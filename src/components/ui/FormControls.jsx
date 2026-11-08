import React, { useEffect } from 'react';
import { pad, dots } from '../../utils/format';

export const Field = ({ l, children }) => (
  <label className="f">
    <span>{l}</span>
    {children}
  </label>
);

export const MoneyInput = ({ value, onChange, ...r }) => (
  <input
    {...r}
    inputMode="numeric"
    value={value === '' || value == null ? '' : dots(value)}
    onChange={e => {
      const d = e.target.value.replace(/\D/g, '');
      onChange(d === '' ? '' : +d);
    }}
  />
);

export const TimeInput = ({ value, onChange }) => {
  // giờ 24h, không AM/PM
  const [h, m] = value.split(':');
  const mins = [...Array(12)].map((_, i) => pad(i * 5));
  if (!mins.includes(m)) {
    mins.push(m);
    mins.sort();
  }
  return (
    <div className="row gap">
      <select value={h} onChange={e => onChange(e.target.value + ':' + m)}>
        {[...Array(24)].map((_, i) => (
          <option key={i}>{pad(i)}</option>
        ))}
      </select>
      <b>:</b>
      <select value={m} onChange={e => onChange(h + ':' + e.target.value)}>
        {mins.map(x => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
};

export const Modal = ({ title, onClose, children }) => {
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="ov"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="row between">
          <h3>{title}</h3>
          <button className="ib" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
