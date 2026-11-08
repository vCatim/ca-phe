// ============ CÀ PHÊ — Lưu trữ LocalStorage & Tính toán Tài chính ============

import { defaultGroups } from '../constants';
import { uid } from './format';
import {
  dedupeTasks,
  goalFingerprint,
  mergeUniqueByFingerprint,
  mergeUniqueTasks,
  transactionFingerprint
} from '../taskIdentity';

export const K = 'caphe-v2';

export const seed = () => ({
  profile: null,
  groups: defaultGroups(),
  tasks: [],
  txs: [],
  goals: [] // `goals` giữ tên dữ liệu cũ, giao diện gọi là quỹ
});

export const META = 'caphe-meta';
export const ACC = id => 'caphe-acc-' + id;

export const rd = k => {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch (e) {
    return null;
  }
};

export const wr = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

export const upgrade = d => {
  const txs = d.txs || [];
  const funds = (d.goals || []).map(g => {
    const oldAlloc = txs.reduce((sum, x) => sum + ((x.alloc && x.alloc[g.id]) || 0), 0);
    const balance = Math.max(0, Number(g.balance ?? (Number(g.current || 0) + oldAlloc)) || 0);
    return { ...g, balance, current: balance, target: balance, unit: 'đ', auto: false };
  });
  return {
    ...d,
    profile: d.profile ? { ...d.profile, cashBase: Number(d.profile.cashBase) || 0 } : d.profile,
    groups: d.groups || defaultGroups(),
    txs,
    goals: funds
  };
};

export const legacy = () => {
  const c = rd('caphe-v2');
  if (c && c.profile) return c;
  const v = rd('caphe-v1');
  return v && v.profile
    ? {
        ...seed(),
        profile: v.profile,
        goals: v.goals || [],
        txs: (v.txs || []).map(x => ({
          id: x.id,
          type: x.type,
          amount: x.amount,
          date: x.date,
          note: x.note,
          taskId: '',
          tk: x.cat || '',
          grp: 'Khác'
        }))
      }
    : null;
};

export const loadMeta = () => {
  const m = rd(META);
  if (m) return m;
  const old = legacy();
  if (old) {
    const id = uid();
    wr(ACC(id), upgrade(old));
    return { accounts: [{ id, name: old.profile.name }], active: id, theme: old.theme || 'dark' };
  }
  return { accounts: [], active: null, theme: 'dark' };
};

export const loadDb = id => upgrade(rd(ACC(id)) || seed());

export const mergeGroups = (cloudGroups = [], localGroups = []) => {
  const names = new Set();
  return [...cloudGroups, ...localGroups].filter(group => {
    const key = String(group.name || '').trim().toLocaleLowerCase('vi-VN');
    if (names.has(key)) return false;
    names.add(key);
    return true;
  });
};

export const mergeCloudData = (cloudDb, localDb) => {
  const cloud = cloudDb || seed();
  const local = localDb || seed();
  return upgrade({
    ...local,
    profile: cloud.profile || local.profile,
    groups: mergeGroups(cloud.groups || [], local.groups || []),
    tasks: mergeUniqueTasks(cloud.tasks || [], local.tasks || []),
    goals: mergeUniqueByFingerprint(cloud.goals || [], local.goals || [], goalFingerprint),
    txs: mergeUniqueByFingerprint(cloud.txs || [], local.txs || [], transactionFingerprint)
  });
};

export const hasCloudSetup = db =>
  Boolean(db?.profile?.hasOnboarded || db?.tasks?.length || db?.txs?.length || db?.goals?.length);

// Thu/chi "hiệu lực": không gắn việc (tính ngay) hoặc gắn với việc ĐÃ hoàn thành. Khoản gắn việc chưa xong thì chờ.
export const isEff = (db, x) => {
  const t = x.taskId && db.tasks.find(k => k.id === x.taskId);
  return !t || t.status === 'done';
};

export const PRIW = { 'Cao': 3, 'Trung bình': 2, 'Thấp': 1 };
export const goalPri = g => (PRIW[g.pri] ? g.pri : 'Trung bình');

export const effectiveNet = db =>
  db.txs
    .filter(x => isEff(db, x))
    .reduce((sum, x) => sum + (x.type === 'income' ? x.amount : -x.amount), 0);

export const fundBalance = fund => Math.max(0, Number(fund.balance ?? fund.current) || 0);

export const totalFundBalance = db => db.goals.reduce((sum, fund) => sum + fundBalance(fund), 0);

export const totalAssets = db => (Number(db.profile?.cashBase) || 0) + effectiveNet(db);

export const availableBalance = db => totalAssets(db) - totalFundBalance(db);

// Giao dịch gắn với việc (taskId); nếu việc đã bị xóa thì dùng bản ghi nhớ tk/grp
export const tInfo = (tasks, x) => {
  const t = tasks.find(t => t.id === x.taskId);
  return t ? { title: t.title, grp: t.cat } : { title: x.tk || 'Không gắn việc', grp: x.grp || 'Khác' };
};
