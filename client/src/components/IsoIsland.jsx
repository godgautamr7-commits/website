import { useEffect, useRef, useState } from 'react';
import { buildTextures, cubeSprite, rng } from '../lib/mcTextures';

/* A floating Minecraft island built block-by-block (grass, dirt, stone + ores,
   a log cabin with a red roof, oak trees, a pond, flowers, a lamp post) and
   drawn once to a canvas with the shared Minecraft-style textures. */

const N = 15; const TOP = 6; const C = 7;
const OPAQUE_SKIP = new Set(['water', 'glass']);

function buildWorld() {
  const r = rng(77);
  const vox = new Map(); const plants = [];
  const key = (x, y, z) => `${x},${y},${z}`;
  const get = (x, y, z) => vox.get(key(x, y, z));
  const set = (x, y, z, t) => { if (t) vox.set(key(x, y, z), t); else vox.delete(key(x, y, z)); };

  /* island body: inverted cone with wobbly edges */
  const radii = [2.0, 3.1, 4.2, 5.2, 6.0, 6.5, 6.9];
  const wob = Array.from({ length: N * N * 8 }, () => (r() - 0.5) * 1.5);
  for (let z = 0; z <= TOP; z += 1) {
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        const d = Math.hypot(x - C, y - C);
        if (d > radii[z] + wob[(z * N + y) * N + x]) continue;
        let t = 'stone';
        if (z === TOP) t = 'grass';
        else if (z === TOP - 1) t = 'dirt';
        else if (z === TOP - 2) t = d > radii[z] - 1.6 ? 'dirt' : 'stone';
        else if (r() < 0.07) t = 'cobble';
        set(x, y, z, t);
      }
    }
  }
  /* ores on the visible lower rim */
  const oreTypes = ['coal_ore', 'iron_ore', 'coal_ore', 'gold_ore', 'iron_ore', 'diamond_ore', 'redstone_ore', 'lapis_ore'];
  for (let z = 0; z <= TOP - 2; z += 1) {
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        if (get(x, y, z) !== 'stone') continue;
        const outer = !get(x + 1, y, z) || !get(x, y + 1, z);
        if (outer && r() < 0.2) set(x, y, z, oreTypes[Math.floor(r() * oreTypes.length)]);
      }
    }
  }
  /* pond (one block deep) */
  [[9, 8], [10, 8], [9, 9], [10, 9], [11, 9], [9, 10], [10, 10]].forEach(([x, y]) => { set(x, y, TOP, null); set(x, y, TOP - 1, 'water'); });
  /* path */
  [[5, 7], [5, 8], [5, 9], [6, 9], [6, 10], [7, 10]].forEach(([x, y]) => { if (get(x, y, TOP) === 'grass') set(x, y, TOP, 'path'); });

  /* log cabin */
  const z0 = TOP + 1;
  for (let y = 3; y <= 6; y += 1) {
    for (let x = 3; x <= 6; x += 1) {
      const corner = (x === 3 || x === 6) && (y === 3 || y === 6);
      const edge = x === 3 || x === 6 || y === 3 || y === 6;
      for (let h = 0; h < 3; h += 1) {
        if (!edge) set(x, y, z0 + h, 'planks');
        else set(x, y, z0 + h, corner ? 'log' : 'planks');
      }
    }
  }
  set(6, 4, z0 + 1, 'glass'); set(6, 5, z0 + 1, 'glass'); set(4, 6, z0 + 1, 'glass');
  set(5, 6, z0, 'door_bottom'); set(5, 6, z0 + 1, 'door_top');
  for (let y = 2; y <= 7; y += 1) for (let x = 2; x <= 7; x += 1) set(x, y, z0 + 3, 'roof');
  for (let y = 3; y <= 6; y += 1) for (let x = 3; x <= 6; x += 1) set(x, y, z0 + 4, 'roof');
  for (let y = 4; y <= 5; y += 1) for (let x = 4; x <= 5; x += 1) set(x, y, z0 + 5, 'roof');
  set(3, 3, z0 + 5, 'cobble'); set(3, 3, z0 + 6, 'cobble');

  /* lamp post */
  set(7, 8, z0, 'log'); set(7, 8, z0 + 1, 'log'); set(7, 8, z0 + 2, 'glow');
  /* pumpkin + bookshelf-style crate */
  set(4, 9, z0, 'pumpkin'); set(3, 8, z0, 'pumpkin');
  set(12, 6, z0, 'gold_block');

  /* oak trees */
  const tree = (x, y, h = 4) => {
    for (let i = 0; i < h; i += 1) set(x, y, z0 + i, 'log');
    const layer = (zz, rad, cut) => {
      for (let dy = -rad; dy <= rad; dy += 1) for (let dx = -rad; dx <= rad; dx += 1) {
        if (cut && Math.abs(dx) === rad && Math.abs(dy) === rad) continue;
        if (!get(x + dx, y + dy, zz)) set(x + dx, y + dy, zz, 'leaves');
      }
    };
    layer(z0 + h - 1, 2, true); layer(z0 + h, 1, false);
    if (!get(x, y, z0 + h + 1)) set(x, y, z0 + h + 1, 'leaves');
  };
  tree(11, 3, 3); tree(2, 10, 3); tree(8, 1, 3);
  [[12, 11], [4, 12]].forEach(([x, y]) => { if (get(x, y, TOP) === 'grass') set(x, y, z0, 'leaves'); });

  /* flowers and grass tufts */
  const flora = [[8, 5, 'poppy'], [9, 6, 'dandelion'], [4, 8, 'tallgrass'], [2, 7, 'poppy'], [8, 3, 'tallgrass'], [10, 6, 'dandelion'], [7, 11, 'dandelion'], [5, 11, 'poppy'], [9, 12, 'tallgrass'], [3, 11, 'tallgrass']];
  flora.forEach(([x, y, t]) => { if (get(x, y, TOP) === 'grass' && !get(x, y, z0)) plants.push({ x, y, z: z0, t }); });

  return { vox, plants, get };
}

export function drawIsland(canvas, TEX, s, dpr) {
  const { vox, plants, get } = buildWorld();
  const S = Math.max(16, Math.round((s * dpr) / 8) * 8); // whole-texel sizes = even, sharp pixels
  const cache = new Map();
  const spriteOf = (t) => { if (!cache.has(t)) cache.set(t, cubeSprite(TEX[t], S)); return cache.get(t); };
  const list = [...vox.entries()].map(([k, t]) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, t }; });
  const solidAt = (x, y, z) => { const t = get(x, y, z); return t && !OPAQUE_SKIP.has(t); };
  const vis = list.filter((v) => !(solidAt(v.x + 1, v.y, v.z) && solidAt(v.x, v.y + 1, v.z) && solidAt(v.x, v.y, v.z + 1)));
  vis.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);

  const T = (x, y, z) => [(x - y) * S, ((x + y) * S) / 2 - (z + 1) * S];
  let minX = 1e9; let maxX = -1e9; let minY = 1e9; let maxY = -1e9;
  vis.forEach((v) => { const [tx, ty] = T(v.x, v.y, v.z); minX = Math.min(minX, tx - S); maxX = Math.max(maxX, tx + S); minY = Math.min(minY, ty); maxY = Math.max(maxY, ty + 2 * S); });
  const pad = S * 0.6; const W = Math.ceil(maxX - minX + pad * 2); const H = Math.ceil(maxY - minY + pad * 2);
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;

  const cxp = -minX + pad; const cyp = -minY + pad;

  const drawPlant = (p) => {
    const tex = TEX.plants[p.t];
    const [tx, ty] = T(p.x, p.y, p.z - 1); // top-back vertex of the ground block
    const cx = cxp + tx; const cy = cyp + ty + S / 2; // middle of the grass top = base of the plant
    g.save(); g.imageSmoothingEnabled = true;
    g.setTransform(S / tex.width, S / (2 * tex.width), 0, S / tex.width, cx - S / 2, cy - S / 4 - S);
    g.drawImage(tex, 0, 0);
    g.setTransform(S / tex.width, -S / (2 * tex.width), 0, S / tex.width, cx - S / 2, cy + S / 4 - S);
    g.drawImage(tex, 0, 0);
    g.restore();
  };

  const order = [...vis, ...plants.map((p) => ({ x: p.x, y: p.y, z: p.z, plant: p }))];
  order.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  order.forEach((v) => {
    if (v.plant) { drawPlant(v.plant); return; }
    const sp = spriteOf(v.t);
    const [tx, ty] = T(v.x, v.y, v.z);
    g.globalAlpha = v.t === 'water' ? 0.82 : 1;
    g.drawImage(sp.canvas, Math.round(cxp + tx - sp.ox), Math.round(cyp + ty - sp.oy));
    g.globalAlpha = 1;
  });
  return { W, H };
}

export default function IsoIsland({ className = '', label = 'A floating Minecraft island with a cabin, trees and a pond' }) {
  const ref = useRef(null);
  const [ratio, setRatio] = useState(1.25);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3); // always render hi-res, then let CSS scale down smoothly
    const { W, H } = drawIsland(canvas, buildTextures(), 34, dpr);
    setRatio(W / H);
  }, []);
  return (
    <div className={`isle ${className}`} style={{ aspectRatio: ratio }} role="img" aria-label={label}>
      <canvas ref={ref} />
    </div>
  );
}
