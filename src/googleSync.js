// Bộ điều phối đồng bộ 2 chiều (2-Way Sync) giữa Cà Phê và Google Calendar / Tasks
import {
  getStoredGoogleAuth,
  isGoogleConnected,
  isGoogleTokenValid,
} from './googleAuth';
import {
  fetchCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './googleCalendar';
import {
  getTargetTaskListId,
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
} from './googleTasks';
import { dedupeTasks, taskFingerprint } from './taskIdentity';

const SETTINGS_KEY = 'caphe_google_sync_settings';

// Cài đặt đồng bộ mặc định
export const getGoogleSyncSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { syncCalendar: true, syncTasks: true, autoSync: true };
    return { syncCalendar: true, syncTasks: true, autoSync: true, ...JSON.parse(raw) };
  } catch (e) {
    return { syncCalendar: true, syncTasks: true, autoSync: true };
  }
};

export const saveGoogleSyncSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Lấy Access Token còn hiệu lực
const getValidToken = () => {
  const auth = getStoredGoogleAuth();
  if (!auth || !auth.accessToken) return null;
  if (!isGoogleTokenValid()) {
    console.warn('Google Access Token đã hết hạn. Vui lòng kết nối lại tài khoản Google.');
    return null;
  }
  return auth.accessToken;
};

// Đồng bộ 2 chiều toàn diện:
// 1. Kéo sự kiện từ Google Calendar & Tasks về
// 2. So khớp để tránh trùng lặp
// 3. Đẩy các task trên máy chưa có trên Google lên Google
export const runTwoWayGoogleSync = async (currentTasks = []) => {
  const token = getValidToken();
  if (!token) {
    throw new Error('Chưa kết nối Google hoặc phiên đăng nhập đã hết hạn. Vui lòng bấm "Kết nối Google".');
  }

  const settings = getGoogleSyncSettings();
  const results = {
    pulledFromCalendar: 0,
    pulledFromTasks: 0,
    pushedToCalendar: 0,
    pushedToTasks: 0,
  };

  let mergedTasks = [...currentTasks];
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const future60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();

  let targetTaskListId = '@default';
  if (settings.syncTasks) {
    targetTaskListId = await getTargetTaskListId(token);
  }

  // BƯỚC 1: KÉO DỮ LIỆU TỪ GOOGLE VỀ APP
  const googleItems = [];

  if (settings.syncCalendar) {
    try {
      const gcalEvents = await fetchCalendarEvents(token, past30, future60);
      results.pulledFromCalendar = gcalEvents.length;
      googleItems.push(...gcalEvents);
    } catch (e) {
      console.error('Lỗi kéo sự kiện Google Calendar:', e);
    }
  }

  if (settings.syncTasks) {
    try {
      const gtasks = await fetchGoogleTasks(token, targetTaskListId);
      results.pulledFromTasks = gtasks.length;
      googleItems.push(...gtasks);
    } catch (e) {
      console.error('Lỗi kéo công việc Google Tasks:', e);
    }
  }

  // So khớp và kết hợp vào danh sách công việc hiện tại
  const taskMapByFingerprint = new Map();
  mergedTasks.forEach(t => {
    taskMapByFingerprint.set(taskFingerprint(t), t);
  });

  googleItems.forEach(gItem => {
    const fp = taskFingerprint(gItem);
    if (taskMapByFingerprint.has(fp)) {
      // Đã có task tương ứng: gán ID liên kết nếu chưa có
      const existing = taskMapByFingerprint.get(fp);
      let updated = false;

      if (gItem.googleEventId && !existing.googleEventId) {
        existing.googleEventId = gItem.googleEventId;
        updated = true;
      }
      if (gItem.googleTaskId && !existing.googleTaskId) {
        existing.googleTaskId = gItem.googleTaskId;
        updated = true;
      }
      // Đồng bộ trạng thái hoàn thành từ Google Tasks nếu có
      if (gItem.syncSource === 'gtasks' && gItem.status !== existing.status) {
        existing.status = gItem.status;
        updated = true;
      }

      if (updated) {
        mergedTasks = mergedTasks.map(t => t.id === existing.id ? { ...existing } : t);
      }
    } else {
      // Chưa có trên máy: thêm mới vào danh sách
      mergedTasks.push(gItem);
      taskMapByFingerprint.set(fp, gItem);
    }
  });

  // BƯỚC 2: ĐẨY CÁC TASK TRÊN MÁY LÊN GOOGLE (Nếu chưa có trên Google)
  for (let i = 0; i < mergedTasks.length; i++) {
    const task = mergedTasks[i];

    // Chỉ đẩy các việc từ hôm nay hoặc tương lai (không đẩy lại việc quá khứ)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (task.date < todayStr) continue;

    // Đẩy lên Google Calendar nếu có giờ bắt đầu & kết thúc và chưa có trên Calendar
    if (settings.syncCalendar && !task.googleEventId && task.start && task.end) {
      try {
        const createdEvent = await createCalendarEvent(token, task);
        if (createdEvent?.id) {
          task.googleEventId = createdEvent.id;
          results.pushedToCalendar++;
        }
      } catch (err) {
        console.warn('Không thể đẩy task lên Calendar:', task.title, err);
      }
    }

    // Đẩy lên Google Tasks nếu chưa có trên Tasks
    if (settings.syncTasks && !task.googleTaskId) {
      try {
        const createdTask = await createGoogleTask(token, task, targetTaskListId);
        if (createdTask?.id) {
          task.googleTaskId = createdTask.id;
          results.pushedToTasks++;
        }
      } catch (err) {
        console.warn('Không thể đẩy task lên Google Tasks:', task.title, err);
      }
    }
  }

  return {
    tasks: dedupeTasks(mergedTasks),
    results,
  };
};

// Đồng bộ 1 task cụ thể khi người dùng tạo / sửa / xóa trong app
export const syncSingleTaskWithGoogle = async (task, action = 'save') => {
  const settings = getGoogleSyncSettings();
  if (!settings.autoSync) return task;

  const token = getValidToken();
  if (!token) return task;

  const updatedTask = { ...task };

  try {
    if (action === 'delete') {
      if (task.googleEventId && settings.syncCalendar) {
        await deleteCalendarEvent(token, task.googleEventId).catch(() => {});
      }
      if (task.googleTaskId && settings.syncTasks) {
        const targetListId = await getTargetTaskListId(token);
        await deleteGoogleTask(token, task.googleTaskId, targetListId).catch(() => {});
      }
      return null;
    }

    if (action === 'save') {
      // 1. Google Calendar
      if (settings.syncCalendar) {
        if (task.googleEventId) {
          await updateCalendarEvent(token, task.googleEventId, task).catch(() => {});
        } else if (task.start && task.end) {
          const created = await createCalendarEvent(token, task).catch(() => null);
          if (created?.id) updatedTask.googleEventId = created.id;
        }
      }

      // 2. Google Tasks
      if (settings.syncTasks) {
        const targetListId = await getTargetTaskListId(token);
        if (task.googleTaskId) {
          await updateGoogleTask(token, task.googleTaskId, task, targetListId).catch(() => {});
        } else {
          const created = await createGoogleTask(token, task, targetListId).catch(() => null);
          if (created?.id) updatedTask.googleTaskId = created.id;
        }
      }
    }
  } catch (e) {
    console.warn('Lỗi auto-sync task với Google:', e);
  }

  return updatedTask;
};
