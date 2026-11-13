import React from 'react';

export const LogoIcon = ({ s = 30 }) => (
  <svg viewBox="0 0 48 48" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 20h24v10a10 10 0 0 1-10 10h-4a10 10 0 0 1-10-10z" fill="currentColor" fillOpacity=".2" />
    <path d="M34 22h3a5 5 0 0 1 0 10h-4" />
    <path className="steam" d="M16 8c-2 2 2 4 0 7M23 6c-2 2 2 4 0 8M30 8c-2 2 2 4 0 7" />
    <path d="M8 44h28" />
  </svg>
);

export const TargetIcon = ({ s = 22, color = 'var(--acc)' }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" fill={color} />
  </svg>
);

export const SunIcon = ({ s = 18 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

export const MoonIcon = ({ s = 18 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z" />
  </svg>
);

export const ThemeIcon = ({ theme, s = 18 }) =>
  theme === 'dark' ? <MoonIcon s={s} /> : <SunIcon s={s} />;
