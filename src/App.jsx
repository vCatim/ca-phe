// ============ CÀ PHÊ — Ứng dụng Quản lý Thời gian & Chi tiêu ============
import React, { useState, useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Dịch vụ và Đồng bộ
import { authService } from './supabase';
import { syncService } from './supabaseSync';
import { AuthScreen } from './AuthScreen';
import { GoogleSyncModal } from './GoogleSyncModal';
import { syncSingleTaskWithGoogle } from './googleSync';
import { NotificationModal } from './NotificationModal';
import {
  scheduleTaskReminder,
  cancelTaskReminder,
  startWebNotificationWatcher,
  resyncAllReminders,
  ensureNotificationChannel,
  saveNotificationSettings
} from './notificationManager';

// Hằng số, Tiện ích & Lưu trữ
import { NAV, PAL } from './constants';
import { today, uid, addDays, money } from './utils/format';
import {
  loadMeta,
  loadDb,
  upgrade,
  mergeCloudData,
  hasCloudSetup,
  wr,
  rd,
  ACC,
  META,
  fundBalance,
  totalFundBalance,
  effectiveNet,
  availableBalance
} from './utils/storage';
import { parseIcs } from './utils/ics';
import { dedupeTasks, taskFingerprint } from './taskIdentity';
import { OUTBOX_EVENT } from './utils/outbox';

// Component giao diện (UI)
import { LogoIcon } from './components/ui/Icons';
import { ThemeToggle } from './components/ui/ThemeToggle';

// Modals
import { TaskForm } from './components/modals/TaskForm';
import { TxForm } from './components/modals/TxForm';
import { TxList } from './components/modals/TxList';
import { FundForm } from './components/modals/FundForm';
import { FundTransferForm } from './components/modals/FundTransferForm';
import { BalanceForm } from './components/modals/BalanceForm';
import { GroupsModal } from './components/modals/GroupsModal';
import { ProfileModal } from './components/modals/ProfileModal';

// Các trang (Pages)
import { Today } from './pages/Today';
import { Calendar } from './pages/Calendar';
import { Finance } from './pages/Finance';
import { Funds } from './pages/Funds';
import { Onboarding } from './pages/Onboarding';

// Xuất lại parseIcs cho tương thích
export { parseIcs };

function App({ id, onLogout, onRename, onDelete, onCloudLinked, theme, themeColor = 'coffee', toggleTheme, setTheme, setThemeColor }) {
  const [db, setDb] = useState(() => loadDb(id));
  const [page, setPage] = useState('today');
  const [modal, setModal] = useState(null);
  const [clip, setClip] = useState(null);
  const [toast, setToast] = useState(null);
  const tt = useRef(null);
  const [cloudUser, setCloudUser] = useState(null);
  const [homeDate, setHomeDate] = useState(today());
  const [pendingSync, setPendingSync] = useState(0);

  const modalRef = useRef(modal);
  const pageRef = useRef(page);
  modalRef.current = modal;
  pageRef.current = page;

  // 1. Quản lý màu và kiểu icon Status Bar theo theme trên Native Android
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: theme === 'light' ? '#f8f2e7' : '#16120e' }).catch(() => {});
      StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark }).catch(() => {});
    }
  }, [theme, themeColor]);

  // 2. Xử lý nút Back phần cứng của Android
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBack = 0;
    const listenerPromise = CapApp.addListener('backButton', () => {
      // Nếu đang mở modal -> đóng modal trước
      if (modalRef.current) {
        setModal(null);
        return;
      }
      // Nếu đang ở trang khác -> quay về Trang chính
      if (pageRef.current !== 'today') {
        setPage('today');
        return;
      }
      // Đang ở Trang chính: bấm lần 2 trong 2s để thoát
      const now = Date.now();
      if (now - lastBack < 2000) {
        CapApp.exitApp();
      } else {
        lastBack = now;
        flash('Bấm lần nữa để thoát ứng dụng');
      }
    });

    return () => {
      listenerPromise.then(h => h.remove()).catch(() => {});
    };
  }, []);

  useEffect(() => {
    ensureNotificationChannel();
    resyncAllReminders(db.tasks);
    startWebNotificationWatcher(() => db.tasks, task => {
      flash(`🔔 Sắp đến giờ: "${task.title}" lúc ${task.start}`);
    });
  }, [db.tasks]);

  useEffect(() => {
    authService.getUser().then(u => {
      setCloudUser(u);
      if (u) {
        syncService.fetchAll(u.id).then(cloud => {
          if (cloud?.profile?.theme && setTheme) {
            setTheme(cloud.profile.theme);
          }
          if (cloud?.profile?.themeColor && setThemeColor) {
            setThemeColor(cloud.profile.themeColor);
          }
          if (cloud?.profile?.notificationSettings) {
            saveNotificationSettings(cloud.profile.notificationSettings);
          }
        }).catch(() => {});
      }
    }).catch(() => {});
    const sub = authService.onAuthStateChange((_, session) => {
      setCloudUser(session?.user || null);
    });
    return () => {
      sub?.data?.subscription?.unsubscribe?.();
    };
  }, []);

  // Đẩy các thay đổi còn kẹt trong hàng đợi lên cloud: chạy khi mở app, khi có
  // mạng lại, khi quay lại tab và định kỳ 30 giây.
  useEffect(() => {
    if (!cloudUser) {
      setPendingSync(0);
      return;
    }

    let alive = true;
    const refreshCount = () => {
      if (alive) setPendingSync(syncService.pendingCount(cloudUser.id));
    };
    const flush = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        refreshCount();
        return;
      }
      const result = await syncService.flushPending(cloudUser.id);
      if (!alive) return;
      setPendingSync(result?.remaining ?? syncService.pendingCount(cloudUser.id));
    };

    refreshCount();
    flush();
    const timer = setInterval(flush, 30000);
    const onOnline = () => flush();
    const onVisible = () => {
      if (document.visibilityState === 'visible') flush();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener(OUTBOX_EVENT, refreshCount);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener(OUTBOX_EVENT, refreshCount);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [cloudUser]);

  const handleThemeChange = ({ theme: nextTheme, themeColor: nextColor }) => {
    const t = nextTheme || theme;
    const c = nextColor || themeColor;
    if (setTheme && nextTheme) setTheme(nextTheme);
    if (setThemeColor && nextColor) setThemeColor(nextColor);
    if (cloudUser) {
      syncService.saveTheme(cloudUser.id, t, c);
      setDb(d => ({
        ...d,
        profile: d.profile ? { ...d.profile, theme: t, themeColor: c } : d.profile
      }));
    }
  };

  useEffect(() => wr(ACC(id), db), [db]);

  const upsert = (k, it) => {
    setDb(d => ({
      ...d,
      [k]: d[k].some(x => x.id === it.id) ? d[k].map(x => (x.id === it.id ? it : x)) : [...d[k], it]
    }));
    if (cloudUser && k === 'goals') syncService.upsertGoal(cloudUser.id, it);
    setModal(null);
  };

  const flash = (msg, undo) => {
    clearTimeout(tt.current);
    setToast({ msg, undo });
    tt.current = setTimeout(() => setToast(null), 5000);
  };

  const del = (k, itemId) => {
    const idx = db[k].findIndex(x => x.id === itemId);
    if (idx < 0) return;
    const item = db[k][idx];
    setDb(d => ({ ...d, [k]: d[k].filter(x => x.id !== itemId) }));
    if (cloudUser) {
      if (k === 'txs') syncService.deleteTx(cloudUser.id, itemId);
      if (k === 'goals') syncService.deleteGoal(cloudUser.id, itemId);
    }
    flash('Đã xóa', () => {
      setDb(d => {
        const a = [...d[k]];
        a.splice(Math.min(idx, a.length), 0, item);
        return { ...d, [k]: a };
      });
      if (cloudUser) {
        if (k === 'txs') syncService.upsertTx(cloudUser.id, item);
        if (k === 'goals') syncService.upsertGoal(cloudUser.id, item);
      }
      setToast(null);
    });
  };

  const openTask = it =>
    setModal({
      k: 'task',
      it: it.id
        ? { ...it, txs: db.txs.filter(x => x.taskId === it.id) }
        : {
            title: '',
            date: today(),
            start: '09:00',
            end: '10:00',
            cat: 'Học tập',
            pri: 'Trung bình',
            note: '',
            status: 'todo',
            ...it,
            txs: []
          }
    });

  const openTx = (type, it) => {
    const gl = db.groups.map(g => g.name);
    setModal({
      k: 'tx',
      it: {
        type,
        amount: '',
        date: today(),
        note: '',
        taskId: '',
        ...it,
        grp: gl.includes(it?.grp) ? it.grp : 'Khác',
        allTasks: db.tasks,
        groups: gl
      }
    });
  };

  const openFund = it => setModal({ k: 'fund', it });
  const openTransfer = (fund, direction) => setModal({ k: 'transfer', fund, direction });
  const openBalance = () => setModal({ k: 'balance' });
  const openList = (type, date) => setModal({ k: 'list', type, date: date || today() });
  const openProfile = () => setModal({ k: 'profile' });
  const openGroups = () => setModal({ k: 'groups' });

  const importIcs = async (file, cat = 'Học tập') => {
    let imported;
    try {
      imported = await parseIcs(await file.text(), cat);
    } catch (error) {
      console.error(error);
      throw new Error('Không đọc được file .ics này.');
    }
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

  const saveFund = fund => {
    setDb(d => ({
      ...d,
      goals: d.goals.some(x => x.id === fund.id) ? d.goals.map(x => (x.id === fund.id ? fund : x)) : [...d.goals, fund]
    }));
    if (cloudUser) syncService.upsertGoal(cloudUser.id, fund);
    flash(`Đã lưu quỹ: "${fund.title}"`);
    setModal(null);
  };

  const saveTx = t => {
    const old = db.txs.find(x => x.id === t.id);
    const { alloc: _alloc, autoGoal: _autoGoal, goalId: _goalId, ...nt } = t;
    setDb(d => {
      const groups = d.groups.some(g => g.name === t.grp)
        ? d.groups
        : [...d.groups, { name: t.grp, share: 0.1, color: PAL[d.groups.length % PAL.length] }];
      return { ...d, groups, txs: old ? d.txs.map(x => (x.id === t.id ? nt : x)) : [...d.txs, nt] };
    });
    if (cloudUser) syncService.upsertTx(cloudUser.id, nt);
    flash(`Đã lưu ${t.type === 'income' ? 'thu nhập' : 'chi tiêu'}: ${money(t.amount)}`);
    setModal(null);
  };

  const saveTask = async t => {
    const { txs: _tx, ...clean } = t;
    if (clean.date > today() && clean.status === 'done') {
      clean.status = 'todo';
      flash('⚠️ Chưa đến ngày nên chưa thể hoàn thành việc này');
    }
    setDb(d => {
      const old = d.tasks.find(x => x.id === clean.id);
      return { ...d, tasks: old ? d.tasks.map(x => (x.id === clean.id ? clean : x)) : [...d.tasks, clean] };
    });
    if (cloudUser) syncService.upsertTask(cloudUser.id, clean);
    if (clean.status === 'done') {
      cancelTaskReminder(clean);
    } else {
      scheduleTaskReminder(clean);
    }
    flash(`Đã lưu: "${clean.title}"`);
    setModal(null);
    try {
      const synced = await syncSingleTaskWithGoogle(clean, 'save');
      if (synced && (synced.googleEventId !== clean.googleEventId || synced.googleTaskId !== clean.googleTaskId)) {
        setDb(d => ({
          ...d,
          tasks: d.tasks.map(x => (x.id === synced.id ? { ...x, ...synced } : x))
        }));
        if (cloudUser) syncService.upsertTask(cloudUser.id, synced);
      }
    } catch (e) {
      console.warn('Google auto-sync error:', e);
    }
  };

  const delTask = id => {
    const t = db.tasks.find(x => x.id === id);
    if (!t) return;
    setDb(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== id) }));
    if (cloudUser) syncService.deleteTask(cloudUser.id, id);
    cancelTaskReminder(t);
    syncSingleTaskWithGoogle(t, 'delete').catch(() => {});
    flash('Đã xóa', () => {
      setDb(d => ({ ...d, tasks: [...d.tasks, t] }));
      if (cloudUser) syncService.upsertTask(cloudUser.id, t);
      setToast(null);
    });
  };

  const transferFund = (fund, direction, amount) => {
    const delta = direction === 'deposit' ? amount : -amount;
    const updated = {
      ...fund,
      balance: fundBalance(fund) + delta,
      current: fundBalance(fund) + delta,
      target: fundBalance(fund) + delta,
      unit: 'đ',
      auto: false
    };
    setDb(d => ({ ...d, goals: d.goals.map(x => (x.id === fund.id ? updated : x)) }));
    if (cloudUser) syncService.upsertGoal(cloudUser.id, updated);
    flash(`${direction === 'deposit' ? 'Đã nạp vào' : 'Đã rút từ'} quỹ ${money(amount)}`);
    setModal(null);
  };

  const deleteFund = fund => {
    if (!window.confirm(`Xóa quỹ "${fund.title}"? ${money(fundBalance(fund))} sẽ trở về số dư hiện có.`)) return;
    del('goals', fund.id);
  };

  const adjustBalance = amount => {
    setDb(d => {
      const profile = { ...d.profile, cashBase: amount - effectiveNet(d) + totalFundBalance(d) };
      if (cloudUser) syncService.saveProfile(cloudUser.id, profile);
      return { ...d, profile };
    });
    flash('Đã cập nhật số dư hiện có');
    setModal(null);
  };

  const pasteClip = target => {
    // dán việc đã sao chép: tuần → vào tuần bắt đầu `target`; ngày → vào ngày `target`. Bỏ qua việc trùng, trạng thái về "Chưa làm"
    if (!clip) return 0;
    const add = clip.items
      .map(({ off, ...r }) => ({ ...r, id: uid(), date: clip.kind === 'week' ? addDays(target, off) : target, status: 'todo' }))
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
    const done = t.status !== 'done';
    const net = db.txs.filter(x => x.taskId === t.id).reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0);
    saveTask({ ...t, status: done ? 'done' : 'todo' });
    const curTasks = db.tasks.filter(x => x.date === t.date);
    const remaining = curTasks.filter(x => x.id !== t.id && x.status !== 'done').length;
    if (done && remaining === 0 && curTasks.length > 0) {
      flash(
        t.date === today()
          ? '🎉 Hoàn thành hết việc hôm nay! Tự thưởng một ly cà phê nhé ☕✨'
          : `🎉 Hoàn thành hết việc ngày ${t.date.split('-').reverse().join('/')}!`
      );
    } else if (net) {
      flash(`Số dư hiện có: ${(done ? net : -net) > 0 ? '+' : '−'}${money(Math.abs(net))}`);
    }
  };

  const openGoogleSync = () => setModal({ k: 'googleSync' });
  const openNotification = () => setModal({ k: 'notif' });

  const P = {
    db,
    openTx,
    openTask,
    openFund,
    openTransfer,
    openBalance,
    openList,
    openProfile,
    openGroups,
    openGoogleSync,
    openNotification,
    clip,
    setClip,
    pasteClip,
    toggle,
    delTask,
    transferFund,
    deleteFund,
    adjustBalance,
    delTx: id => del('txs', id),
    importIcs,
    curDate: homeDate,
    setCurDate: setHomeDate
  };

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><LogoIcon s={34} /> Cà Phê</div>
        <small className="mut">Quản lý cuộc sống sinh viên</small>
        <nav>
          {NAV.map(([k, i, l]) => (
            <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>
              <span>{i}</span>{l}
            </button>
          ))}
        </nav>
        {pendingSync > 0 && (
          <button
            className="btn sm out sync-pending"
            onClick={openProfile}
            title="Các thay đổi này sẽ tự đồng bộ khi có mạng"
          >
            ⏳ {pendingSync} thay đổi chờ đồng bộ
          </button>
        )}
        <ThemeToggle
          theme={theme}
          themeColor={themeColor}
          onChangeTheme={handleThemeChange}
          position="sidebar"
        />
      </aside>
      <main>
        <div className="top">
          <div className="logo mobl"><LogoIcon s={26} /> Cà Phê</div>
          {pendingSync > 0 && (
            <button
              className="btn sm out sync-pending"
              onClick={openProfile}
              title="Các thay đổi này sẽ tự đồng bộ khi có mạng"
            >
              ⏳ {pendingSync}
            </button>
          )}
          <ThemeToggle
            theme={theme}
            themeColor={themeColor}
            onChangeTheme={handleThemeChange}
            position="top"
          />
        </div>
        <div key={page}>
          {page === 'today' && <Today {...P} />}
          {page === 'cal' && <Calendar {...P} />}
          {page === 'fin' && <Finance {...P} />}
          {page === 'goal' && (
            <Funds
              db={db}
              openFund={openFund}
              transferFund={(fund, direction) => openTransfer(fund, direction)}
              deleteFund={deleteFund}
              adjustBalance={openBalance}
            />
          )}
        </div>
      </main>
      <nav className="bot">
        {NAV.map(([k, i, l]) => (
          <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)}>
            <span>{i}</span>{l}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast">
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={toast.undo}>Hoàn tác</button>}
        </div>
      )}
      {modal?.k === 'task' && (
        <TaskForm
          item={modal.it}
          onSave={saveTask}
          onClose={() => setModal(null)}
          onDel={id => {
            delTask(id);
            setModal(null);
          }}
        />
      )}
      {modal?.k === 'tx' && <TxForm item={modal.it} onSave={saveTx} onClose={() => setModal(null)} />}
      {modal?.k === 'fund' && <FundForm item={modal.it} onSave={saveFund} onClose={() => setModal(null)} />}
      {modal?.k === 'transfer' && (
        <FundTransferForm
          fund={modal.fund}
          direction={modal.direction}
          available={availableBalance(db)}
          onSave={amount => transferFund(modal.fund, modal.direction, amount)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.k === 'balance' && <BalanceForm current={availableBalance(db)} onSave={adjustBalance} onClose={() => setModal(null)} />}
      {modal?.k === 'profile' && (
        <ProfileModal
          p={db.profile}
          counts={`${db.tasks.length} việc · ${db.txs.length} giao dịch · ${db.goals.length} quỹ`}
          db={db}
          cloudUser={cloudUser}
          pendingSync={pendingSync}
          onFlushSync={async () => {
            const result = await syncService.flushPending(cloudUser.id);
            setPendingSync(result?.remaining ?? syncService.pendingCount(cloudUser.id));
            if (result?.ok) flash('☁️ Đã đồng bộ xong các thay đổi đang chờ');
            else if (result?.reason === 'rejected') flash('⚠️ Cloud từ chối đồng bộ, hãy đăng nhập lại');
            else flash('❌ Vẫn chưa kết nối được cloud, sẽ tự thử lại');
          }}
          openGoogleSync={openGoogleSync}
          openNotification={openNotification}
          onClose={() => setModal(null)}
          onSave={p => {
            const profile = { ...db.profile, ...p };
            setDb(d => ({ ...d, profile: { ...d.profile, ...p } }));
            if (cloudUser) syncService.saveProfile(cloudUser.id, profile);
            onRename(profile.name);
            setModal(null);
          }}
          onLogout={onLogout}
          onDelete={onDelete}
          onReset={async () => {
            if (cloudUser) {
              const cleared = await syncService.clearUserData(cloudUser.id);
              if (!cleared) {
                flash('❌ Không thể xóa dữ liệu trên cloud. Dữ liệu trên máy vẫn được giữ nguyên.');
                return;
              }
            }
            setDb(d => ({ ...d, tasks: [], txs: [], goals: [] }));
            if (cloudUser) syncService.clearPending(cloudUser.id);
            setPendingSync(0);
            setModal(null);
          }}
          onDownloadCloud={downloaded => {
            setDb(upgrade({ ...downloaded, tasks: dedupeTasks(downloaded.tasks) }));
            // Dữ liệu local vừa bị thay bằng bản cloud; các thay đổi đang chờ
            // không còn đúng nữa nên bỏ đi để tránh đẩy ngược lên cloud.
            if (cloudUser) syncService.clearPending(cloudUser.id);
            setPendingSync(0);
            if (downloaded.profile?.theme && setTheme) {
              setTheme(downloaded.profile.theme);
            }
            if (downloaded.profile?.themeColor && setThemeColor) {
              setThemeColor(downloaded.profile.themeColor);
            }
            if (downloaded.profile?.notificationSettings) {
              saveNotificationSettings(downloaded.profile.notificationSettings);
              resyncAllReminders(downloaded.tasks || []);
            }
          }}
          flash={flash}
          onCloudLinked={(user, linkedDb) => {
            setCloudUser(user);
            if (onCloudLinked) onCloudLinked(user, linkedDb);
          }}
        />
      )}
      {modal?.k === 'groups' && (
        <GroupsModal
          groups={db.groups}
          onClose={() => setModal(null)}
          onAdd={name => {
            const group = { name, share: 0.1, color: PAL[db.groups.length % PAL.length] };
            setDb(d => ({ ...d, groups: [...d.groups, group] }));
            if (cloudUser) syncService.upsertGroup(cloudUser.id, group);
          }}
          onRemove={name => {
            setDb(d => ({ ...d, groups: d.groups.filter(g => g.name !== name) }));
            if (cloudUser) syncService.deleteGroup(cloudUser.id, name);
          }}
        />
      )}
      {modal?.k === 'list' && (
        <TxList
          db={db}
          type={modal.type}
          date={modal.date}
          onClose={() => setModal(null)}
          onAdd={() => openTx(modal.type, { date: modal.date || today() })}
          onEdit={x => openTx(x.type, x)}
          onDel={id => del('txs', id)}
        />
      )}
      {modal?.k === 'googleSync' && (
        <GoogleSyncModal
          onClose={() => setModal(null)}
          db={db}
          flash={flash}
          onSyncComplete={updatedTasks => {
            setDb(d => ({ ...d, tasks: updatedTasks }));
            if (cloudUser) {
              updatedTasks.forEach(item => syncService.upsertTask(cloudUser.id, item));
            }
          }}
        />
      )}
      {modal?.k === 'notif' && (
        <NotificationModal onClose={() => setModal(null)} tasks={db.tasks} flash={flash} cloudUser={cloudUser} />
      )}
    </div>
  );
}

// Gốc: quản lý tài khoản (đăng nhập lại / tạo mới) và giao diện sáng-tối
export default function Root() {
  const [m, setM] = useState(loadMeta);
  const [onboarding, setOnboarding] = useState(null);
  const theme = m.theme || 'dark';
  const themeColor = m.themeColor || 'coffee';

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!m.active) {
      const listenerPromise = CapApp.addListener('backButton', () => {
        CapApp.exitApp();
      });
      return () => {
        listenerPromise.then(h => h.remove()).catch(() => {});
      };
    }
  }, [m.active]);

  useEffect(() => {
    wr(META, { ...m, theme, themeColor });
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.color = themeColor;
  }, [m, theme, themeColor]);

  const setTheme = nextTheme => setM(x => ({ ...x, theme: nextTheme }));
  const setThemeColor = nextColor => setM(x => ({ ...x, themeColor: nextColor }));
  const toggleTheme = () => setM(x => ({ ...x, theme: (x.theme || 'dark') === 'dark' ? 'light' : 'dark' }));

  const delAccount = async (accId, deleteCloud = false) => {
    if (deleteCloud) await authService.deleteOwnAccount();
    try {
      localStorage.removeItem(ACC(accId));
    } catch (e) {}
    if (deleteCloud) await authService.signOut().catch(() => {});
    setM(x => ({
      ...x,
      active: x.active === accId ? null : x.active,
      accounts: x.accounts.filter(a => a.id !== accId)
    }));
  };

  const handleCloudLinked = (user, linkedDb) => {
    const accountName = user.user_metadata?.full_name || linkedDb.profile?.name || user.email.split('@')[0];
    wr(ACC(user.id), upgrade({ ...linkedDb, tasks: dedupeTasks(linkedDb.tasks) }));
    if (linkedDb.profile?.theme) {
      setTheme(linkedDb.profile.theme);
    }
    if (linkedDb.profile?.themeColor) {
      setThemeColor(linkedDb.profile.themeColor);
    }
    if (linkedDb.profile?.notificationSettings) {
      saveNotificationSettings(linkedDb.profile.notificationSettings);
    }
    setM(x => {
      const filtered = x.accounts.filter(a => a.id !== x.active && a.id !== user.id);
      return {
        ...x,
        active: user.id,
        accounts: [...filtered, { id: user.id, name: accountName }]
      };
    });
  };

  const handleCloudLogin = (user, cloudData) => {
    const accountName =
      user.user_metadata?.full_name || cloudData?.profile?.name || user.email?.split('@')[0] || 'Người dùng';
    const localDb = rd(ACC(user.id));
    const activeAcc = m.accounts.find(a => a.id === m.active) || m.accounts[0];
    const prevDb = activeAcc ? rd(ACC(activeAcc.id)) : null;

    const baseDb = mergeCloudData(cloudData, localDb || prevDb);
    const needsOnboarding = !hasCloudSetup(cloudData) && !hasCloudSetup(localDb) && !hasCloudSetup(prevDb);

    if (cloudData?.profile?.theme) {
      setTheme(cloudData.profile.theme);
    }
    if (cloudData?.profile?.themeColor) {
      setThemeColor(cloudData.profile.themeColor);
    }
    if (cloudData?.profile?.notificationSettings) {
      saveNotificationSettings(cloudData.profile.notificationSettings);
    }

    if (!needsOnboarding) {
      wr(ACC(user.id), baseDb);
      syncService.uploadAll(user.id, baseDb).catch(console.error);
      setM(x => {
        const filtered = x.accounts.filter(a => a.id !== user.id);
        return { ...x, active: user.id, accounts: [...filtered, { id: user.id, name: accountName }] };
      });
      return;
    }

    setOnboarding({
      user,
      baseDb,
      initialName: accountName,
      initialBudget: baseDb.profile?.budget || '',
      initialIncome: baseDb.profile?.income || '',
      initialCash: baseDb.profile?.cashBase || ''
    });
  };

  const completeOnboarding = f => {
    if (!onboarding) return;
    const { user, baseDb } = onboarding;
    const finalDb = upgrade({
      ...baseDb,
      profile: {
        ...(baseDb.profile || {}),
        name: f.name.trim(),
        budget: +f.budget || 0,
        income: +f.income || 0,
        cashBase: +f.cashBase || 0,
        hasOnboarded: true
      },
      goals: baseDb.goals || []
    });

    wr(ACC(user.id), finalDb);
    syncService.uploadAll(user.id, finalDb).catch(console.error);

    setM(x => {
      const filtered = x.accounts.filter(a => a.id !== user.id);
      return {
        ...x,
        active: user.id,
        accounts: [...filtered, { id: user.id, name: f.name.trim() }]
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
        initialCash={onboarding.initialCash}
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
        onLogout={() => {
          authService.signOut().catch(() => {});
          setM({ ...m, active: null });
        }}
        onRename={name =>
          setM(x => ({ ...x, accounts: x.accounts.map(a => (a.id === x.active ? { ...a, name } : a)) }))
        }
        onDelete={deleteCloud => delAccount(m.active, deleteCloud)}
        onCloudLinked={handleCloudLinked}
        theme={theme}
        themeColor={themeColor}
        toggleTheme={toggleTheme}
        setTheme={setTheme}
        setThemeColor={setThemeColor}
      />
    );
  }

  return (
    <AuthScreen
      accounts={m.accounts}
      onPick={id => setM({ ...m, active: id })}
      onDelAccount={delAccount}
      onCloudLogin={handleCloudLogin}
      theme={theme}
      themeColor={themeColor}
      toggleTheme={toggleTheme}
      setTheme={setTheme}
      setThemeColor={setThemeColor}
    />
  );
}
