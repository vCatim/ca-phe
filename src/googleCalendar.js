// Tích hợp Google Calendar API v3
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Chuyển đổi sự kiện từ Google Calendar thành task của Cà Phê
export const parseGoogleEventToTask = (event) => {
  if (!event || event.status === 'cancelled') return null;

  let date = '';
  let start = '09:00';
  let end = '10:00';

  if (event.start?.dateTime) {
    const sDate = new Date(event.start.dateTime);
    date = isoDate(sDate);
    start = `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`;

    if (event.end?.dateTime) {
      const eDate = new Date(event.end.dateTime);
      end = `${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`;
    } else {
      end = `${pad((sDate.getHours() + 1) % 24)}:${pad(sDate.getMinutes())}`;
    }
  } else if (event.start?.date) {
    // Sự kiện cả ngày
    date = event.start.date;
    start = '08:00';
    end = '09:00';
  } else {
    return null;
  }

  // Đảm bảo end > start
  if (end <= start) {
    const [h, m] = start.split(':').map(Number);
    end = `${pad((h + 1) % 24)}:${pad(m)}`;
  }

  return {
    id: `gcal_${event.id}`,
    title: event.summary || 'Sự kiện Google Calendar',
    date,
    start,
    end,
    cat: 'Học tập',
    pri: 'Trung bình',
    note: event.description || '',
    status: 'todo',
    googleEventId: event.id,
    syncSource: 'gcal',
  };
};

// Chuyển đổi task Cà Phê sang payload gửi Google Calendar
export const taskToGoogleEventPayload = (task) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  const startDateTime = `${task.date}T${task.start || '09:00'}:00`;
  const endDateTime = `${task.date}T${task.end || '10:00'}:00`;

  return {
    summary: task.title,
    description: task.note ? `${task.note}\n[Đồng bộ từ Cà Phê]` : '[Đồng bộ từ Cà Phê]',
    start: {
      dateTime: new Date(startDateTime).toISOString(),
      timeZone,
    },
    end: {
      dateTime: new Date(endDateTime).toISOString(),
      timeZone,
    },
  };
};

// Lấy danh sách sự kiện từ Google Calendar trong khoảng thời gian
export const fetchCalendarEvents = async (accessToken, timeMin, timeMax) => {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const res = await fetch(`${CALENDAR_API_BASE}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const items = data.items || [];
  return items.map(parseGoogleEventToTask).filter(Boolean);
};

// Tạo sự kiện mới trên Google Calendar
export const createCalendarEvent = async (accessToken, task) => {
  const payload = taskToGoogleEventPayload(task);

  const res = await fetch(CALENDAR_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tạo sự kiện Calendar thất bại: ${errorText}`);
  }

  return await res.json();
};

// Cập nhật sự kiện hiện có trên Google Calendar
export const updateCalendarEvent = async (accessToken, googleEventId, task) => {
  if (!googleEventId) return null;
  const payload = taskToGoogleEventPayload(task);

  const res = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Nếu sự kiện bị xóa trên Google, bỏ qua lỗi 404
    if (res.status === 404) return null;
    const errorText = await res.text();
    throw new Error(`Cập nhật sự kiện Calendar thất bại: ${errorText}`);
  }

  return await res.json();
};

// Xóa sự kiện trên Google Calendar
export const deleteCalendarEvent = async (accessToken, googleEventId) => {
  if (!googleEventId) return false;

  const res = await fetch(`${CALENDAR_API_BASE}/${encodeURIComponent(googleEventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorText = await res.text();
    throw new Error(`Xóa sự kiện Calendar thất bại: ${errorText}`);
  }

  return true;
};
