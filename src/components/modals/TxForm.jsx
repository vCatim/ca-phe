import React, { useState } from 'react';
import { Modal, Field, MoneyInput } from '../ui/FormControls';
import { CHIPS } from '../../constants';
import { dots, uid, today } from '../../utils/format';

export function TxForm({ item, onSave, onClose }) {
  const [f, setF] = useState(item);
  const [nw, setNw] = useState('');
  const isNew = f.grp === '__new';
  const set = (k, v) => setF({ ...f, [k]: v });

  const opts = item.allTasks.filter(t => t.date === f.date).sort((a, b) => a.start.localeCompare(b.start));
  const pick = id => {
    const k = item.allTasks.find(x => x.id === id);
    const g = k && (k.cat === 'Bài tập' ? 'Học tập' : k.cat);
    setF({ ...f, taskId: id, grp: g && item.groups.includes(g) ? g : f.grp });
  };
  const gname = isNew ? (item.groups.find(x => x.toLowerCase() === nw.trim().toLowerCase()) || nw.trim()) : f.grp;
  const chip = ([n, g]) => setF({ ...f, note: n, grp: item.groups.includes(g) ? g : f.grp });

  return (
    <Modal title={item.id ? 'Sửa giao dịch' : 'Thêm giao dịch'} onClose={onClose}>
      <div className="seg">
        {['expense', 'income'].map(t => (
          <button key={t} className={f.type === t ? 'on' : ''} onClick={() => set('type', t)}>
            {t === 'income' ? 'Thu nhập' : 'Chi tiêu'}
          </button>
        ))}
      </div>
      <Field l="Số tiền (đ)">
        <MoneyInput value={f.amount} onChange={v => set('amount', v)} placeholder="0" autoFocus />
      </Field>
      <div className="chips2">
        {[5000, 10000, 20000, 50000, 100000].map(n => (
          <button key={n} className="chip2" onClick={() => set('amount', (+f.amount || 0) + n)}>
            +{dots(n)}
          </button>
        ))}
      </div>
      <Field l="Ghi chú">
        <input value={f.note} onChange={e => set('note', e.target.value)} placeholder="VD: Cà phê" />
      </Field>
      <div className="chips2">
        {CHIPS[f.type].map(c => (
          <button key={c[0]} className="chip2" onClick={() => chip(c)}>
            {c[0]}
          </button>
        ))}
      </div>
      <Field l="Nhóm">
        <select value={f.grp} onChange={e => set('grp', e.target.value)}>
          {item.groups.map(g => <option key={g}>{g}</option>)}
          <option value="__new">＋ Tạo nhóm mới…</option>
        </select>
      </Field>
      {isNew && (
        <Field l="Tên nhóm mới">
          <input value={nw} onChange={e => setNw(e.target.value)} placeholder="VD: Du lịch" autoFocus />
        </Field>
      )}
      {opts.length > 0 && (
        <Field l="Việc liên quan (tuỳ chọn)">
          <select value={f.taskId} onChange={e => pick(e.target.value)}>
            <option value="">Không gắn việc</option>
            {opts.map(t => (
              <option key={t.id} value={t.id}>{t.start} · {t.title}</option>
            ))}
          </select>
        </Field>
      )}
      {opts.length > 0 && <p className="mut s">Gắn với việc: khoản này chỉ được tính khi việc hoàn thành. Không gắn việc: tính ngay.</p>}
      {item.id ? (
        <Field l="Ngày">
          <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value, taskId: '' })} />
        </Field>
      ) : (
        f.date !== today() && <p className="mut s">Ghi cho ngày {f.date.split('-').reverse().join('/')}</p>
      )}
      <button
        className="btn"
        disabled={!(+f.amount > 0) || !gname}
        onClick={() => {
          const { allTasks, groups, ...r } = f;
          const k = allTasks.find(x => x.id === f.taskId);
          onSave({ ...r, id: f.id || uid(), amount: +f.amount, tk: k ? k.title : '', grp: gname });
        }}
      >
        Lưu
      </button>
    </Modal>
  );
}
