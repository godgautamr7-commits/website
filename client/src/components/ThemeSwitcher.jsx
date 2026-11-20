import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/themeContext';

function PaletteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-.9.8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function ThemeSwitcher() {
  const { theme, bg, setTheme, setBg, themes, backgrounds, hasOverride, resetToDefault } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div className="ts-root" ref={rootRef}>
      {open && (
        <div className="ts-panel" role="dialog" aria-label="Appearance">
          <div className="ts-head">
            <span className="ts-title">Theme</span>
            <span className="ts-sub">Pick a look</span>
          </div>
          <div className="ts-opts" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} className="ts-opt" onClick={() => setTheme(t.id)}>
                <span className="ts-thumb" data-t={t.id} aria-hidden="true"><i /><i /><i /></span>
                <span>
                  <span className="ts-name">{t.name}</span>
                  <span className="ts-note">{t.note}</span>
                </span>
                <span className="ts-check"><CheckIcon /></span>
              </button>
            ))}
          </div>

          <p className="ts-label">Background</p>
          <div className="ts-seg" role="radiogroup" aria-label="Background style">
            {backgrounds.map((b) => (
              <button key={b.id} type="button" role="radio" aria-checked={bg === b.id} onClick={() => setBg(b.id)}>{b.label}</button>
            ))}
          </div>
          <p className="ts-foot">Saved on this device. Texture keeps the pattern but stops the motion.</p>
          {hasOverride && <button type="button" className="ts-reset" onClick={resetToDefault}>Use the site default</button>}
        </div>
      )}
      <button type="button" className="ts-fab" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Change theme and background" title="Theme & background">
        <PaletteIcon />
      </button>
    </div>
  );
}
