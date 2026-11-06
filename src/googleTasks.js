// Tích hợp Google Tasks API v1
const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Lấy hoặc tạo danh sách task "Cà Phê" (hoặc dùng @default)
export const getTargetTaskListId = async (accessToken) => {
  try {
    const res = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return '@default';

    const data = await res.json();
    const lists = data.items || [];
    const found = lists.find(l => l.title === 'Cà Phê');
    if (found) return found.id;

    // Tạo danh sách riêng cho app nếu chưa có
    const createRes = await fetch(`${TASKS_API_BASE}/users/@me/lists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Cà Phê' }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id;
    }
  } catch (e) {
    console.warn('Không thể tạo danh sách riêng, dùng @default:', e);
  }

  return '@default';
};

// Chuyển đổi task từ Google Tasks sang Cà Phê
export const parseGoogleTaskToAppTask = (gTask) => {
  if (!gTask || gTask.deleted || gTask.hidden) return null;

  let date = isoDate(new Date());
  if (gTask.due) {
    const d = new Date(gTask.due);
    if (!isNaN(d.getTime())) {
      date = isoDate(d);
    }
  }

  const isCompleted = gTask.status === 'completed';

  return {
    id: `gtask_${gTask.id}`,
    title: gTask.title || 'Công việc Google Tasks',
    date,
    start: '09:00',
    end: '10:00',
    cat: 'Cá nhân',
    pri: 'Trung bình',
    note: gTask.notes || '',
    status: isCompleted ? 'done' : 'todo',
    googleTaskId: gTask.id,
    syncSource: 'gtasks',
  };
};

// Chuyển đổi task Cà Phê sang Google Tasks payload
export const taskToGoogleTaskPayload = (task) => {
  const payload = {
    title: task.title,
    notes: task.note ? `${task.note}\n[Đồng bộ từ Cà Phê]` : '[Đồng bộ từ Cà Phê]',
    status: task.status === 'done' ? 'completed' : 'needsAction',
  };

  if (task.date) {
    payload.due = `${task.date}T00:00:00.000Z`;
  }

  return payload;
};

// Lấy danh sách task từ Google Tasks
export const fetchGoogleTasks = async (accessToken, taskListId = '@default') => {
  const params = new URLSearchParams({
    showCompleted: 'true',
    showHidden: 'true',
    maxResults: '100',
  });

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Tasks API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const items = data.items || [];
  return items.map(parseGoogleTaskToAppTask).filter(Boolean);
};

// Tạo task mới trên Google Tasks
export const createGoogleTask = async (accessToken, task, taskListId = '@default') => {
  const payload = taskToGoogleTaskPayload(task);

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Tạo Google Task thất bại: ${errorText}`);
  }

  return await res.json();
};

// Cập nhật task trên Google Tasks
export const updateGoogleTask = async (accessToken, googleTaskId, task, taskListId = '@default') => {
  if (!googleTaskId) return null;
  const payload = taskToGoogleTaskPayload(task);

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const errorText = await res.text();
    throw new Error(`Cập nhật Google Task thất bại: ${errorText}`);
  }

  return await res.json();
};

// Xóa task trên Google Tasks
export const deleteGoogleTask = async (accessToken, googleTaskId, taskListId = '@default') => {
  if (!googleTaskId) return false;

  const res = await fetch(`${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(googleTaskId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorText = await res.text();
    throw new Error(`Xóa Google Task thất bại: ${errorText}`);
  }

  return true;
};
