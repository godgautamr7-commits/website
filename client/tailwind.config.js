/** @type {import('tailwindcss').Config} */

/* Every colour that changes between themes reads from a CSS variable
   (see src/themes.css). Channels are stored as "r g b" so Tailwind's
   opacity modifiers (bg-white/10, text-cyan-300/80 ...) keep working. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (hue, shades) => Object.fromEntries(shades.map((s) => [s, v(`${hue}-${s}`)]));

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "white" = the theme's foreground colour (white on dark themes, ink on light themes)
        white: v('fg'),
        'on-accent': v('on-accent'),
        slate: scale('slate', [100, 200, 300, 400, 500, 600]),
        ink: { 950: v('ink-950'), 900: v('ink-900'), 850: v('ink-850'), 800: v('ink-800'), 700: v('ink-700') },
        navy: { 900: '#070b1d', 800: '#0a1130', 700: '#101a45', 600: '#18265f' },
        violet: scale('violet', [200, 300, 400, 500, 600]),
        cyan: scale('cyan', [100, 200, 300, 400, 500, 600]),
        emerald: scale('emerald', [200, 300, 400, 500]),
        amber: scale('amber', [100, 200, 300, 400, 500]),
        rose: scale('rose', [200, 300, 400, 500]),
        sky: scale('sky', [300, 400, 500]),
        blue: scale('blue', [300, 400]),
      },
      fontFamily: {
        sans: ['var(--font-body)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgb(var(--violet-500) / 0.55)',
        cyan: '0 0 40px -10px rgb(var(--cyan-400) / 0.5)',
        card: 'var(--shadow-card)',
      },
      backgroundImage: {
        'grid-fade': 'radial-gradient(circle at 50% 0%, rgb(var(--violet-500) / 0.16), transparent 60%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        pulseglow: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        rise: { '0%': { opacity: '0', transform: 'translateY(18px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        pulseglow: 'pulseglow 4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        rise: 'rise 0.6s ease-out both',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
};
