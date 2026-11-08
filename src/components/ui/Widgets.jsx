import React, { useState, useEffect } from 'react';

export const Ring = ({ pct, size = 120 }) => {
  const [v, setV] = useState(0); // bắt đầu từ 0 rồi chạy lên → vòng tròn "đầy dần"
  useEffect(() => {
    const t = setTimeout(() => setV(pct), 40);
    return () => clearTimeout(t);
  }, [pct]);
  const r = 52;
  const C = 2 * Math.PI * r;
  const p = Math.min(v, 100);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={pct > 100 ? 'var(--warn)' : 'var(--acc)'}
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${(C * p) / 100} ${C}`}
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.8,.2,1)' }}
      />
      <circle cx="60" cy="8" r="4.5" fill="var(--acc)" />
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fill="var(--tx)"
        fontSize="23"
        fontWeight="700"
        fontFamily="'Playfair Display', Georgia, serif"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
};

export const Donut = ({ data }) => {
  const tot = data.reduce((a, d) => a + d.v, 0);
  const r = 54;
  const C = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg viewBox="0 0 140 140" width="160" height="160">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
      {tot > 0 &&
        data
          .filter(d => d.v > 0)
          .map(d => {
            const len = (d.v / tot) * C;
            const el = (
              <circle
                key={d.k}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={d.c}
                strokeWidth="18"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-off}
                transform="rotate(-90 70 70)"
                style={{ transition: 'all .6s' }}
              />
            );
            off += len;
            return el;
          })}
    </svg>
  );
};

export const Bar = ({ pct, color }) => (
  <div className="bar">
    <i
      style={{
        width: Math.min(pct, 100) + '%',
        background: color || (pct > 100 ? 'var(--warn)' : 'var(--acc)')
      }}
    />
  </div>
);

export const Stat = ({ l, v, c, onClick }) => (
  <div className={'card stat' + (onClick ? ' clk' : '')} onClick={onClick}>
    <small>{l}{onClick ? ' ›' : ''}</small>
    <b style={{ color: c }}>{v}</b>
  </div>
);

// Lời chào: mỗi ký tự là một span có chỉ số --i để nhảy lần lượt khi rê chuột vào banner
export function Hop({ name }) {
  let i = 0;
  const part = t => [...t].map(c => <span key={i} aria-hidden="true" style={{ '--i': i++ }}>{c}</span>);
  return (
    <h1 className="hop" aria-label={`Chào ${name} ☕`}>
      {part('Chào ')}
      <span className="nm">{part(name)}</span>
      {part(' ☕')}
    </h1>
  );
}
