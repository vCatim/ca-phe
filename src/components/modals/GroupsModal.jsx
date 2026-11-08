import React, { useState } from 'react';
import { Modal } from '../ui/FormControls';

export function GroupsModal({ groups, onClose, onAdd, onRemove }) {
  const [n, setN] = useState('');
  const add = () => {
    const v = n.trim();
    if (v && !groups.some(g => g.name.toLowerCase() === v.toLowerCase())) onAdd(v);
    setN('');
  };

  return (
    <Modal title="Nhóm chi tiêu" onClose={onClose}>
      <div className="col" style={{ gap: 6 }}>
        {groups.map(g => (
          <div key={g.name} className="row gap tx2">
            <i className="dot" style={{ background: g.color }} />
            <span className="grow">{g.name}</span>
            {g.name !== 'Khác' ? (
              <button className="ib" onClick={() => onRemove(g.name)}>🗑</button>
            ) : (
              <small>mặc định</small>
            )}
          </div>
        ))}
      </div>
      <div className="row gap">
        <input
          value={n}
          onChange={e => setN(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Tên nhóm mới, VD: Du lịch"
        />
        <button className="btn sm" onClick={add}>+ Thêm</button>
      </div>
      <p className="mut s">Xóa nhóm thì các giao dịch của nhóm đó được tính vào "Khác".</p>
    </Modal>
  );
}
