import React, { useState, useEffect } from 'react';
import {
  isSupabaseConfigured,
  saveSupabaseConfig,
  clearSupabaseConfig,
  authService,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from './supabase';
import { syncService } from './supabaseSync';

export function SupabaseAuthModal({ onClose, currentDb, onSyncSuccess }) {
  const [configured, setConfigured] = useState(isSupabaseConfigured());
  const [url, setUrl] = useState(SUPABASE_URL || '');
  const [key, setKey] = useState(SUPABASE_ANON_KEY || '');
  const [tab, setTab] = useState('login'); // 'login' | 'signup' | 'config'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (configured) {
      authService.getUser().then(u => setCurrentUser(u)).catch(() => {});
    }
  }, [configured]);

  const handleSaveConfig = e => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) {
      setMsg({ type: 'err', text: 'Vui lòng nhập đầy đủ URL và Anon Key.' });
      return;
    }
    saveSupabaseConfig(url, key);
  };

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await authService.signIn(email, password);
      setCurrentUser(res.user);
      setMsg({ type: 'ok', text: 'Đăng nhập thành công!' });
      if (onSyncSuccess) onSyncSuccess(res.user);
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async e => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await authService.signUp(email, password, fullName);
      if (res.user && !res.session) {
        setMsg({ type: 'ok', text: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản nếu có bật xác thực email.' });
      } else {
        setCurrentUser(res.user);
        setMsg({ type: 'ok', text: 'Đăng ký và đăng nhập thành công!' });
        if (onSyncSuccess) onSyncSuccess(res.user);
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Đăng ký thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setCurrentUser(null);
      setMsg({ type: 'ok', text: 'Đã đăng xuất khỏi Supabase Cloud.' });
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCloud = async () => {
    if (!currentUser) return;
    setSyncing(true);
    setMsg(null);
    try {
      const ok = await syncService.uploadAll(currentUser.id, currentDb);
      if (ok) {
        setMsg({ type: 'ok', text: 'Đã sao lưu toàn bộ dữ liệu hiện tại lên Supabase Cloud thành công!' });
      } else {
        setMsg({ type: 'err', text: 'Đồng bộ thất bại, hãy chắc chắn bạn đã chạy file schema.sql trong SQL Editor.' });
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadCloud = async () => {
    if (!currentUser) return;
    setSyncing(true);
    setMsg(null);
    try {
      const cloudData = await syncService.fetchAll(currentUser.id);
      if (cloudData && (cloudData.tasks.length || cloudData.txs.length || cloudData.goals.length || cloudData.profile)) {
        if (onSyncSuccess) onSyncSuccess(currentUser, cloudData);
        setMsg({ type: 'ok', text: 'Đã tải dữ liệu từ đám mây về máy thành công!' });
      } else {
        setMsg({ type: 'ok', text: 'Tài khoản trên đám mây chưa có dữ liệu nào mới.' });
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="ov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h3 style={{ margin: 0 }}>Đám mây Supabase</h3>
          </div>
          <button className="ib" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {msg && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: '.85rem',
              marginBottom: 14,
              background: msg.type === 'ok' ? 'rgba(40,167,69,0.15)' : 'rgba(220,53,69,0.15)',
              color: msg.type === 'ok' ? 'var(--ok)' : 'var(--warn)',
              border: `1px solid ${msg.type === 'ok' ? 'var(--ok)' : 'var(--warn)'}`
            }}
          >
            {msg.text}
          </div>
        )}

        {/* Chưa cấu hình Supabase URL & Key */}
        {!configured || tab === 'config' ? (
          <form onSubmit={handleSaveConfig} className="col gap">
            <p className="mut s" style={{ margin: 0 }}>
              Nhập thông tin kết nối từ Supabase Dashboard (hoặc điền vào file <code>.env</code>):
            </p>
            <label className="f">
              <span>Project URL</span>
              <input
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                required
              />
            </label>
            <label className="f">
              <span>Anon Public Key</span>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={e => setKey(e.target.value)}
                required
              />
            </label>
            <div className="row gap" style={{ marginTop: 8 }}>
              <button type="submit" className="btn grow">Lưu & Kết nối</button>
              {configured && (
                <button type="button" className="btn out" onClick={() => setTab('login')}>
                  Hủy
                </button>
              )}
            </div>
            {configured && (
              <button
                type="button"
                className="btn out dng sm"
                style={{ marginTop: 6 }}
                onClick={clearSupabaseConfig}
              >
                Xóa thông tin cấu hình này
              </button>
            )}
          </form>
        ) : currentUser ? (
          /* Đã đăng nhập Supabase */
          <div className="col gap">
            <div className="card" style={{ padding: 12, background: 'var(--card2)' }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <div>
                  <small className="mut">Đang đăng nhập bằng Supabase</small>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: 2 }}>{currentUser.email}</div>
                </div>
                <span className="chip" style={{ background: 'var(--ok)', color: '#fff', fontSize: '.72rem', padding: '2px 8px', borderRadius: 99 }}>
                  Online
                </span>
              </div>
            </div>

            <div className="col gap" style={{ marginTop: 6 }}>
              <button
                className="btn"
                disabled={syncing}
                onClick={handleUploadCloud}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>☁️</span>
                <span>{syncing ? 'Đang đồng bộ...' : 'Sao lưu dữ liệu máy này lên Cloud'}</span>
              </button>

              <button
                className="btn out"
                disabled={syncing}
                onClick={handleDownloadCloud}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>📥</span>
                <span>Tải dữ liệu mới nhất từ Cloud về máy</span>
              </button>
            </div>

            <div className="row between" style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <button className="btn sm out" onClick={() => setTab('config')}>
                ⚙️ Cấu hình
              </button>
              <button className="btn sm out dng" disabled={loading} onClick={handleLogout}>
                🚪 Đăng xuất Cloud
              </button>
            </div>
          </div>
        ) : (
          /* Chưa đăng nhập - Form Login / Signup */
          <div>
            <div className="seg" style={{ marginBottom: 14 }}>
              <button className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>
                Đăng nhập
              </button>
              <button className={tab === 'signup' ? 'on' : ''} onClick={() => setTab('signup')}>
                Đăng ký mới
              </button>
            </div>

            <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="col gap">
              {tab === 'signup' && (
                <label className="f">
                  <span>Tên của bạn</span>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </label>
              )}
              <label className="f">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label className="f">
                <span>Mật khẩu</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" className="btn" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập Cloud →' : 'Tạo tài khoản Cloud →'}
              </button>
            </form>

            <div className="row between" style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <button className="btn sm out" onClick={() => setTab('config')}>
                ⚙️ Thay đổi Supabase URL / Key
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
