import { supabase } from './supabase';
import { dedupeTasks, goalFingerprint, mergeUniqueByFingerprint, taskFingerprint, transactionFingerprint } from './taskIdentity';

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
        const { error } = await supabase.from('profiles').upsert({
          id: userId,
          name: db.profile.name || 'Người dùng',
          budget: db.profile.budget || 0,
          income: db.profile.income || 0,
          cash_base: db.profile.cashBase || 0,
          has_onboarded: Boolean(db.profile.hasOnboarded),
          updated_at: new Date().toISOString(),
        });
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
      await supabase.from('profiles').upsert({
        id: userId,
        name: profile.name,
        budget: profile.budget,
        income: profile.income,
        cash_base: profile.cashBase || 0,
        has_onboarded: Boolean(profile.hasOnboarded),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
    }
  },

  // Lưu và xóa nhóm chi tiêu. Trước đây nhóm chỉ được sao lưu trong lần upload toàn bộ.
  async upsertGroup(userId, group) {
    if (!supabase || !userId || !group?.name) return false;
    try {
      const { error } = await supabase.from('groups').upsert({
        id: `${userId}_${group.name}`,
        user_id: userId,
        name: group.name,
        share: group.share,
        color: group.color,
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  async deleteGroup(userId, groupName) {
    if (!supabase || !userId || !groupName) return false;
    try {
      const { error } = await supabase.from('groups').delete().eq('user_id', userId).eq('name', groupName);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
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
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Lưu Task
  async upsertTask(userId, task) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('tasks').upsert({
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
      });
    } catch (e) {
      console.error(e);
    }
  },

  async deleteTask(userId, taskId) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('tasks').delete().eq('id', String(taskId)).eq('user_id', userId);
    } catch (e) {
      console.error(e);
    }
  },

  // Lưu Giao dịch
  async upsertTx(userId, tx) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('transactions').upsert({
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
    } catch (e) {
      console.error(e);
    }
  },

  async deleteTx(userId, txId) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('transactions').delete().eq('id', String(txId)).eq('user_id', userId);
    } catch (e) {
      console.error(e);
    }
  },

  // Lưu Mục tiêu
  async upsertGoal(userId, goal) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('goals').upsert({
        id: String(goal.id),
        user_id: userId,
        title: goal.title,
        target: goal.balance ?? goal.target ?? 0,
        current: goal.balance ?? goal.current ?? 0,
        unit: goal.unit || 'đ',
        pri: goal.pri || 'Trung bình',
        auto: false,
      });
    } catch (e) {
      console.error(e);
    }
  },

  async deleteGoal(userId, goalId) {
    if (!supabase || !userId) return;
    try {
      await supabase.from('goals').delete().eq('id', String(goalId)).eq('user_id', userId);
    } catch (e) {
      console.error(e);
    }
  },
};
