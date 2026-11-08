// ============ CÀ PHÊ — Các hàm định dạng ngày tháng & tiền tệ ============

export const pad = n => String(n).padStart(2, '0');

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => iso(new Date());

export const addDays = (s, n) => {
  const d = new Date(s + 'T00:00');
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const wkStart = s => {
  const day = new Date(s + 'T00:00').getDay();
  return addDays(s, day === 0 ? -6 : 1 - day);
};

export const dBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);

export const addMonths = (s, n) => {
  const d = new Date(s + 'T00:00');
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return iso(d);
};

export const dots = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const money = n => dots(n) + 'đ';

export const uid = () => Math.random().toString(36).slice(2, 9);

export const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3);
