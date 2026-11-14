// ============ Hàng đợi đồng bộ (outbox) ============
// Supabase JS không ném lỗi khi request thất bại mà trả về { error }. Nếu chỉ
// await mà không kiểm tra, thao tác khi mất mạng sẽ mất dữ liệu trong im lặng.
// Outbox lưu lại các thay đổi chưa đẩy được để thử lại khi có mạng.

export const OUTBOX_EVENT = 'caphe:outbox-changed';

// Mỗi bản ghi đủ nhỏ (vài trăm byte) nên hạn mức này rất khó chạm tới.
// Chỉ cắt bớt khi vượt ngưỡng để localStorage không bị đầy.
const MAX_ENTRIES = 2000;

const storeKey = userId => `caphe-outbox-${userId}`;

const emit = () => {
  try {
    window.dispatchEvent(new CustomEvent(OUTBOX_EVENT));
  } catch (e) {}
};

const parse = raw => {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch (e) {
    return [];
  }
};

export const readOutbox = userId => {
  if (!userId) return [];
  try {
    return parse(localStorage.getItem(storeKey(userId)));
  } catch (e) {
    return [];
  }
};

const writeOutbox = (userId, list) => {
  try {
    localStorage.setItem(storeKey(userId), JSON.stringify(list));
  } catch (e) {
    console.warn('Không ghi được hàng đợi đồng bộ:', e);
  }
  emit();
};

// Thêm một thay đổi vào hàng đợi. Nếu entity đã có thay đổi đang chờ thì thay
// thế bằng thay đổi mới nhất (last-write-wins theo từng bản ghi), nhờ vậy
// không bị tình trạng "xoá rồi tạo lại" chạy sai thứ tự.
export const enqueueOutbox = (userId, entry) => {
  if (!userId || !entry || !entry.table || !entry.entityId) return;
  const list = readOutbox(userId).filter(
    item => !(item.table === entry.table && String(item.entityId) === String(entry.entityId))
  );
  const seq = list.reduce((max, item) => Math.max(max, Number(item.seq) || 0), 0) + 1;
  list.push({
    seq,
    attempts: 0,
    ...entry,
    entityId: String(entry.entityId)
  });

  if (list.length > MAX_ENTRIES) {
    console.warn(`Hàng đợi đồng bộ vượt ${MAX_ENTRIES} bản ghi, bỏ các bản ghi cũ nhất.`);
  }
  const trimmed = list.length > MAX_ENTRIES ? list.slice(list.length - MAX_ENTRIES) : list;
  writeOutbox(userId, trimmed);
};

export const removeOutboxEntity = (userId, table, entityId) => {
  if (!userId) return;
  const list = readOutbox(userId);
  const next = list.filter(
    item => !(item.table === table && String(item.entityId) === String(entityId))
  );
  if (next.length !== list.length) writeOutbox(userId, next);
};

// Ghi nhận một lần thử thất bại để có thể hiển thị/giới hạn số lần thử.
export const markOutboxAttempt = (userId, seq, error) => {
  if (!userId) return;
  const list = readOutbox(userId).map(item =>
    Number(item.seq) === Number(seq)
      ? { ...item, attempts: (Number(item.attempts) || 0) + 1, lastError: String(error || '') }
      : item
  );
  writeOutbox(userId, list);
};

export const pendingOutboxCount = userId => readOutbox(userId).length;

export const clearOutbox = userId => {
  if (!userId) return;
  try {
    localStorage.removeItem(storeKey(userId));
  } catch (e) {}
  emit();
};

export const sortedOutbox = (list = []) =>
  [...list].sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
