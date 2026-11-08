import React, { useState } from 'react';
import { Modal, Field, MoneyInput } from '../ui/FormControls';
import { money } from '../../utils/format';
import { fundBalance } from '../../utils/storage';

export function FundTransferForm({ fund, direction, available, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const isDeposit = direction === 'deposit';
  const max = isDeposit ? available : fundBalance(fund);
  const value = +amount || 0;

  return (
    <Modal title={isDeposit ? `Nạp vào ${fund.title}` : `Rút từ ${fund.title}`} onClose={onClose}>
      <p className="mut s">
        {isDeposit
          ? `Có thể nạp tối đa ${money(Math.max(0, available))}.`
          : `Số dư quỹ: ${money(fundBalance(fund))}.`}
      </p>
      <Field l="Số tiền (đ)">
        <MoneyInput value={amount} onChange={setAmount} placeholder="0" autoFocus />
      </Field>
      {value > max && <p className="err">Số tiền vượt quá số dư có thể dùng.</p>}
      <button className="btn" disabled={!(value > 0) || value > max} onClick={() => onSave(value)}>
        Xác nhận
      </button>
    </Modal>
  );
}
