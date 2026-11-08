import React, { useState } from 'react';
import { Donut, Bar, Stat } from '../components/ui/Widgets';
import { today, addDays, wkStart, dots, money } from '../utils/format';
import { isEff, tInfo } from '../utils/storage';

// Tổng kết tuần này / tháng này (độc lập với bộ lọc phía trên)
export function Summary({ db, rg }) {
  const p = db.profile;
  const t = today();
  const wk = rg === 'week';
  const scale = wk ? 7 / 30 : 1;
  const ws = wkStart(t);
  const per = wk ? 'tuần này' : 'tháng này';
  const inR = d => (wk ? d >= ws && d <= addDays(ws, 6) : d.slice(0, 7) === t.slice(0, 7));
  const txs = db.txs.filter(x => inR(x.date) && isEff(db, x));
  const sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0);
  const inc = sum('income');
  const exp = sum('expense');
  const tw = db.groups.reduce((a, g) => a + g.share, 0);
  const by = {};
  txs
    .filter(x => x.type === 'expense')
    .forEach(x => {
      const k = db.groups.some(g => g.name === x.grp) ? x.grp : 'Khác';
      by[k] = (by[k] || 0) + x.amount;
    });
  const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const tk = db.tasks.filter(x => inR(x.date));
  const done = tk.filter(x => x.status === 'done').length;
  const rate = tk.length ? Math.round((done / tk.length) * 100) : 0;
  const bud = p.budget * scale;
  const plan = p.income * scale;
  const notes = [];

  db.groups.forEach(g => {
    const b = (p.budget * g.share) / tw * scale;
    const pc = b ? Math.round(((by[g.name] || 0) / b) * 100) : 0;
    if (pc >= 80) notes.push(`${pc > 100 ? '⚠️' : '☕'} Đã dùng ${pc}% ngân sách ${g.name}.`);
  });
  if (plan && inc) notes.push(`💰 Thu nhập ${per} ${inc >= plan ? 'cao' : 'thấp'} hơn dự tính ${Math.abs(Math.round(((inc - plan) / plan) * 100))}%.`);
  if (tk.length) notes.push(`✅ Hoàn thành ${rate}% việc đã lên lịch (${done}/${tk.length}).`);
  if (inc - exp < 0) notes.push('🚨 Chi tiêu đang vượt thu nhập.');
  if (!notes.length) notes.push('Chưa đủ dữ liệu để nhận xét.');

  return (
    <div className="card sum">
      <h3>📋 Tổng kết {per}</h3>
      <div className="sum3">
        <div>
          <small>Thu nhập</small>
          <b style={{ color: 'var(--ok)' }}>{money(inc)}</b>
        </div>
        <div>
          <small>Chi tiêu</small>
          <b style={{ color: 'var(--warn)' }}>{money(exp)}</b>
        </div>
        <div>
          <small>Số dư</small>
          <b style={{ color: inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)' }}>{money(inc - exp)}</b>
        </div>
      </div>
      <div className="sumrow">
        <span className="mut">Nhóm chi nhiều nhất</span>
        <b>{top ? `${top[0]} (${money(top[1])})` : '—'}</b>
      </div>
      <div className="sumrow">
        <span className="mut">Chi thực tế / Chi dự tính</span>
        <b>{money(exp)}{bud > 0 ? ' / ' + money(bud) : ' (chưa đặt)'}</b>
      </div>
      <div className="sumrow">
        <span className="mut">Thu thực tế / Thu dự tính</span>
        <b>{money(inc)}{plan > 0 ? ' / ' + money(plan) : ' (chưa đặt)'}</b>
      </div>
      <div className="sumrow">
        <span className="mut">Tổng số tiền thu được</span>
        <b style={{ color: inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)' }}>
          {(inc - exp >= 0 ? '+' : '−') + dots(Math.abs(inc - exp))} VND
        </b>
      </div>
      <ul>
        {notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export function Finance({ db, openTx, delTx, openGroups }) {
  const [rg, setRg] = useState('month');
  const [all, setAll] = useState(false);
  const [fm, setFm] = useState('day');
  const [fv, setFv] = useState(today());
  const p = db.profile;
  const t = today();
  const scale = rg === 'today' ? 1 / 30 : rg === 'week' ? 7 / 30 : 1;
  const ws = wkStart(t);

  const inR = d => (rg === 'today' ? d === t : rg === 'week' ? d >= ws && d <= addDays(ws, 6) : d.slice(0, 7) === t.slice(0, 7));
  const txs = db.txs.filter(x => inR(x.date) && isEff(db, x)).sort((a, b) => b.date.localeCompare(a.date));
  const sum = ty => txs.filter(x => x.type === ty).reduce((a, x) => a + x.amount, 0);
  const inc = sum('income');
  const exp = sum('expense');
  const bud = p.budget * scale;
  const usedPct = bud ? (exp / bud) * 100 : 0;

  const tw = db.groups.reduce((a, g) => a + g.share, 0);
  const G = Object.fromEntries(db.groups.map(g => [g.name, [g.color, g.share / tw]]));
  const by = Object.fromEntries(
    Object.keys(G).map(k => [k, txs.filter(x => x.type === 'expense' && (G[x.grp] ? x.grp : 'Khác') === k).reduce((a, x) => a + x.amount, 0)])
  );

  const shown = (all ? db.txs.filter(x => fv && x.date.startsWith(fv)) : db.txs.filter(x => x.date === t)).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const sumOf = ty => shown.filter(x => x.type === ty && isEff(db, x)).reduce((a, x) => a + x.amount, 0);
  const dd = all && fm === 'day' && fv ? { date: fv } : undefined;

  const row = x => (
    <div key={x.id} className={'card tx' + (isEff(db, x) ? '' : ' pend')}>
      <span className="tic">{x.type === 'income' ? '↗' : '↘'}</span>
      <div className="grow">
        <b>{x.note || tInfo(db.tasks, x).title}</b>
        <small>
          {x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title} · {x.date.split('-').reverse().join('/')}
          {isEff(db, x) ? '' : ' · ⏳ chờ hoàn thành việc'}
        </small>
      </div>
      <b style={{ color: x.type === 'income' ? 'var(--ok)' : 'var(--warn)' }}>
        {x.type === 'income' ? '+' : '−'}
        {money(x.amount)}
      </b>
      <button className="ib" onClick={() => openTx(x.type, x)}>✎</button>
      <button className="ib" onClick={() => delTx(x.id)}>🗑</button>
    </div>
  );

  return (
    <div className="page">
      <div className="row between wrap">
        <h2>Tài chính</h2>
        <div className="row gap">
          <div className="seg">
            {[
              ['today', 'Hôm nay'],
              ['week', 'Tuần này'],
              ['month', 'Tháng này']
            ].map(([k, l]) => (
              <button key={k} className={rg === k ? 'on' : ''} onClick={() => setRg(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="four">
        <Stat l="Thu nhập" v={money(inc)} c="var(--ok)" />
        <Stat l="Chi tiêu" v={money(exp)} c="var(--warn)" />
        <Stat l="Số dư" v={money(inc - exp)} c={inc - exp >= 0 ? 'var(--ok)' : 'var(--warn)'} />
        <Stat l="Ngân sách đã dùng" v={bud ? Math.round(usedPct) + '%' : '—'} />
      </div>
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
                opacity: 0.85,
                transition: 'all .2s ease'
              }}
            >
              <span>⚙</span> Sửa nhóm
            </button>
          </div>
          <div className="row gap wrap" style={{ justifyContent: 'center' }}>
            <Donut data={Object.keys(G).map(k => ({ k, v: by[k], c: G[k][0] }))} />
            <div className="col" style={{ gap: 6 }}>
              {Object.keys(G).map(k => (
                <span key={k} className="s">
                  <i className="dot" style={{ background: G[k][0] }} /> {k}: {money(by[k])}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <h3>Thực chi vs ngân sách (nhóm việc)</h3>
          <div className="col gap">
            {Object.keys(G).map(k => {
              const b = p.budget * G[k][1] * scale;
              return (
                <div key={k}>
                  <div className="row between s">
                    <span>{k}</span>
                    <span className="mut">{money(by[k])}{b ? ' / ' + money(b) : ''}</span>
                  </div>
                  <Bar pct={b ? (by[k] / b) * 100 : 0} color={G[k][0]} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <h3>Tổng kết</h3>
      <div className="cols2">
        <Summary db={db} rg="week" />
        <Summary db={db} rg="month" />
      </div>
      <div className="row between wrap">
        <h3>{all ? 'Tất cả giao dịch' : 'Giao dịch hôm nay'}</h3>
        <div className="row gap">
          <button className="btn sm out" onClick={() => openTx('expense', dd)}>+ Chi</button>
          <button className="btn sm" onClick={() => openTx('income', dd)}>+ Thu</button>
        </div>
      </div>
      <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setAll(!all)}>
        {all ? '← Chỉ xem hôm nay' : 'Tất cả giao dịch'}
      </button>
      {all && (
        <div className="card col gap">
          <div className="seg">
            {[
              ['day', 'Ngày'],
              ['month', 'Tháng'],
              ['year', 'Năm']
            ].map(([k, l]) => (
              <button
                key={k}
                className={fm === k ? 'on' : ''}
                onClick={() => {
                  setFm(k);
                  setFv(k === 'day' ? t : k === 'month' ? t.slice(0, 7) : t.slice(0, 4));
                }}
              >
                {l}
              </button>
            ))}
          </div>
          {fm === 'day' && <input type="date" value={fv} onChange={e => setFv(e.target.value)} />}
          {fm === 'month' && <input type="month" value={fv} onChange={e => setFv(e.target.value)} />}
          {fm === 'year' && <input type="number" min="2000" max="2100" value={fv} onChange={e => setFv(e.target.value)} />}
          <div className="row between s">
            <span>Thu: <b style={{ color: 'var(--ok)' }}>{money(sumOf('income'))}</b></span>
            <span>Chi: <b style={{ color: 'var(--warn)' }}>{money(sumOf('expense'))}</b></span>
          </div>
        </div>
      )}
      <div className="col gap">
        {shown.length ? (
          shown.map(row)
        ) : (
          <div className="card empty">
            <p>{all ? 'Không có giao dịch trong khoảng này.' : 'Hôm nay chưa có giao dịch.'}</p>
            <div className="row gap">
              <button className="btn sm out" onClick={() => openTx('expense', dd)}>+ Chi tiêu</button>
              <button className="btn sm" onClick={() => openTx('income', dd)}>+ Thu nhập</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
