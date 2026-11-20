/* Hand-authored, Minecraft-style 16x16 block textures (original pixel art made in
   code — NOT Mojang's files). Each one uses a small palette per block with
   clustered noise, bevels, ore blobs, ridges and so on, the way the real game's
   textures are built. Shared by the floating background cubes and the hero island. */

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = (pal, v) => pal[Math.min(pal.length - 1, Math.max(0, Math.floor(v * pal.length)))];
const shade = (h, k) => { const c = hex(h); return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)]; };

/* smooth wrapped value-noise (gives the "clumpy" look vanilla textures have) */
function lattice(seed, n = 4) {
  const r = rng(seed); const g = Array.from({ length: n * n }, () => r());
  return (x, y) => {
    const fx = (x / 16) * n; const fy = (y / 16) * n;
    const x0 = Math.floor(fx); const y0 = Math.floor(fy);
    const tx = fx - x0; const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx); const sy = ty * ty * (3 - 2 * ty);
    const at = (i, j) => g[(j % n) * n + (i % n)];
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  };
}

function paint(seed, fn) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16;
  const g = c.getContext('2d');
  const img = g.createImageData(16, 16);
  const r = rng(seed);
  const put = (x, y, col, a = 255) => {
    if (x < 0 || y < 0 || x > 15 || y > 15) return;
    const i = (y * 16 + x) * 4; const v = typeof col === 'string' ? hex(col) : col;
    img.data[i] = v[0]; img.data[i + 1] = v[1]; img.data[i + 2] = v[2]; img.data[i + 3] = a;
  };
  fn(put, r);
  g.putImageData(img, 0, 0);
  return c;
}
/* Nearest-neighbour upscale: keeps every texel razor sharp, while letting the
   browser anti-alias the *edges* of rotated / skewed faces (no more jaggies). */
export const UP = 4;
function crisp(src) {
  const c = document.createElement('canvas');
  c.width = src.width * UP; c.height = src.height * UP;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const each = (fn) => { for (let y = 0; y < 16; y += 1) for (let x = 0; x < 16; x += 1) fn(x, y); };

/* ---------- base materials ---------- */
const STONE = ['#707070', '#7b7b7b', '#858585', '#909090'];
const stoneFn = (seed) => {
  const lat = lattice(seed);
  return (x, y, r) => {
    const v = 0.4 * lat(x, y) + 0.6 * r();
    return v < 0.1 ? '#636363' : pick(STONE, (v - 0.1) / 0.9);
  };
};
const GRASS = ['#629c38', '#70a943', '#7fb54d', '#8ac056'];
const DIRT = ['#6a4a31', '#79553a', '#866043', '#946b4c'];

const BLOBS = [
  [[2, 2], [3, 2], [2, 3], [3, 3], [4, 3], [3, 4]],
  [[9, 1], [10, 1], [9, 2], [10, 2], [11, 2], [10, 3]],
  [[6, 7], [7, 7], [8, 7], [6, 8], [7, 8], [7, 9]],
  [[11, 8], [12, 8], [11, 9], [12, 9], [12, 10], [13, 10]],
  [[2, 10], [3, 10], [2, 11], [3, 11], [4, 11], [3, 12]],
  [[9, 13], [10, 13], [10, 14]],
];
function ore(seed, pal) {
  return paint(seed, (put, r) => {
    const f = stoneFn(seed);
    each((x, y) => put(x, y, f(x, y, r)));
    const has = new Set(); BLOBS.forEach((b) => b.forEach(([x, y]) => has.add(`${x},${y}`)));
    BLOBS.forEach((b) => b.forEach(([x, y]) => {
      const up = has.has(`${x},${y - 1}`); const lf = has.has(`${x - 1},${y}`);
      const dn = has.has(`${x},${y + 1}`); const rt = has.has(`${x + 1},${y}`);
      let c = pal[1];
      if (!up || !lf) c = pal[0];
      if (!dn || !rt) c = pal[2];
      if ((!up || !lf) && (!dn || !rt)) c = pal[1];
      if (r() < 0.12) c = pal[2];
      put(x, y, c);
    }));
  });
}

function solidNoise(seed, pal, spread = 1, speck) {
  const lat = lattice(seed);
  return paint(seed, (put, r) => each((x, y) => {
    if (speck && r() < speck[1]) { put(x, y, speck[0]); return; }
    const v = clamp(0.5 + (0.45 * lat(x, y) + 0.55 * r() - 0.5) * spread, 0, 0.999);
    put(x, y, pick(pal, v));
  }));
}

function bevelBlock(seed, base, light, dark, shine) {
  const lat = lattice(seed);
  return paint(seed, (put, r) => each((x, y) => {
    let c = shade(base, 0.94 + (0.5 * lat(x, y) + 0.5 * r()) * 0.12);
    if (x === 0 || y === 0) c = hex(light);
    else if (x === 15 || y === 15) c = hex(dark);
    else if (x === 1 || y === 1) c = shade(light, 0.93);
    else if (x === 14 || y === 14) c = shade(dark, 1.08);
    if ((x - y === 3 || x - y === 4) && x > 2 && x < 9 && y > 2) c = hex(shine);
    put(x, y, c);
  }));
}

/* ---------- plants (cross sprites, transparent) ---------- */
function ascii(rows, map, seed = 1) {
  return paint(seed, (put, r) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const m = map[ch]; put(x, y, Array.isArray(m) ? m[Math.floor(r() * m.length)] : m);
  })));
}

export function buildTextures() {
  /* ---- terrain ---- */
  const stone = paint(1, (put, r) => { const f = stoneFn(1); each((x, y) => put(x, y, f(x, y, r))); });
  const dirt = paint(2, (put, r) => { const lat = lattice(2); each((x, y) => { const v = 0.45 * lat(x, y) + 0.55 * r(); put(x, y, r() < 0.045 ? '#8f8478' : pick(DIRT, v)); }); });
  const grassTop = paint(3, (put, r) => { const lat = lattice(3); each((x, y) => put(x, y, pick(GRASS, 0.5 * lat(x, y) + 0.5 * r()))); });
  const grassSide = paint(4, (put, r) => {
    const lat = lattice(4);
    each((x, y) => {
      const depth = 3 + (r() < 0.55 ? 1 : 0) + (r() < 0.22 ? 1 : 0) - (r() < 0.2 ? 1 : 0);
      if (y < depth) put(x, y, y === depth - 1 ? '#5e8c37' : pick(GRASS, 0.5 * lat(x, y) + 0.5 * r()));
      else put(x, y, r() < 0.045 ? '#8f8478' : pick(DIRT, 0.45 * lat(x, y) + 0.55 * r()));
    });
    for (let x = 0; x < 16; x += 1) if (r() < 0.3) put(x, 5, '#5e8c37');
  });
  const cobble = paint(5, (put, r) => {
    const rr = rng(55); const pts = Array.from({ length: 9 }, () => [rr() * 16, rr() * 16, 0.88 + rr() * 0.2]);
    each((x, y) => {
      let d1 = 99; let d2 = 99; let id = 0;
      pts.forEach((p, i) => {
        let dx = Math.abs(x + 0.5 - p[0]); let dy = Math.abs(y + 0.5 - p[1]);
        dx = Math.min(dx, 16 - dx); dy = Math.min(dy, 16 - dy);
        const d = Math.hypot(dx, dy);
        if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
      });
      if (d2 - d1 < 1.05) { put(x, y, '#4e4e4e'); return; }
      const k = pts[id][2];
      put(x, y, shade('#808080', k * (0.94 + r() * 0.12)));
    });
  });

  /* ---- wood ---- */
  const logSide = paint(6, (put, r) => {
    const col = Array.from({ length: 16 }, () => r());
    each((x, y) => {
      const brk = ((x * 5 + y * 3) % 7 === 0 && r() < 0.5) ? 0.35 : 0;
      const v = clamp(0.62 * col[x] + 0.38 * r() - brk, 0, 0.999);
      put(x, y, pick(['#3c2d17', '#53401f', '#695030', '#7b5f38'], v));
    });
  });
  const logTop = paint(7, (put, r) => each((x, y) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) { put(x, y, shade('#4d3a1f', 0.9 + r() * 0.25)); return; }
    const ring = Math.floor(d / 1.5) % 2;
    put(x, y, shade(ring ? '#a98349' : '#c3a066', 0.95 + r() * 0.1));
    if (d < 1.2) put(x, y, '#8a6a37');
  }));
  const planks = paint(8, (put, r) => {
    const boardShade = [1, 0.93, 1.05, 0.97];
    each((x, y) => {
      const b = Math.floor(y / 4);
      if (y % 4 === 3) { put(x, y, '#7d5e33'); return; }
      const joint = x === (b % 2 ? 5 : 11) && y % 4 !== 3;
      if (joint) { put(x, y, '#8a6a3c'); return; }
      let c = shade('#b8935a', boardShade[b] * (0.95 + r() * 0.1));
      if (r() < 0.07) c = shade('#9a7a45', 1);
      put(x, y, c);
    });
  });
  const leaves = paint(9, (put, r) => {
    const lat = lattice(9);
    each((x, y) => {
      const q = r();
      if (q < 0.1) { put(x, y, '#143308'); return; }
      if (q > 0.93) { put(x, y, '#6fbd3c'); return; }
      put(x, y, pick(['#1f5314', '#2c6a1b', '#3b8525', '#4d9a2e'], 0.5 * lat(x, y) + 0.5 * r()));
    });
  });
  const bricks = paint(10, (put, r) => each((x, y) => {
    const row = Math.floor(y / 4);
    if (y % 4 === 3) { put(x, y, '#b9b3a6'); return; }
    if ((x + (row % 2) * 4) % 8 === 7) { put(x, y, '#b9b3a6'); return; }
    put(x, y, shade(r() < 0.5 ? '#98604f' : '#a66a57', 0.93 + r() * 0.14));
  }));
  const roof = paint(11, (put, r) => each((x, y) => {
    const row = y % 4;
    const base = row === 3 ? '#6e2b1f' : pick(['#8c3a29', '#963f2d', '#a14633'], r());
    put(x, y, row === 0 ? shade(base, 1.1) : base);
    if (row !== 3 && (x + Math.floor(y / 4) * 3) % 8 === 7) put(x, y, '#76301f');
  }));
  const bookshelfSide = paint(12, (put, r) => {
    const bookCols = ['#6b2d2a', '#2c4a2e', '#7a5a2e', '#2e3d6e', '#8b6d3a', '#4e2c5a', '#a3472f'];
    each((x, y) => {
      if (y < 2 || (y > 6 && y < 9) || y > 13) { put(x, y, shade('#b8935a', 0.9 + r() * 0.1)); return; }
      put(x, y, '#2a1d10');
    });
    [[2, 6], [9, 13]].forEach(([y0, y1]) => {
      let x = 0;
      while (x < 16) {
        const wdt = r() < 0.5 ? 1 : 2; const colr = bookCols[Math.floor(r() * bookCols.length)];
        const top = y0 + (r() < 0.4 ? 1 : 0);
        for (let xx = x; xx < Math.min(16, x + wdt); xx += 1) for (let y = top; y <= y1; y += 1) put(xx, y, shade(colr, y === top ? 1.2 : 0.95 + r() * 0.1));
        x += wdt + (r() < 0.2 ? 1 : 0);
      }
    });
  });

  /* ---- ores ---- */
  const coal = ore(21, ['#5a5a5a', '#2d2d2d', '#151515']);
  const iron = ore(22, ['#f2d6c0', '#d9a98a', '#a87c60']);
  const gold = ore(23, ['#fff6a0', '#f7d52e', '#c99a14']);
  const diamond = ore(24, ['#c4fff9', '#4fd9d0', '#2a98a0']);
  const redstone = ore(25, ['#ff7a7a', '#e41c1c', '#8a0a0a']);
  const lapis = ore(26, ['#86a8f4', '#2f56c9', '#1c3189']);
  const emerald = ore(27, ['#a2f7c0', '#17d060', '#0d843c']);

  /* ---- special ---- */
  const glow = paint(31, (put, r) => {
    const lat = lattice(31, 5);
    each((x, y) => put(x, y, pick(['#8b5f2e', '#b9843f', '#e1ab50', '#f8d077', '#fff0aa'], clamp(0.5 * lat(x, y) + 0.55 * r() - 0.04, 0, 0.999))));
  });
  const letters = { T: ['###', '.#.', '.#.', '.#.', '.#.'], N: ['#.#', '###', '###', '#.#', '#.#'] };
  const tntSide = paint(32, (put, r) => {
    each((x, y) => {
      if (y < 4 || y > 11) { put(x, y, shade('#d93a2c', 0.93 + r() * 0.12)); if (x % 4 === 1) put(x, y, '#b42a20'); return; }
      if (y === 4 || y === 11) { put(x, y, '#bbb4a4'); return; }
      put(x, y, shade('#e8e3d4', 0.96 + r() * 0.06));
    });
    [['T', 2], ['N', 6], ['T', 10]].forEach(([ch, x0]) => letters[ch].forEach((row, j) => [...row].forEach((v, i) => { if (v === '#') put(x0 + i, 6 + j, '#2b2b2b'); })));
  });
  const tntTop = paint(33, (put, r) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (x >= 6 && x <= 9 && y >= 6 && y <= 9) { put(x, y, (x === 7 || x === 8) && (y === 7 || y === 8) ? '#3a3a3a' : '#8a8a8a'); return; }
    put(x, y, shade(edge ? '#bb3025' : '#d93a2c', 0.94 + r() * 0.1));
  }));
  const obsidian = solidNoise(34, ['#0d0918', '#140f24', '#1c1432', '#2a1e48'], 1.1, ['#4a3480', 0.05]);
  const nether = solidNoise(35, ['#5a2929', '#6f3333', '#843f3f', '#9a5252'], 1.25, ['#451c1c', 0.07]);
  const sand = solidNoise(36, ['#cfc08a', '#d9ca96', '#e1d4a1', '#e9ddb2'], 0.9);
  const goldBlock = bevelBlock(37, '#f7e045', '#fffbb0', '#c9961a', '#fffde0');
  const diamondBlock = bevelBlock(38, '#52e0d2', '#c8fffa', '#25949a', '#e8ffff');
  const ironBlock = bevelBlock(39, '#dcdcdc', '#ffffff', '#9c9c9c', '#ffffff');
  const pumpkinSide = paint(40, (put, r) => each((x, y) => {
    const k = [0.78, 1.05, 1.0, 0.9][x % 4];
    put(x, y, shade('#d4801f', k * (0.95 + r() * 0.1) * (y < 1 || y > 14 ? 0.85 : 1)));
  }));
  const pumpkinTop = paint(41, (put, r) => each((x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d < 1.6) { put(x, y, (x + y) % 2 ? '#5d7f2a' : '#7a5a24'); return; }
    put(x, y, shade(d > 6 ? '#b3631a' : '#cf7a1f', 0.95 + r() * 0.1));
  }));
  const doorBottom = paint(42, (put, r) => each((x, y) => {
    const border = x === 0 || x === 15 || y === 15 || y === 0;
    const panel = (x >= 3 && x <= 12) && ((y >= 2 && y <= 6) || (y >= 9 && y <= 13));
    let c = shade(border ? '#4a3118' : panel ? '#7a5428' : '#63421f', 0.95 + r() * 0.1);
    if (x === 12 && y === 8) c = [225, 225, 225];
    put(x, y, c);
  }));
  const doorTop = paint(43, (put, r) => each((x, y) => {
    const border = x === 0 || x === 15 || y === 0;
    const win = y >= 3 && y <= 5 && [2, 3, 6, 7, 8, 9, 12, 13].includes(x);
    put(x, y, win ? '#cfe6f0' : shade(border ? '#4a3118' : '#63421f', 0.95 + r() * 0.1));
  }));
  const glass = paint(44, (put) => each((x, y) => {
    const edge = x === 0 || y === 0 || x === 15 || y === 15;
    if (edge) put(x, y, '#d8eef4', 235);
    else if ((x === 3 && y >= 3 && y <= 5) || (y === 3 && x >= 3 && x <= 5) || (x === 5 && y === 5)) put(x, y, '#ffffff', 190);
    else put(x, y, '#aad4e2', 70);
  }));
  const water = paint(45, (put, r) => {
    const lat = lattice(45, 4);
    each((x, y) => put(x, y, pick(['#2a46c4', '#3556d6', '#4468e6', '#5c7cf0'], 0.65 * lat(x, y) + 0.35 * r()), 215));
  });
  const pathT = paint(46, (put, r) => { const lat = lattice(46); each((x, y) => put(x, y, pick(['#8a7340', '#977e49', '#a58a52', '#ae945c'], 0.5 * lat(x, y) + 0.5 * r()))); });

  /* ---- plants ---- */
  const poppy = ascii([
    '................', '................', '................', '................',
    '......rrr.......', '.....rRRRr......', '.....rRDRr......', '......rRr.......',
    '.......g........', '.......g........', '......gg........', '.......gg.......',
    '.......g........', '.......g........', '.......g........', '.......g........',
  ], { r: '#a82424', R: '#e23a30', D: '#2a1a10', g: '#3f7f2a' });
  const dandelion = ascii([
    '................', '................', '................', '................',
    '......yyy.......', '.....yYYYy......', '.....yYYYy......', '......yYy.......',
    '.......g........', '.......g........', '......gg........', '.......gg.......',
    '.......g........', '.......g........', '.......g........', '.......g........',
  ], { y: '#d9a91c', Y: '#f7d92e', g: '#3f7f2a' });
  const tallgrass = ascii([
    '.....g......g...', '.....g.....gh...', '.....gh....g....', '..g..gh...gh..g.',
    '..g..g....g...g.', '..gh.g...gh..gh.', '...g.gh..g...g..', '...gh.g.gh..gh..',
    '...g..ghg...g...', '...gh.gh...gh...', '....g.gh..gh....', '....ghgh..g.....',
    '.....ghg.gh.....', '.....ghgghg.....', '.....gggggg.....', '......gggg......',
  ], { g: ['#5c9a38', '#6aa845'], h: ['#74a846', '#82b650'] }, 7);

  const solid = (t) => ({ top: t, left: t, right: t });
  const out = {
    grass: { top: grassTop, left: grassSide, right: grassSide },
    dirt: solid(dirt), stone: solid(stone), cobble: solid(cobble), path: solid(pathT),
    planks: solid(planks), log: { top: logTop, left: logSide, right: logSide },
    leaves: solid(leaves), bricks: solid(bricks), roof: solid(roof),
    bookshelf: { top: planks, left: bookshelfSide, right: bookshelfSide },
    coal_ore: solid(coal), iron_ore: solid(iron), gold_ore: solid(gold), diamond_ore: solid(diamond),
    redstone_ore: solid(redstone), lapis_ore: solid(lapis), emerald_ore: solid(emerald),
    glow: solid(glow), tnt: { top: tntTop, left: tntSide, right: tntSide },
    obsidian: solid(obsidian), netherrack: solid(nether), sand: solid(sand),
    gold_block: solid(goldBlock), diamond_block: solid(diamondBlock), iron_block: solid(ironBlock),
    pumpkin: { top: pumpkinTop, left: pumpkinSide, right: pumpkinSide },
    door_bottom: solid(doorBottom), door_top: solid(doorTop),
    glass: { ...solid(glass), trans: true }, water: { ...solid(water), trans: true },
    plants: { poppy, dandelion, tallgrass },
  };
  /* upscale every unique canvas once */
  const seen = new Map();
  const up = (cv) => { if (!seen.has(cv)) seen.set(cv, crisp(cv)); return seen.get(cv); };
  Object.values(out).forEach((set) => {
    if (set.top) { set.top = up(set.top); set.left = up(set.left); set.right = up(set.right); }
    else Object.keys(set).forEach((k) => { set[k] = up(set[k]); });
  });
  return out;
}

/* isometric cube sprite: +x goes right-down, +y goes left-down, +z goes up */
export function cubeSprite(set, S) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(2 * S) + 2; c.height = Math.ceil(2 * S) + 2;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const N = set.top.width; const ox = S + 1; const oy = 1;
  const face = (img, m) => { g.save(); g.setTransform(m[0] / N, m[1] / N, m[2] / N, m[3] / N, ox + m[4], oy + m[5]); g.drawImage(img, 0, 0); g.restore(); };
  face(set.top, [S, S / 2, -S, S / 2, 0, 0]);
  face(set.left, [S, S / 2, 0, S, -S, S / 2]);
  face(set.right, [S, -S / 2, 0, S, 0, S]);
  if (!set.trans) {
    const poly = (pts, style) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(ox + x, oy + y) : g.moveTo(ox + x, oy + y))); g.closePath(); g.fillStyle = style; g.fill(); };
    poly([[-S, S / 2], [0, S], [0, 2 * S], [-S, 1.5 * S]], 'rgba(0,0,0,0.22)');
    poly([[0, S], [S, S / 2], [S, 1.5 * S], [0, 2 * S]], 'rgba(0,0,0,0.44)');
    /* crisp bevel: bright top rim, dark outer edge, like the in-game block outline */
    g.lineJoin = 'miter'; g.lineWidth = Math.max(1, S / 32);
    g.strokeStyle = 'rgba(255,255,255,0.16)';
    g.beginPath(); g.moveTo(ox - S, oy + S / 2); g.lineTo(ox, oy); g.lineTo(ox + S, oy + S / 2); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.38)';
    g.beginPath(); g.moveTo(ox - S, oy + S / 2); g.lineTo(ox, oy + S); g.lineTo(ox + S, oy + S / 2); g.moveTo(ox, oy + S); g.lineTo(ox, oy + 2 * S); g.stroke();
  }
  return { canvas: c, ox, oy };
}
