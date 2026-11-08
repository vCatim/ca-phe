// ============ CÀ PHÊ — Trích xuất tệp lịch .ics ============

import { pad, iso, uid } from './format';

// Đọc nội dung file .ics → danh sách việc (xuất ra để kiểm thử). Lịch lặp chỉ mở rộng ±6 tháng quanh `now`.
// EXDATE do ical.js tự loại; buổi bị dời/sửa (RECURRENCE-ID) được gắn vào chuỗi lặp; buổi STATUS:CANCELLED bị bỏ qua.
export async function parseIcs(text, cat = 'Học tập', now = new Date()) {
  const { default: ICAL } = await import('ical.js');
  const calendar = new ICAL.Component(ICAL.parse(text));
  const rangeStart = new Date(now);
  rangeStart.setMonth(rangeStart.getMonth() - 6);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(now);
  rangeEnd.setMonth(rangeEnd.getMonth() + 6);
  rangeEnd.setHours(23, 59, 59, 999);
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const cancelled = c => String(c.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED';

  const toTask = (ev, st, en) => {
    const title = (ev.summary || 'Sự kiện từ lịch').trim();
    const note = ev.description || 'Nhập từ file lịch .ics';
    if (st.isDate) return { id: uid(), title, date: st.toString().slice(0, 10), start: '09:00', end: '10:00', cat, pri: 'Trung bình', status: 'todo', note }; // cả ngày → 09:00–10:00
    const a = st.toJSDate();
    const b = en && en.toJSDate() > a ? en.toJSDate() : new Date(a.getTime() + 36e5);
    return { id: uid(), title, date: iso(a), start: hm(a), end: iso(b) === iso(a) ? hm(b) : '23:59', cat, pri: 'Trung bình', status: 'todo', note }; // qua nửa đêm → cắt ở 23:59
  };

  const all = calendar.getAllSubcomponents('vevent');
  const exceptions = all.filter(c => c.hasProperty('recurrence-id'));
  const out = [];

  for (const c of all.filter(c => !c.hasProperty('recurrence-id'))) {
    if (cancelled(c)) continue;
    const ev = new ICAL.Event(c);
    if (!ev.startDate) continue;
    if (!ev.isRecurring()) {
      out.push(toTask(ev, ev.startDate, ev.endDate));
      continue;
    }
    exceptions.filter(x => x.getFirstPropertyValue('uid') === ev.uid).forEach(x => ev.relateException(new ICAL.Event(x)));
    const it = ev.iterator();
    let occ;
    let n = 0;
    while ((occ = it.next()) && n++ < 1000) {
      const d = ev.getOccurrenceDetails(occ);
      const at = d.startDate.toJSDate();
      if (at > rangeEnd) break;
      if (at < rangeStart || cancelled(d.item.component)) continue;
      out.push(toTask(d.item, d.startDate, d.endDate));
    }
  }
  return out;
}
