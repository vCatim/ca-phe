import React, { useState, useEffect } from 'react';
import {
  getNotificationSettings,
  saveNotificationSettings,
  checkNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  resyncAllReminders,
} from './notificationManager';

export function NotificationModal({ onClose, tasks = [], flash }) {
  const [settings, setSettings] = useState(getNotificationSettings());
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    checkNotificationPermission().then(setPermissionGranted);
  }, []);

  const handleToggleEnable = async (enabled) => {
    if (enabled && !permissionGranted) {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (!granted) {
        setMsg({ type: 'err', text: 'Cần cấp quyền thông báo trong cài đặt để bật tính năng này.' });
        return;
      }
    }

    const updated = { ...settings, enabled };
    setSettings(updated);
    saveNotificationSettings(updated);

    if (enabled) {
      resyncAllReminders(tasks);
      if (flash) flash('🔔 Đã bật thông báo nhắc lịch');
    } else {
      if (flash) flash('🔕 Đã tắt thông báo');
    }
  };

  const handleChangeLeadMinutes = (leadMinutes) => {
    const updated = { ...settings, leadMinutes: Number(leadMinutes) };
    setSettings(updated);
    saveNotificationSettings(updated);
    if (updated.enabled) {
      resyncAllReminders(tasks);
    }
    if (flash) flash(`Đã đổi: Nhắc trước ${leadMinutes} phút`);
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setMsg(null);
    try {
      await sendTestNotification();
      setPermissionGranted(true);
      setMsg({ type: 'ok', text: 'Đã gửi thông báo thử! Bạn hãy kiểm tra khay thông báo nhé.' });
    } catch (e) {
      setMsg({ type: 'err', text: e.message || 'Không gửi được thông báo.' });
    } finally {
      setTesting(false);
    }
  };

  const leadOptions = [
    [0, 'Đúng giờ bắt đầu (0 phút)'],
    [5, 'Trước 5 phút'],
    [10, 'Trước 10 phút (Khuyên dùng)'],
    [15, 'Trước 15 phút'],
    [30, 'Trước 30 phút'],
  ];

  return (
    <div className="ov" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet" role="dialog" aria-modal="true" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <h3 style={{ margin: 0 }}>Cài đặt Thông báo</h3>
          </div>
          <button className="ib" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        {msg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: '.85rem',
              marginBottom: 12,
              background: msg.type === 'ok' ? 'rgba(79, 154, 98, 0.16)' : 'rgba(232, 144, 106, 0.16)',
              color: msg.type === 'ok' ? 'var(--ok)' : 'var(--warn)',
              border: `1px solid ${msg.type === 'ok' ? 'var(--ok)' : 'var(--warn)'}`,
            }}
          >
            {msg.text}
          </div>
        )}

        <div className="col gap">
          {/* Trạng thái quyền */}
          <div className="card" style={{ padding: 12, background: 'var(--card2)' }}>
            <div className="row between" style={{ alignItems: 'center' }}>
              <div>
                <small className="mut">Quyền thông báo hệ thống</small>
                <div style={{ fontWeight: 600, fontSize: '.95rem', marginTop: 2 }}>
                  {permissionGranted ? '🟢 Đã cho phép' : '⚠️ Chưa cấp quyền'}
                </div>
              </div>
              {!permissionGranted && (
                <button
                  className="btn sm"
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    setPermissionGranted(granted);
                  }}
                >
                  Cấp quyền
                </button>
              )}
            </div>
          </div>

          {/* Bật / tắt */}
          <label className="row between card" style={{ padding: 14, cursor: 'pointer' }}>
            <div>
              <b>Bật thông báo nhắc việc</b>
              <small className="mut">Báo chuông và hiện pop-up khi đến lịch</small>
            </div>
            <input
              type="checkbox"
              style={{ width: 22, height: 22, cursor: 'pointer' }}
              checked={settings.enabled}
              onChange={(e) => handleToggleEnable(e.target.checked)}
            />
          </label>

          {/* Chọn thời gian báo trước */}
          {settings.enabled && (
            <div className="card col gap" style={{ padding: 14 }}>
              <b>Thời điểm nhắc nhở</b>
              <div className="col" style={{ gap: 8 }}>
                {leadOptions.map(([val, label]) => (
                  <label key={val} className="row gap s" style={{ cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="leadMinutes"
                      style={{ width: 'auto' }}
                      checked={settings.leadMinutes === val}
                      onChange={() => handleChangeLeadMinutes(val)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Nút thử nghiệm */}
          <button
            type="button"
            className="btn out"
            disabled={testing}
            onClick={handleTestNotification}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span>🔔</span>
            <span>{testing ? 'Đang gửi...' : 'Bấm để gửi thông báo thử'}</span>
          </button>

          <p className="mut s" style={{ margin: '4px 0 0', lineHeight: 1.5, fontSize: '.78rem' }}>
            💡 <i>Ghi chú:</i> Trên Android APK, thông báo sử dụng bộ đếm hệ thống (AlarmManager) nên sẽ báo chính xác từng giây mà <b>hoàn toàn không tốn pin hay RAM nền</b> khi bạn khóa màn hình.
          </p>
        </div>
      </div>
    </div>
  );
}
