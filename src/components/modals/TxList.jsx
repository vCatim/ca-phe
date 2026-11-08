import React from 'react';
import { Modal } from '../ui/FormControls';
import { today, money } from '../../utils/format';
import { isEff, tInfo } from '../../utils/storage';

export function TxList({ db, type, date, onClose, onAdd, onEdit, onDel }) {
  const d = date || today();
  const isT = d === today();
  const list = db.txs.filter(x => x.date === d && x.type === type);
  const tot = list.filter(x => isEff(db, x)).reduce((a, x) => a + x.amount, 0);
  const inc = type === 'income';
  const pend = list.some(x => !isEff(db, x));

  return (
    <Modal
      title={
        inc
          ? isT
            ? 'Thu nhập hôm nay'
            : `Thu nhập ngày ${d.split('-').reverse().join('/')}`
          : isT
          ? 'Chi tiêu hôm nay'
          : `Chi tiêu ngày ${d.split('-').reverse().join('/')}`
      }
      onClose={onClose}
    >
      {list.length ? (
        list.map(x => (
          <div key={x.id} className={'row gap tx2' + (isEff(db, x) ? '' : ' pend')}>
            <div className="grow">
              <b>{x.note || tInfo(db.tasks, x).title}</b>
              <small>
                {x.grp || 'Khác'} · 🔗 {tInfo(db.tasks, x).title}
                {isEff(db, x) ? '' : ' · ⏳ chờ hoàn thành việc'}
              </small>
            </div>
            <b style={{ color: inc ? 'var(--ok)' : 'var(--warn)' }}>{money(x.amount)}</b>
            <button className="ib" onClick={() => onEdit(x)}>✎</button>
            <button className="ib" onClick={() => onDel(x.id)}>🗑</button>
          </div>
        ))
      ) : (
        <p className="mut">{isT ? 'Hôm nay chưa có khoản nào.' : 'Ngày này chưa có khoản nào.'}</p>
      )}
      {pend && <p className="mut s">Khoản gắn với việc chưa hoàn thành chưa được tính vào tổng.</p>}
      <div className="row between">
        <b>Tổng (đã tính)</b>
        <b>{money(tot)}</b>
      </div>
      <button className="btn" onClick={onAdd}>
        + {inc ? 'Thu nhập' : 'Chi tiêu'}
      </button>
    </Modal>
  );
}
