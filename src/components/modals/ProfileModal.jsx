import React, { useState } from 'react';
import { Modal, Field, MoneyInput } from '../ui/FormControls';
import { authService } from '../../supabase';
import { syncService } from '../../supabaseSync';
import { mergeCloudData } from '../../utils/storage';

export function ProfileModal({
  p,
  counts,
  db,
  cloudUser,
  onClose,
  onSave,
  onLogout,
  onDelete,
  onReset,
  onDownloadCloud,
  flash,
  onCloudLinked,
  openGoogleSync,
  openNotification
}) {
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
      const uploaded = await syncService.uploadAll(cloudUser.id, db);
      if (!uploaded) throw new Error('Upload failed');
      flash(`🎉 Đã sao lưu toàn bộ ${db.tasks.length} việc, ${db.txs.length} giao dịch và ${db.goals.length} quỹ lên email!`);
    } catch (e) {
      flash('❌ Không thể đồng bộ, hãy kiểm tra kết nối mạng.');
    } finally {
      setSyncing(false);
    }
  };

  const doDownloadCloud = async () => {
    if (!cloudUser || !window.confirm('Tải dữ liệu mới nhất từ cloud sẽ thay thế dữ liệu đang có trên máy này. Bạn có muốn tiếp tục?')) return;
    setSyncing(true);
    try {
      const downloaded = await syncService.fetchAll(cloudUser.id);
      if (!downloaded) throw new Error('Download failed');
      onDownloadCloud(downloaded);
      flash('☁️ Đã tải dữ liệu mới nhất từ Email về máy này.');
    } catch (e) {
      flash('❌ Không thể tải dữ liệu từ cloud, hãy kiểm tra kết nối mạng.');
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

      const cloud = await syncService.fetchAll(user.id);
      const mergedDb = mergeCloudData(cloud, {
        ...db,
        profile: { ...db.profile, hasOnboarded: true },
      });
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
                  <span className="tag" style={{ background: 'color-mix(in srgb,var(--ok) 18%,transparent)', color: 'var(--ok)' }}>Đã liên kết</span>
                </div>
                <div style={{ wordBreak: 'break-all' }}>
                  <b>{cloudUser.email}</b>
                </div>
                <p className="mut s" style={{ margin: 0 }}>
                  Dữ liệu của bạn được tự động sao lưu an toàn trên đám mây Supabase.
                </p>
                <div className="sync-actions" style={{ marginTop: 2 }}>
                  <button className="btn sm out" disabled={syncing} onClick={doDownloadCloud} aria-label="Tải dữ liệu từ Email về máy">
                    {syncing ? 'Đang tải...' : '☁️ Tải từ Email'}
                  </button>
                  <button className="btn sm" disabled={syncing} onClick={doSyncAll} aria-label="Sao lưu dữ liệu máy này lên Email">
                    {syncing ? 'Đang tải...' : '↥ Sao lưu lên Email'}
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
                  Dữ liệu hiện chỉ lưu trên trình duyệt này. Hãy kết nối email để chuyển toàn bộ <b>{db.tasks.length} việc</b>, <b>{db.txs.length} giao dịch</b> và <b>{db.goals.length} quỹ</b> lên đám mây, không lo mất khi đổi máy.
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
          <button className="btn out" onClick={() => { onClose(); if (openGoogleSync) openGoogleSync(); }}>📅 Đồng bộ Google Calendar & Tasks</button>
          <button className="btn out" onClick={() => { onClose(); if (openNotification) openNotification(); }}>🔔 Cài đặt thông báo nhắc việc</button>
          <button className="btn out" onClick={onLogout}>🚪 Đăng xuất</button>
          <button className="btn out dng" onClick={() => setV('del_confirm')}>🗑 Xóa tài khoản này</button>
        </>
      )}

      {v === 'link_email' && (
        <div className="col gap">
          <p className="mut s" style={{ margin: 0, lineHeight: 1.5 }}>
            Nhập email và mật khẩu. Toàn bộ <b>{db.tasks.length} việc</b>, <b>{db.txs.length} giao dịch</b> và <b>{db.goals.length} quỹ</b> hiện có trên máy này sẽ được tải thẳng lên email của bạn!
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
            Toàn bộ việc cần làm, lịch trình, các giao dịch và quỹ sẽ bị <strong>xóa vĩnh viễn</strong> và không thể khôi phục.{cloudUser ? ' Tài khoản Email này cũng sẽ bị xóa khỏi Supabase.' : ' Tài khoản này chỉ được lưu trên máy.'}
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
            {sure2 ? 'Bấm lần nữa để xóa hết việc, giao dịch, quỹ' : '🧹 Xóa toàn bộ việc, giao dịch, quỹ'}
          </button>
        </>
      )}
    </Modal>
  );
}
