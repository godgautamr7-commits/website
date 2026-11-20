import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';
import BackgroundFX from '../components/BackgroundFX';
import { APPEARANCE_KEY, applyAppearance, normalizeAppearance, readCachedAppearance } from '../lib/appearance';
import { BACKGROUNDS, BG_KEY, THEMES, THEME_KEY, applyTheme, readStoredRaw } from '../lib/themes';

const THEME_IDS = THEMES.map((t) => t.id);
const BG_IDS = BACKGROUNDS.map((b) => b.id);
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const schemeOf = (id) => (THEMES.find((t) => t.id === id) || THEMES[0]).scheme;

function save(key, value) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/* Look = visitor's own pick (if any) → otherwise the site default set by the admin.
   An admin "preview" (Admin → Appearance) temporarily overrides both. */
export function ThemeProvider({ children }) {
  const [userTheme, setUserTheme] = useState(() => readStoredRaw(THEME_KEY, THEME_IDS));
  const [userBg, setUserBg] = useState(() => readStoredRaw(BG_KEY, BG_IDS));
  const [saved, setSaved] = useState(readCachedAppearance);
  const [preview, setPreview] = useState(null);

  const appearance = preview || saved;
  const theme = preview ? appearance.default_theme : userTheme ?? appearance.default_theme;
  const bg = preview ? appearance.default_bg : userBg ?? appearance.default_bg;

  useLayoutEffect(() => {
    applyTheme(theme, bg);
    applyAppearance(appearance, schemeOf(theme));
  }, [theme, bg, appearance]);

  const setTheme = useCallback((id) => {
    if (!THEME_IDS.includes(id) || id === theme) return;
    const commit = () => {
      applyTheme(id, bg);
      applyAppearance(appearance, schemeOf(id));
      setUserTheme(id);
      save(THEME_KEY, id);
    };
    // Cross-fade between looks where the browser supports it
    if (document.startViewTransition && !prefersReducedMotion()) document.startViewTransition(commit);
    else commit();
  }, [theme, bg, appearance]);

  const setBg = useCallback((id) => {
    if (!BG_IDS.includes(id)) return;
    setUserBg(id);
    save(BG_KEY, id);
  }, []);

  /* Visitor goes back to whatever the site admin chose */
  const resetToDefault = useCallback(() => {
    setUserTheme(null); setUserBg(null);
    save(THEME_KEY, null); save(BG_KEY, null);
  }, []);

  /* Called with the admin's saved block (from /home) */
  const setAdminAppearance = useCallback((raw) => {
    const next = normalizeAppearance(raw);
    setSaved(next);
    save(APPEARANCE_KEY, JSON.stringify(next));
  }, []);

  /* Live preview from the admin editor; pass null to stop previewing */
  const previewAppearance = useCallback((raw) => setPreview(raw ? normalizeAppearance(raw) : null), []);

  /* Material ripple on buttons + cursor-following spotlight on cards */
  useEffect(() => {
    const onPointerDown = (e) => {
      if (document.documentElement.dataset.theme !== 'material' || prefersReducedMotion()) return;
      const el = e.target.closest?.('.btn, .btn-primary, .btn-ghost, .btn-danger, .sidebar-link');
      if (!el || el.disabled) return;
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      const dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      dot.style.left = `${e.clientX - rect.left - size / 2}px`;
      dot.style.top = `${e.clientY - rect.top - size / 2}px`;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(dot);
      dot.addEventListener('animationend', () => dot.remove(), { once: true });
    };

    let frame = 0;
    const onPointerMove = (e) => {
      if (frame || e.pointerType === 'touch') return;
      const card = e.target.closest?.('.glass');
      if (!card) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const value = useMemo(() => ({
    theme, bg, appearance, themes: THEMES, backgrounds: BACKGROUNDS,
    hasOverride: userTheme !== null || userBg !== null,
    setTheme, setBg, resetToDefault, setAdminAppearance, previewAppearance,
  }), [theme, bg, appearance, userTheme, userBg, setTheme, setBg, resetToDefault, setAdminAppearance, previewAppearance]);

  return (
    <ThemeContext.Provider value={value}>
      <BackgroundFX />
      {children}
    </ThemeContext.Provider>
  );
}
