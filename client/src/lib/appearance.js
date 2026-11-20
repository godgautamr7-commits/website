/* Admin-controlled appearance (Admin → Appearance).
   The saved block is applied on top of the active theme as CSS variables, so
   it works with every theme and never touches component markup. */
import { BACKGROUNDS, DEFAULT_BG, DEFAULT_THEME, THEMES } from './themes';

export const APPEARANCE_KEY = 'swiftcloud_appearance';
export const MOTIONS = [
  { id: 'orbs', label: 'Cursor orbs', note: 'Soft glowing orbs and shapes follow the mouse' },
  { id: 'spotlight', label: 'Spotlight grid', note: 'A dot grid that lights up under the cursor' },
  { id: 'off', label: 'Off', note: 'No hero motion' },
];

export const DEFAULT_APPEARANCE = {
  default_theme: DEFAULT_THEME,
  default_bg: DEFAULT_BG,
  visitor_switcher: true,
  hero_motion: 'orbs',
  motion_intensity: 60,
  page_bg_color: '',
  accent_color: '',
  bg_image_url: '',
  bg_image_opacity: 35,
  bg_image_blur: 0,
};

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (v, min, max, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d; };

export function normalizeAppearance(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const d = DEFAULT_APPEARANCE;
  return {
    default_theme: THEMES.some((t) => t.id === r.default_theme) ? r.default_theme : d.default_theme,
    default_bg: BACKGROUNDS.some((b) => b.id === r.default_bg) ? r.default_bg : d.default_bg,
    visitor_switcher: r.visitor_switcher !== false,
    hero_motion: MOTIONS.some((m) => m.id === r.hero_motion) ? r.hero_motion : d.hero_motion,
    motion_intensity: clamp(r.motion_intensity, 0, 100, d.motion_intensity),
    page_bg_color: HEX.test(r.page_bg_color || '') ? r.page_bg_color.toLowerCase() : '',
    accent_color: HEX.test(r.accent_color || '') ? r.accent_color.toLowerCase() : '',
    bg_image_url: typeof r.bg_image_url === 'string' ? r.bg_image_url.trim() : '',
    bg_image_opacity: clamp(r.bg_image_opacity, 0, 100, d.bg_image_opacity),
    bg_image_blur: clamp(r.bg_image_blur, 0, 24, d.bg_image_blur),
  };
}

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (rgb, other, t) => rgb.map((c, i) => Math.round(c + (other[i] - c) * t));
const ch = (rgb) => rgb.join(' ');
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const ACCENT_VARS = ['violet-200', 'violet-300', 'violet-400', 'violet-500', 'violet-600',
  'cyan-100', 'cyan-200', 'cyan-300', 'cyan-400', 'cyan-500', 'cyan-600', 'on-accent'];
const INK_VARS = ['ink-950', 'ink-900', 'ink-850', 'ink-800', 'ink-700'];

/* Writes (or clears) the CSS variables for the given appearance. */
export function applyAppearance(app, scheme) {
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  const clear = (k) => root.style.removeProperty(k);
  const dark = scheme !== 'light';

  if (app.accent_color) {
    const c = toRgb(app.accent_color);
    const shades = dark
      ? { 200: mix(c, WHITE, 0.72), 300: mix(c, WHITE, 0.45), 400: mix(c, WHITE, 0.2), 500: c, 600: mix(c, BLACK, 0.14) }
      : { 200: mix(c, BLACK, 0.45), 300: mix(c, BLACK, 0.24), 400: c, 500: c, 600: mix(c, BLACK, 0.14) };
    for (const [s, v] of Object.entries(shades)) set(`--violet-${s}`, ch(v));
    set('--cyan-100', ch(dark ? mix(c, WHITE, 0.82) : mix(c, BLACK, 0.5)));
    set('--cyan-200', ch(shades[200]));
    set('--cyan-300', ch(shades[300]));
    set('--cyan-400', ch(mix(c, WHITE, dark ? 0.3 : 0.28)));
    set('--cyan-500', ch(mix(c, WHITE, dark ? 0.22 : 0.2)));
    set('--cyan-600', ch(c));
    set('--on-accent', luminance(c) > 0.62 ? '20 20 24' : '255 255 255');
  } else {
    ACCENT_VARS.forEach(clear);
  }

  if (app.page_bg_color) {
    const c = toRgb(app.page_bg_color);
    set('--page-bg', app.page_bg_color);
    set('--ink-950', ch(c));
    if (dark) {
      set('--ink-900', ch(mix(c, WHITE, 0.04)));
      set('--ink-850', ch(mix(c, WHITE, 0.08)));
      set('--ink-800', ch(mix(c, WHITE, 0.12)));
      set('--ink-700', ch(mix(c, WHITE, 0.2)));
    } else {
      ['--ink-900', '--ink-850', '--ink-800', '--ink-700'].forEach(clear);
    }
  } else {
    clear('--page-bg');
    INK_VARS.forEach((k) => clear(`--${k}`));
  }

  const url = app.bg_image_url;
  if (url && /^(\/uploads\/[\w.-]+|https:\/\/[^\s"'()\\]+)$/.test(url)) {
    set('--bgimg', `url("${url}")`);
    set('--bgimg-opacity', String(app.bg_image_opacity / 100));
    set('--bgimg-blur', `${app.bg_image_blur}px`);
    root.setAttribute('data-bgimg', 'on');
  } else {
    ['--bgimg', '--bgimg-opacity', '--bgimg-blur'].forEach(clear);
    root.setAttribute('data-bgimg', 'off');
  }
}

export function readCachedAppearance() {
  try { return normalizeAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY) || '{}')); }
  catch { return normalizeAppearance({}); }
}
