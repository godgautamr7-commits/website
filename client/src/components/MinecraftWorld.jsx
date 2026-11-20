import { useEffect, useRef } from 'react';
import { useTheme } from '../context/themeContext';
import { buildTextures, rng } from '../lib/mcTextures';

/* Minecraft-style animated backdrop (canvas, no images, no copyrighted assets).
   Block textures come from lib/mcTextures.js (hand-authored 16x16 pixel art).
   Cubes are real 3D: they tumble, catch light as they turn and drift all over the
   screen. Around them: pixel stars, blocky clouds, fireflies, embers, XP orbs that
   fly toward the cursor, a block-selection grid, a cursor-following glow and
   block-break particles. Modes follow the site's Background switch:
   animated / texture (static) / plain (off). */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* soft round glow sprite */
function glowSprite(color, px) {
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2);
  gr.addColorStop(0, `rgba(${color},0.95)`);
  gr.addColorStop(0.25, `rgba(${color},0.35)`);
  gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, px, px);
  return c;
}

/* ---- true orthographic 3D cube with affine-mapped pixel textures ---- */
const FACES = [
  { n: [0, 0, 1], p: [[-1, 1, 1], [1, 1, 1], [-1, -1, 1]], t: 'left' },
  { n: [0, 0, -1], p: [[1, 1, -1], [-1, 1, -1], [1, -1, -1]], t: 'left' },
  { n: [1, 0, 0], p: [[1, 1, 1], [1, 1, -1], [1, -1, 1]], t: 'right' },
  { n: [-1, 0, 0], p: [[-1, 1, -1], [-1, 1, 1], [-1, -1, -1]], t: 'right' },
  { n: [0, 1, 0], p: [[-1, 1, -1], [1, 1, -1], [-1, 1, 1]], t: 'top' },
];
const LIGHT = (() => { const l = [-0.35, 0.8, 0.5]; const m = Math.hypot(...l); return l.map((v) => v / m); })();

function drawCube(ctx, set, size, yaw, pitch) {
  const cy_ = Math.cos(yaw); const sy_ = Math.sin(yaw); const cp = Math.cos(pitch); const sp = Math.sin(pitch);
  const rot = (p) => {
    const x = p[0] * cy_ + p[2] * sy_; const z = -p[0] * sy_ + p[2] * cy_;
    return [x, p[1] * cp - z * sp, p[1] * sp + z * cp];
  };
  const prj = (p) => { const r = rot(p); return [r[0] * size, -r[1] * size]; };
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  for (const f of FACES) {
    const nr = rot(f.n);
    if (nr[2] <= 0.02) continue;
    const [p0, p1, p2] = f.p.map(prj);
    const img = set[f.t]; const N = img.width;
    ctx.save();
    ctx.transform((p1[0] - p0[0]) / N, (p1[1] - p0[1]) / N, (p2[0] - p0[0]) / N, (p2[1] - p0[1]) / N, p0[0], p0[1]);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
    const p3 = [p1[0] + p2[0] - p0[0], p1[1] + p2[1] - p0[1]];
    const dot = nr[0] * LIGHT[0] + nr[1] * LIGHT[1] + nr[2] * LIGHT[2];
    const k = 0.46 + 0.62 * Math.max(0, dot);
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p3[0], p3[1]); ctx.lineTo(p2[0], p2[1]); ctx.closePath();
    if (k < 1) { ctx.fillStyle = `rgba(0,0,0,${clamp(1 - k, 0, 0.62).toFixed(3)})`; ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

const CUBE_TYPES = ['grass', 'diamond_ore', 'tnt', 'log', 'gold_ore', 'glow', 'cobble', 'dirt', 'obsidian', 'iron_ore', 'planks', 'netherrack', 'redstone_ore', 'bookshelf', 'gold_block', 'sand', 'coal_ore', 'lapis_ore', 'leaves', 'pumpkin', 'bricks', 'diamond_block', 'stone', 'emerald_ore'];
const CRUMBS = ['#5e9634', '#7bb544', '#866043', '#5f4229', '#808080', '#a8a8a8', '#d9c98a'];
const CLOUDS = [
  [[0, 1, 5, 1], [1, 0, 3, 1], [-1, 2, 8, 1]],
  [[0, 0, 4, 1], [-1, 1, 6, 1]],
  [[0, 1, 7, 1], [2, 0, 3, 1], [1, 2, 5, 1]],
];

export default function MinecraftWorld({ scoped = false }) {
  const { theme, bg } = useTheme();
  const canvasRef = useRef(null);
  const enabled = (scoped ? theme === 'legacy-light' : theme === 'legacy-dark') && bg !== 'plain';
  const animatedMode = bg === 'animated';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return undefined;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animate = animatedMode && !reduced;
    const TEX = buildTextures();
    const glows = { warm: glowSprite('255,205,110', 64), green: glowSprite('150,255,70', 48), amber: glowSprite('255,150,50', 32), blue: glowSprite('110,160,255', 64) };

    let w = 0; let h = 0; let dpr = 1; let raf = 0; let last = performance.now(); let t = 0; let dirty = true;
    let cubes = []; let stars = []; let clouds = []; let flies = []; let embers = []; let orbs = [];
    const parts = [];
    const m = { x: -999, y: -999, gx: 0, gy: 0, sx: 0, sy: 0, last: -1e9, lastSpawn: { x: 0, y: 0 }, has: false };
    let scrollY = 0;

    const layout = () => {
      const r = rng(2026);
      const small = w < 700;
      const n = small ? 9 : 18;
      cubes = Array.from({ length: n }, (_, i) => {
        const d = 0.3 + ((i * 0.37) % 0.7);
        return {
          type: CUBE_TYPES[i % CUBE_TYPES.length],
          x: r() * w, y: r() * h, d, size: (small ? 9 : 12) + d * (small ? 12 : 22),
          ang: r() * 6.28, spd: (10 + r() * 26) * (0.5 + d), turn: (r() - 0.5) * 0.5,
          yaw: r() * 6.28, spin: (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.6),
          pitch: 0.5 + r() * 0.2, pph: r() * 6.28, roll: (r() - 0.5) * 0.3, ph: r() * 6.28, ox: 0, oy: 0,
        };
      });
      stars = Array.from({ length: clamp(Math.round((w * h) / 9500), 30, 150) }, () => ({ x: r() * w, y: r() * h, s: r() < 0.2 ? 2 : 1, ph: r() * 6.28, sp: 0.6 + r() * 1.6 }));
      clouds = Array.from({ length: small ? 3 : 5 }, (_, i) => ({ shape: CLOUDS[i % 3], x: r() * w, y: 40 + r() * h * 0.7, p: 30 + r() * 26, v: 5 + r() * 9, a: 0.035 + r() * 0.04 }));
      flies = Array.from({ length: small ? 14 : 28 }, () => ({ x: r() * w, y: r() * h, vx: 0, vy: 0, ph: r() * 6.28, c: r() < 0.55 ? 'green' : 'warm' }));
      embers = Array.from({ length: small ? 14 : 30 }, () => ({ x: r() * w, y: h + r() * h, v: 18 + r() * 40, sw: r() * 6.28, s: 2 + Math.round(r() * 2), a: 0.4 + r() * 0.5 }));
      orbs = Array.from({ length: small ? 4 : 7 }, () => ({ x: r() * w, y: r() * h, vx: 0, vy: 0, ph: r() * 6.28, cd: 0 }));
    };

    const resize = () => {
      const host = scoped ? canvas.parentElement : null;
      w = host ? host.clientWidth : window.innerWidth;
      h = host ? host.clientHeight : window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      layout();
      if (!m.has) { m.gx = w * 0.7; m.gy = h * 0.4; m.sx = m.gx; m.sy = m.gy; }
      dirty = true;
    };

    const burst = (x, y, n, speed = 220) => {
      for (let i = 0; i < n; i += 1) {
        const a = Math.random() * Math.PI * 2; const v = speed * (0.35 + Math.random() * 0.65);
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0, max: 0.7 + Math.random() * 0.6, s: 3 + Math.round(Math.random() * 3), c: CRUMBS[(Math.random() * CRUMBS.length) | 0] });
      }
      if (parts.length > 220) parts.splice(0, parts.length - 220);
    };

    const rel = (e) => {
      if (!scoped) return { x: e.clientX, y: e.clientY };
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      const p = rel(e);
      m.x = p.x; m.y = p.y; m.has = true; m.last = performance.now();
      if (Math.hypot(p.x - m.lastSpawn.x, p.y - m.lastSpawn.y) > 38) {
        m.lastSpawn = { x: p.x, y: p.y };
        if (animate && p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h) burst(p.x, p.y, 2, 90);
      }
    };
    const onDown = (e) => {
      const p = rel(e);
      if (animate && p.x >= 0 && p.y >= 0 && p.x <= w && p.y <= h) burst(p.x, p.y, 16, 260);
    };
    const onScroll = () => { scrollY = window.scrollY; };

    /* ---------- drawing ---------- */
    const drawCloud = (c) => {
      ctx.fillStyle = `rgba(255,255,255,${c.a})`;
      for (const [cx, cy, cw, ch] of c.shape) ctx.fillRect(c.x + cx * c.p, c.y + cy * c.p, cw * c.p, ch * c.p);
    };

    const frame = (dt) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true;

      const idle = performance.now() - m.last > 2500 || !m.has;
      const tx = idle ? w * (0.55 + Math.sin(t * 0.45) * 0.3) : m.x;
      const ty = idle ? h * (0.45 + Math.cos(t * 0.37) * 0.25) : m.y;
      m.gx += (tx - m.gx) * Math.min(1, dt * 7); m.gy += (ty - m.gy) * Math.min(1, dt * 7);
      m.sx += (tx - m.sx) * Math.min(1, dt * 2.2); m.sy += (ty - m.sy) * Math.min(1, dt * 2.2);
      const px = (m.sx / w - 0.5); const py = (m.sy / h - 0.5);

      /* ambient colour pools (gold bottom-left, blue top-right) */
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.max(w, h);
      let g = ctx.createRadialGradient(w * 0.04 - px * 60, h * 1.02 - py * 40, 0, w * 0.04 - px * 60, h * 1.02 - py * 40, R * 0.62);
      g.addColorStop(0, 'rgba(214,160,52,0.30)'); g.addColorStop(1, 'rgba(214,160,52,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      g = ctx.createRadialGradient(w * 0.96 - px * 80, h * 0.2 - py * 60, 0, w * 0.96 - px * 80, h * 0.2 - py * 60, R * 0.5);
      g.addColorStop(0, 'rgba(70,120,210,0.22)'); g.addColorStop(1, 'rgba(70,120,210,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

      /* big soft cursor glow + tight warm core */
      const gr = Math.min(560, Math.max(320, w * 0.42));
      g = ctx.createRadialGradient(m.sx, m.sy, 0, m.sx, m.sy, gr);
      g.addColorStop(0, 'rgba(120,190,255,0.16)'); g.addColorStop(0.6, 'rgba(90,140,220,0.05)'); g.addColorStop(1, 'rgba(90,140,220,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      g = ctx.createRadialGradient(m.gx, m.gy, 0, m.gx, m.gy, gr * 0.55);
      g.addColorStop(0, 'rgba(255,214,130,0.30)'); g.addColorStop(0.45, 'rgba(255,180,90,0.08)'); g.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      /* stars */
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillRect(Math.round(s.x - px * 14 * s.s), Math.round(s.y - py * 10 * s.s), s.s, s.s);
      }
      ctx.globalAlpha = 1;

      /* clouds */
      for (const c of clouds) drawCloud({ ...c, x: c.x - px * 40, y: c.y - py * 24 });

      /* lit block grid + selection box around the cursor */
      const cell = 48; const reach = 5;
      if (m.has || idle) {
        const gx0 = Math.floor(m.gx / cell); const gy0 = Math.floor(m.gy / cell);
        ctx.lineWidth = 1;
        for (let j = -reach; j <= reach; j += 1) {
          for (let i = -reach; i <= reach; i += 1) {
            const dd = Math.hypot(i, j);
            if (dd > reach) continue;
            const a = (1 - dd / reach) * 0.16;
            ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
            ctx.strokeRect((gx0 + i) * cell + 0.5, (gy0 + j) * cell + 0.5, cell, cell);
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(gx0 * cell, gy0 * cell, cell, cell);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
        ctx.strokeRect(gx0 * cell + 1, gy0 * cell + 1, cell - 2, cell - 2);
      }

      /* floating 3D cubes */
      const mg = 90; const spanW = w + mg * 2; const spanH = h + mg * 2;
      for (const c of cubes) {
        let cx = c.x - px * 90 * c.d + c.ox;
        let cy = c.y - py * 60 * c.d + Math.sin(t * 0.9 + c.ph) * 6 * c.d + c.oy;
        cy = (((cy - scrollY * c.d * 0.2 + mg) % spanH) + spanH) % spanH - mg;
        cx = (((cx + mg) % spanW) + spanW) % spanW - mg;
        const dx = cx - m.gx; const dy = cy - m.gy; const dist = Math.hypot(dx, dy);
        const reachC = c.size * 3;
        const near = dist < reachC ? 1 - dist / reachC : 0;
        const wantX = near ? (dx / (dist || 1)) * near * 34 : 0; const wantY = near ? (dy / (dist || 1)) * near * 34 : 0;
        c.ox += (wantX - c.ox) * Math.min(1, dt * 5); c.oy += (wantY - c.oy) * Math.min(1, dt * 5);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(c.roll + Math.sin(t * 0.5 + c.ph) * 0.12);
        ctx.globalAlpha = clamp(0.4 + c.d * 0.5 + near * 0.2, 0, 1);
        const set = TEX[c.type];
        drawCube(ctx, set, c.size, c.yaw + near * 0.8, c.pitch + Math.sin(t * 0.7 + c.pph) * 0.18);
        if (c.type === 'glow' || near > 0.35) {
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = c.type === 'glow' ? 0.5 : near * 0.35;
          const gs = c.size * 4.2; ctx.drawImage(glows.warm, -gs / 2, -gs / 2, gs, gs);
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

      /* embers */
      ctx.globalCompositeOperation = 'lighter';
      for (const e of embers) {
        const k = 1 - clamp(e.y / h, 0, 1);
        ctx.globalAlpha = e.a * (0.3 + k);
        ctx.fillStyle = k > 0.55 ? '#ffd27a' : '#ff8a2a';
        ctx.fillRect(Math.round(e.x + Math.sin(e.sw) * 10), Math.round(e.y), e.s, e.s);
      }
      /* fireflies */
      for (const f of flies) {
        const gs = glows[f.c]; const p = 0.5 + 0.5 * Math.sin(t * 1.6 + f.ph);
        ctx.globalAlpha = 0.25 + p * 0.55;
        ctx.drawImage(gs, f.x - 14, f.y - 14, 28, 28);
        ctx.globalAlpha = 0.9; ctx.fillStyle = f.c === 'green' ? '#d8ff9a' : '#ffe9b0';
        ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 2, 2);
      }
      /* xp orbs */
      for (const o of orbs) {
        if (o.cd > 0) continue;
        const mix = 0.5 + 0.5 * Math.sin(t * 3 + o.ph);
        ctx.globalAlpha = 0.5; ctx.drawImage(glows.green, o.x - 14, o.y - 14, 28, 28);
        ctx.globalAlpha = 1; ctx.fillStyle = `rgb(${Math.round(120 + 100 * mix)},255,${Math.round(40 - 30 * mix)})`;
        ctx.fillRect(Math.round(o.x) - 3, Math.round(o.y) - 4, 6, 8); ctx.fillRect(Math.round(o.x) - 4, Math.round(o.y) - 3, 8, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 3, 2, 2);
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

      /* block-break particles */
      for (const p of parts) {
        ctx.globalAlpha = clamp(1 - p.life / p.max, 0, 1);
        ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      ctx.globalAlpha = 1;
    };

    const update = (dt) => {
      t += dt;
      for (const c of cubes) {
        c.ang += (Math.sin(t * 0.25 + c.ph * 3) * 0.35 + c.turn * 0.2) * dt;
        c.x += Math.cos(c.ang) * c.spd * dt; c.y += Math.sin(c.ang) * c.spd * 0.7 * dt;
        c.yaw += c.spin * dt;
        const mg = c.size * 2;
        if (c.x < -mg) c.x = w + mg; else if (c.x > w + mg) c.x = -mg;
        if (c.y < -mg) c.y = h + mg; else if (c.y > h + mg) c.y = -mg;
      }
      for (const c of clouds) { c.x += c.v * dt; if (c.x > w + 260) c.x = -300; }
      for (const f of flies) {
        f.vx += (Math.random() - 0.5) * 60 * dt; f.vy += (Math.random() - 0.5) * 60 * dt;
        f.vx *= 0.96; f.vy *= 0.96; f.x += f.vx * dt * 3; f.y += f.vy * dt * 3;
        if (f.x < -20) f.x = w + 20; if (f.x > w + 20) f.x = -20; if (f.y < -20) f.y = h + 20; if (f.y > h + 20) f.y = -20;
      }
      for (const e of embers) { e.y -= e.v * dt; e.sw += dt * 1.4; if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; } }
      for (const o of orbs) {
        if (o.cd > 0) { o.cd -= dt; if (o.cd <= 0) { o.x = Math.random() * w; o.y = h + 20; o.vx = 0; o.vy = 0; } continue; }
        const dx = m.gx - o.x; const dy = m.gy - o.y; const d = Math.hypot(dx, dy);
        if (m.has && d < 230) { const f = (1 - d / 230) * 900; o.vx += (dx / (d || 1)) * f * dt; o.vy += (dy / (d || 1)) * f * dt; }
        o.vy += Math.sin(t * 1.3 + o.ph) * 6 * dt - 4 * dt;
        o.vx *= 0.94; o.vy *= 0.94; o.x += o.vx * dt; o.y += o.vy * dt;
        if (d < 16 && m.has) { burst(o.x, o.y, 8, 120); o.cd = 2 + Math.random() * 2; }
        if (o.y < -20) o.y = h + 20; if (o.x < -20) o.x = w + 20; if (o.x > w + 20) o.x = -20;
      }
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const p = parts[i]; p.life += dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985;
        if (p.life >= p.max) parts.splice(i, 1);
      }
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (animate) { update(dt); frame(dt); } else if (dirty) { frame(0); dirty = false; }
    };

    resize();
    const ro = scoped ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas.parentElement); else window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [enabled, animatedMode, scoped]);

  if (!enabled) return null;
  return <canvas ref={canvasRef} className={scoped ? 'mc-canvas mc-scoped' : 'mc-canvas'} aria-hidden="true" />;
}
