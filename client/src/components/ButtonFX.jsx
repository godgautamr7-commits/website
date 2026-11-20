import { useEffect } from 'react';

/* One delegated listener that feeds the pointer position (--mx / --my, in px)
   to the "aurora" buttons so their blue light follows the cursor. */
const SELECTOR = '.btn-aurora, .btn-primary, .lg-bar';

export default function ButtonFX() {
  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return undefined;
    const move = (e) => {
      const el = e.target.closest?.(SELECTOR);
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(1)}px`);
      el.style.setProperty('--my', `${(e.clientY - r.top).toFixed(1)}px`);
    };
    document.addEventListener('pointermove', move, { passive: true });
    return () => document.removeEventListener('pointermove', move);
  }, []);
  return null;
}
