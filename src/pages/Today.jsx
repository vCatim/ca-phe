import React, { useState } from 'react';
import { Hop, Ring, Stat } from '../components/ui/Widgets';
import { TaskRow } from '../components/ui/TaskRow';
import { DatePicker } from '../components/modals/DatePicker';
import { QUOTES, WD } from '../constants';
import { today, addDays, money } from '../utils/format';
import { isEff } from '../utils/storage';

export function Today({ db, openTx, openTask, openList, openProfile, toggle, delTask, curDate = today(), setCurDate }) {
  const [dir, setDir] = useState('');
  const [pick, setPick] = useState(false);
  const p = db.profile;
  const dayBudget = p.budget / 30;
  const isToday = curDate === today();

  const go = d => {
    setDir(d > curDate ? 'n' : 'p'); // nhớ hướng để trượt đúng chiều
    if (setCurDate) setCurDate(d);
  };

  const curD = new Date(curDate + 'T00:00');
  const dmy = curDate.split('-').reverse().join('/');
  const tasks = db.tasks.filter(x => x.date === curDate).sort((a, b) => a.start.localeCompare(b.start));
  const tx = db.txs.filter(x => x.date === curDate && isEff(db, x));
  const exp = tx.filter(x => x.type === 'expense').reduce((a, x) => a + x.amount, 0);
  const inc = tx.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0);
  const done = tasks.filter(x => x.status === 'done').length;
  const dn = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);

  return (
    <div className="page stg">
      <div className="banner st" style={{ '--n': 0 }} onClick={openProfile}>
        <div className="bn-alt" aria-hidden="true" />
        <small>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small>
        <Hop name={p.name} />
        <p>“{QUOTES[dn % QUOTES.length]}”</p>
        <span className="chip">👤 Tài khoản <i>›</i></span>
      </div>

      {/* Chọn ngày: gọn một hàng, giữ nguyên đầy đủ tính năng */}
      <div className="dnav st" style={{ '--n': 1 }}>
        <button className="dnb" onClick={() => go(addDays(curDate, -1))} aria-label="Ngày trước">‹</button>
        <button className="dpick" onClick={() => setPick(true)} aria-label="Chọn ngày khác">
          <span className="dpt">
            <b>{isToday ? 'Hôm nay' : WD[curD.getDay()]}</b>
            <small>{isToday ? `${WD[curD.getDay()]}, ${dmy}` : dmy}</small>
          </span>
          <span className="dpc">▾</span>
        </button>
        <button className="dnb" onClick={() => go(addDays(curDate, 1))} aria-label="Ngày sau">›</button>
        {!isToday && <button className="btn sm out back" onClick={() => go(today())}>↩ Hôm nay</button>}
      </div>

      {/* key={curDate}: đổi ngày thì phần thân trượt vào theo chiều bấm */}
      <div key={curDate} className={'dbody ' + (dir ? 'dsl dsl-' + dir : 'st')} style={{ '--n': 2 }}>
        {/* Khối 1: Thẻ ngân sách toàn chiều ngang */}
        {p.budget ? (
          <div className="card row gap wrap">
            <Ring pct={(exp / dayBudget) * 100} size={110} />
            <div className="grow">
              <small className="mut">{isToday ? 'Ngân sách hôm nay' : `Ngân sách ngày (${dmy})`}</small>
              <h2>{money(exp)} <span className="mut">/ {money(dayBudget)}</span></h2>
              <p className="mut s">{exp <= dayBudget ? `Còn ${money(dayBudget - exp)} có thể chi` : `Vượt ${money(exp - dayBudget)}`}</p>
            </div>
          </div>
        ) : (
          <div className="card row between gap">
            <div>
              <small className="mut">{isToday ? 'Chi hôm nay' : `Chi ngày ${dmy}`}</small>
              <h2>{money(exp)}</h2>
              <p className="mut s">Bạn chưa đặt ngân sách tháng.</p>
            </div>
            <button className="btn sm out" onClick={openProfile}>Đặt ngân sách</button>
          </div>
        )}

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
          {tasks.length ? (
            tasks.map((x, i) => (
              <div key={x.id} className="trow" style={{ '--n': i }}>
                <TaskRow t={x} onToggle={toggle} onEdit={openTask} onDel={delTask} />
              </div>
            ))
          ) : (
            <div className="card empty">
              <span className="big">📝</span>
              <p>{isToday ? 'Hôm nay chưa có việc nào.' : `Ngày ${dmy} chưa có việc nào.`}</p>
              <button className="btn sm" onClick={() => openTask({ date: curDate })}>+ Thêm việc</button>
            </div>
          )}
        </div>
      </div>
      {pick && <DatePicker value={curDate} tasks={db.tasks} onPick={d => { go(d); setPick(false); }} onClose={() => setPick(false)} />}
    </div>
  );
}
