// ============ CÀ PHÊ — toàn bộ logic của app (React) ============
// Cấu trúc: 1) tiện ích  2) dữ liệu mẫu + localStorage  3) component nhỏ  4) các trang  5) App gốc
import React, { useState, useEffect, useRef } from 'react';

// ---------- 1) Tiện ích ----------
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return iso(d); };
const wkStart = s => addDays(s, -new Date(s + 'T00:00').getDay());
const dBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
const addMonths = (s, n) => { const d = new Date(s + 'T00:00'), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); };
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const dots = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const money = n => dots(n) + 'đ';
const uid = () => Math.random().toString(36).slice(2, 9);
const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3);
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const CATS = ['Học tập', 'Bài tập', 'Dự án', 'Cá nhân', 'Sức khỏe'];
const CC = { 'Học tập': 'var(--k-study)', 'Bài tập': 'var(--k-study)', 'Dự án': 'var(--k-proj)', 'Cá nhân': 'var(--k-pers)', 'Sức khỏe': 'var(--k-pers)' };
const PRI = ['Thấp', 'Trung bình', 'Cao'];
const ST = { todo: 'Chưa làm', doing: 'Đang làm', done: 'Hoàn thành' };
// nhóm việc mặc định: tên + trọng số ngân sách (nhóm tự tạo thêm cũng có trọng số, ngân sách được chia theo tỷ lệ)
const PAL = ['#e0a24a', '#5b8def', '#6fae7c', '#a07be0', '#e58e5d', '#d9658b', '#4fb3bf', '#c9b458', '#a99a89'];
const GRP0 = [['Ăn uống', .3], ['Đi lại', .08], ['Học tập', .15], ['Dự án', .1], ['Giải trí', .12], ['Mua sắm', .1], ['Sức khỏe', .05], ['Cá nhân', .05], ['Khác', .05]];
const defaultGroups = () => GRP0.map(([name, share], i) => ({ name, share, color: PAL[i % PAL.length] }));
const QUOTES = ['Mỗi ngày một bước nhỏ, cuối tháng thành quãng đường dài.', 'Một tách cà phê, một kế hoạch rõ ràng — thế là đủ để bắt đầu.', 'Kỷ luật hôm nay là tự do của ngày mai.', 'Code một dòng, tiết kiệm một đồng, tiến gần mục tiêu hơn một chút.', 'Đừng chờ đủ động lực — hãy bắt đầu, động lực sẽ tới.', 'Tiến bộ 1% mỗi ngày, một năm sau bạn sẽ ngạc nhiên.'];

// ---------- 2) Dữ liệu mẫu + localStorage ----------
const K = 'caphe-v2';
const seed = () => ({ profile: null, groups: defaultGroups(), tasks: [], txs: [], goals: [] }); // tài khoản mới bắt đầu trống, người dùng tự thêm
// Nhiều tài khoản (giả lập, không có máy chủ): META giữ danh sách + tài khoản đang đăng nhập, mỗi tài khoản có một khóa dữ liệu riêng
const META = 'caphe-meta', ACC = id => 'caphe-acc-' + id;
const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const upgrade = d => ({ ...d, groups: d.groups || defaultGroups() });
const legacy = () => { // dữ liệu bản cũ (v2/v1) → trở thành tài khoản đầu tiên
  const c = rd('caphe-v2'); if (c && c.profile) return c;
  const v = rd('caphe-v1');
  return v && v.profile ? { ...seed(), profile: v.profile, goals: v.goals || [], txs: (v.txs || []).map(x => ({ id: x.id, type: x.type, amount: x.amount, date: x.date, note: x.note, taskId: '', tk: x.cat || '', grp: 'Khác' })) } : null;
};
const loadMeta = () => {
  const m = rd(META); if (m) return m;
  const old = legacy();
  if (old) { const id = uid(); wr(ACC(id), upgrade(old)); return { accounts: [{ id, name: old.profile.name }], active: id, theme: old.theme || 'dark' }; }
  return { accounts: [], active: null, theme: 'dark' };
};
const loadDb = id => upgrade(rd(ACC(id)) || seed());

// ---------- 3) Component nhỏ ----------
const LogoIcon = ({ s = 30 }) => (<svg viewBox="0 0 48 48" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
  <path d="M10 20h24v10a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z" fill="currentColor" fillOpacity=".2" /><path d="M34 22h3a5 5 0 0 1 0 10h-4" />
  <path className="steam" d="M16 8c-2 2 2 4 0 7M23 6c-2 2 2 4 0 8M30 8c-2 2 2 4 0 7" /><path d="M8 44h28" /></svg>);
// Thu/chi gắn với việc đã hoàn thành: thu cộng, chi trừ vào mục tiêu tiền có bật "tự cập nhật" (giá trị suy ra, không lưu trùng)
const contribOf = db => db.txs.reduce((a, x) => { const t = db.tasks.find(k => k.id === x.taskId); return t && t.status === 'done' ? a + (x.type === 'income' ? x.amount : -x.amount) : a; }, 0);
const goalNow = (db, g) => g.auto ? Math.max(0, g.current + contribOf(db)) : g.current;
const CHIPS = { expense: [['Cà phê', 'Ăn uống'], ['Ăn trưa', 'Ăn uống'], ['Xăng', 'Đi lại'], ['Gửi xe', 'Đi lại'], ['Mua sách', 'Học tập'], ['Xem phim', 'Giải trí']], income: [['Làm thêm', 'Khác'], ['Freelance', 'Dự án'], ['Học bổng', 'Học tập'], ['Gia đình', 'Khác']] };
// Giao dịch gắn với việc (taskId); nếu việc đã bị xóa thì dùng bản ghi nhớ tk/grp
const tInfo = (tasks, x) => { const t = tasks.find(t => t.id === x.taskId); return t ? { title: t.title, grp: t.cat } : { title: x.tk || 'Không gắn việc', grp: x.grp || 'Khác' }; };
const Ring = ({ pct, size = 120 }) => {
  const r = 52, C = 2 * Math.PI * r, p = Math.min(pct, 100);
  return (<svg viewBox="0 0 120 120" width={size} height={size}>
    <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
    <circle cx="60" cy="60" r={r} fill="none" stroke={pct > 100 ? 'var(--warn)' : 'var(--acc)'} strokeWidth="11" strokeLinecap="round"
      strokeDasharray={`${C * p / 100} ${C}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .8s ease' }} />
    <text x="60" y="66" textAnchor="middle" fill="var(--tx)" fontSize="22" fontWeight="700">{Math.round(pct)}%</text>
  </svg>);
};
const Donut = ({ data }) => {
  const tot = data.reduce((a, d) => a + d.v, 0), r = 54, C = 2 * Math.PI * r; let off = 0;
  return (<svg viewBox="0 0 140 140" width="160" height="160">
    <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
    {tot > 0 && data.filter(d => d.v > 0).map(d => { const len = d.v / tot * C, el = <circle key={d.k} cx="70" cy="70" r={r} fill="none" stroke={d.c} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)" style={{ transition: 'all .6s' }} />; off += len; return el; })}
  </svg>);
};
const Bar = ({ pct, color }) => <div className="bar"><i style={{ width: Math.min(pct, 100) + '%', background: color || (pct > 100 ? 'var(--warn)' : 'var(--acc)') }} /></div>;
const Stat = ({ l, v, c, onClick }) => <div className={'card stat' + (onClick ? ' clk' : '')} onClick={onClick}><small>{l}{onClick ? ' ›' : ''}</small><b style={{ color: c }}>{v}</b></div>;
const Field = ({ l, children }) => <label className="f"><span>{l}</span>{children}</label>;
const MoneyInput = ({ value, onChange, ...r }) => <input {...r} inputMode="numeric" value={value === '' || value == null ? '' : dots(value)} onChange={e => { const d = e.target.value.replace(/\D/g, ''); onChange(d === '' ? '' : +d); }} />;
const TimeInput = ({ value, onChange }) => { // giờ 24h, không AM/PM
  const [h, m] = value.split(':'), mins = [...Array(12)].map((_, i) => pad(i * 5)); if (!mins.includes(m)) { mins.push(m); mins.sort(); }
  return <div className="row gap"><select value={h} onChange={e => onChange(e.target.value + ':' + m)}>{[...Array(24)].map((_, i) => <option key={i}>{pad(i)}</option>)}</select><b>:</b><select value={m} onChange={e => onChange(h + ':' + e.target.value)}>{mins.map(x => <option key={x}>{x}</option>)}</select></div>;
};
const Modal = ({ title, onClose, children }) => (
  <div className="ov" onClick={onClose}><div className="sheet" onClick={e => e.stopPropagation()}>
    <div className="row between"><h3>{title}</h3><button className="ib" onClick={onClose}>✕</button></div>{children}</div></div>);

const TaskRow = ({ t, onToggle, onEdit, onDel }) => (
  <div className={'task ' + (t.status === 'done' ? 'done' : '')} style={{ '--c': CC[t.cat] }}>
    <button className={'chk ' + (t.status === 'done' ? 'on' : '')} onClick={() => onToggle(t)}>{t.status === 'done' ? '✓' : ''}</button>
    <div className="grow"><b>{t.title}</b><small>{t.start}–{t.end}{t.note ? ' · ' + t.note : ''}</small></div>
    <span className="tag cat" style={{ '--c': CC[t.cat] }}>{t.cat}</span>
    {t.pri === 'Cao' && <span className="tag hi">Cao</span>}
    <button className="ib" onClick={() => onEdit(t)}>✎</button><button className="ib" onClick={() => onDel(t.id)}>🗑</button>
  </div>);

// ---------- Form thêm/sửa ----------
function TaskForm({ item, onSave, onClose, onDel }) {
  const [f, setF] = useState(item), [more, setMore] = useState(!!item.id); const set = (k, v) => setF({ ...f, [k]: v });
  const bad = !f.title.trim() || f.end <= f.start;
  return (<Modal title={item.id ? 'Sửa công việc' : 'Thêm công việc'} onClose={onClose}>
    <Field l="Tên việc"><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="VD: Học React" autoFocus /></Field>
    <div className="grid2"><Field l="Bắt đầu (24h)"><TimeInput value={f.start} onChange={v => set('start', v)} /></Field><Field l="Kết thúc (24h)"><TimeInput value={f.end} onChange={v => set('end', v)} /></Field></div>
    {!more && <p className="mut s">📅 {f.date.split('-').reverse().join('/')} · {f.cat}</p>}
    <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? 'Ẩn chi tiết ▴' : 'Thêm chi tiết ▾'}</button>
    {more && <><div className="grid2"><Field l="Ngày"><input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
      <Field l="Nhóm"><select value={f.cat} onChange={e => set('cat', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="Ưu tiên"><select value={f.pri} onChange={e => set('pri', e.target.value)}>{PRI.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="Trạng thái"><select value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field></div>
      <Field l="Ghi chú"><textarea rows="2" value={f.note} onChange={e => set('note', e.target.value)} /></Field></>}
    {f.end <= f.start && <p className="err">Giờ kết thúc phải sau giờ bắt đầu</p>}
    <button className="btn" disabled={bad} onClick={() => onSave({ ...f, id: f.id || uid(), title: f.title.trim() })}>Lưu</button>
    {item.id && <button className="btn out dng" onClick={() => onDel(item.id)}>🗑 Xóa việc này</button>}</Modal>);
}
function TxForm({ item, onSave, onClose }) {
  const [f, setF] = useState(item), [nw, setNw] = useState(''), isNew = f.grp === '__new', set = (k, v) => setF({ ...f, [k]: v });
  const opts = item.allTasks.filter(t => t.date === f.date).sort((a, b) => a.start.localeCompare(b.start));
  const pick = id => { const k = item.allTasks.find(x => x.id === id), g = k && (k.cat === 'Bài tập' ? 'Học tập' : k.cat); setF({ ...f, taskId: id, grp: g && item.groups.includes(g) ? g : f.grp }); };
  const gname = isNew ? (item.groups.find(x => x.toLowerCase() === nw.trim().toLowerCase()) || nw.trim()) : f.grp;
  const chip = ([n, g]) => setF({ ...f, note: n, grp: item.groups.includes(g) ? g : f.grp });
  return (<Modal title={item.id ? 'Sửa giao dịch' : 'Thêm giao dịch'} onClose={onClose}>
    <div className="seg">{['expense', 'income'].map(t => <button key={t} className={f.type === t ? 'on' : ''} onClick={() => set('type', t)}>{t === 'income' ? 'Thu nhập' : 'Chi tiêu'}</button>)}</div>
    <Field l="Số tiền (đ)"><MoneyInput value={f.amount} onChange={v => set('amount', v)} placeholder="0" autoFocus /></Field>
    <div className="chips2">{[10000, 20000, 50000, 100000].map(n => <button key={n} className="chip2" onClick={() => set('amount', (+f.amount || 0) + n)}>+{dots(n)}</button>)}</div>
    <Field l="Ghi chú"><input value={f.note} onChange={e => set('note', e.target.value)} placeholder="VD: Cà phê" /></Field>
    <div className="chips2">{CHIPS[f.type].map(c => <button key={c[0]} className="chip2" onClick={() => chip(c)}>{c[0]}</button>)}</div>
    <Field l="Nhóm"><select value={f.grp} onChange={e => set('grp', e.target.value)}>{item.groups.map(g => <option key={g}>{g}</option>)}<option value="__new">＋ Tạo nhóm mới…</option></select></Field>
    {isNew && <Field l="Tên nhóm mới"><input value={nw} onChange={e => setNw(e.target.value)} placeholder="VD: Du lịch" autoFocus /></Field>}
    {opts.length > 0 && <Field l="Việc liên quan (tuỳ chọn)"><select value={f.taskId} onChange={e => pick(e.target.value)}><option value="">Không gắn việc</option>{opts.map(t => <option key={t.id} value={t.id}>{t.start} · {t.title}</option>)}</select></Field>}
    {opts.length > 0 && <p className="mut s">Gắn với việc để mục tiêu tự cập nhật khi việc đó hoàn thành.</p>}
    {item.id ? <Field l="Ngày"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value, taskId: '' })} /></Field> : f.date !== today() && <p className="mut s">Ghi cho ngày {f.date.split('-').reverse().join('/')}</p>}
    <button className="btn" disabled={!(+f.amount > 0) || !gname} onClick={() => { const { allTasks, groups, ...r } = f, k = allTasks.find(x => x.id === f.taskId); onSave({ ...r, id: f.id || uid(), amount: +f.amount, tk: k ? k.title : '', grp: gname }); }}>Lưu</button></Modal>);
}
function TxList({ db, type, onClose, onAdd, onEdit, onDel }) {
  const list = db.txs.filter(x => x.date === today() && x.type === type), tot = list.reduce((a, x) => a + x.amount, 0), inc = type === 'income';
  return (<Modal title={inc ? 'Thu nhập hôm nay' : 'Chi tiêu hôm nay'} onClose={onClose}>
    {list.length ? list.map(x => <div key={x.id} className="row gap tx2"><div className="grow"><b>{x.note || tInfo(db.tasks, x).title}</b><small>{x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title}</small></div>
      <b style={{ color: inc ? 'var(--ok)' : 'var(--warn)' }}>{money(x.amount)}</b><button className="ib" onClick={() => onEdit(x)}>✎</button><button className="ib" onClick={() => onDel(x.id)}>🗑</button></div>) : <p className="mut">Hôm nay chưa có khoản nào.</p>}
    <div className="row between"><b>Tổng</b><b>{money(tot)}</b></div><button className="btn" onClick={onAdd}>+ {inc ? 'Thu nhập' : 'Chi tiêu'}</button></Modal>);
}
function GoalForm({ item, onSave, onClose }) {
  const [f, setF] = useState(item); const set = (k, v) => setF({ ...f, [k]: v }), isMoney = f.unit.trim() === 'đ';
  return (<Modal title={item.id ? 'Sửa mục tiêu' : 'Mục tiêu mới'} onClose={onClose}>
    <Field l="Tên mục tiêu"><input value={f.title} onChange={e => set('title', e.target.value)} autoFocus /></Field>
    <div className="grid2"><Field l="Hiện có"><MoneyInput value={f.current} onChange={v => set('current', v)} /></Field>
      <Field l="Mục tiêu"><MoneyInput value={f.target} onChange={v => set('target', v)} /></Field></div>
    <Field l="Đơn vị (đ, cuốn, buổi...)"><input value={f.unit} onChange={e => set('unit', e.target.value)} /></Field>
    {isMoney && <label className="row gap s"><input type="checkbox" style={{ width: 'auto' }} checked={!!f.auto} onChange={e => set('auto', e.target.checked)} /> Tự cộng/trừ theo thu–chi của việc đã hoàn thành</label>}
    <button className="btn" disabled={!f.title.trim() || !(+f.target > 0)} onClick={() => { const { contrib, ...r } = f; onSave({ ...r, id: f.id || uid(), target: +f.target, auto: isMoney && !!f.auto, current: Math.max(0, (+f.current || 0) - (isMoney && f.auto ? contrib : 0)) }); }}>Lưu</button></Modal>);
}

// ---------- Onboarding ----------
function Onboarding({ onDone, onBack }) {
  const [f, setF] = useState({ name: '', budget: '', income: '' }), [more, setMore] = useState(false), [gs, setGs] = useState([{ title: '', target: '', unit: 'đ' }]);
  const set = (k, v) => setF({ ...f, [k]: v }), setG = (i, k, v) => setGs(gs.map((g, j) => j === i ? { ...g, [k]: v } : g));
  return (<div className="onb"><div className="card onbc">
    <div className="logo"><LogoIcon s={34} /> Cà Phê</div><h2>Chào mừng bạn!</h2><p className="mut">Chỉ cần một cái tên là bắt đầu được rồi.</p>
    <Field l="Tên của bạn"><input value={f.name} onChange={e => set('name', e.target.value)} autoFocus /></Field>
    <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? 'Ẩn bớt ▴' : 'Thêm ngân sách & mục tiêu (không bắt buộc) ▾'}</button>
    {more && <><Field l="Ngân sách chi tiêu dự tính / tháng (đ)"><MoneyInput value={f.budget} onChange={v => set('budget', v)} placeholder="VD: 3.000.000" /></Field>
      <Field l="Thu nhập dự tính / tháng (đ)"><MoneyInput value={f.income} onChange={v => set('income', v)} placeholder="VD: 4.000.000" /></Field>
      <div className="col gap"><span className="s mut">Mục tiêu của bạn (thêm bao nhiêu tuỳ ý)</span>
        {gs.map((g, i) => <div key={i} className="gbox"><div className="row gap"><input value={g.title} onChange={e => setG(i, 'title', e.target.value)} placeholder="VD: Mua laptop" />{gs.length > 1 && <button className="ib" onClick={() => setGs(gs.filter((_, j) => j !== i))}>✕</button>}</div>
          <div className="grid2"><MoneyInput value={g.target} onChange={v => setG(i, 'target', v)} placeholder="Cần đạt" /><input value={g.unit} onChange={e => setG(i, 'unit', e.target.value)} placeholder="Đơn vị (đ, cuốn...)" /></div></div>)}
        <button className="btn sm out" onClick={() => setGs([...gs, { title: '', target: '', unit: 'đ' }])}>+ Thêm mục tiêu</button></div></>}
    <button className="btn" disabled={!f.name.trim()} onClick={() => onDone({ ...f, goals: gs })}>Bắt đầu →</button>
    {onBack && <button className="btn out" onClick={onBack}>← Quay lại đăng nhập</button>}</div></div>);
}

// ---------- 4) Các trang ----------
// Lời chào: mỗi ký tự là một span có chỉ số --i để nhảy lần lượt khi rê chuột vào banner
function Hop({ name }) {
  let i = 0;
  const part = t => [...t].map(c => <span key={i} aria-hidden="true" style={{ '--i': i++ }}>{c}</span>);
  return <h1 className="hop" aria-label={`Chào ${name} ☕`}>{part('Chào ')}<span className="nm">{part(name)}</span>{part(' ☕')}</h1>;
}
function Today({ db, openTx, openTask, openList, openProfile, toggle, delTask }) {
  const t = today(), p = db.profile, dayBudget = p.budget / 30;
  const tasks = db.tasks.filter(x => x.date === t).sort((a, b) => a.start.localeCompare(b.start));
  const tx = db.txs.filter(x => x.date === t), exp = tx.filter(x => x.type === 'expense').reduce((a, x) => a + x.amount, 0), inc = tx.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const done = tasks.filter(x => x.status === 'done').length;
  const dn = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  return (<div className="page">
    <div className="banner" onClick={openProfile}><div className="bn-alt" aria-hidden="true" /><small>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
      <Hop name={p.name} /><p>“{QUOTES[dn % QUOTES.length]}”</p><span className="chip">👤 Tài khoản <i>›</i></span></div>
    <div className="cols">
      {p.budget ? <div className="card row gap"><Ring pct={exp / dayBudget * 100} />
        <div><small className="mut">Ngân sách hôm nay</small><h2>{money(exp)} <span className="mut">/ {money(dayBudget)}</span></h2>
          <p className="mut s">{exp <= dayBudget ? `Còn ${money(dayBudget - exp)} có thể chi` : `Vượt ${money(exp - dayBudget)}`}</p></div></div>
        : <div className="card"><small className="mut">Chi hôm nay</small><h2>{money(exp)}</h2><p className="mut s">Bạn chưa đặt ngân sách tháng.</p><button className="btn sm out" onClick={openProfile}>Đặt ngân sách</button></div>}
      <div className="card col gap"><button className="btn out" onClick={() => openTx('expense')}>+ Chi tiêu</button><button className="btn" onClick={() => openTx('income')}>+ Thu nhập</button></div></div>
    <div className="three"><Stat l="Việc đã xong" v={`${done}/${tasks.length}`} /><Stat l="Thu hôm nay" v={money(inc)} c="var(--ok)" onClick={() => openList('income')} /><Stat l="Chi hôm nay" v={money(exp)} c="var(--warn)" onClick={() => openList('expense')} /></div>
    <div className="row between"><h3>Việc cần làm hôm nay</h3><button className="btn sm" onClick={() => openTask({ date: t })}>+ Thêm</button></div>
    <div className="col gap">{tasks.length ? tasks.map(x => <TaskRow key={x.id} t={x} onToggle={toggle} onEdit={openTask} onDel={delTask} />) : <div className="card empty"><span className="big">📝</span><p>Hôm nay chưa có việc nào.</p><button className="btn sm" onClick={() => openTask({ date: t })}>+ Thêm việc đầu tiên</button></div>}</div></div>);
}

function Calendar({ db, openTask, toggle, delTask, clip, setClip, pasteClip }) {
  const [sel, setSel] = useState(today()), [col, setCol] = useState(0), [dir, setDir] = useState('n'), [ys, setYs] = useState(false), [drag, setDrag] = useState(null), [noTr, setNoTr] = useState(false);
  const [q, setQ] = useState(''), [msg, setMsg] = useState(''), sw = useRef(null), clipRef = useRef(null), wheelLock = useRef(false);
  const CH = 48, ws = wkStart(sel), days = [...Array(7)].map((_, i) => addDays(ws, i)), HH = 48, H0 = 7;
  const isMob = () => !!window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const dayTasks = d => db.tasks.filter(x => x.date === d).sort((a, b) => a.start.localeCompare(b.start));
  const say = t => { setMsg(t); setTimeout(() => setMsg(''), 3000); };
  const W = () => (clipRef.current && clipRef.current.offsetWidth) || 320;
  // ----- lịch mobile: col = 0 (xem tháng) / 1 (xem tuần); kéo ngón tay thì dx/dy bám theo, thả tay thì trượt nốt hoặc trượt về -----
  const mc = d => { const st = wkStart(d.slice(0, 8) + '01'), n = new Date(+d.slice(0, 4), +d.slice(5, 7), 0).getDate(), r = Math.ceil((dBetween(st, d.slice(0, 8) + pad(n)) + 1) / 7); return { cells: [...Array(r * 7)].map((_, i) => addDays(st, i)), rows: r, st }; };
  const wc = d => ({ cells: [...Array(7)].map((_, i) => addDays(wkStart(d), i)), rows: 1 });
  const rows = mc(sel).rows, rng = Math.max((rows - 1) * CH, CH), selRow = Math.floor(dBetween(mc(sel).st, sel) / 7);
  const dragging = !!drag && !drag.settle, dragY = dragging && drag.axis === 'y', dx = drag && drag.axis === 'x' ? drag.dx : 0;
  const colNow = Math.min(1, Math.max(0, col - (dragY ? drag.dy : 0) / rng)); // mức thu gọn hiện tại 0..1
  const useWeek = col === 1 && !dragY && !ys; // nghỉ ở chế độ tuần: dựng 3 hàng tuần; còn lại dựng lưới tháng rồi cắt bớt
  const trs = dragging || noTr ? 'none' : 'all .26s cubic-bezier(.2,.8,.2,1)';
  const panels = [-1, 0, 1].map(i => useWeek ? { ...wc(addDays(sel, 7 * i)), m: addDays(sel, 7 * i) } : { ...mc(addMonths(sel, i)), m: addMonths(sel, i) });
  let h = CH;
  if (!useWeek) { const base = rows * CH - colNow * (rows - 1) * CH, nb = dx ? panels[dx < 0 ? 2 : 0].rows : rows; h = colNow === 0 && dx ? base + (nb - rows) * CH * Math.min(1, Math.abs(dx) / W()) : base; }
  const commit = dir => { if (drag && drag.settle) return; const wk = col === 1; setDrag({ axis: 'x', dx: -dir * W(), dy: 0, settle: true });
    setTimeout(() => { setNoTr(true); setSel(c => wk ? addDays(c, 7 * dir) : addMonths(c, dir)); setDrag(null); setTimeout(() => setNoTr(false), 60); }, 270); };
  const settleCol = (t, two) => { setYs(true); if (two) requestAnimationFrame(() => requestAnimationFrame(() => setCol(t))); else setCol(t); setTimeout(() => setYs(false), 320); };
  const jump = ns => { setDir(ns > sel ? 'n' : 'p'); setSel(ns); };
  const go = n => isMob() ? commit(n) : jump(addDays(sel, 7 * n));
  useEffect(() => { // máy tính: phím ← → đổi tuần
    const h = e => { if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector('.ov')) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });
  const down = e => { if (drag && drag.settle) return; sw.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null }; };
  const move = e => { const k = sw.current; if (!k) return; const mx = e.clientX - k.x, my = e.clientY - k.y;
    if (!k.axis) { if (Math.abs(mx) < 8 && Math.abs(my) < 8) return; k.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} }
    setDrag({ axis: k.axis, dx: k.axis === 'x' ? mx : 0, dy: k.axis === 'y' ? my : 0 }); };
  const up = e => { const k = sw.current; sw.current = null; if (!k || !k.axis) return;
    const mx = e.clientX - k.x, my = e.clientY - k.y, v = Math.abs(k.axis === 'x' ? mx : my) / Math.max(1, Date.now() - k.t);
    if (k.axis === 'x') { if (Math.abs(mx) > W() * .25 || (v > .5 && Math.abs(mx) > 30)) commit(mx < 0 ? 1 : -1); else setDrag(null); }
    else { const cn = Math.min(1, Math.max(0, col - my / rng)), t = v > .4 && Math.abs(my) > 25 ? (my < 0 ? 1 : 0) : (cn > .5 ? 1 : 0); setDrag(null); settleCol(t); } };
  const copyW = () => { const items = db.tasks.filter(x => x.date >= days[0] && x.date <= days[6]).map(x => ({ ...x, off: dBetween(ws, x.date) })); setClip({ kind: 'week', items }); say(`Đã sao chép tuần (${items.length} việc)`); };
  const copyD = () => { const items = dayTasks(sel).map(x => ({ ...x, off: 0 })); setClip({ kind: 'day', items }); say(`Đã sao chép ngày (${items.length} việc)`); };
  const paste = () => { const n = pasteClip(clip.kind === 'week' ? ws : sel); say(n ? `Đã dán ${n} việc` : 'Không có việc nào để dán (hoặc đã có sẵn)'); };
  const list = dayTasks(sel), add = () => { openTask({ date: sel, title: q.trim() }); setQ(''); };
  const cell = (d, out) => <button key={d} className={'cell ' + (d === sel ? 'sel ' : '') + (out ? 'out' : '')} onClick={() => setSel(d)}>
    <span className={'dn ' + (d === today() ? 'now' : '')}>{+d.slice(8)}</span>
    <span className="bars">{dayTasks(d).slice(0, 3).map(x => <i key={x.id} style={{ background: x.pri === 'Cao' ? 'var(--warn)' : CC[x.cat], opacity: x.status === 'done' ? .4 : 1 }} />)}</span></button>;
  return (<div className="page">
    <div className="row between wrap"><h2 className="desk">Lịch tuần</h2><h2 className="mob">Tháng {+sel.slice(5, 7)}, {sel.slice(0, 4)}</h2>
      <div className="row gap"><button className="btn sm out" onClick={() => go(-1)}>←</button><button className="btn sm out" onClick={() => jump(today())}>Hôm nay</button><button className="btn sm out" onClick={() => go(1)}>→</button>
        <button className="btn sm desk" onClick={() => openTask({ date: sel })}>+ Thêm việc</button></div></div>
    <p className="mut s desk">{days[0].split('-').reverse().join('/')} – {days[6].split('-').reverse().join('/')}</p>
    <div className="row gap wrap"><button className="btn sm out" onClick={copyW}>⧉ Sao chép tuần</button><button className="btn sm out" onClick={copyD}>⧉ Sao chép ngày</button>
      {clip && <button className="btn sm" onClick={paste}>📋 Dán {clip.kind === 'week' ? 'tuần' : 'ngày'}</button>}{msg && <span className="s" style={{ color: 'var(--ok)' }}>{msg}</span>}</div>
    {/* Desktop: lưới tuần */}
    <div className="card wk desk" onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20 && !wheelLock.current) { wheelLock.current = true; go(e.deltaX > 0 ? 1 : -1); setTimeout(() => { wheelLock.current = false; }, 500); } }}><div className={'wkanim ' + (dir === 'n' ? 'wn' : 'wp')} key={ws}><div className="wkh"><i />{days.map((d, i) => <div key={d} className={(d === today() ? 'tdy ' : '') + (d === sel ? 'selh' : '')} onClick={() => setSel(d)}>{DAYS[i]} <b>{d.slice(8)}</b></div>)}</div>
      <div className="wkb" style={{ height: 16 * HH }}><div className="hrs">{[...Array(16)].map((_, i) => <span key={i} style={{ height: HH }}>{pad(H0 + i)}:00</span>)}</div>
        {days.map(d => <div key={d} className="dcol" style={{ backgroundSize: `100% ${HH}px` }}>{dayTasks(d).map(x => {
          const top = Math.max(0, (toMin(x.start) - H0 * 60) / 60 * HH), hh = Math.max(26, (toMin(x.end) - toMin(x.start)) / 60 * HH);
          return <div key={x.id} className={'blk ' + (x.pri === 'Cao' ? 'hp ' : '') + (x.status === 'done' ? 'done' : '')} style={{ top, height: hh, '--c': CC[x.cat] }} onClick={() => openTask(x)}><b>{x.title}</b><small>{x.start}–{x.end}</small><small>{x.note}</small></div>;
        })}</div>)}</div></div></div>
    {/* Mobile: lịch tháng/tuần kéo theo ngón tay + danh sách theo ngày */}
    <div className="card calcard mob" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { sw.current = null; setDrag(null); }}>
      <div className="cgrid h">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="clip" ref={clipRef} style={{ height: h, transition: trs }}>
        <div className="track" style={{ transform: `translateX(calc(-33.3333% + ${dx}px))`, transition: trs }}>
          {panels.map((p, i) => <div key={(useWeek ? 'w' : 'm') + i} className="pan" style={{ transform: i === 1 && !useWeek ? `translateY(${-colNow * selRow * CH}px)` : 'none', transition: trs }}>
            <div className="cgrid">{p.cells.map(d => cell(d, !useWeek && d.slice(0, 7) !== p.m.slice(0, 7)))}</div></div>)}</div></div>
      <button className="grab" onClick={() => settleCol(col === 1 ? 0 : 1, col === 1)} aria-label="Thu gọn hoặc mở rộng lịch" /></div>
    <div className="mob"><div className="row between"><b>{WD[new Date(sel + 'T00:00').getDay()]}, {sel.slice(8)}/{sel.slice(5, 7)}</b><span className="mut s">{list.length} việc</span></div>
      <div className="col gap dayl" key={sel} style={{ marginTop: 10 }}>{list.length ? list.map(x => <TaskRow key={x.id} t={x} onToggle={toggle} onEdit={openTask} onDel={delTask} />) : <div className="card empty"><p>Chưa có việc nào trong ngày này.</p><button className="btn sm" onClick={() => openTask({ date: sel })}>+ Thêm việc</button></div>}</div>
      <div className="qa"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={`Thêm việc vào ${sel.slice(8)}/${sel.slice(5, 7)}`} /><button onClick={add} aria-label="Thêm việc">+</button></div></div>
    <div className="row gap wrap s mut"><span><i className="dot" style={{ background: CC['Học tập'] }} /> Học tập/Bài tập</span><span><i className="dot" style={{ background: CC['Dự án'] }} /> Dự án</span><span><i className="dot" style={{ background: CC['Cá nhân'] }} /> Cá nhân/Sức khỏe</span><span><i className="dot" style={{ background: 'var(--warn)' }} /> Ưu tiên cao</span></div></div>);
}

function Finance({ db, openTx, delTx, openGroups }) {
  const [rg, setRg] = useState('month'), [all, setAll] = useState(false), [fm, setFm] = useState('day'), [fv, setFv] = useState(today()), p = db.profile, t = today(), scale = rg === 'week' ? 7 / 30 : 1, ws = wkStart(t);
  const inR = d => rg === 'week' ? d >= ws && d <= addDays(ws, 6) : d.slice(0, 7) === t.slice(0, 7);
  const txs = db.txs.filter(x => inR(x.date)).sort((a, b) => b.date.localeCompare(a.date));
  const sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0), inc = sum('income'), exp = sum('expense'), bud = p.budget * scale, usedPct = bud ? exp / bud * 100 : 0;
  const tw = db.groups.reduce((a, g) => a + g.share, 0), G = Object.fromEntries(db.groups.map(g => [g.name, [g.color, g.share / tw]]));
  const by = Object.fromEntries(Object.keys(G).map(k => [k, txs.filter(x => x.type === 'expense' && (G[x.grp] ? x.grp : 'Khác') === k).reduce((a, x) => a + x.amount, 0)]));
  const shown = (all ? db.txs.filter(x => fv && x.date.startsWith(fv)) : db.txs.filter(x => x.date === t)).sort((a, b) => b.date.localeCompare(a.date));
  const sumOf = ty => shown.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0), dd = all && fm === 'day' && fv ? { date: fv } : undefined;
  const row = x => <div key={x.id} className="card tx"><span className="tic">{x.type === 'income' ? '↗' : '↘'}</span><div className="grow"><b>{x.note || tInfo(db.tasks, x).title}</b><small>{x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title} · {x.date.split('-').reverse().join('/')}</small></div>
    <b style={{ color: x.type === 'income' ? 'var(--ok)' : 'var(--warn)' }}>{x.type === 'income' ? '+' : '−'}{money(x.amount)}</b><button className="ib" onClick={() => openTx(x.type, x)}>✎</button><button className="ib" onClick={() => delTx(x.id)}>🗑</button></div>;
  return (<div className="page">
    <div className="row between wrap"><h2>Tài chính</h2><div className="row gap"><div className="seg">{[['week', 'Tuần này'], ['month', 'Tháng này']].map(([k, l]) => <button key={k} className={rg === k ? 'on' : ''} onClick={() => setRg(k)}>{l}</button>)}</div></div></div>
    <div className="four"><Stat l="Thu nhập" v={money(inc)} c="var(--ok)" /><Stat l="Chi tiêu" v={money(exp)} c="var(--warn)" /><Stat l="Số dư" v={money(inc - exp)} c={inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)'} /><Stat l="Ngân sách đã dùng" v={bud ? Math.round(usedPct) + '%' : '—'} /></div>
    <div className="cols">
      <div className="card"><div className="row between"><h3>Chi tiêu theo nhóm việc</h3><button className="btn sm out" onClick={openGroups}>✎ Sửa nhóm</button></div><div className="row gap wrap" style={{ justifyContent: 'center' }}>
        <Donut data={Object.keys(G).map(k => ({ k, v: by[k], c: G[k][0] }))} />
        <div className="col" style={{ gap: 6 }}>{Object.keys(G).map(k => <span key={k} className="s"><i className="dot" style={{ background: G[k][0] }} /> {k}: {money(by[k])}</span>)}</div></div></div>
      <div className="card"><h3>Thực chi vs ngân sách (nhóm việc)</h3><div className="col gap">{Object.keys(G).map(k => { const b = p.budget * G[k][1] * scale; return <div key={k}><div className="row between s"><span>{k}</span><span className="mut">{money(by[k])}{b ? ' / ' + money(b) : ''}</span></div><Bar pct={b ? by[k] / b * 100 : 0} color={G[k][0]} /></div>; })}</div></div></div>
    <h3>Tổng kết</h3>
    <div className="cols2"><Summary db={db} rg="week" /><Summary db={db} rg="month" /></div>
    <div className="row between wrap"><h3>{all ? 'Tất cả giao dịch' : 'Giao dịch hôm nay'}</h3><div className="row gap"><button className="btn sm out" onClick={() => openTx('expense', dd)}>+ Chi</button><button className="btn sm" onClick={() => openTx('income', dd)}>+ Thu</button></div></div>
    <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setAll(!all)}>{all ? '← Chỉ xem hôm nay' : 'Tất cả giao dịch'}</button>
    {all && <div className="card col gap"><div className="seg">{[['day', 'Ngày'], ['month', 'Tháng'], ['year', 'Năm']].map(([k, l]) => <button key={k} className={fm === k ? 'on' : ''} onClick={() => { setFm(k); setFv(k === 'day' ? t : k === 'month' ? t.slice(0, 7) : t.slice(0, 4)); }}>{l}</button>)}</div>
      {fm === 'day' && <input type="date" value={fv} onChange={e => setFv(e.target.value)} />}{fm === 'month' && <input type="month" value={fv} onChange={e => setFv(e.target.value)} />}{fm === 'year' && <input type="number" min="2000" max="2100" value={fv} onChange={e => setFv(e.target.value)} />}
      <div className="row between s"><span>Thu: <b style={{ color: 'var(--ok)' }}>{money(sumOf('income'))}</b></span><span>Chi: <b style={{ color: 'var(--warn)' }}>{money(sumOf('expense'))}</b></span></div></div>}
    <div className="col gap">{shown.length ? shown.map(row) : <div className="card empty"><p>{all ? 'Không có giao dịch trong khoảng này.' : 'Hôm nay chưa có giao dịch.'}</p><div className="row gap"><button className="btn sm out" onClick={() => openTx('expense', dd)}>+ Chi tiêu</button><button className="btn sm" onClick={() => openTx('income', dd)}>+ Thu nhập</button></div></div>}</div></div>);
}

function Goals({ db, openGoal, delGoal, bump }) {
  const fmt = (g, v) => g.unit === 'đ' ? money(v) : `${v}`, contrib = contribOf(db);
  return (<div className="page"><div className="row between"><h2>Mục tiêu</h2><button className="btn sm" onClick={() => openGoal({})}>+ Mục tiêu mới</button></div>
    <div className="cols3">{db.goals.map(g => { const now = goalNow(db, g), pc = now / g.target * 100; return <div key={g.id} className="card goal">
      <div className="row between"><b>🎯 {g.title}</b><span><button className="ib" onClick={() => openGoal(g)}>✎</button><button className="ib" onClick={() => delGoal(g.id)}>🗑</button></span></div>
      <h2>{fmt(g, now)} <span className="mut s">/ {fmt(g, g.target)}{g.unit !== 'đ' ? ' ' + g.unit : ''}</span></h2><Bar pct={pc} color={pc >= 100 ? 'var(--ok)' : undefined} />
      {g.auto && <small>Tự cập nhật từ thu–chi của việc đã hoàn thành ({contrib >= 0 ? '+' : '−'}{money(Math.abs(contrib))})</small>}
      <div className="row between s"><span className="mut">{Math.round(pc)}% hoàn thành</span><button className="btn sm out" onClick={() => bump(g)}>+ {g.unit === 'đ' ? '500.000đ' : '1 ' + g.unit}</button></div></div>; })}</div>
    {!db.goals.length && <div className="card empty"><span className="big">🎯</span><p>Chưa có mục tiêu nào.</p><button className="btn sm" onClick={() => openGoal({})}>+ Đặt mục tiêu đầu tiên</button></div>}</div>);
}

// Tổng kết tuần này / tháng này (độc lập với bộ lọc phía trên)
function Summary({ db, rg }) {
  const p = db.profile, t = today(), wk = rg === 'week', scale = wk ? 7 / 30 : 1, ws = wkStart(t), per = wk ? 'tuần này' : 'tháng này';
  const inR = d => wk ? d >= ws && d <= addDays(ws, 6) : d.slice(0, 7) === t.slice(0, 7);
  const txs = db.txs.filter(x => inR(x.date)), sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0), inc = sum('income'), exp = sum('expense');
  const tw = db.groups.reduce((a, g) => a + g.share, 0), by = {};
  txs.filter(x => x.type === 'expense').forEach(x => { const k = db.groups.some(g => g.name === x.grp) ? x.grp : 'Khác'; by[k] = (by[k] || 0) + x.amount; });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0], tk = db.tasks.filter(x => inR(x.date)), done = tk.filter(x => x.status === 'done').length, rate = tk.length ? Math.round(done / tk.length * 100) : 0;
  const bud = p.budget * scale, plan = p.income * scale, notes = [];
  db.groups.forEach(g => { const b = p.budget * g.share / tw * scale, pc = b ? Math.round((by[g.name] || 0) / b * 100) : 0; if (pc >= 80) notes.push(`${pc > 100 ? '⚠️' : '☕'} Đã dùng ${pc}% ngân sách ${g.name}.`); });
  if (plan && inc) notes.push(`💰 Thu nhập ${per} ${inc >= plan ? 'cao' : 'thấp'} hơn dự tính ${Math.abs(Math.round((inc - plan) / plan * 100))}%.`);
  if (tk.length) notes.push(`✅ Hoàn thành ${rate}% việc đã lên lịch (${done}/${tk.length}).`);
  if (inc - exp < 0) notes.push('🚨 Chi tiêu đang vượt thu nhập.');
  if (!notes.length) notes.push('Chưa đủ dữ liệu để nhận xét.');
  return (<div className="card sum"><h3>📋 Tổng kết {per}</h3>
    <div className="sum3"><div><small>Thu nhập</small><b style={{ color: 'var(--ok)' }}>{money(inc)}</b></div><div><small>Chi tiêu</small><b style={{ color: 'var(--warn)' }}>{money(exp)}</b></div><div><small>Số dư</small><b style={{ color: inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)' }}>{money(inc - exp)}</b></div></div>
    <div className="sumrow"><span className="mut">Nhóm chi nhiều nhất</span><b>{top ? `${top[0]} (${money(top[1])})` : '—'}</b></div>
    <div className="sumrow"><span className="mut">Hoàn thành việc</span><b>{tk.length ? rate + '%' : '—'}</b></div>
    {(bud > 0 || plan > 0) && <div className="sumrow"><span className="mut">Dự tính chi / thu</span><b>{money(bud)} / {money(plan)}</b></div>}
    <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>);
}

// ---------- Đăng nhập lại / tài khoản ----------
function Login({ accounts, onPick, onNew }) {
  return (<div className="onb"><div className="card onbc"><div className="logo"><LogoIcon s={34} /> Cà Phê</div><h2>Đăng nhập lại</h2><p className="mut">Chọn tài khoản để tiếp tục, hoặc tạo tài khoản/tên mới.</p>
    {accounts.map(a => <button key={a.id} className="acc" onClick={() => onPick(a.id)}><span className="ava">{(a.name[0] || '?').toUpperCase()}</span><b>{a.name}</b><span className="mut">Vào →</span></button>)}
    <button className="btn out" onClick={onNew}>+ Tạo tài khoản / tên mới</button></div></div>);
}
function ProfileModal({ p, counts, theme, toggleTheme, onClose, onSave, onLogout, onDelete, onReset }) {
  const [v, setV] = useState('menu'), [f, setF] = useState(p), [sure, setSure] = useState(false), [sure2, setSure2] = useState(false), set = (k, x) => setF({ ...f, [k]: x });
  return (<Modal title={v === 'menu' ? 'Tài khoản' : 'Thông tin cá nhân'} onClose={onClose}>
    <div className="row gap"><span className="ava">{(p.name[0] || '?').toUpperCase()}</span><div><b>{p.name}</b><small>{counts}</small></div></div>
    {v === 'menu' ? <><button className="btn out" onClick={() => setV('info')}>👤 Thông tin cá nhân</button><button className="btn out" onClick={toggleTheme}>{theme === 'dark' ? '☀️ Chuyển sang giao diện sáng' : '🌙 Chuyển sang giao diện tối'}</button><button className="btn" onClick={onLogout}>🚪 Đăng xuất</button></> :
      <><Field l="Tên"><input value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field l="Ngân sách chi tiêu / tháng (đ)"><MoneyInput value={f.budget} onChange={x => set('budget', x)} /></Field>
        <Field l="Thu nhập dự tính / tháng (đ)"><MoneyInput value={f.income} onChange={x => set('income', x)} /></Field>
        <button className="btn" disabled={!f.name.trim()} onClick={() => onSave({ name: f.name.trim(), budget: +f.budget || 0, income: +f.income || 0 })}>Lưu</button>
        <button className="btn out" onClick={() => setV('menu')}>← Quay lại</button>
        <button className="btn out dng" onClick={() => sure2 ? onReset() : setSure2(true)}>{sure2 ? 'Bấm lần nữa để xóa hết việc, giao dịch, mục tiêu' : '🧹 Xóa toàn bộ việc, giao dịch, mục tiêu'}</button>
        <button className="btn out dng" onClick={() => sure ? onDelete() : setSure(true)}>{sure ? 'Bấm lần nữa để xóa vĩnh viễn' : '🗑 Xóa tài khoản này'}</button></>}</Modal>);
}

function GroupsModal({ groups, onClose, onAdd, onRemove }) {
  const [n, setN] = useState('');
  const add = () => { const v = n.trim(); if (v && !groups.some(g => g.name.toLowerCase() === v.toLowerCase())) onAdd(v); setN(''); };
  return (<Modal title="Nhóm chi tiêu" onClose={onClose}>
    <div className="col" style={{ gap: 6 }}>{groups.map(g => <div key={g.name} className="row gap tx2"><i className="dot" style={{ background: g.color }} /><span className="grow">{g.name}</span>{g.name !== 'Khác' ? <button className="ib" onClick={() => onRemove(g.name)}>🗑</button> : <small>mặc định</small>}</div>)}</div>
    <div className="row gap"><input value={n} onChange={e => setN(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Tên nhóm mới, VD: Du lịch" /><button className="btn sm" onClick={add}>+ Thêm</button></div>
    <p className="mut s">Xóa nhóm thì các giao dịch của nhóm đó được tính vào "Khác".</p></Modal>);
}

// ---------- 5) App gốc ----------
const NAV = [['today', '☀️', 'Hôm nay'], ['cal', '📅', 'Lịch'], ['fin', '💰', 'Tài chính'], ['goal', '🎯', 'Mục tiêu']];
function App({ id, theme, toggleTheme, onLogout, onRename, onDelete }) {
  const [db, setDb] = useState(() => loadDb(id)), [page, setPage] = useState('today'), [modal, setModal] = useState(null), [clip, setClip] = useState(null), [toast, setToast] = useState(null), tt = useRef(null);
  useEffect(() => wr(ACC(id), db), [db]);
  const upsert = (k, it) => { setDb(d => ({ ...d, [k]: d[k].some(x => x.id === it.id) ? d[k].map(x => x.id === it.id ? it : x) : [...d[k], it] })); setModal(null); };
  const flash = (msg, undo) => { clearTimeout(tt.current); setToast({ msg, undo }); tt.current = setTimeout(() => setToast(null), 5000); };
  const del = (k, id) => { const idx = db[k].findIndex(x => x.id === id); if (idx < 0) return; const item = db[k][idx]; setDb(d => ({ ...d, [k]: d[k].filter(x => x.id !== id) }));
    flash('Đã xóa', () => { setDb(d => { const a = [...d[k]]; a.splice(Math.min(idx, a.length), 0, item); return { ...d, [k]: a }; }); setToast(null); }); };
    const openTask = it => setModal({ k: 'task', it: it.id ? it : { title: '', date: today(), start: '09:00', end: '10:00', cat: 'Học tập', pri: 'Trung bình', note: '', status: 'todo', ...it } });
  const openTx = (type, it) => { const gl = db.groups.map(g => g.name); setModal({ k: 'tx', it: { type, amount: '', date: today(), note: '', taskId: '', ...it, grp: gl.includes(it?.grp) ? it.grp : 'Khác', allTasks: db.tasks, groups: gl } }); };
  const openGoal = it => setModal({ k: 'goal', it: it.id ? { ...it, current: goalNow(db, it), contrib: contribOf(db) } : { title: '', current: 0, target: '', unit: 'đ', auto: !db.goals.some(g => g.auto), contrib: contribOf(db) } });
  const openList = type => setModal({ k: 'list', type });
  const openProfile = () => setModal({ k: 'profile' });
  const openGroups = () => setModal({ k: 'groups' });
  const saveTx = t => { setDb(d => ({ ...d, groups: d.groups.some(g => g.name === t.grp) ? d.groups : [...d.groups, { name: t.grp, share: .1, color: PAL[d.groups.length % PAL.length] }] })); upsert('txs', t); };
  const pasteClip = target => { // dán việc đã sao chép: tuần → vào tuần bắt đầu `target`; ngày → vào ngày `target`. Bỏ qua việc trùng, trạng thái về "Chưa làm"
    if (!clip) return 0;
    const add = clip.items.map(({ off, ...r }) => ({ ...r, id: uid(), date: clip.kind === 'week' ? addDays(target, off) : target, status: 'todo' }))
      .filter(n => !db.tasks.some(x => x.date === n.date && x.start === n.start && x.end === n.end && x.title === n.title));
    if (add.length) setDb(d => ({ ...d, tasks: [...d.tasks, ...add] })); return add.length;
  };
  const toggle = t => { const done = t.status !== 'done', gl = db.goals.find(g => g.auto), net = db.txs.filter(x => x.taskId === t.id).reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0);
    upsert('tasks', { ...t, status: done ? 'done' : 'todo' }); if (gl && net) flash(`${gl.title}: ${(done ? net : -net) > 0 ? '+' : '−'}${money(Math.abs(net))}`); };
  const saveGoal = g => { setDb(d => { const list = d.goals.some(x => x.id === g.id) ? d.goals.map(x => x.id === g.id ? g : x) : [...d.goals, g]; return { ...d, goals: g.auto ? list.map(x => x.id !== g.id ? { ...x, auto: false } : x) : list }; }); setModal(null); };
  const bump = g => upsert('goals', { ...g, current: g.current + (g.unit === 'đ' ? 500000 : 1) });
  const P = { db, openTx, openTask, openGoal, openList, openProfile, openGroups, clip, setClip, pasteClip, toggle, delTask: id => del('tasks', id), delTx: id => del('txs', id), delGoal: id => del('goals', id), bump };
  return (<div className="app">
    <aside className="side"><div className="logo"><LogoIcon s={34} /> Cà Phê</div><small className="mut">Quản lý cuộc sống sinh viên</small>
      <nav>{NAV.map(([k, i, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><span>{i}</span>{l}</button>)}</nav></aside>
    <main><div className="top"><div className="logo mobl"><LogoIcon s={26} /> Cà Phê</div></div>
      <div key={page}>{page === 'today' && <Today {...P} />}{page === 'cal' && <Calendar {...P} />}{page === 'fin' && <Finance {...P} />}{page === 'goal' && <Goals {...P} />}</div></main>
    <nav className="bot">{NAV.map(([k, i, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><span>{i}</span>{l}</button>)}</nav>
    {toast && <div className="toast"><span>{toast.msg}</span>{toast.undo && <button onClick={toast.undo}>Hoàn tác</button>}</div>}
    {modal?.k === 'task' && <TaskForm item={modal.it} onSave={t => upsert('tasks', t)} onClose={() => setModal(null)} onDel={id => { del('tasks', id); setModal(null); }} />}
    {modal?.k === 'tx' && <TxForm item={modal.it} onSave={saveTx} onClose={() => setModal(null)} />}
    {modal?.k === 'goal' && <GoalForm item={modal.it} onSave={saveGoal} onClose={() => setModal(null)} />}
    {modal?.k === 'profile' && <ProfileModal p={db.profile} counts={`${db.tasks.length} việc · ${db.txs.length} giao dịch · ${db.goals.length} mục tiêu`} onClose={() => setModal(null)} onSave={p => { setDb(d => ({ ...d, profile: p })); onRename(p.name); setModal(null); }} theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} onDelete={onDelete} onReset={() => { setDb(d => ({ ...d, tasks: [], txs: [], goals: [] })); setModal(null); }} />}
    {modal?.k === 'groups' && <GroupsModal groups={db.groups} onClose={() => setModal(null)} onAdd={name => setDb(d => ({ ...d, groups: [...d.groups, { name, share: .1, color: PAL[d.groups.length % PAL.length] }] }))} onRemove={name => setDb(d => ({ ...d, groups: d.groups.filter(g => g.name !== name) }))} />}
    {modal?.k === 'list' && <TxList db={db} type={modal.type} onClose={() => setModal(null)} onAdd={() => openTx(modal.type)} onEdit={x => openTx(x.type, x)} onDel={id => del('txs', id)} />}
  </div>);
}
// Gốc: quản lý tài khoản (đăng nhập lại / tạo mới) và giao diện sáng-tối
export default function Root() {
  const [m, setM] = useState(loadMeta), [creating, setCreating] = useState(false);
  useEffect(() => { wr(META, m); document.documentElement.dataset.theme = m.theme; }, [m]);
  const create = f => {
    const id = uid(), b = seed(), gl = f.goals.filter(g => g.title.trim() && +g.target > 0).map(g => ({ id: uid(), title: g.title.trim(), current: 0, target: +g.target, unit: g.unit.trim() || 'đ' }));
    const ai = gl.findIndex(g => g.unit === 'đ'); if (ai >= 0) gl[ai].auto = true;
    const d = { ...b, goals: gl };
    wr(ACC(id), { ...d, profile: { name: f.name.trim(), budget: +f.budget || 0, income: +f.income || 0 } });
    setM({ ...m, accounts: [...m.accounts, { id, name: f.name.trim() }], active: id }); setCreating(false);
  };
  if (m.active) return <App key={m.active} id={m.active} theme={m.theme} toggleTheme={() => setM(x => ({ ...x, theme: x.theme === 'dark' ? 'light' : 'dark' }))}
    onLogout={() => setM({ ...m, active: null })} onRename={name => setM(x => ({ ...x, accounts: x.accounts.map(a => a.id === x.active ? { ...a, name } : a) }))}
    onDelete={() => { try { localStorage.removeItem(ACC(m.active)); } catch (e) {} setM({ ...m, active: null, accounts: m.accounts.filter(a => a.id !== m.active) }); }} />;
  if (!m.accounts.length || creating) return <Onboarding onDone={create} onBack={m.accounts.length ? () => setCreating(false) : null} />;
  return <Login accounts={m.accounts} onPick={id => setM({ ...m, active: id })} onNew={() => setCreating(true)} />;
}
