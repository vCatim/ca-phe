import React, { useState } from 'react';
import { Modal, Field } from '../ui/FormControls';
import { uid } from '../../utils/format';
import { fundBalance } from '../../utils/storage';

export function FundForm({ item, onSave, onClose }) {
  const [title, setTitle] = useState(item.title || '');

  return (
    <Modal title={item.id ? 'Đổi tên quỹ' : 'Tạo quỹ mới'} onClose={onClose}>
      <Field l="Tên quỹ">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Du lịch" autoFocus />
      </Field>
      <p className="mut s">Bạn có thể nạp tiền vào quỹ ngay sau khi tạo.</p>
      <button
        className="btn"
        disabled={!title.trim()}
        onClick={() =>
          onSave({
            ...item,
            id: item.id || uid(),
            title: title.trim(),
            balance: fundBalance(item),
            current: fundBalance(item),
            target: fundBalance(item),
            unit: 'đ',
            auto: false
          })
        }
      >
        Lưu
      </button>
    </Modal>
  );
}
