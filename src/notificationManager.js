// Hệ thống thông báo nhắc việc Hybrid (Capacitor Android Native + Web Notification API)
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const SETTINGS_KEY = 'caphe_notification_settings';
const NOTIFIED_TASKS_KEY = 'caphe_notified_tasks';

const hashCode = (str) => {
  let hash = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
};

// Đọc cài đặt thông báo
export const getNotificationSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { enabled: true, leadMinutes: 10, sound: true };
    return { enabled: true, leadMinutes: 10, sound: true, ...JSON.parse(raw) };
  } catch (e) {
    return { enabled: true, leadMinutes: 10, sound: true };
  }
};

export const saveNotificationSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Yêu cầu quyền thông báo từ hệ điều hành / trình duyệt
export const requestNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (e) {
      console.warn('Lỗi xin quyền Capacitor LocalNotification:', e);
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Lỗi xin quyền Web Notification:', e);
      return false;
    }
  }

  return false;
};

// Kiểm tra quyền hiện tại
export const checkNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch (e) {
      return false;
    }
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission === 'granted';
  }

  return false;
};

// Lên lịch thông báo cho 1 task
export const scheduleTaskReminder = async (task, leadMinutes = 10) => {
  if (!task || !task.date || !task.start || task.status === 'done') return;

  const [h, m] = task.start.split(':').map(Number);
  const targetDate = new Date(`${task.date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);

  // Trừ đi số phút nhắc trước
  const notifyTime = new Date(targetDate.getTime() - leadMinutes * 60 * 1000);
  const now = new Date();

  // Nếu thời điểm thông báo đã qua, không lên lịch nữa
  if (notifyTime <= now) return;

  const notifId = hashCode(`${task.id}_${task.date}_${task.start}`);
  const title = `☕ Nhắc việc: ${task.title}`;
  const body = leadMinutes > 0
    ? `Sắp bắt đầu lúc ${task.start} (còn ${leadMinutes} phút)${task.note ? ' · ' + task.note : ''}`
    : `Bắt đầu lúc ${task.start}${task.note ? ' · ' + task.note : ''}`;

  if (Capacitor.isNativePlatform()) {
    // 1. ANDROID NATIVE ALARM (Không cần app chạy ngầm, 0% RAM)
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notifId,
            schedule: { at: notifyTime },
            sound: 'beep.wav',
            actionTypeId: '',
            extra: {
              taskId: task.id,
              date: task.date,
            },
          },
        ],
      });
    } catch (e) {
      console.warn('Không thể lên lịch Native Alarm:', e);
    }
  }
};

// Hủy thông báo của 1 task khi bị xóa hoặc hoàn thành
export const cancelTaskReminder = async (task) => {
  if (!task || !task.id) return;
  const notifId = hashCode(`${task.id}_${task.date}_${task.start}`);

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notifId }],
      });
    } catch (e) {
      console.warn('Lỗi hủy Native Notification:', e);
    }
  }
};

// Lên lịch lại toàn bộ các task sắp tới (dùng khi mở app hoặc cập nhật danh sách task)
export const resyncAllReminders = async (tasks = []) => {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) return;

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingTasks = (tasks || []).filter(t => t.date >= todayStr && t.status !== 'done');

  for (const task of upcomingTasks) {
    await scheduleTaskReminder(task, settings.leadMinutes);
  }
};

// Bộ đếm quét định kỳ trên Web Desktop (cho trình duyệt)
let webWatcherInterval = null;

export const startWebNotificationWatcher = (getTasksCallback, onNotifyCallback) => {
  if (Capacitor.isNativePlatform()) return; // Trên Android native đã có AlarmManager, không cần vòng lặp
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (webWatcherInterval) clearInterval(webWatcherInterval);

  webWatcherInterval = setInterval(() => {
    const settings = getNotificationSettings();
    if (!settings.enabled || Notification.permission !== 'granted') return;

    const tasks = getTasksCallback ? getTasksCallback() : [];
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // Đọc danh sách ID đã thông báo hôm nay
    let notifiedSet = new Set();
    try {
      const raw = localStorage.getItem(NOTIFIED_TASKS_KEY);
      if (raw) notifiedSet = new Set(JSON.parse(raw));
    } catch (e) {}

    const leadMs = (settings.leadMinutes || 10) * 60 * 1000;

    tasks.filter(t => t.date === todayStr && t.status !== 'done').forEach(task => {
      const [h, m] = (task.start || '09:00').split(':').map(Number);
      const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
      const diff = startTime - now.getTime();

      const notifKey = `${task.id}_${todayStr}_${task.start}`;

      // Bắn thông báo khi thời gian còn lại nằm trong khoảng [0, leadMs] và chưa từng thông báo
      if (diff >= 0 && diff <= leadMs && !notifiedSet.has(notifKey)) {
        notifiedSet.add(notifKey);
        localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify([...notifiedSet]));

        const title = `☕ Nhắc việc: ${task.title}`;
        const body = `Sắp bắt đầu lúc ${task.start} (còn ~${Math.round(diff / 60000)} phút)${task.note ? ' · ' + task.note : ''}`;

        try {
          new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: notifKey,
          });
        } catch (e) {}

        if (onNotifyCallback) onNotifyCallback(task);
      }
    });
  }, 30000); // Quét mỗi 30 giây
};

// Gửi thông báo thử nghiệm (Test Notification)
export const sendTestNotification = async () => {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Bạn chưa cấp quyền thông báo cho ứng dụng.');
  }

  const title = '☕ Cà Phê: Thông báo hoạt động tốt!';
  const body = 'Hệ thống nhắc việc đã sẵn sàng trên thiết bị của bạn ✨';

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000),
          schedule: { at: new Date(Date.now() + 1000) }, // Sau 1 giây
        },
      ],
    });
  } else {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
    });
  }

  return true;
};
