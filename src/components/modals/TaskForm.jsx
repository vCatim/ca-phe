import React, { useState } from 'react';
import { Modal, Field, TimeInput } from '../ui/FormControls';
import { CATS, PRI, ST } from '../../constants';
import { today, uid, money } from '../../utils/format';

export function TaskForm({ item, onSave, onClose, onDel }) {
  const [f, setF] = useState(item);
  const [more, setMore] = useState(!!item.id);
  const set = (k, v) => setF({ ...f, [k]: v });
  const bad = !f.title.trim() || f.end <= f.start;
  const txs = item.txs || [];

  return (
    <Modal title={item.id ? 'Sửa công việc' : 'Thêm công việc'} onClose={onClose}>
      <Field l="Tên việc">
        <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="VD: Học React" autoFocus />
      </Field>
      <div className="grid2">
        <Field l="Bắt đầu (24h)">
          <TimeInput value={f.start} onChange={v => set('start', v)} />
        </Field>
        <Field l="Kết thúc (24h)">
          <TimeInput value={f.end} onChange={v => set('end', v)} />
        </Field>
      </div>
      {!more && <p className="mut s">📅 {f.date.split('-').reverse().join('/')} · {f.cat}</p>}
      <button className="btn sm out" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>
        {more ? 'Ẩn chi tiết ▴' : 'Thêm chi tiết ▾'}
      </button>
      {more && (
        <>
          <div className="grid2">
            <Field l="Ngày">
              <input type="date" value={f.date} onChange={e => set('date', e.target.value)} />
            </Field>
            <Field l="Nhóm">
              <select value={f.cat} onChange={e => set('cat', e.target.value)}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field l="Ưu tiên">
              <select value={f.pri} onChange={e => set('pri', e.target.value)}>
                {PRI.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field l="Trạng thái">
              <select value={f.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(ST).map(([k, v]) => (
                  <option key={k} value={k} disabled={k === 'done' && f.date > today()}>
                    {v}{k === 'done' && f.date > today() ? ' (chỉ mở khi đến ngày)' : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field l="Ghi chú">
            <textarea rows="2" value={f.note} onChange={e => set('note', e.target.value)} />
          </Field>
        </>
      )}
      {item.id && (
        <div className="card" style={{ padding: 12, background: 'var(--card2)', display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 14 }}>
          <div className="row between s">
            <b>💰 Khoản thu / chi gắn với việc này</b>
            <span className="mut">{txs.length ? `${txs.length} khoản` : 'Chưa có'}</span>
          </div>
          {txs.length ? (
            <div className="col" style={{ gap: 6 }}>
              {txs.map(x => (
                <div key={x.id} className="row between s" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <span>{x.type === 'income' ? '↗ Thu' : '↘ Chi'}: <b>{x.note || x.grp || 'Giao dịch'}</b></span>
                    <small className="mut">{x.grp} · {x.date.split('-').reverse().join('/')}</small>
                  </div>
                  <b style={{ color: x.type === 'income' ? 'var(--ok)' : 'var(--warn)' }}>
                    {x.type === 'income' ? '+' : '−'}{money(x.amount)}
                  </b>
                </div>
              ))}
              <div className="row between s" style={{ paddingTop: 4 }}>
                <b>Tổng chênh lệch</b>
                <b style={{ color: txs.reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0) >= 0 ? 'var(--ok)' : 'var(--warn)' }}>
                  {money(txs.reduce((a, x) => a + (x.type === 'income' ? x.amount : -x.amount), 0))}
                </b>
              </div>
            </div>
          ) : (
            <p className="mut s">Chưa có khoản thu/chi nào gắn với việc này.</p>
          )}
        </div>
      )}
      {f.end <= f.start && <p className="err">Giờ kết thúc phải sau giờ bắt đầu</p>}
      <button
        className="btn"
        disabled={bad}
        onClick={() => {
          const { txs: _tx, ...clean } = f;
          onSave({ ...clean, id: f.id || uid(), title: f.title.trim() });
        }}
      >
        Lưu
      </button>
      {item.id && <button className="btn out dng" onClick={() => onDel(item.id)}>🗑 Xóa việc này</button>}
    </Modal>
  );
}
