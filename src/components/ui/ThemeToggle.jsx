import React from 'react';
import { ThemeIcon } from './Icons';

export const ThemeToggle = ({ theme, onToggle }) => (
  <button
    className="theme"
    onClick={onToggle}
    aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
    title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
  >
    <ThemeIcon theme={theme} />
    <span className="theme-label">{theme === 'dark' ? 'Sáng' : 'Tối'}</span>
  </button>
);
