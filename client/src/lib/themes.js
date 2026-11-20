/* Theme registry — one source of truth for the switcher, the provider and
   the pre-paint script in index.html (keep the ids in sync with that script). */

export const THEMES = [
  { id: 'legacy-dark', name: 'Legacy Black', note: 'Editorial, black, huge type', scheme: 'dark', color: '#050505' },
  { id: 'legacy-light', name: 'Legacy White', note: 'Editorial, white, huge type', scheme: 'light', color: '#fafaf8' },
  { id: 'cyber', name: 'Cyberpunk', note: 'Dark, neon pink, grain & scanlines', scheme: 'dark', color: '#08020c' },
  { id: 'neu', name: 'Neumorphism', note: 'Soft shadows, light and clean', scheme: 'light', color: '#f0eff4' },
  { id: 'bento', name: 'Bento UI', note: 'Modular tiles, bright blue', scheme: 'light', color: '#e2e2e6' },
  { id: 'material', name: 'Material', note: 'Layered, elevated, full of motion', scheme: 'light', color: '#eceefb' },
  { id: 'glass', name: 'Original', note: 'The first Legacy Cloud look', scheme: 'dark', color: '#05060d' },
];

export const BACKGROUNDS = [
  { id: 'animated', label: 'Animated' },
  { id: 'texture', label: 'Texture' },
  { id: 'plain', label: 'Plain' },
];

export const THEME_KEY = 'swiftcloud_theme';
export const BG_KEY = 'swiftcloud_bg';
export const DEFAULT_THEME = 'legacy-dark';
export const DEFAULT_BG = 'animated';

export const isLegacy = (id) => typeof id === 'string' && id.startsWith('legacy');

export function readStored(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

/* Writes the attributes the stylesheet keys off. Safe to call repeatedly. */
export function applyTheme(themeId, bgId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-scheme', theme.scheme);
  root.setAttribute('data-bg', bgId);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.color);
}

export function readStoredRaw(key, allowed) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : null;
  } catch {
    return null;
  }
}
