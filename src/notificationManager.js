// Hệ thống thông báo nhắc việc Hybrid (Capacitor Android Native + Web Notification API)
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const SETTINGS_KEY = 'caphe_notification_settings';
const NOTIFIED_TASKS_KEY = 'caphe_notified_tasks';
export const REMINDER_CHANNEL_ID = 'reminders';

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
    if (!raw) return { enabled: true, leadMinutes: 5, sound: true };
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled ?? true,
      leadMinutes: typeof parsed.leadMinutes === 'number' ? parsed.leadMinutes : 5,
      sound: parsed.sound ?? true,
    };
  } catch (e) {
    return { enabled: true, leadMinutes: 5, sound: true };
  }
};

export const saveNotificationSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {}
};

// Khởi tạo kênh thông báo ưu tiên cao trên Android (bắt buộc từ Android 8.0+)
export const ensureNotificationChannel = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: 'Nhắc nhở công việc',
        description: 'Thông báo nhắc nhở các công việc sắp diễn ra',
        importance: 5, // IMPORTANCE_HIGH (5): âm thanh + rung + pop-up heads-up banner
        visibility: 1, // VISIBILITY_PUBLIC (1): hiện trên màn hình khóa
        vibration: true,
        lights: true,
      });
    } catch (e) {
      console.warn('Lỗi tạo notification channel:', e);
    }
  }
};

// Yêu cầu quyền thông báo từ hệ điều hành / trình duyệt
export const requestNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
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

// Hủy thông báo của 1 task khi bị xóa hoặc hoàn thành
export const cancelTaskReminder = async (task) => {
  if (!task || !task.id) return;
  const notifId = hashCode(task.id);

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

// Lên lịch thông báo cho 1 task
export const scheduleTaskReminder = async (task, leadMinutes) => {
  if (!task || !task.id || !task.date || !task.start) return;

  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  // Nếu việc đã hoàn thành -> hủy thông báo và thoát
  if (task.status === 'done') {
    await cancelTaskReminder(task);
    return;
  }

  // Số phút nhắc trước (ưu tiên tham số truyền vào, nếu không có lấy theo cài đặt người dùng)
  const effectiveLead = typeof leadMinutes === 'number'
    ? leadMinutes
    : (typeof settings.leadMinutes === 'number' ? settings.leadMinutes : 5);

  const [y, mth, d] = String(task.date).split('-').map(Number);
  const [h, m] = String(task.start).split(':').map(Number);
  if (isNaN(y) || isNaN(mth) || isNaN(d) || isNaN(h) || isNaN(m)) return;

  // Giờ bắt đầu chính xác theo múi giờ thiết bị địa phương
  const targetDate = new Date(y, mth - 1, d, h, m, 0, 0);
  const now = new Date();

  // Nếu công việc đã bắt đầu quá 1 phút trước, không nhắc nữa
  if (now.getTime() - targetDate.getTime() > 60 * 1000) {
    return;
  }

  // Thời điểm cần phát chuông báo
  let notifyTime = new Date(targetDate.getTime() - effectiveLead * 60 * 1000);

  // Nếu thời điểm nhắc trước đã qua (ví dụ: tạo việc lúc còn 3 phút nữa là đến giờ,
  // nhưng cài đặt nhắc trước 5 phút) -> phát thông báo ngay sau 1.5 giây
  if (notifyTime.getTime() <= now.getTime()) {
    notifyTime = new Date(Date.now() + 1500);
  }

  const notifId = hashCode(task.id);
  const diffMinutes = Math.max(0, Math.round((targetDate.getTime() - notifyTime.getTime()) / 60000));

  const title = `☕ Nhắc việc: ${task.title}`;
  const body = diffMinutes > 0
    ? `Sắp bắt đầu lúc ${task.start} (còn ~${diffMinutes} phút)${task.note ? ' · ' + task.note : ''}`
    : `Bắt đầu lúc ${task.start}${task.note ? ' · ' + task.note : ''}`;

  if (Capacitor.isNativePlatform()) {
    try {
      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notifId,
            schedule: {
              at: notifyTime,
              allowWhileIdle: true, // Đánh thức CPU ở chế độ Doze/màn hình khóa trên Android
            },
            channelId: REMINDER_CHANNEL_ID,
            autoCancel: true,
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

// Lên lịch lại toàn bộ các task sắp tới
export const resyncAllReminders = async (tasks = []) => {
  const settings = getNotificationSettings();
  if (!settings.enabled) {
    if (Capacitor.isNativePlatform()) {
      try {
        const pending = await LocalNotifications.getPending();
        if (pending?.notifications?.length) {
          await LocalNotifications.cancel({
            notifications: pending.notifications.map(n => ({ id: n.id })),
          });
        }
      } catch (e) {}
    }
    return;
  }

  const hasPerm = await checkNotificationPermission();
  if (!hasPerm) return;

  await ensureNotificationChannel();

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const upcomingTasks = (tasks || []).filter(t => t && t.date >= todayStr && t.status !== 'done');

  for (const task of upcomingTasks) {
    await scheduleTaskReminder(task, settings.leadMinutes);
  }
};

// Quét định kỳ trên Web Desktop (cho trình duyệt)
let webWatcherInterval = null;

export const startWebNotificationWatcher = (getTasksCallback, onNotifyCallback) => {
  if (Capacitor.isNativePlatform()) return; // Trên Android native đã dùng AlarmManager
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

    const leadMinutes = typeof settings.leadMinutes === 'number' ? settings.leadMinutes : 5;
    const leadMs = leadMinutes * 60 * 1000;

    tasks.filter(t => t && t.date === todayStr && t.status !== 'done').forEach(task => {
      const [h, m] = (task.start || '09:00').split(':').map(Number);
      const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0).getTime();
      const diff = startTime - now.getTime();

      const notifKey = `${task.id}_${todayStr}_${task.start}`;

      // Bắn thông báo khi thời gian còn lại nằm trong khoảng nhắc trước và chưa trôi qua quá 1 phút
      if (diff >= -60000 && diff <= leadMs && !notifiedSet.has(notifKey)) {
        notifiedSet.add(notifKey);
        try {
          localStorage.setItem(NOTIFIED_TASKS_KEY, JSON.stringify([...notifiedSet]));
        } catch (e) {}

        const title = `☕ Nhắc việc: ${task.title}`;
        const diffMin = Math.max(0, Math.round(diff / 60000));
        const body = diffMin > 0
          ? `Sắp bắt đầu lúc ${task.start} (còn ~${diffMin} phút)${task.note ? ' · ' + task.note : ''}`
          : `Bắt đầu lúc ${task.start}${task.note ? ' · ' + task.note : ''}`;

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
  }, 15000); // Quét mỗi 15 giây
};

// Gửi thông báo thử nghiệm (Test Notification)
export const sendTestNotification = async () => {
  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Bạn chưa cấp quyền thông báo cho ứng dụng.');
  }

  await ensureNotificationChannel();

  const title = '☕ Cà Phê: Thông báo hoạt động tốt!';
  const body = 'Hệ thống nhắc việc đã sẵn sàng trên thiết bị của bạn ✨';

  if (Capacitor.isNativePlatform()) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 100000) + 1,
          schedule: {
            at: new Date(Date.now() + 1500),
            allowWhileIdle: true,
          },
          channelId: REMINDER_CHANNEL_ID,
          autoCancel: true,
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
