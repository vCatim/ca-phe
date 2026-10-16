import React, { useState, useEffect, useRef } from 'react';
import { authService } from './supabase';
import { syncService } from './supabaseSync';
import { SCENE, CAPTIONS } from './authScene';
import './auth.css';

const I = {
  mail: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  lock: <path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6" />,
  eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  off: <path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6A17 17 0 0 0 2 12s4 7 10 7c1.8 0 3.4-.6 4.8-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
};
const Ic = ({ n, c = 'ic' }) => <svg className={c} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{I[n]}</svg>;

const Logo = ({ s = 30 }) => (<svg viewBox="0 0 48 48" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
  <path d="M10 20h24v10a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z" fill="currentColor" fillOpacity=".2" /><path d="M34 22h3a5 5 0 0 1 0 10h-4" />
  <path className="steam" d="M16 8c-2 2 2 4 0 7M23 6c-2 2 2 4 0 8M30 8c-2 2 2 4 0 7" /><path d="M8 44h28" /></svg>);

// Dịch lỗi Supabase sang tiếng Việt dễ hiểu
const errVi = e => {
  const m = (e && e.message) || '';
  if (/invalid login/i.test(m)) return 'Email hoặc mật khẩu chưa đúng, thử lại nhé.';
  if (/not confirmed/i.test(m)) return 'Email này chưa được xác nhận. Hãy mở hộp thư và bấm vào liên kết nhé.';
  if (/already registered|already been registered/i.test(m)) return 'Email này đã có tài khoản, hãy chuyển qua "Đăng nhập".';
  if (/at least 6/i.test(m)) return 'Mật khẩu cần tối thiểu 6 ký tự.';
  if (/rate limit|too many/i.test(m)) return 'Bạn thử quá nhiều lần, đợi một lát rồi thử lại nhé.';
  if (/fetch|network/i.test(m)) return 'Không kết nối được mạng, kiểm tra lại giúp mình nhé.';
  return m || 'Có lỗi xảy ra, thử lại sau nhé.';
};

// Hiệu ứng parallax: chuột (máy tính), chạm/kéo + nghiêng máy (điện thoại), tự đung đưa nhẹ khi đứng yên
function useParallax(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, last = 0, tilt = 0, raf = 0;
    const touch = (x, y) => { tx = x; ty = y; last = performance.now(); };
    const onMove = e => touch((e.clientX / innerWidth - .5) * 2, (e.clientY / innerHeight - .5) * 2);
    const onScroll = () => { ty = Math.max(-1, Math.min(1, scrollY / (innerHeight * .5))); last = performance.now(); };
    const onTilt = e => { if (e.gamma == null) return; tilt = performance.now(); tx = Math.max(-1, Math.min(1, e.gamma / 25)); ty = Math.max(-1, Math.min(1, ((e.beta || 45) - 45) / 25)); };
    const loop = t => {
      if (t - last > 2500 && t - tilt > 2500) { tx = Math.sin(t / 2400) * .45; ty = Math.cos(t / 3100) * .3; }
      cx += (tx - cx) * .06; cy += (ty - cy) * .06;
      el.style.setProperty('--mx', cx.toFixed(3)); el.style.setProperty('--my', cy.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    addEventListener('pointermove', onMove, { passive: true }); addEventListener('scroll', onScroll, { passive: true }); addEventListener('deviceorientation', onTilt);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('deviceorientation', onTilt); };
  }, []);
}

function Scene() {
  const ref = useRef(null), [i, setI] = useState(0), tm = useRef(0);
  useParallax(ref);
  // câu giới thiệu tự đổi sau mỗi 5,5 giây
  useEffect(() => { tm.current = setTimeout(() => setI((i + 1) % CAPTIONS.length), 5500); return () => clearTimeout(tm.current); }, [i]);
  return (
    <div className="au-scene" ref={ref}>
      {SCENE.map((l, k) => <div key={k} className="au-l" style={{ '--d': l.d }}><div className="au-li" dangerouslySetInnerHTML={{ __html: l.html }} /></div>)}
      <div className="au-brand"><Logo s={30} /> Cà Phê</div>
      <div className="au-cap">
        <p key={i}>{CAPTIONS[i]}</p>
      </div>
    </div>
  );
}

const Field = ({ icon, label, children, extra, hasVal }) => (
  <label className={'au-f' + (hasVal ? ' has-val' : '')}>
    <Ic n={icon} />
    {children}
    <span>{label}</span>
    {extra}
  </label>
);

export function AuthScreen({ accounts = [], onPick, onNew, onCloudLogin, theme, toggleTheme }) {
  const [tab, setTab] = useState('login'), [name, setName] = useState(''), [email, setEmail] = useState(''), [pw, setPw] = useState('');
  const [show, setShow] = useState(false), [loading, setLoading] = useState(false), [msg, setMsg] = useState(null), [out, setOut] = useState(false);
  const login = tab === 'login';

  const enter = async user => {
    let cloud = null;
    try { const c = await syncService.fetchAll(user.id); if (c && (c.tasks.length || c.txs.length || c.goals.length || c.profile)) cloud = c; } catch (e) {}
    setMsg({ t: 'ok', s: 'Đăng nhập thành công, chào mừng bạn!' }); setOut(true);
    setTimeout(() => onCloudLogin(user, cloud), 550);
  };
  const submit = async e => {
    e.preventDefault(); setLoading(true); setMsg(null);
    try {
      if (login) { const r = await authService.signIn(email.trim(), pw); await enter(r.user); return; }
      const r = await authService.signUp(email.trim(), pw, name.trim());
      if (r.user && !r.session) setMsg({ t: 'ok', s: 'Đăng ký xong! Hãy mở email để xác nhận tài khoản, rồi quay lại đăng nhập nhé.' });
      else await enter(r.user);
    } catch (err) { setMsg({ t: 'err', s: errVi(err) }); } finally { setLoading(false); }
  };
  const forgot = async () => {
    if (!email.trim()) return setMsg({ t: 'err', s: 'Nhập email của bạn vào ô phía trên trước, rồi bấm lại nhé.' });
    try { await authService.resetPassword(email.trim()); setMsg({ t: 'ok', s: 'Đã gửi email đặt lại mật khẩu, kiểm tra hộp thư nhé.' }); }
    catch (err) { setMsg({ t: 'err', s: errVi(err) }); }
  };
  const swap = t => { setTab(t); setMsg(null); };

  return (
    <div className={'au-wrap' + (out ? ' au-out' : '')}>
      <div className="au-bg"><i /><i /></div>
      <button className="au-theme" onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối">{theme === 'dark' ? '☀️' : '🌙'}</button>
      <div className="au-card">
        <form className="au-form" onSubmit={submit}>
          <div className="au-h" key={tab} style={{ '--i': 0 }}>
            <h1>{login ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}</h1>
            <p>{login ? 'Đăng nhập để đồng bộ lịch, thu chi và mục tiêu trên mọi thiết bị.' : 'Chỉ mất một phút, dữ liệu của bạn được lưu an toàn trên đám mây.'}</p>
          </div>
          <div className="au-seg" style={{ '--i': 1, '--t': login ? 0 : 1 }} role="tablist"><i />
            <button type="button" className={login ? 'on' : ''} onClick={() => swap('login')}>Đăng nhập</button>
            <button type="button" className={!login ? 'on' : ''} onClick={() => swap('signup')}>Đăng ký</button>
          </div>
          <div className="au-fields" style={{ '--i': 2 }}>
            <div className={'au-col' + (!login ? ' open' : '')}><div>
              <Field icon="user" label="Tên của bạn" hasVal={Boolean(name)}><input value={name} onChange={e => setName(e.target.value)} placeholder=" " autoComplete="name" tabIndex={login ? -1 : 0} /></Field>
            </div></div>
            <Field icon="mail" label="Email" hasVal={Boolean(email)}><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder=" " autoComplete="email" required /></Field>
            <Field
              icon="lock"
              label="Mật khẩu"
              hasVal={Boolean(pw)}
              extra={
                <button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                  <Ic n={show ? 'off' : 'eye'} c="" />
                </button>
              }
            >
              <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder=" " minLength={6} autoComplete={login ? 'current-password' : 'new-password'} required />
            </Field>
          </div>
          <div className="au-row" style={{ '--i': 3 }}>{login ? <button type="button" className="au-link" onClick={forgot}>Quên mật khẩu?</button> : <span />}</div>
          {msg && <div className={'au-msg ' + msg.t} key={msg.s} role="status">{msg.s}</div>}
          <button className="au-go" disabled={loading} style={{ '--i': 4 }}>{loading ? <span className="au-spin" /> : <>{login ? 'Đăng nhập' : 'Tạo tài khoản'} <b>→</b></>}</button>
          <div className="au-or" style={{ '--i': 5 }}>hoặc dùng trên máy này</div>
          <div className="au-accs" style={{ '--i': 6 }}>
            {accounts.map(a => <button type="button" key={a.id} className="au-chip" onClick={() => onPick(a.id)}><span className="ava">{(a.name[0] || '?').toUpperCase()}</span>{a.name}</button>)}
            <button type="button" className="au-chip try" onClick={onNew}>+ Dùng thử, không cần tài khoản</button>
          </div>
        </form>
        <Scene />
      </div>
    </div>
  );
}
