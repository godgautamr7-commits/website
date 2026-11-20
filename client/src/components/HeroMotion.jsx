import { useEffect, useRef } from 'react';
import { useTheme } from '../context/themeContext';

/* Mouse-reactive motion behind the hero.
   - Smoothly follows the cursor (eased), drifts on its own when the pointer is
     idle or on touch screens, and stops completely for "reduced motion".
   - Look comes from the active theme (themes.css, ".hm-*" rules).
   - Style + strength are set in Admin → Appearance. */
const SHAPES = ['a', 'b', 'c', 'd'];

export default function HeroMotion() {
  const { appearance } = useTheme();
  const style = appearance.hero_motion;
  const intensity = appearance.motion_intensity;
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || style === 'off') return undefined;
    const host = el.parentElement;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const cur = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };
    let lastMove = 0;
    let raf = 0;
    let visible = true;

    const paint = () => {
      el.style.setProperty('--px', cur.x.toFixed(4));
      el.style.setProperty('--py', cur.y.toFixed(4));
    };
    paint();
    if (reduced) return undefined;

    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      const r = host.getBoundingClientRect();
      target.x = Math.min(1.15, Math.max(-0.15, (e.clientX - r.left) / r.width));
      target.y = Math.min(1.15, Math.max(-0.15, (e.clientY - r.top) / r.height));
      lastMove = performance.now();
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const mode = document.documentElement.dataset.bg;
      if (!visible || mode === 'texture' || mode === 'plain') return;
      if (now - lastMove > 2500) { // idle → gentle drift so the hero never feels frozen
        const t = now / 1000;
        target.x = 0.5 + Math.sin(t * 0.45) * 0.28;
        target.y = 0.5 + Math.cos(t * 0.37) * 0.22;
      }
      cur.x += (target.x - cur.x) * 0.07;
      cur.y += (target.y - cur.y) * 0.07;
      paint();
    };

    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 });
    io.observe(host);
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [style]);

  if (style === 'off') return null;
  return (
    <div className={`hm hm-${style}`} ref={ref} aria-hidden="true" style={{ '--amp': intensity / 100 }}>
      {style === 'orbs' && (
        <>
          <span className="hm-orb hm-orb-1" />
          <span className="hm-orb hm-orb-2" />
          <span className="hm-orb hm-orb-3" />
          {SHAPES.map((s) => <span key={s} className={`hm-shape hm-shape-${s}`} />)}
        </>
      )}
      {style === 'spotlight' && (
        <>
          <span className="hm-grid" />
          <span className="hm-grid hm-grid-lit" />
        </>
      )}
      <span className="hm-glow" />
    </div>
  );
}
