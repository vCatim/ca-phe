import { supabase } from './supabase';
import { dedupeTasks, goalFingerprint, mergeUniqueByFingerprint, taskFingerprint, transactionFingerprint } from './taskIdentity';
import {
  clearOutbox,
  enqueueOutbox,
  markOutboxAttempt,
  pendingOutboxCount,
  readOutbox,
  removeOutboxEntity,
  sortedOutbox,
} from './utils/outbox';

// Tránh chạy nhiều lượt đẩy hàng đợi cùng lúc (interval + online + visibilitychange).
let flushing = false;

const taskRow = (userId, task) => ({
  id: String(task.id),
  user_id: userId,
  title: task.title,
  date: task.date,
  start_time: task.start,
  end_time: task.end,
  cat: task.cat,
  pri: task.pri,
  note: task.note || '',
  status: task.status,
  google_event_id: task.googleEventId || null,
  google_task_id: task.googleTaskId || null,
});

const txRow = (userId, tx) => ({
  id: String(tx.id),
  user_id: userId,
  type: tx.type,
  amount: tx.amount,
  date: tx.date,
  note: tx.note || '',
  task_id: tx.taskId || null,
  goal_id: tx.goalId || null,
  auto_goal: tx.autoGoal !== false,
  grp: tx.grp || 'Khác',
  tk: tx.tk || '',
  alloc: tx.alloc || null,
});

const goalRow = (userId, goal) => ({
  id: String(goal.id),
  user_id: userId,
  title: goal.title,
  target: goal.balance ?? goal.target ?? 0,
  current: goal.balance ?? goal.current ?? 0,
  unit: goal.unit || 'đ',
  pri: goal.pri || 'Trung bình',
  auto: false,
});

// Ghi 1 bản ghi lên Supabase. Nhờ supabase-js trả về { error } thay vì ném lỗi,
// lỗi mạng/quyền trước đây bị bỏ qua hoàn toàn. Nay thất bại sẽ được đưa vào
// outbox để thử lại, còn thành công thì xoá bản ghi đang chờ của entity đó.
const writeRow = async (userId, table, op, entityId, row) => {
  if (!supabase || !userId) return false;
  try {
    const { error } = op === 'delete'
      ? await supabase.from(table).delete().eq('id', String(entityId)).eq('user_id', userId)
      : await supabase.from(table).upsert(row);
    if (error) throw error;
    removeOutboxEntity(userId, table, entityId);
    return true;
  } catch (e) {
    console.warn(`Không đồng bộ được ${table}/${entityId}, đã xếp vào hàng đợi:`, e?.message || e);
    enqueueOutbox(userId, { op, table, entityId, payload: op === 'upsert' ? row : null });
    return false;
  }
};

export const syncService = {
  // Lấy toàn bộ dữ liệu người dùng từ Supabase
  async fetchAll(userId) {
    if (!supabase || !userId) return null;

    try {
      const [pRes, grpRes, tRes, gRes, txRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('groups').select('*').eq('user_id', userId),
        supabase.from('tasks').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
      ]);

      if (pRes.error) console.error('Fetch profile error:', pRes.error);
      if (grpRes.error) console.error('Fetch groups error:', grpRes.error);
      if (tRes.error) console.error('Fetch tasks error:', tRes.error);
      if (gRes.error) console.error('Fetch goals error:', gRes.error);
      if (txRes.error) console.error('Fetch txs error:', txRes.error);
      // Không được trả về một database rỗng khi chỉ một truy vấn gặp lỗi:
      // thao tác tải từ cloud có thể dùng kết quả này để thay thế dữ liệu local.
      if ([pRes, grpRes, tRes, gRes, txRes].some(result => result.error)) return null;

      // Chuyển đổi dữ liệu DB -> định dạng App
      const profile = pRes.data
        ? {
            name: pRes.data.name || 'Người dùng',
            budget: Number(pRes.data.budget) || 0,
            income: Number(pRes.data.income) || 0,
            cashBase: Number(pRes.data.cash_base) || 0,
            hasOnboarded: Boolean(pRes.data.has_onboarded),
            theme: pRes.data.theme || 'dark',
            themeColor: pRes.data.theme_color || 'coffee',
            notificationSettings: pRes.data.notification_settings || null,
          }
        : null;

      const groups = (grpRes.data && grpRes.data.length > 0)
        ? grpRes.data.map(g => ({ name: g.name, share: Number(g.share), color: g.color }))
        : null;

      const tasks = (tRes.data || []).map(t => ({
        id: t.id,
        title: t.title,
        date: t.date,
        start: t.start_time || '09:00',
        end: t.end_time || '10:00',
        cat: t.cat || 'Học tập',
        pri: t.pri || 'Trung bình',
        note: t.note || '',
        status: t.status || 'todo',
        googleEventId: t.google_event_id || undefined,
        googleTaskId: t.google_task_id || undefined,
      }));

      const goals = (gRes.data || []).map(g => ({
        id: g.id,
        title: g.title,
        target: Number(g.target) || 0,
        current: Number(g.current) || 0,
        unit: g.unit || 'đ',
        pri: g.pri || 'Trung bình',
        auto: false,
        balance: Number(g.current) || 0,
      }));

      const txs = (txRes.data || []).map(x => ({
        id: x.id,
        type: x.type,
        amount: Number(x.amount) || 0,
        date: x.date,
        note: x.note || '',
        taskId: x.task_id || '',
        goalId: x.goal_id || '',
        autoGoal: x.auto_goal !== false,
        grp: x.grp || 'Khác',
        tk: x.tk || '',
        alloc: x.alloc || null,
      }));

      return { profile, groups, tasks, goals, txs };
    } catch (e) {
      console.error('Error fetching Supabase data:', e);
      return null;
    }
  },

  // Đồng bộ toàn bộ dữ liệu từ Client lên Supabase (Migration/Backup ban đầu)
  async uploadAll(userId, db) {
    if (!supabase || !userId || !db) return false;

    try {
      // 1. Profile
      if (db.profile) {
        const profilePayload = {
          id: userId,
          name: db.profile.name || 'Người dùng',
          budget: db.profile.budget || 0,
          income: db.profile.income || 0,
          cash_base: db.profile.cashBase || 0,
          has_onboarded: Boolean(db.profile.hasOnboarded),
          theme: db.profile.theme || 'dark',
          theme_color: db.profile.themeColor || 'coffee',
          updated_at: new Date().toISOString(),
        };
        if (db.profile.notificationSettings !== undefined) {
          profilePayload.notification_settings = db.profile.notificationSettings;
        }
        let { error } = await supabase.from('profiles').upsert(profilePayload);
        if (error && (error.message?.includes('theme_color') || error.code === '42703')) {
          delete profilePayload.theme_color;
          const retry = await supabase.from('profiles').upsert(profilePayload);
          error = retry.error;
        }
        if (error) throw error;
      }

      // 2. Groups
      if (db.groups && db.groups.length) {
        const rows = db.groups.map(g => ({
          id: `${userId}_${g.name}`,
          user_id: userId,
          name: g.name,
          share: g.share,
          color: g.color,
        }));
        const { error } = await supabase.from('groups').upsert(rows);
        if (error) throw error;
      }

      // 3. Tasks. So sánh với dữ liệu cloud trước khi ghi: cùng lịch từ
      // localStorage trên máy khác sẽ không tạo thêm một bản sao có id mới.
      if (db.tasks && db.tasks.length) {
        const { data: cloudTasks, error: cloudTasksError } = await supabase
          .from('tasks')
          .select('id, title, date, start_time, end_time')
          .eq('user_id', userId);
        if (cloudTasksError) throw cloudTasksError;

        const cloudKeys = new Set((cloudTasks || []).map(taskFingerprint));
        const localTasks = dedupeTasks(db.tasks);
        const rows = localTasks
          .filter(t => !cloudKeys.has(taskFingerprint(t)) || (cloudTasks || []).some(x => String(x.id) === String(t.id)))
          .map(t => ({
            id: String(t.id),
            user_id: userId,
            title: t.title,
            date: t.date,
            start_time: t.start,
            end_time: t.end,
            cat: t.cat,
            pri: t.pri,
            note: t.note || '',
            status: t.status || 'todo',
            google_event_id: t.googleEventId || null,
            google_task_id: t.googleTaskId || null,
          }));
        if (rows.length) {
          const { error } = await supabase.from('tasks').upsert(rows);
          if (error) throw error;
        }
      }

      // 4. Goals
      if (db.goals && db.goals.length) {
        const { data: cloudGoals, error: cloudGoalsError } = await supabase
          .from('goals').select('id, title, unit').eq('user_id', userId);
        if (cloudGoalsError) throw cloudGoalsError;
        const cloudGoalKeys = new Set((cloudGoals || []).map(goalFingerprint));
        const rows = mergeUniqueByFingerprint([], db.goals, goalFingerprint)
          .filter(g => !cloudGoalKeys.has(goalFingerprint(g)) || (cloudGoals || []).some(x => String(x.id) === String(g.id)))
          .map(g => ({
          id: String(g.id),
          user_id: userId,
          title: g.title,
          target: g.balance ?? g.target ?? 0,
          current: g.balance ?? g.current ?? 0,
          unit: g.unit || 'đ',
          pri: g.pri || 'Trung bình',
          auto: false,
          }));
        const { error } = await supabase.from('goals').upsert(rows);
        if (error) throw error;
      }

      // 5. Transactions
      if (db.txs && db.txs.length) {
        const { data: cloudTxs, error: cloudTxsError } = await supabase
          .from('transactions').select('id, type, amount, date, note, grp').eq('user_id', userId);
        if (cloudTxsError) throw cloudTxsError;
        const cloudTxKeys = new Set((cloudTxs || []).map(transactionFingerprint));
        const rows = mergeUniqueByFingerprint([], db.txs, transactionFingerprint)
          .filter(x => !cloudTxKeys.has(transactionFingerprint(x)) || (cloudTxs || []).some(row => String(row.id) === String(x.id)))
          .map(x => ({
          id: String(x.id),
          user_id: userId,
          type: x.type,
          amount: x.amount,
          date: x.date,
          note: x.note || '',
          task_id: x.taskId || null,
          goal_id: x.goalId || null,
          auto_goal: x.autoGoal !== false,
          grp: x.grp || 'Khác',
          tk: x.tk || '',
          alloc: x.alloc || null,
          }));
        const { error } = await supabase.from('transactions').upsert(rows);
        if (error) throw error;
      }

      return true;
    } catch (e) {
      console.error('Error uploading to Supabase:', e);
      return false;
    }
  },

  // Cập nhật Profile
  async saveProfile(userId, profile) {
    if (!supabase || !userId) return;
    try {
      const payload = {
        id: userId,
        name: profile.name,
        budget: profile.budget,
        income: profile.income,
        cash_base: profile.cashBase || 0,
        has_onboarded: Boolean(profile.hasOnboarded),
        updated_at: new Date().toISOString(),
      };
      if (profile.theme) payload.theme = profile.theme;
      if (profile.themeColor) payload.theme_color = profile.themeColor;
      if (profile.notificationSettings !== undefined) payload.notification_settings = profile.notificationSettings;
      let { error } = await supabase.from('profiles').upsert(payload);
      if (error && (error.message?.includes('theme_color') || error.code === '42703')) {
        delete payload.theme_color;
        const retry = await supabase.from('profiles').upsert(payload);
        error = retry.error;
      }
      if (error) throw error;
    } catch (e) {
      console.error(e);
    }
  },

  // Cập nhật Theme & Bộ màu riêng biệt
  async saveTheme(userId, themeMode, themeColor = 'coffee') {
    if (!supabase || !userId) return;
    try {
      const updateData = {
        updated_at: new Date().toISOString(),
      };
      if (themeMode) updateData.theme = themeMode;
      if (themeColor) updateData.theme_color = themeColor;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) {
        if (error.message?.includes('theme_color') || error.code === '42703') {
          await supabase.from('profiles').update({
            theme: themeMode,
            updated_at: new Date().toISOString(),
          }).eq('id', userId);
        } else {
          console.error('Error saving theme to Supabase:', error);
        }
      }
    } catch (e) {
      console.error('Error saving theme to Supabase:', e);
    }
  },

  // Cập nhật Cài đặt thông báo riêng biệt
  async saveNotificationSettings(userId, settings) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('profiles').update({
        notification_settings: settings,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } catch (e) {
      console.error('Error saving notification settings to Supabase:', e);
    }
  },

  // Lưu và xóa nhóm chi tiêu. Trước đây nhóm chỉ được sao lưu trong lần upload toàn bộ.
  async upsertGroup(userId, group) {
    if (!supabase || !userId || !group?.name) return false;
    const row = {
      id: `${userId}_${group.name}`,
      user_id: userId,
      name: group.name,
      share: group.share,
      color: group.color,
    };
    return writeRow(userId, 'groups', 'upsert', row.id, row);
  },

  async deleteGroup(userId, groupName) {
    if (!supabase || !userId || !groupName) return false;
    return writeRow(userId, 'groups', 'delete', `${userId}_${groupName}`, null);
  },

  // Xóa phần dữ liệu mà thao tác "xóa toàn bộ" trong ứng dụng đề cập đến.
  async clearUserData(userId) {
    if (!supabase || !userId) return false;
    try {
      const results = await Promise.all([
        supabase.from('tasks').delete().eq('user_id', userId),
        supabase.from('transactions').delete().eq('user_id', userId),
        supabase.from('goals').delete().eq('user_id', userId),
      ]);
      const failed = results.find(result => result.error);
      if (failed) throw failed.error;
      // Dữ liệu đã xoá trên cloud thì các thay đổi đang chờ cũng không còn ý nghĩa.
      clearOutbox(userId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Lưu Task
  async upsertTask(userId, task) {
    if (!supabase || !userId || !task?.id) return false;
    return writeRow(userId, 'tasks', 'upsert', task.id, taskRow(userId, task));
  },

  async deleteTask(userId, taskId) {
    if (!supabase || !userId || !taskId) return false;
    return writeRow(userId, 'tasks', 'delete', taskId, null);
  },

  // Lưu Giao dịch
  async upsertTx(userId, tx) {
    if (!supabase || !userId || !tx?.id) return false;
    return writeRow(userId, 'transactions', 'upsert', tx.id, txRow(userId, tx));
  },

  async deleteTx(userId, txId) {
    if (!supabase || !userId || !txId) return false;
    return writeRow(userId, 'transactions', 'delete', txId, null);
  },

  // Lưu Mục tiêu / Quỹ
  async upsertGoal(userId, goal) {
    if (!supabase || !userId || !goal?.id) return false;
    return writeRow(userId, 'goals', 'upsert', goal.id, goalRow(userId, goal));
  },

  async deleteGoal(userId, goalId) {
    if (!supabase || !userId || !goalId) return false;
    return writeRow(userId, 'goals', 'delete', goalId, null);
  },

  // ===== Hàng đợi đồng bộ =====
  pendingCount(userId) {
    return pendingOutboxCount(userId);
  },

  clearPending(userId) {
    clearOutbox(userId);
  },

  // Đẩy các thay đổi đang chờ lên cloud. Trả về số bản ghi còn lại để UI hiển thị.
  async flushPending(userId) {
    if (!supabase || !userId) return { ok: false, reason: 'unconfigured', remaining: 0 };
    if (flushing) return { ok: true, reason: 'busy', remaining: pendingOutboxCount(userId) };

    const queue = sortedOutbox(readOutbox(userId));
    if (!queue.length) return { ok: true, remaining: 0 };

    flushing = true;
    try {
      for (const entry of queue) {
        const request = entry.op === 'delete'
          ? supabase.from(entry.table).delete().eq('id', entry.entityId).eq('user_id', userId)
          : supabase.from(entry.table).upsert(entry.payload);
        const { error } = await request;

        if (error) {
          markOutboxAttempt(userId, entry.seq, error.message);
          const status = Number(error.status) || 0;
          // status = 0 thường là mất mạng; 429/5xx là lỗi tạm thời.
          const transient = !status || status >= 500 || status === 429;
          return {
            ok: false,
            reason: transient ? 'network' : 'rejected',
            error: error.message,
            remaining: pendingOutboxCount(userId),
          };
        }
        removeOutboxEntity(userId, entry.table, entry.entityId);
      }
      return { ok: true, remaining: 0 };
    } catch (e) {
      // Lỗi mạng ngoài dự kiến: giữ nguyên hàng đợi để lần sau thử lại.
      return { ok: false, reason: 'network', error: e?.message, remaining: pendingOutboxCount(userId) };
    } finally {
      flushing = false;
    }
  },
};
