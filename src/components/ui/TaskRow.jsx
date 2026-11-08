import React from 'react';
import { CC } from '../../constants';
import { today } from '../../utils/format';

export const TaskRow = ({ t, onToggle, onEdit, onDel }) => {
  const isFuture = t.date > today();
  return (
    <div className={'task ' + (t.status === 'done' ? 'done' : '')} style={{ '--c': CC[t.cat] }}>
      <button
        className={'chk ' + (t.status === 'done' ? 'on' : '') + (isFuture ? ' dis' : '')}
        onClick={() => onToggle(t)}
        title={isFuture ? 'Chưa đến ngày nên chưa thể hoàn thành' : (t.status === 'done' ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành')}
      >
        {t.status === 'done' ? '✓' : isFuture ? '🔒' : ''}
      </button>
      <div className="grow">
        <b>{t.title}</b>
        <small>{t.start}–{t.end}{t.note ? ' · ' + t.note : ''}</small>
      </div>
      <span className="tag cat" style={{ '--c': CC[t.cat] }}>{t.cat}</span>
      {t.pri === 'Cao' && <span className="tag hi">Cao</span>}
      <button className="ib" onClick={() => onEdit(t)}>✎</button>
      <button className="ib" onClick={() => onDel(t.id)}>🗑</button>
    </div>
  );
};
