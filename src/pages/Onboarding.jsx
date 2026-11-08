import React, { useState } from 'react';
import { LogoIcon } from '../components/ui/Icons';
import { Field, MoneyInput } from '../components/ui/FormControls';

export function Onboarding({ onDone, onBack, initialName = '', initialBudget = '', initialIncome = '', initialCash = '' }) {
  const [f, setF] = useState({
    name: initialName || '',
    budget: initialBudget || '',
    income: initialIncome || '',
    cashBase: initialCash || '',
  });
  const set = (k, v) => setF({ ...f, [k]: v });

  return (
    <div className="onb">
      <div className="card onbc" style={{ maxWidth: 500 }}>
        <div className="logo"><LogoIcon s={34} /> Cà Phê</div>
        <h2>Thiết lập tài khoản</h2>
        <p className="mut">Nhập thông tin để bắt đầu quản lý thời gian, chi tiêu và các quỹ của bạn.</p>
        <Field l="Tên của bạn">
          <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên của bạn" autoFocus />
        </Field>
        <Field l="Ngân sách chi tiêu dự tính / tháng (đ)">
          <MoneyInput value={f.budget} onChange={v => set('budget', v)} placeholder="VD: 3.000.000" />
        </Field>
        <Field l="Thu nhập dự tính / tháng (đ)">
          <MoneyInput value={f.income} onChange={v => set('income', v)} placeholder="VD: 5.000.000" />
        </Field>
        <Field l="Số dư hiện có (đ)">
          <MoneyInput value={f.cashBase} onChange={v => set('cashBase', v)} placeholder="VD: 2.000.000" />
        </Field>
        <p className="mut s">Bạn có thể tạo và nạp tiền vào quỹ sau khi hoàn tất.</p>
        <button className="btn" disabled={!f.name.trim()} onClick={() => onDone(f)} style={{ marginTop: 6 }}>
          Hoàn tất & Bắt đầu →
        </button>
        {onBack && (
          <button type="button" className="btn out" onClick={onBack}>
            ← Đăng xuất
          </button>
        )}
      </div>
    </div>
  );
}
