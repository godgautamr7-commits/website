/* Legacy Cloud editorial UI (Legacy Black / Legacy White themes).
   Inspired by large-type editorial sites: huge headings, hairlines, numbered
   labels, black/white sections, a mouse-reactive hero and an "explore" overlay. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import Emoji, { Rich } from './Emoji';
import Icon from './icons';
import { Skeleton, SkeletonLine } from './ui';
import { useTheme } from '../context/themeContext';
import { FACTS, GUIDES, MARQUEE, MODES, WORLDS } from '../lib/minecraft';
import { isLegacy } from '../lib/themes';
import MinecraftWorld from './MinecraftWorld';
import IsoIsland from './IsoIsland';

export const UpRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6" /></svg>
);
const Down = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" /></svg>
);

/* ---------- image with skeleton loading ---------- */
export function ProgressiveImage({ src, alt, className = '', eager = false, style }) {
  const [state, setState] = useState('loading');
  const ref = useRef(null);
  useEffect(() => {
    setState('loading');
    const el = ref.current;
    if (el && el.complete && el.naturalWidth > 0) setState('ready');
  }, [src]);
  return (
    <div className={`pimg ${className}`} data-state={state} style={style}>
      {state === 'loading' && <span className="pimg-skel skeleton" aria-hidden="true" />}
      <img ref={ref} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" onLoad={() => setState('ready')} onError={() => setState('error')} />
    </div>
  );
}

/* ---------- Black / White switch (header) ---------- */
export function ModeToggle() {
  const { theme, themes, setTheme } = useTheme();
  const dark = (themes.find((t) => t.id === theme)?.scheme || 'dark') === 'dark';
  return (
    <button type="button" className="mode-toggle" onClick={() => setTheme(dark ? 'legacy-light' : 'legacy-dark')}
      aria-label={`Switch to ${dark ? 'white' : 'black'} background`} title="Black / White background">
      <span data-on={dark}>Black</span><span data-on={!dark}>White</span>
    </button>
  );
}

/* ---------- ring cursor (desktop, legacy themes only) ---------- */
export function CustomCursor() {
  const { theme } = useTheme();
  const ref = useRef(null);
  const legacy = isLegacy(theme);
  useEffect(() => {
    if (!legacy || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    let x = -100; let y = -100; let cx = -100; let cy = -100; let raf = 0;
    const move = (e) => {
      x = e.clientX; y = e.clientY;
      el.dataset.shown = '1';
      el.dataset.hover = e.target.closest?.('a, button, [role="button"], input, select, textarea, label, [data-cursor]') ? '1' : '0';
    };
    const leave = () => { el.dataset.shown = '0'; };
    const tick = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`; raf = requestAnimationFrame(tick); };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); };
  }, [legacy]);
  if (!legacy) return null;
  return <div ref={ref} className="lg-cursor" data-shown="0" data-hover="0" aria-hidden="true"><i /></div>;
}

/* ---------- ticker ---------- */
export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="lg-marquee" aria-hidden="true">
      <div className="lg-marquee-track">
        {items.map(([e, label], i) => <span key={`${e}-${i}`}><Emoji name={e} size={18} />{label}</span>)}
      </div>
    </div>
  );
}

/* ---------- hero ---------- */

export function LegacyHero({ hero }) {
  const stageRef = useRef(null);
  const words = (hero?.headline || 'Build Your Worlds.').split(' ');
  const cut = Math.ceil(words.length / 2);
  const lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')].filter(Boolean);

  const onMove = (e) => {
    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${((0.5 - ny) * 7).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((nx - 0.5) * 9).toFixed(2)}deg`);
  };
  const onLeave = () => {
    const el = stageRef.current;
    if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
  };

  return (
    <section className="lg-hero scope-dark">
      <MinecraftWorld scoped />
      <div className="lg-hero-glow" aria-hidden="true" />
      <div className="lg-hero-stage" ref={stageRef} onMouseMove={onMove} onMouseLeave={onLeave}>
        <IsoIsland className="lg-island" />
      </div>
      <div className="container-x lg-hero-copy">
        <h1 className="lg-giant">{lines.map((l, i) => <span key={i} className="block">{l}</span>)}</h1>
        <div className="lg-hero-side">
          <p className="lg-hero-kicker">
            <Link to="/minecraft" className="lg-kicker-link" data-cursor><Rich text={hero?.eyebrow || 'Minecraft Server Hosting'} /> <UpRight size={15} /></Link>
          </p>
          <p className="lg-hero-sub">{hero?.subtitle}</p>
          <Link to="/plans" className="lg-btn lg-btn-line" data-cursor>
            <span>{hero?.primary_cta || 'Get Started'}</span> <Down />
          </Link>
        </div>
      </div>
      <Marquee />
    </section>
  );
}

/* ---------- Worlds carousel ---------- */
export function WorldsCarousel({ onOpenPanel }) {
  const [i, setI] = useState(0);
  const w = WORLDS[i];
  const go = useCallback((d) => setI((v) => (v + d + WORLDS.length) % WORLDS.length), []);
  const onKey = (e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); };
  return (
    <section className="lg-section lg-worlds" id="worlds" aria-roledescription="carousel" aria-label="Minecraft worlds" onKeyDown={onKey}>
      <div className="container-x">
        <h2 className="lg-giant lg-giant-sm reveal">Worlds</h2>
        <div className="lg-carousel">
          <button type="button" className="lg-arrow" onClick={() => go(-1)} aria-label="Previous world"><Icon name="arrow" size={20} className="rotate-180" /></button>
          <div className="lg-car-left" aria-live="polite">
            <h3>{w.name}</h3>
            <p>{w.tag}</p>
          </div>
          <div className="lg-car-stage" style={{ '--tone': w.tone }}>
            <span className="lg-tri" aria-hidden="true" />
            <ProgressiveImage key={w.id} className="lg-car-img" src={w.img} alt={`${w.name} diorama`} />
          </div>
          <div className="lg-car-right">
            <span className="lg-eyebrow">World {w.n} / {String(WORLDS.length).padStart(2, '0')}</span>
            <p>{w.blurb}</p>
            <div className="lg-dots" role="tablist" aria-label="Choose a world">
              {WORLDS.map((x, k) => <button key={x.id} type="button" role="tab" aria-selected={k === i} aria-label={x.name} data-on={k === i} onClick={() => setI(k)} />)}
            </div>
          </div>
          <button type="button" className="lg-arrow" onClick={() => go(1)} aria-label="Next world"><Icon name="arrow" size={20} /></button>
        </div>
        <button type="button" className="lg-bar" onClick={onOpenPanel}><span>Explore all worlds</span><UpRight size={18} /></button>
      </div>
    </section>
  );
}

/* ---------- morphing orb + serif line (inspired by studio sites) ---------- */
export function Explore({ onOpenPanel }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
      el.style.setProperty('--my', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
    };
    update();
    if (!reduced) {
      window.addEventListener('scroll', onScroll, { passive: true });
      el.addEventListener('pointermove', onMove, { passive: true });
    }
    return () => { window.removeEventListener('scroll', onScroll); el.removeEventListener('pointermove', onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <section className="lg-explore scope-dark" ref={ref} aria-label="Explore">
      <div className="lg-orb" aria-hidden="true"><span /></div>
      <p className="lg-serif">
        Explore our worlds <button type="button" className="lg-dotbtn" onClick={onOpenPanel} aria-label="Open the worlds list" data-cursor />
        {' '}or learn more about Legacy Cloud <Link to="/minecraft" className="lg-dotbtn" aria-label="Read the Minecraft guide" data-cursor />.
      </p>
    </section>
  );
}

/* ---------- list / grid overlay ---------- */
export function WorldsPanel({ open, onClose }) {
  const [view, setView] = useState('grid');
  const [hover, setHover] = useState(0);
  const navigate = useNavigate();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  if (!open) return null;
  const pick = (w) => { onClose(); navigate(`/minecraft#${w.id}`); };
  return createPortal(
    <div className="lg-panel-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="lg-panel" role="dialog" aria-modal="true" aria-label="All worlds">
        <div className="lg-panel-head">
          <b>Worlds</b>
          <div className="lg-panel-view" role="radiogroup" aria-label="Layout">
            <button type="button" role="radio" aria-checked={view === 'list'} onClick={() => setView('list')}>List</button>
            <span>/</span>
            <button type="button" role="radio" aria-checked={view === 'grid'} onClick={() => setView('grid')}>Grid</button>
          </div>
          <button type="button" ref={closeRef} className="lg-panel-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </div>
        {view === 'grid' ? (
          <div className="lg-panel-grid">
            {WORLDS.map((w) => (
              <button key={w.id} type="button" className="lg-tile" onClick={() => pick(w)} style={{ '--tone': w.tone }} data-cursor>
                <div className="lg-tile-img"><ProgressiveImage src={w.img} alt="" eager /></div>
                <b>{w.name}</b><small>{w.n} · {w.tag}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="lg-panel-list">
            <ul>
              {WORLDS.map((w, k) => (
                <li key={w.id}>
                  <button type="button" onMouseEnter={() => setHover(k)} onFocus={() => setHover(k)} onClick={() => pick(w)} data-cursor>
                    <span>{w.n}</span><b>{w.name}</b><small>{w.tag}</small>
                  </button>
                </li>
              ))}
            </ul>
            <div className="lg-panel-preview" style={{ '--tone': WORLDS[hover].tone }}>
              <ProgressiveImage key={WORLDS[hover].id} src={WORLDS[hover].img} alt="" eager />
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- numbered premise ---------- */
export function Premise() {
  return (
    <section className="lg-section" id="premise">
      <div className="container-x">
        <div className="lg-split">
          <div className="lg-label"><i /><span>01</span><b>The premise</b></div>
          <div>
            <h2 className="lg-h2 reveal">What can truly be called Minecraft?</h2>
            <p className="lg-lead reveal">
              Look at an empty grid of blocks. Place one, then another. It becomes a house, a farm, a castle — a world that is yours.
              Minecraft is a sandbox built from cubes where nothing is ever finished. Players have been building in it since the early public
              alphas in 2009 and the full release in 2011, and it has grown into the best-selling video game ever made.
            </p>
            <p className="lg-lead reveal">Legacy Cloud exists so that world has a home that never goes offline.</p>
          </div>
        </div>
        <div className="lg-split lg-modes">
          <div className="lg-label"><i /><span>02</span><b>Game modes</b></div>
          <ol>
            {MODES.map((m) => <li key={m.name} className="reveal"><b>{m.name}</b><span>{m.note}</span></li>)}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ---------- about + live facts ---------- */
export function AboutFacts({ stats }) {
  const rows = [
    ['Hardware', 'Intel · AMD Ryzen'],
    ['Storage', 'NVMe SSD'],
    ['Protection', 'DDoS filtering, layers 3 / 4 / 7'],
    ['Control panel', 'Files, plugins, backups, console'],
    ['Support', 'Discord · tickets'],
    ['Customers', String(stats?.customers ?? 0)],
    ['Servers deployed', String(stats?.servers ?? 0)],
    ['Active plans', String(stats?.plans ?? 0)],
  ];
  return (
    <section className="lg-section lg-about" id="about">
      <div className="container-x">
        <div className="lg-about-top">
          <h2 className="lg-giant lg-giant-sm reveal">Legacy</h2>
          <dl className="lg-facts">
            {rows.map(([k, v]) => <div key={k} className="reveal"><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
        <p className="lg-note">Customer, server and plan numbers are read live from our database. We never inflate them.</p>
      </div>
    </section>
  );
}

/* ---------- guides ---------- */
export function Guides() {
  return (
    <section className="lg-section" id="guides">
      <div className="container-x">
        <div className="lg-split">
          <div className="lg-label"><i /><span>03</span><b>Guides</b></div>
          <h2 className="lg-h2 reveal">Everything you need to know before you launch.</h2>
        </div>
        <div className="lg-guides">
          {GUIDES.map((g) => (
            <Link key={g.id} to={`/minecraft#${g.id}`} className="lg-guide reveal" style={{ '--tone': g.tone }} data-cursor>
              <div className="lg-guide-img"><ProgressiveImage src={g.img} alt="" /></div>
              <small>Guide · {g.read} read</small>
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- blue call-to-action band ---------- */
export function CtaBand({ discordUrl }) {
  return (
    <section className="lg-cta" aria-label="Get started">
      <div className="container-x lg-cta-inner">
        <div>
          <h2 className="lg-h2"><Emoji name="gift" size={34} /> Free migration on every plan.</h2>
          <p>Choose a plan, check out, and our team provisions your node. Moving from another host? We transfer your world for you.</p>
          <div className="lg-cta-btns">
            <Link to="/plans" className="lg-btn lg-btn-solid-light" data-cursor><span>Get Started</span> <UpRight /></Link>
            <a href={discordUrl} target="_blank" rel="noreferrer" className="lg-btn lg-btn-line-light" data-cursor><span>Join Discord</span> <UpRight /></a>
          </div>
        </div>
        <ProgressiveImage className="lg-cta-img" src="/images/world-overworld.webp" alt="" />
      </div>
    </section>
  );
}

/* ---------- skeleton for the legacy home ---------- */
export function LegacyHomeSkeleton() {
  return (
    <div aria-hidden="true" className="lg-skel">
      <section className="lg-hero scope-dark">
        <div className="container-x lg-hero-copy">
          <div>
            <SkeletonLine width="62%" height={110} className="!rounded-md" />
            <SkeletonLine width="48%" height={110} className="mt-4 !rounded-md" />
          </div>
          <div className="lg-hero-side">
            <SkeletonLine width={120} height={12} />
            <SkeletonLine width="100%" height={12} className="mt-4" />
            <SkeletonLine width="80%" height={12} className="mt-2" />
            <Skeleton width={180} height={44} className="mt-6 !rounded-none" />
          </div>
        </div>
        <Skeleton className="lg-skel-island !rounded-md" />
      </section>
      <section className="container-x lg-section">
        <SkeletonLine width="44%" height={140} className="!rounded-md" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} height={240} className="!rounded-none" />)}
        </div>
      </section>
    </div>
  );
}
