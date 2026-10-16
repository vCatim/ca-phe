// ============ CÀ PHÊ — toàn bộ logic của app (React) ============
// Cấu trúc: 1) tiện ích  2) dữ liệu mẫu + localStorage  3) component nhỏ  4) các trang  5) App gốc
import React, { useState, useEffect, useRef } from 'react';
import { authService, isSupabaseConfigured } from './supabase';
import { syncService } from './supabaseSync';
import { AuthScreen } from './AuthScreen';
import { dedupeTasks, mergeUniqueTasks, taskFingerprint } from './taskIdentity';

// ---------- 1) Tiện ích ----------
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return iso(d); };
const wkStart = s => {
  const day = new Date(s + 'T00:00').getDay();
  return addDays(s, day === 0 ? -6 : 1 - day);
};
const dBetween = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
const addMonths = (s, n) => { const d = new Date(s + 'T00:00'), day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); return iso(d); };
const WD = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const dots = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const money = n => dots(n) + 'đ';
const uid = () => Math.random().toString(36).slice(2, 9);
const toMin = t => +t.slice(0, 2) * 60 + +t.slice(3);
const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

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
const TargetIcon = ({ s = 22, color = 'var(--acc)' }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);
// Thu/chi "hiệu lực": không gắn việc (tính ngay) hoặc gắn với việc ĐÃ hoàn thành. Khoản gắn việc chưa xong thì chờ.
const isEff = (db, x) => { const t = x.taskId && db.tasks.find(k => k.id === x.taskId); return !t || t.status === 'done'; };
const PRIW = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 }, goalPri = g => PRIW[g.pri] ? g.pri : 'Trung bình';
// Mỗi khoản thu/chi hiệu lực lưu `alloc` = {mụcTiêuId: số tiền đã cộng(+)/trừ(−)}. Tiền hiện có của mục tiêu = gốc + tổng alloc (nên xóa/sửa giao dịch là tự cập nhật)
const allocSum = (db, gid) => db.txs.reduce((a, x) => a + ((x.alloc && x.alloc[gid]) || 0), 0);
const goalNow = (db, g) => Math.max(0, g.current + allocSum(db, g.id));
// Chia một khoản thu (+) / chi (−) cho các mục tiêu tiền đang bật tự động, theo ưu tiên (Cao 3 : Trung bình 2 : Thấp 1); thu chỉ chia cho mục tiêu chưa đạt
const splitAlloc = (db, amount) => {
  let gs = db.goals.filter(g => g.auto && g.unit === 'đ');
  if (!gs.length || !amount) return null;
  if (amount > 0) { const open = gs.filter(g => goalNow(db, g) < g.target); if (open.length) gs = open; }
  gs = [...gs].sort((a, b) => PRIW[goalPri(b)] - PRIW[goalPri(a)]);
  const W = gs.reduce((a, g) => a + PRIW[goalPri(g)], 0), out = {}; let used = 0;
  gs.slice(1).forEach(g => { out[g.id] = Math.round(amount * PRIW[goalPri(g)] / W); used += out[g.id]; });
  out[gs[0].id] = amount - used; // phần dư về mục tiêu ưu tiên cao nhất
  return out;
};
// Việc hoàn thành / bỏ hoàn thành → cộng/trừ các thu/chi gắn với việc đó vào mục tiêu
const retarget = (db, taskId, done) => {
  let txs = db.txs;
  db.txs.filter(x => x.taskId === taskId).forEach(x => {
    if (x.autoGoal === false) return;
    const amount = x.type === 'income' ? x.amount : -x.amount;
    const alloc = done
      ? (x.goalId ? { [x.goalId]: amount } : splitAlloc({ ...db, txs: txs.filter(y => y.id !== x.id) }, amount))
      : null;
    txs = txs.map(y => { if (y.id !== x.id) return y; const { alloc: _a, ...r } = y; return alloc ? { ...r, alloc } : { ...r, alloc: null }; });
  });
  return txs;
};
const CHIPS = { expense: [['Cà phê', 'Ăn uống'], ['Ăn trưa', 'Ăn uống'], ['Xăng', 'Đi lại'], ['Gửi xe', 'Đi lại'], ['Mua sách', 'Học tập'], ['Xem phim', 'Giải trí']], income: [['Làm thêm', 'Khác'], ['Freelance', 'Dự án'], ['Học bổng', 'Học tập'], ['Gia đình', 'Khác']] };
// Giao dịch gắn với việc (taskId); nếu việc đã bị xóa thì dùng bản ghi nhớ tk/grp
const tInfo = (tasks, x) => { const t = tasks.find(t => t.id === x.taskId); return t ? { title: t.title, grp: t.cat } : { title: x.tk || 'Không gắn việc', grp: x.grp || 'Khác' }; };
const Ring = ({ pct, size = 120 }) => {
  const [v, setV] = useState(0); // bắt đầu từ 0 rồi chạy lên → vòng tròn "đầy dần"
  useEffect(() => { const t = setTimeout(() => setV(pct), 40); return () => clearTimeout(t); }, [pct]);
  const r = 52, C = 2 * Math.PI * r, p = Math.min(v, 100);
  return (<svg viewBox="0 0 120 120" width={size} height={size}>
    <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
    <circle cx="60" cy="60" r={r} fill="none" stroke={pct > 100 ? 'var(--warn)' : 'var(--acc)'} strokeWidth="11" strokeLinecap="round"
      strokeDasharray={`${C * p / 100} ${C}`} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)' }} />
    <circle cx="60" cy="8" r="4.5" fill="var(--acc)" />
    <text x="60" y="67" textAnchor="middle" fill="var(--tx)" fontSize="23" fontWeight="700" fontFamily="'Playfair Display', Georgia, serif">{Math.round(pct)}%</text>
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
const Modal = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="ov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="row between"><h3>{title}</h3><button className="ib" onClick={onClose} aria-label="Đóng">✕</button></div>
        {children}
      </div>
    </div>
  );
};

const TaskRow = ({ t, onToggle, onEdit, onDel }) => {
  const isFuture = t.date > today();
  return (
    <div className={'task ' + (t.status === 'done' ? 'done' : '')} style={{ '--c': CC[t.cat] }}>
      <button
        className={'chk ' + (t.status === 'done' ? 'on' : '') + (isFuture ? ' dis' : '')}
        onClick={() => onToggle(t)}
        title={isFuture ? 'Chưa đến ngày nên chưa thể hoàn thành' : (t.status === 'done' ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành')}
      >
        {t.status === 'done' ? '✓' : isFuture ? '🔒' : ''}
      </button>
      <div className="grow"><b>{t.title}</b><small>{t.start}–{t.end}{t.note ? ' · ' + t.note : ''}</small></div>
      <span className="tag cat" style={{ '--c': CC[t.cat] }}>{t.cat}</span>
      {t.pri === 'Cao' && <span className="tag hi">Cao</span>}
      <button className="ib" onClick={() => onEdit(t)}>✎</button><button className="ib" onClick={() => onDel(t.id)}>🗑</button>
    </div>
  );
};

// ---------- Form thêm/sửa ----------
function TaskForm({ item, onSave, onClose, onDel }) {
  const [f, setF] = useState(item), [more, setMore] = useState(!!item.id); const set = (k, v) => setF({ ...f, [k]: v });
  const bad = !f.title.trim() || f.end <= f.start;
  const txs = item.txs || [];
  return (<Modal title={item.id ? 'Sửa công việc' : 'Thêm công việc'} onClose={onClose}>
    <Field l="Tên việc"><input value={f.title} onChange={e => set('title', e.target.value)} placeholder="VD: Học React" autoFocus /></Field>
    <div className="grid2"><Field l="Bắt đầu (24h)"><TimeInput value={f.start} onChange={v => set('start', v)} /></Field><Field l="Kết thúc (24h)"><TimeInput value={f.end} onChange={v => set('end', v)} /></Field></div>
    {!more && <p className="mut s">📅 {f.date.split('-').reverse().join('/')} · {f.cat}</p>}
    <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? 'Ẩn chi tiết ▴' : 'Thêm chi tiết ▾'}</button>
    {more && <><div className="grid2"><Field l="Ngày"><input type="date" value={f.date} onChange={e => set('date', e.target.value)} /></Field>
      <Field l="Nhóm"><select value={f.cat} onChange={e => set('cat', e.target.value)}>{CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="Ưu tiên"><select value={f.pri} onChange={e => set('pri', e.target.value)}>{PRI.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field l="Trạng thái"><select value={f.status} onChange={e => set('status', e.target.value)}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k} disabled={k === 'done' && f.date > today()}>{v}{k === 'done' && f.date > today() ? ' (chỉ mở khi đến ngày)' : ''}</option>)}</select></Field></div>
      <Field l="Ghi chú"><textarea rows="2" value={f.note} onChange={e => set('note', e.target.value)} /></Field></>}
    {item.id && (
      <div className="card" style={{ padding: 12, background: 'var(--card2)', display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 14 }}>
        <div className="row between s">
          <b>💰 Khoản thu / chi gắn với việc này</b>
          <span className="mut">{txs.length ? `${txs.length} khoản` : 'Chưa có'}</span>
        </div>
        {txs.length ? (
          <div className="col" style={{ gap: 6 }}>
            {txs.map(x => (
              <div key={x.id} className="row between s" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <div>
                  <span>{x.type === 'income' ? '↗ Thu' : '↘ Chi'}: <b>{x.note || x.grp || 'Giao dịch'}</b></span>
                  <small className="mut">{x.grp} · {x.date.split('-').reverse().join('/')}</small>
                </div>
                <b style={{ color: x.type === 'income' ? 'var(--ok)' : 'var(--warn)' }}>
                  {x.type === 'income' ? '+' : '−'}{money(x.amount)}
                </b>
              </div>
            ))}
            <div className="row between s" style={{ paddingTop: 4 }}>
              <b>Tổng chênh lệch</b>
              <b style={{ color: txs.reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0) >= 0 ? 'var(--ok)' : 'var(--warn)' }}>
                {money(txs.reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0))}
              </b>
            </div>
          </div>
        ) : (
          <p className="mut s">Chưa có khoản thu/chi nào gắn với việc này.</p>
        )}
      </div>
    )}
    {f.end <= f.start && <p className="err">Giờ kết thúc phải sau giờ bắt đầu</p>}
    <button className="btn" disabled={bad} onClick={() => { const { txs: _tx, ...clean } = f; onSave({ ...clean, id: f.id || uid(), title: f.title.trim() }); }}>Lưu</button>
    {item.id && <button className="btn out dng" onClick={() => onDel(item.id)}>🗑 Xóa việc này</button>}</Modal>);
}
function TxForm({ item, onSave, onClose }) {
  const [f, setF] = useState({ autoGoal: true, goalId: '', ...item }), [nw, setNw] = useState(''), isNew = f.grp === '__new', set = (k, v) => setF({ ...f, [k]: v });
  const opts = item.allTasks.filter(t => t.date === f.date).sort((a, b) => a.start.localeCompare(b.start));
  const pick = id => { const k = item.allTasks.find(x => x.id === id), g = k && (k.cat === 'Bài tập' ? 'Học tập' : k.cat); setF({ ...f, taskId: id, grp: g && item.groups.includes(g) ? g : f.grp }); };
  const gname = isNew ? (item.groups.find(x => x.toLowerCase() === nw.trim().toLowerCase()) || nw.trim()) : f.grp;
  const chip = ([n, g]) => setF({ ...f, note: n, grp: item.groups.includes(g) ? g : f.grp });
  const hasGoals = item.goals && item.goals.length > 0;
  return (<Modal title={item.id ? 'Sửa giao dịch' : 'Thêm giao dịch'} onClose={onClose}>
    <div className="seg">{['expense', 'income'].map(t => <button key={t} className={f.type === t ? 'on' : ''} onClick={() => set('type', t)}>{t === 'income' ? 'Thu nhập' : 'Chi tiêu'}</button>)}</div>
    <Field l="Số tiền (đ)"><MoneyInput value={f.amount} onChange={v => set('amount', v)} placeholder="0" autoFocus /></Field>
    <div className="chips2">{[5000, 10000, 20000, 50000, 100000].map(n => <button key={n} className="chip2" onClick={() => set('amount', (+f.amount || 0) + n)}>+{dots(n)}</button>)}</div>
    <Field l="Ghi chú"><input value={f.note} onChange={e => set('note', e.target.value)} placeholder="VD: Cà phê" /></Field>
    <div className="chips2">{CHIPS[f.type].map(c => <button key={c[0]} className="chip2" onClick={() => chip(c)}>{c[0]}</button>)}</div>
    <Field l="Nhóm"><select value={f.grp} onChange={e => set('grp', e.target.value)}>{item.groups.map(g => <option key={g}>{g}</option>)}<option value="__new">＋ Tạo nhóm mới…</option></select></Field>
    {isNew && <Field l="Tên nhóm mới"><input value={nw} onChange={e => setNw(e.target.value)} placeholder="VD: Du lịch" autoFocus /></Field>}
    <div className="card" style={{ padding: '10px 12px', background: 'var(--card2)', borderRadius: 14 }}>
      <label className="row gap s" style={{ cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          style={{ width: 'auto', accentColor: 'var(--acc)' }}
          checked={f.autoGoal !== false}
          onChange={e => set('autoGoal', e.target.checked)}
        />
        <b>🎯 Tự động cập nhật vào mục tiêu</b>
      </label>
      {f.autoGoal !== false && hasGoals && (
        <div style={{ marginTop: 8 }}>
          <select
            value={f.goalId || ''}
            onChange={e => set('goalId', e.target.value)}
            style={{ fontSize: '.85rem', padding: '6px 10px' }}
          >
            <option value="">Tất cả mục tiêu tiền (theo mức ưu tiên)</option>
            {item.goals.map(g => (
              <option key={g.id} value={g.id}>
                {g.title} ({money(g.now)} / {money(g.target)})
              </option>
            ))}
          </select>
        </div>
      )}
      {f.autoGoal !== false && !hasGoals && (
        <p className="mut s" style={{ marginTop: 4 }}>
          Khoản này sẽ tự động cập nhật khi bạn tạo mục tiêu tiền (đ).
        </p>
      )}
    </div>
    {opts.length > 0 && <Field l="Việc liên quan (tuỳ chọn)"><select value={f.taskId} onChange={e => pick(e.target.value)}><option value="">Không gắn việc</option>{opts.map(t => <option key={t.id} value={t.id}>{t.start} · {t.title}</option>)}</select></Field>}
    {opts.length > 0 && <p className="mut s">Gắn với việc: khoản này chỉ được tính (và cập nhật mục tiêu) khi việc hoàn thành. Không gắn việc: tính ngay.</p>}
    {item.id ? <Field l="Ngày"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value, taskId: '' })} /></Field> : f.date !== today() && <p className="mut s">Ghi cho ngày {f.date.split('-').reverse().join('/')}</p>}
    <button className="btn" disabled={!(+f.amount > 0) || !gname} onClick={() => { const { allTasks, groups, goals, ...r } = f, k = allTasks.find(x => x.id === f.taskId); onSave({ ...r, id: f.id || uid(), amount: +f.amount, tk: k ? k.title : '', grp: gname, autoGoal: f.autoGoal !== false, goalId: f.autoGoal !== false ? f.goalId || '' : '' }); }}>Lưu</button></Modal>);
}
function TxList({ db, type, date, onClose, onAdd, onEdit, onDel }) {
  const d = date || today(), isT = d === today();
  const list = db.txs.filter(x => x.date === d && x.type === type), tot = list.filter(x => isEff(db, x)).reduce((a, x) => a + x.amount, 0), inc = type === 'income', pend = list.some(x => !isEff(db, x));
  return (<Modal title={inc ? (isT ? 'Thu nhập hôm nay' : `Thu nhập ngày ${d.split('-').reverse().join('/')}`) : (isT ? 'Chi tiêu hôm nay' : `Chi tiêu ngày ${d.split('-').reverse().join('/')}`)} onClose={onClose}>
    {list.length ? list.map(x => <div key={x.id} className={'row gap tx2' + (isEff(db, x) ? '' : ' pend')}><div className="grow"><b>{x.note || tInfo(db.tasks, x).title}</b><small>{x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title}{isEff(db, x) ? '' : ' · ⏳ chờ hoàn thành việc'}</small></div>
      <b style={{ color: inc ? 'var(--ok)' : 'var(--warn)' }}>{money(x.amount)}</b><button className="ib" onClick={() => onEdit(x)}>✎</button><button className="ib" onClick={() => onDel(x.id)}>🗑</button></div>) : <p className="mut">{isT ? 'Hôm nay chưa có khoản nào.' : 'Ngày này chưa có khoản nào.'}</p>}
    {pend && <p className="mut s">Khoản gắn với việc chưa hoàn thành chưa được tính vào tổng.</p>}
    <div className="row between"><b>Tổng (đã tính)</b><b>{money(tot)}</b></div><button className="btn" onClick={onAdd}>+ {inc ? 'Thu nhập' : 'Chi tiêu'}</button></Modal>);
}
function GoalForm({ item, onSave, onClose }) {
  const [f, setF] = useState(item); const set = (k, v) => setF({ ...f, [k]: v }), isMoney = f.unit.trim() === 'đ';
  const bad = !f.title.trim() || !(+f.target > 0);

  const handleSave = () => {
    const { asum, ...r } = f;
    const isEdit = !!item.id;
    const currentEdited = isEdit && (+f.current !== item.current);
    // Nếu người dùng chủ động sửa số tiền "Hiện có", lấy chính xác giá trị đó. Nếu không sửa, giữ nguyên gốc.
    const finalCurrent = currentEdited || !isEdit
      ? Math.max(0, +f.current || 0)
      : Math.max(0, (+f.current || 0) - (asum || 0));

    onSave({
      ...r,
      id: f.id || uid(),
      target: +f.target,
      pri: f.pri || 'Trung bình',
      auto: isMoney && !!f.auto,
      current: finalCurrent
    }, currentEdited);
  };

  return (<Modal title={item.id ? 'Sửa mục tiêu' : 'Mục tiêu mới'} onClose={onClose}>
    <Field l="Tên mục tiêu"><input value={f.title} onChange={e => set('title', e.target.value)} autoFocus /></Field>
    <div className="grid2"><Field l="Hiện có"><MoneyInput value={f.current} onChange={v => set('current', v)} /></Field>
      <Field l="Mục tiêu"><MoneyInput value={f.target} onChange={v => set('target', v)} /></Field></div>
    <Field l="Đơn vị (đ, cuốn, buổi...)"><input value={f.unit} onChange={e => set('unit', e.target.value)} /></Field>
    <Field l="Mức ưu tiên"><select value={f.pri || 'Trung bình'} onChange={e => set('pri', e.target.value)}>{PRI.map(c => <option key={c}>{c}</option>)}</select></Field>
    {isMoney && <label className="row gap s"><input type="checkbox" style={{ width: 'auto' }} checked={!!f.auto} onChange={e => set('auto', e.target.checked)} /> Tự động cập nhật theo thu/chi</label>}
    <button className="btn" disabled={bad} onClick={handleSave}>Lưu</button></Modal>);
}

// ---------- Onboarding ----------
function Onboarding({ onDone, onBack, initialName = '', initialBudget = '', initialIncome = '', initialGoals = null }) {
  const [f, setF] = useState({
    name: initialName || '',
    budget: initialBudget || '',
    income: initialIncome || '',
  });
  const [gs, setGs] = useState(
    initialGoals && initialGoals.length
      ? initialGoals.map(g => ({ title: g.title || '', target: g.target || '', unit: g.unit || 'đ' }))
      : [{ title: '', target: '', unit: 'đ' }]
  );
  const set = (k, v) => setF({ ...f, [k]: v }), setG = (i, k, v) => setGs(gs.map((g, j) => j === i ? { ...g, [k]: v } : g));
  return (<div className="onb"><div className="card onbc" style={{ maxWidth: 500 }}>
    <div className="logo"><LogoIcon s={34} /> Cà Phê</div><h2>Thiết lập tài khoản</h2><p className="mut">Nhập tên của bạn, ngân sách chi tiêu và các mục tiêu để bắt đầu quản lý thời gian & chi tiêu.</p>
    <Field l="Tên của bạn"><input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên của bạn" autoFocus /></Field>
    <Field l="Ngân sách chi tiêu dự tính / tháng (đ)"><MoneyInput value={f.budget} onChange={v => set('budget', v)} placeholder="VD: 3.000.000" /></Field>
    <Field l="Thu nhập dự tính / tháng (đ)"><MoneyInput value={f.income} onChange={v => set('income', v)} placeholder="VD: 5.000.000" /></Field>
    <div className="col gap" style={{ marginTop: 2 }}>
      <div className="row between"><span className="s mut" style={{ fontWeight: 600 }}>🎯 Mục tiêu (tiết kiệm, mua sắm...)</span><small className="mut">(không bắt buộc)</small></div>
      {gs.map((g, i) => <div key={i} className="gbox"><div className="row gap"><input value={g.title} onChange={e => setG(i, 'title', e.target.value)} placeholder="VD: Mua laptop" />{gs.length > 1 && <button type="button" className="ib" onClick={() => setGs(gs.filter((_, j) => j !== i))} title="Xóa mục tiêu">✕</button>}</div>
        <div className="grid2"><MoneyInput value={g.target} onChange={v => setG(i, 'target', v)} placeholder="Cần đạt" /><input value={g.unit} onChange={e => setG(i, 'unit', e.target.value)} placeholder="Đơn vị (đ, cuốn...)" /></div></div>)}
      <button type="button" className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setGs([...gs, { title: '', target: '', unit: 'đ' }])}>+ Thêm mục tiêu</button></div>
    <button className="btn" disabled={!f.name.trim()} onClick={() => onDone({ ...f, goals: gs })} style={{ marginTop: 6 }}>Hoàn tất & Bắt đầu →</button>
    {onBack && <button type="button" className="btn out" onClick={onBack}>← Đăng xuất</button>}</div></div>);
}

// ---------- 4) Các trang ----------
// Lời chào: mỗi ký tự là một span có chỉ số --i để nhảy lần lượt khi rê chuột vào banner
function Hop({ name }) {
  let i = 0;
  const part = t => [...t].map(c => <span key={i} aria-hidden="true" style={{ '--i': i++ }}>{c}</span>);
  return <h1 className="hop" aria-label={`Chào ${name} ☕`}>{part('Chào ')}<span className="nm">{part(name)}</span>{part(' ☕')}</h1>;
}
function Today({ db, openTx, openTask, openList, openProfile, toggle, delTask, curDate = today(), setCurDate }) {
  const [dir, setDir] = useState(''), [pick, setPick] = useState(false);
  const p = db.profile, dayBudget = p.budget / 30, isToday = curDate === today();
  const go = d => { setDir(d > curDate ? 'n' : 'p'); if (setCurDate) setCurDate(d); }; // nhớ hướng để trượt đúng chiều
  const curD = new Date(curDate + 'T00:00'), dmy = curDate.split('-').reverse().join('/');
  const tasks = db.tasks.filter(x => x.date === curDate).sort((a, b) => a.start.localeCompare(b.start));
  const tx = db.txs.filter(x => x.date === curDate && isEff(db, x));
  const exp = tx.filter(x => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  const inc = tx.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const done = tasks.filter(x => x.status === 'done').length;
  const dn = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);
  return (<div className="page stg">
    <div className="banner st" style={{ '--n': 0 }} onClick={openProfile}><div className="bn-alt" aria-hidden="true" />
      <small>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
      <Hop name={p.name} /><p>“{QUOTES[dn % QUOTES.length]}”</p><span className="chip">👤 Tài khoản <i>›</i></span></div>

    {/* Chọn ngày: gọn một hàng, giữ nguyên đầy đủ tính năng */}
    <div className="dnav st" style={{ '--n': 1 }}>
      <button className="dnb" onClick={() => go(addDays(curDate, -1))} aria-label="Ngày trước">‹</button>
      <button className="dpick" onClick={() => setPick(true)} aria-label="Chọn ngày khác">
        <span className="dpt"><b>{isToday ? 'Hôm nay' : WD[curD.getDay()]}</b><small>{isToday ? `${WD[curD.getDay()]}, ${dmy}` : dmy}</small></span><span className="dpc">▾</span>
      </button>
      <button className="dnb" onClick={() => go(addDays(curDate, 1))} aria-label="Ngày sau">›</button>
      {!isToday && <button className="btn sm out back" onClick={() => go(today())}>↩ Hôm nay</button>}
    </div>

    {/* key={curDate}: đổi ngày thì phần thân trượt vào theo chiều bấm */}
    <div key={curDate} className={'dbody ' + (dir ? 'dsl dsl-' + dir : 'st')} style={{ '--n': 2 }}>
      {/* Khối 1: Thẻ ngân sách toàn chiều ngang */}
      {p.budget
        ? <div className="card row gap wrap">
            <Ring pct={exp / dayBudget * 100} size={110} />
            <div className="grow">
              <small className="mut">{isToday ? 'Ngân sách hôm nay' : `Ngân sách ngày (${dmy})`}</small>
              <h2>{money(exp)} <span className="mut">/ {money(dayBudget)}</span></h2>
              <p className="mut s">{exp <= dayBudget ? `Còn ${money(dayBudget - exp)} có thể chi` : `Vượt ${money(exp - dayBudget)}`}</p>
            </div>
          </div>
        : <div className="card row between gap">
            <div>
              <small className="mut">{isToday ? 'Chi hôm nay' : `Chi ngày ${dmy}`}</small>
              <h2>{money(exp)}</h2>
              <p className="mut s">Bạn chưa đặt ngân sách tháng.</p>
            </div>
            <button className="btn sm out" onClick={openProfile}>Đặt ngân sách</button>
          </div>}

      {/* Khối 2: Hai nút hành động full chiều rộng trong một thẻ riêng */}
      <div className="card col gap">
        <button className="btn out" onClick={() => openTx('expense', { date: curDate })}>+ Chi tiêu</button>
        <button className="btn" onClick={() => openTx('income', { date: curDate })}>+ Thu nhập</button>
      </div>

      {/* Khối 3: Ba thẻ thống kê */}
      <div className="three">
        <Stat l="Việc đã xong" v={`${done}/${tasks.length}`} />
        <Stat l={isToday ? 'Thu hôm nay' : 'Thu ngày này'} v={money(inc)} c="var(--ok)" onClick={() => openList('income', curDate)} />
        <Stat l={isToday ? 'Chi hôm nay' : 'Chi ngày này'} v={money(exp)} c="var(--warn)" onClick={() => openList('expense', curDate)} />
      </div>

      {/* Khối 4: Việc cần làm */}
      <div className="row between">
        <h3>{isToday ? 'Việc cần làm hôm nay' : `Việc cần làm (${dmy})`}</h3>
        <button className="btn sm" onClick={() => openTask({ date: curDate })}>+ Thêm</button>
      </div>
      <div className="col gap">
        {tasks.length
          ? tasks.map((x, i) => <div key={x.id} className="trow" style={{ '--n': i }}><TaskRow t={x} onToggle={toggle} onEdit={openTask} onDel={delTask} /></div>)
          : <div className="card empty"><span className="big">📝</span><p>{isToday ? 'Hôm nay chưa có việc nào.' : `Ngày ${dmy} chưa có việc nào.`}</p><button className="btn sm" onClick={() => openTask({ date: curDate })}>+ Thêm việc</button></div>}
      </div>
    </div>
    {pick && <DatePicker value={curDate} tasks={db.tasks} onPick={d => { go(d); setPick(false); }} onClose={() => setPick(false)} />}</div>);
}

// Đọc nội dung file .ics → danh sách việc (xuất ra để kiểm thử). Lịch lặp chỉ mở rộng ±6 tháng quanh `now`.
// EXDATE do ical.js tự loại; buổi bị dời/sửa (RECURRENCE-ID) được gắn vào chuỗi lặp; buổi STATUS:CANCELLED bị bỏ qua.
export async function parseIcs(text, cat = 'Học tập', now = new Date()) {
  const { default: ICAL } = await import('ical.js');
  const calendar = new ICAL.Component(ICAL.parse(text));
  const rangeStart = new Date(now); rangeStart.setMonth(rangeStart.getMonth() - 6); rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(now); rangeEnd.setMonth(rangeEnd.getMonth() + 6); rangeEnd.setHours(23, 59, 59, 999);
  const hm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const cancelled = c => String(c.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED';
  const toTask = (ev, st, en) => {
    const title = (ev.summary || 'Sự kiện từ lịch').trim(), note = ev.description || 'Nhập từ file lịch .ics';
    if (st.isDate) return { id: uid(), title, date: st.toString().slice(0, 10), start: '09:00', end: '10:00', cat, pri: 'Trung bình', status: 'todo', note }; // cả ngày → 09:00–10:00
    const a = st.toJSDate(), b = en && en.toJSDate() > a ? en.toJSDate() : new Date(a.getTime() + 36e5);
    return { id: uid(), title, date: iso(a), start: hm(a), end: iso(b) === iso(a) ? hm(b) : '23:59', cat, pri: 'Trung bình', status: 'todo', note }; // qua nửa đêm → cắt ở 23:59
  };
  const all = calendar.getAllSubcomponents('vevent'), exceptions = all.filter(c => c.hasProperty('recurrence-id')), out = [];
  for (const c of all.filter(c => !c.hasProperty('recurrence-id'))) {
    if (cancelled(c)) continue;
    const ev = new ICAL.Event(c);
    if (!ev.startDate) continue;
    if (!ev.isRecurring()) { out.push(toTask(ev, ev.startDate, ev.endDate)); continue; }
    exceptions.filter(x => x.getFirstPropertyValue('uid') === ev.uid).forEach(x => ev.relateException(new ICAL.Event(x)));
    const it = ev.iterator(); let occ, n = 0;
    while ((occ = it.next()) && n++ < 1000) {
      const d = ev.getOccurrenceDetails(occ), at = d.startDate.toJSDate();
      if (at > rangeEnd) break;
      if (at < rangeStart || cancelled(d.item.component)) continue;
      out.push(toTask(d.item, d.startDate, d.endDate));
    }
  }
  return out;
}

// Chọn ngày: chọn tháng/năm bằng ô chọn rồi bấm vào ngày (như Google Calendar)
function DatePicker({ value, tasks, onPick, onClose }) {
  const [vm, setVm] = useState(value.slice(0, 7)), y = +vm.slice(0, 4), m = +vm.slice(5, 7), first = vm + '-01', st = wkStart(first);
  const rows = Math.ceil((dBetween(st, vm + '-' + pad(new Date(y, m, 0).getDate())) + 1) / 7), cells = [...Array(rows * 7)].map((_, i) => addDays(st, i)), has = new Set(tasks.map(t => t.date));
  const mv = k => setVm(addMonths(first, k).slice(0, 7)), thisY = new Date().getFullYear(), years = [...new Set([...Array(31)].map((_, i) => thisY - 10 + i).concat(y))].sort((a, b) => a - b);
  return (<Modal title="Chọn ngày" onClose={onClose}>
    <div className="row between gap"><button className="btn sm out" onClick={() => mv(-1)}>‹</button>
      <div className="row gap"><select value={m} onChange={e => setVm(y + '-' + pad(e.target.value))} style={{ width: 'auto' }}>{[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}</select>
        <select value={y} onChange={e => setVm(e.target.value + '-' + pad(m))} style={{ width: 'auto' }}>{years.map(v => <option key={v}>{v}</option>)}</select></div>
      <button className="btn sm out" onClick={() => mv(1)}>›</button></div>
    <div className="cgrid h">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
    <div className="cgrid">{cells.map(d => <button key={d} className={'cell ' + (d === value ? 'sel ' : '') + (d.slice(0, 7) !== vm ? 'out' : '')} onClick={() => onPick(d)}><span className={'dn ' + (d === today() ? 'now' : '')}>{+d.slice(8)}</span><span className="bars">{has.has(d) && <i style={{ background: 'var(--acc)' }} />}</span></button>)}</div>
    <div className="row between"><button className="btn sm out" onClick={() => onPick(today())}>Hôm nay</button><button className="btn sm out" onClick={onClose}>Đóng</button></div></Modal>);
}

function Calendar({ db, openTask, toggle, delTask, clip, setClip, pasteClip, importIcs }) {
  const [sel, setSel] = useState(today()), [col, setCol] = useState(0), [dir, setDir] = useState('n'), [ys, setYs] = useState(false), [drag, setDrag] = useState(null), [noTr, setNoTr] = useState(false);
  const [q, setQ] = useState(''), [msg, setMsg] = useState(''), sw = useRef(null), clipRef = useRef(null), wheelLock = useRef(false), fileRef = useRef(null), wkRef = useRef(null), [pick, setPick] = useState(false);
  useEffect(() => { if (wkRef.current) wkRef.current.scrollTop = 6.5 * 48; }, [sel.slice(0, 8) + wkStart(sel)]); // mở ra thì cuộn tới khoảng 6:30 sáng
  const CH = 48, ws = wkStart(sel), days = [...Array(7)].map((_, i) => addDays(ws, i)), HH = 48, H0 = 0, HR = 24; // lưới đủ 24 giờ (00:00–24:00)
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
  const handleIcs = async e => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importIcs(file);
      say(
        result.added
          ? `Đã nhập ${result.added} sự kiện${result.skipped ? `, bỏ qua ${result.skipped} sự kiện trùng` : ''}.`
          : 'Không có sự kiện mới để nhập.'
      );
    } catch (error) {
      say(error.message || 'Không đọc được file .ics.');
    }

    e.target.value = '';
  };
  const cell = (d, out) => <button key={d} className={'cell ' + (d === sel ? 'sel ' : '') + (out ? 'out' : '')} onClick={() => setSel(d)}>
    <span className={'dn ' + (d === today() ? 'now' : '')}>{+d.slice(8)}</span>
    <span className="bars">{dayTasks(d).slice(0, 3).map(x => <i key={x.id} style={{ background: x.pri === 'Cao' ? 'var(--warn)' : CC[x.cat], opacity: x.status === 'done' ? .4 : 1 }} />)}</span></button>;
  return (<div className="page">
    <div className="row between wrap"><h2 className="ttl" onClick={() => setPick(true)} title="Bấm để chọn ngày/tháng">Tháng {+sel.slice(5, 7)}, {sel.slice(0, 4)} ▾</h2>
      <div className="row gap"><button className="btn sm out" onClick={() => go(-1)} aria-label="Trước">←</button><button className="btn sm out" onClick={() => jump(today())}>Hôm nay</button><button className="btn sm out" onClick={() => go(1)} aria-label="Sau">→</button>
        <button className="btn sm desk" onClick={() => openTask({ date: sel })}>+ Thêm việc</button></div></div>
    <p className="mut s desk">{days[0].split('-').reverse().join('/')} – {days[6].split('-').reverse().join('/')}</p>
    <div className="row gap wrap">
  <button className="btn sm out" onClick={copyW}>⧉ Sao chép tuần</button>
  <button className="btn sm out" onClick={copyD}>⧉ Sao chép ngày</button>
  <button className="btn sm out" onClick={() => fileRef.current?.click()}>📥 Nhập lịch .ics</button>
  <input
    ref={fileRef}
    type="file"
    accept=".ics,text/calendar"
    onChange={handleIcs}
    style={{ display: 'none' }}
  />
      {clip && <button className="btn sm" onClick={paste}>📋 Dán {clip.kind === 'week' ? 'tuần' : 'ngày'}</button>}{msg && <span className="s" style={{ color: 'var(--ok)' }}>{msg}</span>}</div>
    {/* Desktop: lưới tuần */}
    <div className="card wk desk" onWheel={e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 20 && !wheelLock.current) { wheelLock.current = true; go(e.deltaX > 0 ? 1 : -1); setTimeout(() => { wheelLock.current = false; }, 500); } }}><div className={'wkanim ' + (dir === 'n' ? 'wn' : 'wp')} key={ws}><div className="wkh"><i />{days.map((d, i) => <div key={d} className={(d === today() ? 'tdy ' : '') + (d === sel ? 'selh' : '')} onClick={() => setSel(d)}>{DAYS[i]} <b>{d.slice(8)}</b></div>)}</div>
      <div className="wkscroll" ref={wkRef}><div className="wkb" style={{ height: HR * HH }}><div className="hrs">{[...Array(HR)].map((_, i) => <span key={i} style={{ height: HH }}>{i > 0 ? pad(H0 + i) + ':00' : ''}</span>)}</div>
        {days.map(d => <div key={d} className="dcol" style={{ backgroundSize: `100% ${HH}px` }}>{dayTasks(d).map(x => {
          const s0 = Math.max(toMin(x.start), H0 * 60), e0 = Math.min(toMin(x.end), (H0 + HR) * 60); // cắt phần nằm ngoài lưới
          const top = (s0 - H0 * 60) / 60 * HH, hh = Math.max(26, (e0 - s0) / 60 * HH);
          return <div key={x.id} className={'blk ' + (x.pri === 'Cao' ? 'hp ' : '') + (x.status === 'done' ? 'done' : '')} style={{ top, height: hh, '--c': CC[x.cat] }} onClick={() => openTask(x)}><b>{x.title}</b><small>{x.start}–{x.end}</small><small>{x.note}</small></div>;
        })}</div>)}</div></div></div></div>
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
    <div className="row gap wrap s mut"><span><i className="dot" style={{ background: CC['Học tập'] }} /> Học tập/Bài tập</span><span><i className="dot" style={{ background: CC['Dự án'] }} /> Dự án</span><span><i className="dot" style={{ background: CC['Cá nhân'] }} /> Cá nhân/Sức khỏe</span><span><i className="dot" style={{ background: 'var(--warn)' }} /> Ưu tiên cao</span></div>
    {pick && <DatePicker value={sel} tasks={db.tasks} onPick={d => { jump(d); setPick(false); }} onClose={() => setPick(false)} />}</div>);
}

function Finance({ db, openTx, delTx, openGroups }) {
  const [rg, setRg] = useState('month'), [all, setAll] = useState(false), [fm, setFm] = useState('day'), [fv, setFv] = useState(today()), p = db.profile, t = today(), scale = rg === 'today' ? 1 / 30 : rg === 'week' ? 7 / 30 : 1, ws = wkStart(t);
  const inR = d => rg === 'today' ? d === t : rg === 'week' ? (d >= ws && d <= addDays(ws, 6)) : d.slice(0, 7) === t.slice(0, 7);
  const txs = db.txs.filter(x => inR(x.date) && isEff(db, x)).sort((a, b) => b.date.localeCompare(a.date));
  const sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0), inc = sum('income'), exp = sum('expense'), bud = p.budget * scale, usedPct = bud ? exp / bud * 100 : 0;
  const tw = db.groups.reduce((a, g) => a + g.share, 0), G = Object.fromEntries(db.groups.map(g => [g.name, [g.color, g.share / tw]]));
  const by = Object.fromEntries(Object.keys(G).map(k => [k, txs.filter(x => x.type === 'expense' && (G[x.grp] ? x.grp : 'Khác') === k).reduce((a, x) => a + x.amount, 0)]));
  const shown = (all ? db.txs.filter(x => fv && x.date.startsWith(fv)) : db.txs.filter(x => x.date === t)).sort((a, b) => b.date.localeCompare(a.date));
  const sumOf = ty => shown.filter(x => x.type === ty && isEff(db, x)).reduce((a, x) => a + x.amount, 0), dd = all && fm === 'day' && fv ? { date: fv } : undefined;
  const row = x => <div key={x.id} className={'card tx' + (isEff(db, x) ? '' : ' pend')}><span className="tic">{x.type === 'income' ? '↗' : '↘'}</span><div className="grow"><b>{x.note || tInfo(db.tasks, x).title}</b><small>{x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title} · {x.date.split('-').reverse().join('/')}{isEff(db, x) ? '' : ' · ⏳ chờ hoàn thành việc'}</small></div>
    <b style={{ color: x.type === 'income' ? 'var(--ok)' : 'var(--warn)' }}>{x.type === 'income' ? '+' : '−'}{money(x.amount)}</b><button className="ib" onClick={() => openTx(x.type, x)}>✎</button><button className="ib" onClick={() => delTx(x.id)}>🗑</button></div>;
  return (<div className="page">
    <div className="row between wrap"><h2>Tài chính</h2><div className="row gap"><div className="seg">{[['today', 'Hôm nay'], ['week', 'Tuần này'], ['month', 'Tháng này']].map(([k, l]) => <button key={k} className={rg === k ? 'on' : ''} onClick={() => setRg(k)}>{l}</button>)}</div></div></div>
    <div className="four"><Stat l="Thu nhập" v={money(inc)} c="var(--ok)" /><Stat l="Chi tiêu" v={money(exp)} c="var(--warn)" /><Stat l="Số dư" v={money(inc - exp)} c={inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)'} /><Stat l="Ngân sách đã dùng" v={bud ? Math.round(usedPct) + '%' : '—'} /></div>
    <div className="cols">
      <div className="card">
        <div className="row between" style={{ alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Chi tiêu theo nhóm việc</h3>
          <button
            onClick={openGroups}
            title="Quản lý và chỉnh sửa nhóm việc"
            style={{
              background: 'var(--card2)',
              border: '1px solid var(--line)',
              color: 'var(--tx)',
              fontSize: '.76rem',
              fontWeight: 600,
              padding: '3px 9px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              opacity: .85,
              transition: 'all .2s ease'
            }}
          >
            <span>⚙</span> Sửa nhóm
          </button>
        </div>
        <div className="row gap wrap" style={{ justifyContent: 'center' }}>
          <Donut data={Object.keys(G).map(k => ({ k, v: by[k], c: G[k][0] }))} />
          <div className="col" style={{ gap: 6 }}>{Object.keys(G).map(k => <span key={k} className="s"><i className="dot" style={{ background: G[k][0] }} /> {k}: {money(by[k])}</span>)}</div>
        </div>
      </div>
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

function Goals({ db, openGoal, delGoal, bump, toggleAuto, cyclePri }) {
  const fmt = (g, v) => g.unit === 'đ' ? money(v) : `${v}`, list = [...db.goals].sort((a, b) => PRIW[goalPri(b)] - PRIW[goalPri(a)]), nAuto = db.goals.filter(g => g.auto && g.unit === 'đ').length;
  return (<div className="page"><div className="row between"><h2>Mục tiêu</h2><button className="btn sm" onClick={() => openGoal({})}>+ Mục tiêu mới</button></div>
    {nAuto > 1 && <p className="mut s">Khi có nhiều mục tiêu bật tự động, thu/chi được chia theo mức ưu tiên (Cao 3 : Trung bình 2 : Thấp 1). Thu nhập chỉ chia cho mục tiêu chưa đạt.</p>}
    <div className="cols3">{list.map(g => { const now = goalNow(db, g), pc = now / g.target * 100, isMoney = g.unit === 'đ'; return <div key={g.id} className="card goal">
      <div className="goal-top">
        <div className="goal-title-wrap">
          <TargetIcon s={22} color="var(--acc)" />
          <b className="goal-title-text">{g.title}</b>
        </div>
        <div className="goal-actions">
          <button className="ib" onClick={() => openGoal(g)} title="Sửa">✎</button>
          <button className="ib" onClick={() => delGoal(g.id)} title="Xóa">🗑</button>
        </div>
      </div>
      <div className="goal-num-row">
        <h2>{fmt(g, now)} <span className="mut s">/ {fmt(g, g.target)}{g.unit !== 'đ' ? ' ' + g.unit : ''}</span></h2>
      </div>
      <Bar pct={pc} color={pc >= 100 ? 'var(--ok)' : undefined} />
      <div className="row between s goal-meta-row">
        <span className="mut">{Math.round(pc)}% hoàn thành</span>
        <button className={'pri p' + PRIW[goalPri(g)]} onClick={() => cyclePri(g)} title="Bấm để đổi mức ưu tiên">Ưu tiên: {goalPri(g)}</button>
      </div>
      <div className="goal-foot">
        {isMoney ? <button className={'sw' + (g.auto ? ' on' : '')} onClick={() => toggleAuto(g)}><i /><span>Tự động cập nhật</span></button>
          : <button className="btn sm out goal-bump-btn" onClick={() => bump(g)}>+ 1 {g.unit}</button>}
      </div>
    </div>; })}</div>
    {!db.goals.length && <div className="card empty"><TargetIcon s={48} color="var(--mut)" /><p>Chưa có mục tiêu nào.</p><button className="btn sm" onClick={() => openGoal({})}>+ Đặt mục tiêu đầu tiên</button></div>}</div>);
}

// Tổng kết tuần này / tháng này (độc lập với bộ lọc phía trên)
function Summary({ db, rg }) {
  const p = db.profile, t = today(), wk = rg === 'week', scale = wk ? 7 / 30 : 1, ws = wkStart(t), per = wk ? 'tuần này' : 'tháng này';
  const inR = d => wk ? d >= ws && d <= addDays(ws, 6) : d.slice(0, 7) === t.slice(0, 7);
  const txs = db.txs.filter(x => inR(x.date) && isEff(db, x)), sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0), inc = sum('income'), exp = sum('expense');
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
    <div className="sumrow"><span className="mut">Chi thực tế / Chi dự tính</span><b>{money(exp)}{bud > 0 ? ' / ' + money(bud) : ' (chưa đặt)'}</b></div>
    <div className="sumrow"><span className="mut">Thu thực tế / Thu dự tính</span><b>{money(inc)}{plan > 0 ? ' / ' + money(plan) : ' (chưa đặt)'}</b></div>
    <div className="sumrow"><span className="mut">Tổng số tiền thu được</span><b style={{ color: inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)' }}>{(inc - exp >= 0 ? '+' : '−') + dots(Math.abs(inc - exp))} VND</b></div>
    <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>);
}

function ProfileModal({ p, counts, db, cloudUser, onClose, onSave, onLogout, onDelete, onReset, flash, onCloudLinked }) {
  const [v, setV] = useState('menu'); // 'menu' | 'info' | 'link_email' | 'change_email' | 'del_confirm'
  const [f, setF] = useState(p);
  const [sure2, setSure2] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPw, setLinkPw] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState(null);

  const set = (k, x) => setF({ ...f, [k]: x });

  const doSyncAll = async () => {
    if (!cloudUser) return;
    setSyncing(true);
    try {
      await syncService.uploadAll(cloudUser.id, db);
      flash(`🎉 Đã sao lưu toàn bộ ${db.tasks.length} việc, ${db.txs.length} chi tiêu và ${db.goals.length} mục tiêu lên email!`);
    } catch (e) {
      flash('❌ Không thể đồng bộ, hãy kiểm tra kết nối mạng.');
    } finally {
      setSyncing(false);
    }
  };

  const doLink = async (isSignUp) => {
    if (!linkEmail.trim() || !linkPw) {
      setAuthMsg({ t: 'err', s: 'Vui lòng nhập đầy đủ Email và Mật khẩu.' });
      return;
    }
    setAuthLoading(true);
    setAuthMsg(null);
    try {
      let r;
      if (isSignUp) {
        r = await authService.signUp(linkEmail.trim(), linkPw, f.name || p.name);
        if (r.user && !r.session) {
          setAuthMsg({ t: 'ok', s: 'Đã gửi email xác nhận! Bạn mở hộp thư bấm vào link xác nhận rồi bấm "Đăng nhập" ở đây nhé.' });
          setAuthLoading(false);
          return;
        }
      } else {
        r = await authService.signIn(linkEmail.trim(), linkPw);
      }
      const user = r.user;
      if (!user) throw new Error('Không lấy được thông tin người dùng.');

      // Lấy lịch có sẵn trên cloud trước khi đẩy dữ liệu local lên. Điều này
      // tránh nhân đôi cùng một sự kiện khi người dùng liên kết lại email cũ.
      const cloud = await syncService.fetchAll(user.id);
      const mergedDb = { ...db, tasks: mergeUniqueTasks(cloud?.tasks, db.tasks) };
      const uploaded = await syncService.uploadAll(user.id, mergedDb);
      if (!uploaded) throw new Error('Không thể đồng bộ dữ liệu lên email, hãy kiểm tra kết nối rồi thử lại.');
      if (onCloudLinked) onCloudLinked(user, mergedDb);
      const skipped = Math.max(0, db.tasks.length + (cloud?.tasks?.length || 0) - mergedDb.tasks.length);
      flash(`🎉 Đã liên kết và đồng bộ vào ${user.email}!${skipped ? ` Đã bỏ qua ${skipped} lịch trùng.` : ''}`);
      setV('menu');
    } catch (err) {
      setAuthMsg({ t: 'err', s: (err && err.message) || 'Có lỗi xảy ra, thử lại sau nhé.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const doChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      flash('⚠️ Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    try {
      await authService.updateUser({ email: newEmail.trim() });
      flash(`Đã gửi thư xác nhận đến ${newEmail.trim()}. Hãy mở hộp thư để hoàn tất đổi email nhé!`);
      setV('menu');
    } catch (e) {
      flash((e && e.message) || 'Không thể đổi email, thử lại sau.');
    }
  };

  const titles = {
    menu: 'Tài khoản',
    info: 'Thông tin cá nhân & Ngân sách',
    link_email: 'Đồng bộ lên Email',
    change_email: 'Đổi địa chỉ Email',
    del_confirm: 'Xác nhận xóa tài khoản',
  };

  return (
    <Modal title={titles[v] || 'Tài khoản'} onClose={onClose}>
      {v === 'menu' && (
        <>
          <div className="row gap" style={{ marginBottom: 4 }}>
            <span className="ava">{(p.name[0] || '?').toUpperCase()}</span>
            <div>
              <b>{p.name}</b>
              <small>{counts}</small>
            </div>
          </div>

          {/* Trạng thái liên kết Email và Đồng bộ đám mây */}
          <div className="card" style={{ padding: '12px 14px', background: 'var(--card2)', borderRadius: 14 }}>
            {cloudUser ? (
              <div className="col gap" style={{ gap: 8 }}>
                <div className="row between s">
                  <span style={{ color: 'var(--ok)', fontWeight: 600 }}>☁️ Đã liên kết Email</span>
                  <span className="tag" style={{ background: 'color-mix(in srgb,var(--ok) 18%,transparent)', color: 'var(--ok)' }}>Đang đồng bộ</span>
                </div>
                <div style={{ wordBreak: 'break-all' }}>
                  <b>{cloudUser.email}</b>
                </div>
                <p className="mut s" style={{ margin: 0 }}>
                  Dữ liệu của bạn được tự động sao lưu an toàn trên đám mây Supabase.
                </p>
                <div className="row gap wrap" style={{ marginTop: 2 }}>
                  <button className="btn sm" disabled={syncing} onClick={doSyncAll} style={{ flex: 1 }}>
                    {syncing ? 'Đang tải...' : '🔄 Tải dữ liệu máy này lên Email'}
                  </button>
                  <button className="btn sm out" onClick={() => { setNewEmail(''); setV('change_email'); }}>
                    ✏️ Đổi email
                  </button>
                </div>
              </div>
            ) : (
              <div className="col gap" style={{ gap: 8 }}>
                <div className="row between s">
                  <span style={{ color: 'var(--warn)', fontWeight: 600 }}>⚠️ Tài khoản chỉ lưu trên máy này</span>
                  <span className="tag" style={{ background: 'color-mix(in srgb,var(--warn) 18%,transparent)', color: 'var(--warn)' }}>Chưa có email</span>
                </div>
                <p className="mut s" style={{ margin: 0 }}>
                  Dữ liệu hiện chỉ lưu trên trình duyệt này. Hãy kết nối email để chuyển toàn bộ <b>{db.tasks.length} việc</b>, <b>{db.txs.length} chi tiêu</b> và <b>{db.goals.length} mục tiêu</b> lên đám mây, không lo mất khi đổi máy.
                </p>
                <button
                  className="btn sm"
                  onClick={() => { setLinkEmail(''); setLinkPw(''); setAuthMsg(null); setV('link_email'); }}
                  style={{ marginTop: 2 }}
                >
                  ☁️ Cập nhật Email để lưu trữ & đồng bộ ngay ➔
                </button>
              </div>
            )}
          </div>

          <button className="btn out" onClick={() => setV('info')}>👤 Sửa thông tin cá nhân & Ngân sách</button>
          <button className="btn out" onClick={onLogout}>🚪 Đăng xuất</button>
          <button className="btn out dng" onClick={() => setV('del_confirm')}>🗑 Xóa tài khoản này</button>
        </>
      )}

      {v === 'link_email' && (
        <div className="col gap">
          <p className="mut s" style={{ margin: 0, lineHeight: 1.5 }}>
            Nhập email và mật khẩu. Toàn bộ <b>{db.tasks.length} việc</b>, <b>{db.txs.length} chi tiêu</b> và <b>{db.goals.length} mục tiêu</b> hiện có trên máy này sẽ được tải thẳng lên email của bạn!
          </p>
          <Field l="Địa chỉ Email">
            <input type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="VD: yourname@gmail.com" autoFocus />
          </Field>
          <Field l="Mật khẩu (tối thiểu 6 ký tự)">
            <input type="password" value={linkPw} onChange={e => setLinkPw(e.target.value)} placeholder="••••••••" minLength={6} />
          </Field>
          {authMsg && <div className={'au-msg ' + authMsg.t}>{authMsg.s}</div>}
          <div className="col gap" style={{ marginTop: 6 }}>
            <button className="btn" disabled={authLoading} onClick={() => doLink(false)}>
              {authLoading ? 'Đang xử lý...' : 'Đăng nhập & Tải dữ liệu lên Email'}
            </button>
            <button className="btn out" disabled={authLoading} onClick={() => doLink(true)}>
              {authLoading ? 'Đang xử lý...' : 'Tạo tài khoản mới & Tải dữ liệu lên'}
            </button>
            <button className="btn sm out" onClick={() => setV('menu')}>← Quay lại</button>
          </div>
        </div>
      )}

      {v === 'change_email' && (
        <div className="col gap">
          <p className="mut s" style={{ margin: 0 }}>
            Email hiện tại: <b>{cloudUser?.email}</b>. Nhập địa chỉ email mới mà bạn muốn đổi sang:
          </p>
          <Field l="Địa chỉ Email mới">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="VD: emailmoi@gmail.com" autoFocus />
          </Field>
          <button className="btn" onClick={doChangeEmail}>Gửi yêu cầu đổi email</button>
          <button className="btn out" onClick={() => setV('menu')}>← Quay lại</button>
        </div>
      )}

      {v === 'del_confirm' && (
        <div className="col gap" style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{ fontSize: '2.5rem' }}>⚠️</div>
          <h3 style={{ color: 'var(--warn)', margin: 0 }}>Xác nhận xóa tài khoản?</h3>
          <p className="mut s" style={{ margin: 0 }}>
            Bạn có chắc chắn muốn xóa tài khoản <strong>"{p.name}"</strong> không?
          </p>
          <div style={{ background: 'color-mix(in srgb,var(--warn) 12%,transparent)', border: '1px solid var(--warn)', borderRadius: 12, padding: 12, fontSize: '.84rem', color: 'var(--warn)', textAlign: 'left', lineHeight: 1.5 }}>
            Toàn bộ việc cần làm, lịch trình, các khoản chi tiêu và mục tiêu sẽ bị <strong>xóa vĩnh viễn</strong> và không thể khôi phục.{cloudUser ? ' Tài khoản Email này cũng sẽ bị xóa khỏi Supabase.' : ' Tài khoản này chỉ được lưu trên máy.'}
          </div>
          <div className="row gap" style={{ marginTop: 10, justifyContent: 'center' }}>
            <button className="btn out" onClick={() => setV('menu')}>Hủy bỏ (Giữ lại)</button>
            <button
              className="btn"
              style={{ background: 'var(--warn)', color: '#fff' }}
              disabled={authLoading}
              onClick={async () => {
                setAuthLoading(true);
                setAuthMsg(null);
                try {
                  await onDelete(Boolean(cloudUser));
                  onClose();
                } catch (error) {
                  setAuthMsg({ t: 'err', s: (error && error.message) || 'Không thể xóa tài khoản trên cloud. Dữ liệu vẫn được giữ nguyên.' });
                } finally {
                  setAuthLoading(false);
                }
              }}
            >
              {authLoading ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
            </button>
          </div>
          {authMsg && <div className={'au-msg ' + authMsg.t}>{authMsg.s}</div>}
        </div>
      )}

      {v === 'info' && (
        <>
          <Field l="Tên"><input value={f.name} onChange={e => set('name', e.target.value)} /></Field>
          <Field l="Ngân sách chi tiêu / tháng (đ)"><MoneyInput value={f.budget} onChange={x => set('budget', x)} /></Field>
          <Field l="Thu nhập dự tính / tháng (đ)"><MoneyInput value={f.income} onChange={x => set('income', x)} /></Field>
          <button className="btn" disabled={!f.name.trim()} onClick={() => onSave({ name: f.name.trim(), budget: +f.budget || 0, income: +f.income || 0 })}>Lưu thay đổi</button>
          <button className="btn out" onClick={() => setV('menu')}>← Quay lại</button>
          <button className="btn out dng" onClick={() => sure2 ? onReset() : setSure2(true)}>
            {sure2 ? 'Bấm lần nữa để xóa hết việc, giao dịch, mục tiêu' : '🧹 Xóa toàn bộ việc, giao dịch, mục tiêu'}
          </button>
        </>
      )}
    </Modal>
  );
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
const NAV = [['today', '🏠', 'Trang chính'], ['cal', '📅', 'Lịch'], ['fin', '💰', 'Tài chính'], ['goal', '🎯', 'Mục tiêu']];
function App({ id, onLogout, onRename, onDelete, onCloudLinked }) {
  const [db, setDb] = useState(() => loadDb(id)), [page, setPage] = useState('today'), [modal, setModal] = useState(null), [clip, setClip] = useState(null), [toast, setToast] = useState(null), tt = useRef(null);
  const [cloudUser, setCloudUser] = useState(null);
  const [homeDate, setHomeDate] = useState(today());

  useEffect(() => {
    authService.getUser().then(u => setCloudUser(u)).catch(() => {});
    const sub = authService.onAuthStateChange((_, session) => {
      setCloudUser(session?.user || null);
    });
    return () => {
      sub?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => wr(ACC(id), db), [db]);
  const upsert = (k, it) => {
    setDb(d => ({ ...d, [k]: d[k].some(x => x.id === it.id) ? d[k].map(x => x.id === it.id ? it : x) : [...d[k], it] }));
    if (cloudUser && k === 'goals') syncService.upsertGoal(cloudUser.id, it);
    setModal(null);
  };
  const flash = (msg, undo) => { clearTimeout(tt.current); setToast({ msg, undo }); tt.current = setTimeout(() => setToast(null), 5000); };
  const del = (k, itemId) => {
    const idx = db[k].findIndex(x => x.id === itemId); if (idx < 0) return; const item = db[k][idx];
    setDb(d => ({ ...d, [k]: d[k].filter(x => x.id !== itemId) }));
    if (cloudUser) {
      if (k === 'txs') syncService.deleteTx(cloudUser.id, itemId);
      if (k === 'goals') syncService.deleteGoal(cloudUser.id, itemId);
    }
    flash('Đã xóa', () => {
      setDb(d => { const a = [...d[k]]; a.splice(Math.min(idx, a.length), 0, item); return { ...d, [k]: a }; });
      if (cloudUser) {
        if (k === 'txs') syncService.upsertTx(cloudUser.id, item);
        if (k === 'goals') syncService.upsertGoal(cloudUser.id, item);
      }
      setToast(null);
    });
  };
  const openTask = it => setModal({ k: 'task', it: it.id ? { ...it, txs: db.txs.filter(x => x.taskId === it.id) } : { title: '', date: today(), start: '09:00', end: '10:00', cat: 'Học tập', pri: 'Trung bình', note: '', status: 'todo', ...it, txs: [] } });
  const openTx = (type, it) => {
    const gl = db.groups.map(g => g.name);
    const moneyGoals = db.goals.filter(g => g.unit === 'đ').map(g => ({ ...g, now: goalNow(db, g) }));
    setModal({
      k: 'tx',
      it: {
        type,
        amount: '',
        date: today(),
        note: '',
        taskId: '',
        autoGoal: it && it.autoGoal !== undefined ? it.autoGoal : true,
        goalId: '',
        ...it,
        grp: gl.includes(it?.grp) ? it.grp : 'Khác',
        allTasks: db.tasks,
        groups: gl,
        goals: moneyGoals
      }
    });
  };
  const openGoal = it => setModal({ k: 'goal', it: it.id ? { ...it, current: goalNow(db, it), asum: allocSum(db, it.id) } : { title: '', current: 0, target: '', unit: 'đ', pri: 'Trung bình', auto: true, asum: 0 } });
  const openList = (type, date) => setModal({ k: 'list', type, date: date || today() });
  const openProfile = () => setModal({ k: 'profile' });
  const openGroups = () => setModal({ k: 'groups' });
  const importIcs = async (file, cat = 'Học tập') => {
    let imported;
    try { imported = await parseIcs(await file.text(), cat); }
    catch (error) { console.error(error); throw new Error('Không đọc được file .ics này.'); }
    const existing = new Set(db.tasks.map(taskFingerprint));
    const newTasks = dedupeTasks(imported).filter(t => {
      const key = taskFingerprint(t);
      if (existing.has(key)) return false;
      existing.add(key);
      return true;
    });
    setDb(current => ({ ...current, tasks: [...current.tasks, ...newTasks] }));
    if (cloudUser) {
      newTasks.forEach(task => syncService.upsertTask(cloudUser.id, task));
    }
    return { added: newTasks.length, skipped: imported.length - newTasks.length };
  };
  const saveGoal = (g, currentEdited) => {
    setDb(d => {
      let txs = d.txs;
      // Nếu người dùng chủ động sửa số tiền "Hiện có", xóa các phân bổ alloc cũ vào mục tiêu này
      // để số tiền hiện có hiển thị chính xác con số người dùng vừa nhập
      if (currentEdited && g.id) {
        txs = txs.map(x => {
          if (!x.alloc || !(g.id in x.alloc)) return x;
          const { [g.id]: _del, ...restAlloc } = x.alloc;
          return { ...x, alloc: Object.keys(restAlloc).length ? restAlloc : null };
        });
      }
      const goals = d.goals.some(x => x.id === g.id)
        ? d.goals.map(x => x.id === g.id ? g : x)
        : [...d.goals, g];
      return { ...d, goals, txs };
    });
    if (cloudUser) {
      syncService.upsertGoal(cloudUser.id, g);
      if (currentEdited && g.id) {
        db.txs.filter(x => x.alloc && (g.id in x.alloc)).forEach(x => {
          const { [g.id]: _del, ...restAlloc } = x.alloc;
          syncService.upsertTx(cloudUser.id, { ...x, alloc: Object.keys(restAlloc).length ? restAlloc : null });
        });
      }
    }
    flash(`Đã lưu mục tiêu: "${g.title}"`);
    setModal(null);
  };
  const saveTx = t => { // khoản hiệu lực (không gắn việc / việc đã xong) được chia ngay vào mục tiêu tự động; khoản chờ thì chưa
    const old = db.txs.find(x => x.id === t.id), signed = x => x.type === 'income' ? x.amount : -x.amount, task = t.taskId && db.tasks.find(k => k.id === t.taskId);
    const eff = !task || task.status === 'done', { alloc: _o, ...base } = t;
    let alloc = null;
    if (eff && t.autoGoal !== false) {
      if (t.goalId) {
        alloc = { [t.goalId]: signed(t) };
      } else {
        alloc = splitAlloc({ ...db, txs: db.txs.filter(x => x.id !== t.id) }, signed(t));
      }
    }
    const nt = alloc ? { ...base, alloc } : { ...base, alloc: null };
    setDb(d => {
      const groups = d.groups.some(g => g.name === t.grp) ? d.groups : [...d.groups, { name: t.grp, share: .1, color: PAL[d.groups.length % PAL.length] }];
      return { ...d, groups, txs: old ? d.txs.map(x => x.id === t.id ? nt : x) : [...d.txs, nt] };
    });
    if (cloudUser) syncService.upsertTx(cloudUser.id, nt);
    flash(`Đã lưu ${t.type === 'income' ? 'thu nhập' : 'chi tiêu'}: ${money(t.amount)}`);
    setModal(null);
  };
  const saveTask = t => { // lưu việc; nếu đổi trạng thái hoàn thành thì cập nhật mục tiêu
    const { txs: _tx, ...clean } = t;
    if (clean.date > today() && clean.status === 'done') {
      clean.status = 'todo';
      flash('⚠️ Chưa đến ngày nên chưa thể hoàn thành việc này');
    }
    setDb(d => {
      const old = d.tasks.find(x => x.id === clean.id), nd = { ...d, tasks: old ? d.tasks.map(x => x.id === clean.id ? clean : x) : [...d.tasks, clean] }, was = !!old && old.status === 'done', now = clean.status === 'done';
      if (was === now) return nd;
      const updatedTxs = retarget(nd, clean.id, now);
      if (cloudUser) {
        updatedTxs.filter(x => x.taskId === clean.id).forEach(x => syncService.upsertTx(cloudUser.id, x));
      }
      return { ...nd, txs: updatedTxs };
    });
    if (cloudUser) syncService.upsertTask(cloudUser.id, clean);
    flash(`Đã lưu: "${clean.title}"`);
    setModal(null);
  };
  const delTask = id => {
    const t = db.tasks.find(x => x.id === id); if (!t) return;
    setDb(d => {
      const nd = { ...d, tasks: d.tasks.filter(x => x.id !== id) };
      if (t.status === 'done') return nd;
      const updatedTxs = retarget(nd, id, true);
      if (cloudUser) {
        updatedTxs.filter(x => x.taskId === id).forEach(x => syncService.upsertTx(cloudUser.id, x));
      }
      return { ...nd, txs: updatedTxs };
    });
    if (cloudUser) syncService.deleteTask(cloudUser.id, id);
    flash('Đã xóa', () => {
      setDb(d => {
        const nd = { ...d, tasks: [...d.tasks, t] };
        if (t.status === 'done') return nd;
        const updatedTxs = retarget(nd, id, false);
        if (cloudUser) {
          updatedTxs.filter(x => x.taskId === id).forEach(x => syncService.upsertTx(cloudUser.id, x));
        }
        return { ...nd, txs: updatedTxs };
      });
      if (cloudUser) syncService.upsertTask(cloudUser.id, t);
      setToast(null);
    });
  };
  const toggleAuto = g => {
    const updated = { ...g, auto: !g.auto };
    setDb(d => ({ ...d, goals: d.goals.map(x => x.id === g.id ? updated : x) }));
    if (cloudUser) syncService.upsertGoal(cloudUser.id, updated);
  };
  const cyclePri = g => {
    const nextPri = { 'Thấp': 'Trung bình', 'Trung bình': 'Cao', 'Cao': 'Thấp' }[goalPri(g)];
    const updated = { ...g, pri: nextPri };
    setDb(d => ({ ...d, goals: d.goals.map(x => x.id === g.id ? updated : x) }));
    if (cloudUser) syncService.upsertGoal(cloudUser.id, updated);
  };
  const pasteClip = target => { // dán việc đã sao chép: tuần → vào tuần bắt đầu `target`; ngày → vào ngày `target`. Bỏ qua việc trùng, trạng thái về "Chưa làm"
    if (!clip) return 0;
    const add = clip.items.map(({ off, ...r }) => ({ ...r, id: uid(), date: clip.kind === 'week' ? addDays(target, off) : target, status: 'todo' }))
      .filter(n => !db.tasks.some(x => x.date === n.date && x.start === n.start && x.end === n.end && x.title === n.title));
    if (add.length) {
      setDb(d => ({ ...d, tasks: [...d.tasks, ...add] }));
      if (cloudUser) add.forEach(item => syncService.upsertTask(cloudUser.id, item));
    }
    return add.length;
  };
  const toggle = t => {
    if (t.date > today()) {
      flash('⚠️ Chưa đến ngày nên chưa thể hoàn thành việc này');
      return;
    }
    const done = t.status !== 'done', net = db.txs.filter(x => x.taskId === t.id).reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0);
    saveTask({ ...t, status: done ? 'done' : 'todo' });
    const curTasks = db.tasks.filter(x => x.date === t.date);
    const remaining = curTasks.filter(x => x.id !== t.id && x.status !== 'done').length;
    if (done && remaining === 0 && curTasks.length > 0) {
      flash(t.date === today() ? '🎉 Hoàn thành hết việc hôm nay! Tự thưởng một ly cà phê nhé ☕✨' : `🎉 Hoàn thành hết việc ngày ${t.date.split('-').reverse().join('/')}!`);
    } else if (net && db.goals.some(g => g.auto && g.unit === 'đ')) {
      flash(`Mục tiêu: ${(done ? net : -net) > 0 ? '+' : '−'}${money(Math.abs(net))}`);
    }
  };
  const bump = g => upsert('goals', { ...g, current: g.current + 1 });
  const P = { db, openTx, openTask, openGoal, openList, openProfile, openGroups, clip, setClip, pasteClip, toggle, delTask, toggleAuto, cyclePri, delTx: id => del('txs', id), delGoal: id => del('goals', id), bump, importIcs, curDate: homeDate, setCurDate: setHomeDate };
  return (<div className="app">
    <aside className="side"><div className="logo"><LogoIcon s={34} /> Cà Phê</div><small className="mut">Quản lý cuộc sống sinh viên</small>
      <nav>{NAV.map(([k, i, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><span>{i}</span>{l}</button>)}</nav>
    </aside>
    <main>
      <div className="top">
        <div className="logo mobl"><LogoIcon s={26} /> Cà Phê</div>
      </div>
      <div key={page}>{page === 'today' && <Today {...P} />}{page === 'cal' && <Calendar {...P} />}{page === 'fin' && <Finance {...P} />}{page === 'goal' && <Goals {...P} />}</div>
    </main>
    <nav className="bot">{NAV.map(([k, i, l]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}><span>{i}</span>{l}</button>)}</nav>
    {toast && <div className="toast"><span>{toast.msg}</span>{toast.undo && <button onClick={toast.undo}>Hoàn tác</button>}</div>}
    {modal?.k === 'task' && <TaskForm item={modal.it} onSave={saveTask} onClose={() => setModal(null)} onDel={id => { delTask(id); setModal(null); }} />}
    {modal?.k === 'tx' && <TxForm item={modal.it} onSave={saveTx} onClose={() => setModal(null)} />}
    {modal?.k === 'goal' && <GoalForm item={modal.it} onSave={saveGoal} onClose={() => setModal(null)} />}
    {modal?.k === 'profile' && (
      <ProfileModal
        p={db.profile}
        counts={`${db.tasks.length} việc · ${db.txs.length} giao dịch · ${db.goals.length} mục tiêu`}
        db={db}
        cloudUser={cloudUser}
        onClose={() => setModal(null)}
        onSave={p => {
          setDb(d => ({ ...d, profile: p }));
          if (cloudUser) syncService.saveProfile(cloudUser.id, p);
          onRename(p.name);
          setModal(null);
        }}
        onLogout={onLogout}
        onDelete={onDelete}
        onReset={() => {
          setDb(d => ({ ...d, tasks: [], txs: [], goals: [] }));
          setModal(null);
        }}
        flash={flash}
        onCloudLinked={(user, linkedDb) => {
          setCloudUser(user);
          if (onCloudLinked) onCloudLinked(user, linkedDb);
        }}
      />
    )}
    {modal?.k === 'groups' && <GroupsModal groups={db.groups} onClose={() => setModal(null)} onAdd={name => setDb(d => ({ ...d, groups: [...d.groups, { name, share: .1, color: PAL[d.groups.length % PAL.length] }] }))} onRemove={name => setDb(d => ({ ...d, groups: d.groups.filter(g => g.name !== name) }))} />}
    {modal?.k === 'list' && <TxList db={db} type={modal.type} date={modal.date} onClose={() => setModal(null)} onAdd={() => openTx(modal.type, { date: modal.date || today() })} onEdit={x => openTx(x.type, x)} onDel={id => del('txs', id)} />}
  </div>);
}
// Gốc: quản lý tài khoản (đăng nhập lại / tạo mới) và giao diện sáng-tối
export default function Root() {
  const [m, setM] = useState(loadMeta), [onboarding, setOnboarding] = useState(null);
  useEffect(() => { wr(META, { ...m, theme: 'dark' }); document.documentElement.dataset.theme = 'dark'; }, [m]);

  const delAccount = async (accId, deleteCloud = false) => {
    if (deleteCloud) await authService.deleteOwnAccount();
    try { localStorage.removeItem(ACC(accId)); } catch (e) {}
    if (deleteCloud) await authService.signOut().catch(() => {});
    setM(x => ({
      ...x,
      active: x.active === accId ? null : x.active,
      accounts: x.accounts.filter(a => a.id !== accId),
    }));
  };

  const handleCloudLinked = (user, linkedDb) => {
    const accountName = user.user_metadata?.full_name || linkedDb.profile?.name || user.email.split('@')[0];
    wr(ACC(user.id), upgrade({ ...linkedDb, tasks: dedupeTasks(linkedDb.tasks) }));
    setM(x => {
      const filtered = x.accounts.filter(a => a.id !== x.active && a.id !== user.id);
      return {
        ...x,
        active: user.id,
        accounts: [...filtered, { id: user.id, name: accountName }],
      };
    });
  };

  const handleCloudLogin = (user, cloudData) => {
    const accountName = user.user_metadata?.full_name || cloudData?.profile?.name || user.email?.split('@')[0] || 'Người dùng';
    const localDb = rd(ACC(user.id));
    const activeAcc = m.accounts.find(a => a.id === m.active) || m.accounts[0];
    const prevDb = activeAcc ? rd(ACC(activeAcc.id)) : null;

    let baseDb = seed();
    if (cloudData && (cloudData.tasks?.length || cloudData.txs?.length || cloudData.goals?.length || cloudData.profile)) {
      baseDb = cloudData;
    } else if (localDb && (localDb.tasks?.length || localDb.txs?.length || localDb.goals?.length || localDb.profile)) {
      baseDb = localDb;
    } else if (prevDb && (prevDb.tasks?.length || prevDb.txs?.length || prevDb.goals?.length)) {
      baseDb = prevDb;
    }

    setOnboarding({
      user,
      baseDb,
      initialName: accountName,
      initialBudget: baseDb.profile?.budget || '',
      initialIncome: baseDb.profile?.income || '',
      initialGoals: baseDb.goals && baseDb.goals.length ? baseDb.goals : [{ title: '', target: '', unit: 'đ' }],
    });
  };

  const completeOnboarding = f => {
    if (!onboarding) return;
    const { user, baseDb } = onboarding;
    const gl = (f.goals || [])
      .filter(g => g.title && g.title.trim() && +g.target > 0)
      .map(g => ({
        id: g.id || uid(),
        title: g.title.trim(),
        current: g.current || 0,
        target: +g.target,
        unit: g.unit.trim() || 'đ',
        auto: g.unit.trim() === 'đ' ? (g.auto !== undefined ? g.auto : true) : false,
      }));

    const finalDb = upgrade({
      ...baseDb,
      profile: {
        ...(baseDb.profile || {}),
        name: f.name.trim(),
        budget: +f.budget || 0,
        income: +f.income || 0,
        hasOnboarded: true,
      },
      goals: gl,
    });

    wr(ACC(user.id), finalDb);
    syncService.uploadAll(user.id, finalDb).catch(console.error);

    setM(x => {
      const filtered = x.accounts.filter(a => a.id !== user.id);
      return {
        ...x,
        active: user.id,
        accounts: [...filtered, { id: user.id, name: f.name.trim() }],
      };
    });

    setOnboarding(null);
  };

  const cancelOnboarding = () => {
    authService.signOut().catch(() => {});
    setOnboarding(null);
  };

  if (onboarding) {
    return (
      <Onboarding
        initialName={onboarding.initialName}
        initialBudget={onboarding.initialBudget}
        initialIncome={onboarding.initialIncome}
        initialGoals={onboarding.initialGoals}
        onDone={completeOnboarding}
        onBack={cancelOnboarding}
      />
    );
  }

  if (m.active) {
    return (
      <App
        key={m.active}
        id={m.active}
        onLogout={() => { authService.signOut().catch(() => {}); setM({ ...m, active: null }); }}
        onRename={name => setM(x => ({ ...x, accounts: x.accounts.map(a => a.id === x.active ? { ...a, name } : a) }))}
        onDelete={deleteCloud => delAccount(m.active, deleteCloud)}
        onCloudLinked={handleCloudLinked}
      />
    );
  }

  return (
    <AuthScreen
      accounts={m.accounts}
      onPick={id => setM({ ...m, active: id })}
      onDelAccount={delAccount}
      onCloudLogin={handleCloudLogin}
    />
  );
}

