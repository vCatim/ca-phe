import React, { useState, useRef, useEffect } from 'react';
import { SunIcon, MoonIcon, ThemeIcon } from './Icons';
import { THEME_COLORS } from '../../constants';

const CheckIcon = ({ s = 14 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = ({ s = 14 }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const ThemeToggle = ({
  theme = 'dark',
  themeColor = 'coffee',
  onChangeTheme,
  onToggle,
  position = 'sidebar',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);

  const activeColorObj = THEME_COLORS.find(c => c.id === themeColor) || THEME_COLORS[0];
  const currentAccentHex = theme === 'light' ? activeColorObj.lightColor : activeColorObj.color;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = e => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = e => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelectMode = nextMode => {
    if (onChangeTheme) {
      onChangeTheme({ theme: nextMode, themeColor });
    } else if (onToggle && nextMode !== theme) {
      onToggle();
    }
  };

  const handleSelectColor = nextColor => {
    if (onChangeTheme) {
      onChangeTheme({ theme, themeColor: nextColor });
    }
  };

  const isAuth = position === 'auth';

  return (
    <div className="theme-picker-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={isAuth ? 'au-theme' : 'theme'}
        onClick={() => setIsOpen(v => !v)}
        aria-label="Tùy chỉnh chủ đề và màu sắc"
        title="Tùy chỉnh giao diện (Sáng/Tối & Màu sắc)"
        aria-expanded={isOpen}
      >
        <ThemeIcon theme={theme} />
        {!isAuth && (
          <span className="theme-label">
            {theme === 'dark' ? 'Tối' : 'Sáng'} • {activeColorObj.name}
          </span>
        )}
        <span
          className="theme-dot"
          style={{ backgroundColor: currentAccentHex }}
          title={activeColorObj.name}
        />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`theme-popover pos-${position}`}
          role="dialog"
          aria-label="Tùy chỉnh giao diện"
        >
          <div className="theme-popover-header">
            <span className="theme-popover-title">Giao diện & Màu sắc</span>
            <button
              type="button"
              className="theme-popover-close"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng"
            >
              <CloseIcon />
            </button>
          </div>

          {/* 1. Chế độ hiển thị (Sáng / Tối) */}
          <div className="theme-popover-sec">
            <span className="theme-popover-label">Chế độ</span>
            <div className="theme-mode-grid">
              <button
                type="button"
                className={`theme-mode-btn ${theme === 'dark' ? 'on' : ''}`}
                onClick={() => handleSelectMode('dark')}
              >
                <MoonIcon s={15} />
                <span>Tối</span>
              </button>
              <button
                type="button"
                className={`theme-mode-btn ${theme === 'light' ? 'on' : ''}`}
                onClick={() => handleSelectMode('light')}
              >
                <SunIcon s={15} />
                <span>Sáng</span>
              </button>
            </div>
          </div>

          {/* 2. Bộ màu chủ đạo */}
          <div className="theme-popover-sec">
            <span className="theme-popover-label">Bộ màu chủ đạo</span>
            <div className="theme-color-grid">
              {THEME_COLORS.map(c => {
                const swatchHex = theme === 'light' ? c.lightColor : c.color;
                const isSelected = themeColor === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`theme-color-btn ${isSelected ? 'on' : ''}`}
                    onClick={() => handleSelectColor(c.id)}
                  >
                    <span
                      className="theme-swatch"
                      style={{ backgroundColor: swatchHex }}
                    />
                    <div className="theme-color-meta">
                      <span className="theme-color-name">
                        <span style={{ marginRight: 6 }}>{c.icon}</span>
                        {c.name}
                      </span>
                      <small className="theme-color-desc">{c.desc}</small>
                    </div>
                    {isSelected && (
                      <span className="theme-check">
                        <CheckIcon />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
