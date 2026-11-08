import React, { useState } from 'react';
import { Modal } from '../ui/FormControls';
import { DAYS } from '../../constants';
import { pad, today, addDays, wkStart, dBetween, addMonths } from '../../utils/format';

export function DatePicker({ value, tasks, onPick, onClose }) {
  const [vm, setVm] = useState(value.slice(0, 7));
  const y = +vm.slice(0, 4);
  const m = +vm.slice(5, 7);
  const first = vm + '-01';
  const st = wkStart(first);
  const rows = Math.ceil((dBetween(st, vm + '-' + pad(new Date(y, m, 0).getDate())) + 1) / 7);
  const cells = [...Array(rows * 7)].map((_, i) => addDays(st, i));
  const has = new Set(tasks.map(t => t.date));
  const mv = k => setVm(addMonths(first, k).slice(0, 7));
  const thisY = new Date().getFullYear();
  const years = [...new Set([...Array(31)].map((_, i) => thisY - 10 + i).concat(y))].sort((a, b) => a - b);

  return (
    <Modal title="Chọn ngày" onClose={onClose}>
      <div className="row between gap">
        <button className="btn sm out" onClick={() => mv(-1)}>‹</button>
        <div className="row gap">
          <select value={m} onChange={e => setVm(y + '-' + pad(e.target.value))} style={{ width: 'auto' }}>
            {[...Array(12)].map((_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}
          </select>
          <select value={y} onChange={e => setVm(e.target.value + '-' + pad(m))} style={{ width: 'auto' }}>
            {years.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <button className="btn sm out" onClick={() => mv(1)}>›</button>
      </div>
      <div className="cgrid h">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="cgrid">
        {cells.map(d => (
          <button
            key={d}
            className={'cell ' + (d === value ? 'sel ' : '') + (d.slice(0, 7) !== vm ? 'out' : '')}
            onClick={() => onPick(d)}
          >
            <span className={'dn ' + (d === today() ? 'now' : '')}>{+d.slice(8)}</span>
            <span className="bars">{has.has(d) && <i style={{ background: 'var(--acc)' }} />}</span>
          </button>
        ))}
      </div>
      <div className="row between">
        <button className="btn sm out" onClick={() => onPick(today())}>Hôm nay</button>
        <button className="btn sm out" onClick={onClose}>Đóng</button>
      </div>
    </Modal>
  );
}
