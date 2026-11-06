// Một lịch được xem là trùng khi cùng nội dung và cùng khoảng thời gian.
// Không dùng `id` vì mỗi thiết bị/localStorage có thể tạo id khác nhau cho cùng một sự kiện.
export const normaliseText = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('vi-VN');

export const taskFingerprint = task => [
  normaliseText(task.title),
  String(task.date || ''),
  String(task.start || task.start_time || '09:00'),
  String(task.end || task.end_time || '10:00'),
].join('|');

export const dedupeTasks = tasks => {
  const seen = new Set();
  return (tasks || []).filter(task => {
    const key = taskFingerprint(task);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Giữ phiên bản cloud trước, sau đó chỉ thêm lịch local chưa có trên cloud.
export const mergeUniqueTasks = (cloudTasks, localTasks) => dedupeTasks([
  ...(cloudTasks || []),
  ...(localTasks || []),
]);

// Quỹ và giao dịch không dùng id để nhận diện bản sao vì id cục bộ khác nhau
// giữa hai thiết bị. Cloud luôn được giữ lại trước.
export const goalFingerprint = goal => [
  normaliseText(goal.title),
  normaliseText(goal.unit || 'đ'),
].join('|');

export const transactionFingerprint = tx => [
  normaliseText(tx.type),
  String(Number(tx.amount) || 0),
  String(tx.date || ''),
  normaliseText(tx.note),
  normaliseText(tx.grp),
].join('|');

export const mergeUniqueByFingerprint = (cloudItems, localItems, fingerprint) => {
  const seen = new Set();
  return [...(cloudItems || []), ...(localItems || [])].filter(item => {
    const key = fingerprint(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
