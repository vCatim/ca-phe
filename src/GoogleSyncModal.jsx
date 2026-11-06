import React, { useState, useEffect } from 'react';
import {
  getGoogleClientId,
  saveGoogleClientId,
  getStoredGoogleAuth,
  isGoogleConnected,
  isGoogleTokenValid,
  requestGoogleAccessToken,
  clearGoogleAuth,
} from './googleAuth';
import {
  getGoogleSyncSettings,
  saveGoogleSyncSettings,
  runTwoWayGoogleSync,
} from './googleSync';

export function GoogleSyncModal({ onClose, db, onSyncComplete, flash }) {
  const [connected, setConnected] = useState(isGoogleConnected());
  const [tokenValid, setTokenValid] = useState(isGoogleTokenValid());
  const [authData, setAuthData] = useState(getStoredGoogleAuth());
  const [clientId, setClientId] = useState(getGoogleClientId());
  const [settings, setSettings] = useState(getGoogleSyncSettings());
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  useEffect(() => {
    const auth = getStoredGoogleAuth();
    setAuthData(auth);
    setConnected(isGoogleConnected());
    setTokenValid(isGoogleTokenValid());
  }, []);

  const handleSaveSettings = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveGoogleSyncSettings(updated);
  };

  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (!clientId.trim()) {
      setStatusMsg({ type: 'err', text: 'Vui lòng nhập Google Client ID trước khi kết nối.' });
      return;
    }

    saveGoogleClientId(clientId.trim());
    setLoading(true);
    setStatusMsg(null);

    try {
      const auth = await requestGoogleAccessToken(clientId.trim());
      setAuthData(auth);
      setConnected(true);
      setTokenValid(true);
      setStatusMsg({ type: 'ok', text: 'Kết nối tài khoản Google thành công!' });
      if (flash) flash('✅ Kết nối Google thành công');
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: 'err',
        text: err.message || 'Không thể kết nối với Google. Vui lòng kiểm tra Client ID và cấu hình Redirect URI.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Bạn có chắc muốn ngắt kết nối Google Calendar & Tasks?')) {
      clearGoogleAuth();
      setConnected(false);
      setAuthData(null);
      setStatusMsg({ type: 'ok', text: 'Đã ngắt kết nối tài khoản Google.' });
      if (flash) flash('Đã ngắt kết nối Google');
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setStatusMsg(null);

    try {
      const syncResult = await runTwoWayGoogleSync(db.tasks || []);
      if (onSyncComplete) {
        onSyncComplete(syncResult.tasks);
      }

      const r = syncResult.results;
      const summaryText = `Đã kéo ${r.pulledFromCalendar} lịch, ${r.pulledFromTasks} việc từ Google; Đã đẩy ${r.pushedToCalendar} lịch, ${r.pushedToTasks} việc lên Google.`;

      setStatusMsg({
        type: 'ok',
        text: `Đồng bộ 2 chiều thành công! ${summaryText}`,
      });

      if (flash) flash('✨ Đồng bộ Google hoàn tất!');
    } catch (err) {
      console.error(err);
      setStatusMsg({
        type: 'err',
        text: err.message || 'Đồng bộ thất bại. Vui lòng kiểm tra lại kết nối mạng.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>📅</span>
            <h3 style={{ margin: 0 }}>Google Calendar & Tasks</h3>
          </div>
          <button className="ib" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: '.85rem',
              marginBottom: 12,
              background: statusMsg.type === 'ok' ? 'rgba(79, 154, 98, 0.16)' : 'rgba(232, 144, 106, 0.16)',
              color: statusMsg.type === 'ok' ? 'var(--ok)' : 'var(--warn)',
              border: `1px solid ${statusMsg.type === 'ok' ? 'var(--ok)' : 'var(--warn)'}`,
            }}
          >
            {statusMsg.text}
          </div>
        )}

        {connected ? (
          /* TRẠNG THÁI: ĐÃ KẾT NỐI */
          <div className="col gap">
            <div className="card" style={{ padding: 14, background: 'var(--card2)' }}>
              <div className="row between" style={{ alignItems: 'center' }}>
                <div className="row gap" style={{ alignItems: 'center' }}>
                  {authData?.user?.picture ? (
                    <img
                      src={authData.user.picture}
                      alt="Avatar"
                      style={{ width: 40, height: 40, borderRadius: '50%' }}
                    />
                  ) : (
                    <div className="ava">G</div>
                  )}
                  <div>
                    <b>{authData?.user?.name || 'Tài khoản Google'}</b>
                    <small>{authData?.user?.email || 'Đã kết nối OAuth2'}</small>
                  </div>
                </div>
                <span
                  className="chip"
                  style={{
                    position: 'static',
                    background: tokenValid ? 'var(--ok)' : 'var(--warn)',
                    color: '#fff',
                    fontSize: '.72rem',
                    padding: '3px 10px',
                    borderRadius: 99,
                  }}
                >
                  {tokenValid ? 'Sẵn sàng' : 'Hết hạn token'}
                </span>
              </div>
            </div>

            {!tokenValid && (
              <div className="card" style={{ padding: 12, borderColor: 'var(--warn)' }}>
                <p className="s mut" style={{ margin: '0 0 8px' }}>
                  Phiên đăng nhập Google đã hết hạn. Vui lòng cấp lại quyền để tiếp tục đồng bộ.
                </p>
                <button className="btn sm" onClick={handleConnect} disabled={loading}>
                  {loading ? 'Đang xác thực...' : 'Cấp lại quyền Google'}
                </button>
              </div>
            )}

            {/* Cài đặt đồng bộ */}
            <div className="card col gap" style={{ padding: 14 }}>
              <b>Tuỳ chọn đồng bộ hai chiều</b>
              <label className="row gap s" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={settings.syncCalendar}
                  onChange={(e) => handleSaveSettings('syncCalendar', e.target.checked)}
                />
                <span>Đồng bộ <b>Google Calendar</b> (lịch sự kiện, buổi học có giờ)</span>
              </label>

              <label className="row gap s" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={settings.syncTasks}
                  onChange={(e) => handleSaveSettings('syncTasks', e.target.checked)}
                />
                <span>Đồng bộ <b>Google Tasks</b> (danh sách công việc cần làm)</span>
              </label>

              <label className="row gap s" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={settings.autoSync}
                  onChange={(e) => handleSaveSettings('autoSync', e.target.checked)}
                />
                <span>Tự động cập nhật Google khi thêm / sửa / xóa việc trên máy</span>
              </label>
            </div>

            <div className="row gap" style={{ marginTop: 4 }}>
              <button
                className="btn grow"
                onClick={handleSyncNow}
                disabled={syncing}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>{syncing ? '⏳' : '🔄'}</span>
                <span>{syncing ? 'Đang đồng bộ...' : 'Đồng bộ hai chiều ngay'}</span>
              </button>
            </div>

            <div className="row between" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              <button className="btn sm out" onClick={() => setConnected(false)}>
                ⚙️ Đổi Client ID
              </button>
              <button className="btn sm out dng" onClick={handleDisconnect}>
                Ngắt kết nối Google
              </button>
            </div>
          </div>
        ) : (
          /* TRẠNG THÁI: CHƯA KẾT NỐI */
          <form onSubmit={handleConnect} className="col gap">
            <p className="mut s" style={{ margin: 0 }}>
              Kết nối hai chiều với <b>Google Calendar</b> & <b>Google Tasks</b> giúp bạn xem và cập nhật lịch trình trên mọi thiết bị (điện thoại, máy tính, widget Google).
            </p>

            <label className="f">
              <span>Google OAuth Client ID</span>
              <input
                type="text"
                placeholder="VD: 123456789-abc.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
            </label>

            <button
              type="button"
              className="btn sm out"
              style={{ alignSelf: 'flex-start', margin: '4px 0' }}
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? 'Ẩn hướng dẫn ▴' : '❓ Hướng dẫn lấy Client ID (2 phút) ▾'}
            </button>

            {showHelp && (
              <div className="card s mut col" style={{ gap: 8, padding: 12, background: 'var(--card2)', fontSize: '.8rem', lineHeight: 1.5 }}>
                <b>Các bước lấy Google Client ID:</b>
                <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--acc)' }}>Google Cloud Console</a> và tạo một Dự án (Project) mới.</li>
                  <li>Vào <b>APIs & Services</b> &gt; <b>Library</b>: Bật <b>Google Calendar API</b> và <b>Google Tasks API</b>.</li>
                  <li>Vào <b>OAuth consent screen</b>: Chọn <i>External</i>, đặt tên ứng dụng (Cà Phê), thêm email của bạn vào mục <i>Test Users</i>.</li>
                  <li>Vào <b>Credentials</b> &gt; <b>Create Credentials</b> &gt; chọn <b>OAuth client ID</b>:
                    <br />- Application type: <b>Web application</b>.
                    <br />- Authorized JavaScript origins: Thêm URL hiện tại của bạn: <code style={{ color: 'var(--acc)' }}>{currentOrigin}</code>
                  </li>
                  <li>Copy chuỗi <b>Client ID</b> và dán vào ô bên trên.</li>
                </ol>
              </div>
            )}

            <button
              type="submit"
              className="btn"
              disabled={loading || !clientId.trim()}
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span>{loading ? '⏳' : '🔗'}</span>
              <span>{loading ? 'Đang kết nối...' : 'Đăng nhập & Cấp quyền Google'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
