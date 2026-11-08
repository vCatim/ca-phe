import React, { useState } from 'react';
import { Modal, Field, MoneyInput } from '../ui/FormControls';

export function BalanceForm({ current, onSave, onClose }) {
  const [amount, setAmount] = useState(Math.max(0, current));

  return (
    <Modal title="Điều chỉnh số dư hiện có" onClose={onClose}>
      <Field l="Số dư hiện có (đ)">
        <MoneyInput value={amount} onChange={setAmount} placeholder="0" autoFocus />
      </Field>
      <p className="mut s">Số tiền này không bao gồm các khoản đã phân bổ vào quỹ.</p>
      <button className="btn" disabled={amount === '' || amount == null} onClick={() => onSave(+amount || 0)}>
        Lưu số dư
      </button>
    </Modal>
  );
}
