import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'swiftcloud.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  full_name TEXT DEFAULT '',
  discord TEXT DEFAULT '',
  company TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('intel','amd','infinity')),
  name TEXT NOT NULL,
  ram TEXT NOT NULL,
  cpu TEXT NOT NULL,
  storage TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  location TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_popular INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  percent_off INTEGER NOT NULL DEFAULT 0,
  amount_off_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  max_uses INTEGER NOT NULL DEFAULT 0,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES plans(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  plan_snapshot TEXT NOT NULL DEFAULT '{}',
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  coupon_code TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT DEFAULT 'manual',
  billing_name TEXT DEFAULT '',
  billing_email TEXT DEFAULT '',
  billing_address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  ip TEXT DEFAULT 'Pending assignment',
  location TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'provisioning',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  server_id INTEGER REFERENCES servers(id) ON DELETE SET NULL,
  plan_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  renews_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  is_staff INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  quote TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  flag TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational','degraded','maintenance','offline')),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  capacity TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

try { db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE users ADD COLUMN terms_accepted_at TEXT NOT NULL DEFAULT ''"); } catch { /* already exists */ }
try { db.exec("ALTER TABLE plans ADD COLUMN is_popular INTEGER NOT NULL DEFAULT 0"); } catch { /* already exists */ }

// --- Node monitoring columns (added incrementally, safe to re-run) ---
for (const stmt of [
  "ALTER TABLE locations ADD COLUMN node_url TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE locations ADD COLUMN ip_address TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE locations ADD COLUMN ip_type TEXT NOT NULL DEFAULT 'shared'",
  "ALTER TABLE locations ADD COLUMN cloudflare INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE locations ADD COLUMN check_enabled INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE locations ADD COLUMN check_interval_minutes INTEGER NOT NULL DEFAULT 5",
  "ALTER TABLE locations ADD COLUMN up_count INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE locations ADD COLUMN down_count INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE locations ADD COLUMN last_checked_at TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE locations ADD COLUMN last_check_status TEXT NOT NULL DEFAULT 'unknown'",
  "ALTER TABLE locations ADD COLUMN last_response_ms INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE locations ADD COLUMN uptime_percent REAL NOT NULL DEFAULT 100",
  "ALTER TABLE locations ADD COLUMN maintenance_until TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE locations ADD COLUMN maintenance_note TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE locations ADD COLUMN status_note TEXT NOT NULL DEFAULT ''",
]) {
  try { db.exec(stmt); } catch { /* column already exists */ }
}

db.exec(`
CREATE TABLE IF NOT EXISTS location_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  checked_at TEXT NOT NULL DEFAULT (datetime('now')),
  ok INTEGER NOT NULL DEFAULT 0,
  response_ms INTEGER NOT NULL DEFAULT 0,
  http_status INTEGER NOT NULL DEFAULT 0,
  cloudflare INTEGER NOT NULL DEFAULT 0,
  resolved_ip TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_location_checks_location ON location_checks(location_id, checked_at DESC);
`);

const DEFAULT_CONTENT = {
  hero: {
    eyebrow: 'Minecraft Server Hosting',
    headline: 'Build Your Worlds.',
    subtitle: 'Legacy Cloud turns ideas into living Minecraft worlds — fast NVMe servers, DDoS protection and real people behind every node.',
    primary_cta: 'Get Started',
    secondary_cta: 'View Plans',
    badge: 'NVMe storage · DDoS protection · Instant setup',
  },
  why_choose: {
    title: 'Why Choose Legacy Cloud?',
    subtitle: 'Built by gamers, engineered for performance. Every node is tuned for Minecraft.',
    items: [
      { icon: 'bolt', title: 'Low-Latency Hardware', desc: 'Modern Intel and AMD Ryzen nodes with NVMe storage keep ticks smooth, even with heavy plugins.' },
      { icon: 'shield', title: 'DDoS Protection', desc: 'Always-on layer 3/4/7 filtering absorbs attacks before they ever reach your world.' },
      { icon: 'cpu', title: 'Full Control Panel', desc: 'Manage files, plugins, backups, scheduled tasks and console access from one clean panel.' },
      { icon: 'clock', title: 'Instant Provisioning', desc: 'Your server is created the moment your order is approved — no waiting for manual setup.' },
      { icon: 'headset', title: 'Human Support', desc: 'Real engineers on Discord and tickets, not scripted bots. We play Minecraft too.' },
      { icon: 'refresh', title: 'Free Migrations', desc: 'Moving from another host? Our team transfers your worlds, plugins and configs for free.' },
    ],
  },
  features: {
    title: 'Everything your server needs',
    subtitle: 'No upsells for basics. Core hosting features are included on every plan.',
    items: [
      { title: 'Pterodactyl Panel', desc: 'A modern, fast game panel with full SFTP and console access.' },
      { title: 'Automatic Backups', desc: 'Scheduled off-site backups so a bad plugin never ends your world.' },
      { title: 'One-Click Modpacks', desc: 'Paper, Purpur, Fabric, Forge, NeoForge and modpack installers.' },
      { title: 'Subdomain Included', desc: 'Get yourserver.legacycloud.gg pointing at your node instantly.' },
      { title: 'MySQL Databases', desc: 'Databases for LuckPerms, CoreProtect and your other plugins.' },
      { title: 'No Player Limits', desc: 'We never cap slots. Your hardware sets the limit, not a license.' },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know before you deploy.',
    items: [
      { q: 'How fast is my server set up?', a: 'Orders are reviewed and provisioned quickly. Once your order status is set to active in our system, your server appears in your dashboard with panel credentials.' },
      { q: 'Can I upgrade my plan later?', a: 'Yes. Open a support ticket and we will migrate you to a larger plan. Your world, plugins and configuration are preserved.' },
      { q: 'Do you limit player slots?', a: 'No. We do not sell slot limits. Your RAM and CPU determine how many players your server can comfortably hold.' },
      { q: 'What panel do you use?', a: 'Every server runs on Pterodactyl, with full file management, scheduled tasks, backups and live console.' },
      { q: 'Which payment methods are supported?', a: 'Checkout creates an invoice and reserves your configuration. Payment instructions are shown after ordering, and an administrator marks the invoice paid once payment is confirmed. We never auto-mark payments as successful.' },
      { q: 'Do you offer refunds?', a: 'Contact support within 72 hours of your first payment if the service does not work for you. Refunds are handled case by case by our billing team.' },
    ],
  },
  promo: {
    enabled: true,
    text: 'Launch offer: use code SWIFT10 for 10% off your first month.',
    link_text: 'View plans',
    link_url: '/plans',
  },
  appearance: {
    default_theme: 'legacy-dark',
    default_bg: 'animated',
    visitor_switcher: true,
    hero_motion: 'orbs',
    motion_intensity: 60,
    page_bg_color: '',
    accent_color: '',
    bg_image_url: '',
    bg_image_opacity: 35,
    bg_image_blur: 0,
  },
  branding: {
    logo_url: '',
    logo_alt: 'Legacy Cloud logo',
    brand_name: 'LEGACY CLOUD',
    discord_url: 'https://discord.gg/',
  },
  footer: {
    tagline: 'Premium Minecraft hosting engineered for performance, built for communities.',
    discord_url: 'https://discord.gg/',
    support_email: 'support@legacycloud.gg',
    status_url: '/status',
  },
  contact: {
    title: 'Talk to a human',
    subtitle: 'Questions about a plan, a migration or a custom build? Our team replies fast.',
    email: 'support@legacycloud.gg',
    discord: 'https://discord.gg/',
  },
};

const seedContent = db.prepare('INSERT OR IGNORE INTO content (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
  seedContent.run(key, JSON.stringify(value));
}

// One-time migration to the Legacy Cloud brand + editorial design (keeps all other edits).
try {
  const done = db.prepare("SELECT 1 FROM content WHERE key = 'migrated_legacy_v1'").get();
  if (!done) {
    db.prepare(`UPDATE content SET value = replace(replace(replace(value, 'Swift Cloud', 'Legacy Cloud'), 'SWIFT CLOUD', 'LEGACY CLOUD'), 'swiftcloud.gg', 'legacycloud.gg')`).run();
    const hero = getContent('hero');
    if (hero && hero.headline === 'Power Your Gaming World.') setContent('hero', DEFAULT_CONTENT.hero);
    const app = getContent('appearance');
    if (app && (app.default_theme === 'neu' || app.default_theme === 'cyber' || app.default_theme === 'glass')) setContent('appearance', { ...app, default_theme: 'legacy-dark' });
    setContent('migrated_legacy_v1', true);
  }
} catch (err) {
  console.error('[db] legacy migration skipped:', err.message);
}

// Ensure each category has a default "Most popular" plan (only if none is flagged yet).
try {
  const popularCount = db.prepare('SELECT COUNT(*) AS c FROM plans WHERE is_popular = 1').get().c;
  if (popularCount === 0) {
    for (const [cat, name] of [['intel', 'Intel Pro'], ['amd', 'AMD Ryzen Pro'], ['infinity', 'Intel Infinity']]) {
      db.prepare('UPDATE plans SET is_popular = 1 WHERE category = ? AND name = ?').run(cat, name);
    }
  }
} catch { /* ignore */ }

const planCount = db.prepare('SELECT COUNT(*) AS c FROM plans').get().c;
if (planCount === 0) {
  const insertPlan = db.prepare(`INSERT INTO plans (category, name, ram, cpu, storage, price_cents, location, features, sort_order)
    VALUES (@category, @name, @ram, @cpu, @storage, @price_cents, @location, @features, @sort_order)`);
  const plans = [
    { category: 'intel', name: 'Intel Starter', ram: '4 GB DDR4', cpu: '2 vCPU · Intel Xeon', storage: '30 GB NVMe', price_cents: 699, location: 'Ashburn, US', sort_order: 1,
      features: ['Unlimited player slots', 'Pterodactyl panel', 'DDoS protection', '1 MySQL database', 'Daily backups'] },
    { category: 'intel', name: 'Intel Pro', ram: '8 GB DDR4', cpu: '3 vCPU · Intel Xeon', storage: '60 GB NVMe', price_cents: 1299, location: 'Ashburn, US', sort_order: 2,
      features: ['Unlimited player slots', 'Pterodactyl panel', 'DDoS protection', '3 MySQL databases', 'Daily backups', 'Free subdomain'] },
    { category: 'intel', name: 'Intel Elite', ram: '16 GB DDR4', cpu: '4 vCPU · Intel Xeon', storage: '120 GB NVMe', price_cents: 2499, location: 'Dallas, US', sort_order: 3,
      features: ['Unlimited player slots', 'Priority CPU', 'DDoS protection', '5 MySQL databases', 'Hourly backups', 'Free migration'] },
    { category: 'amd', name: 'AMD Ryzen Starter', ram: '4 GB DDR4', cpu: '2 cores · Ryzen 9 5950X', storage: '35 GB NVMe', price_cents: 799, location: 'Frankfurt, EU', sort_order: 1,
      features: ['High clock speed', 'Pterodactyl panel', 'DDoS protection', '1 MySQL database', 'Daily backups'] },
    { category: 'amd', name: 'AMD Ryzen Pro', ram: '8 GB DDR4', cpu: '4 cores · Ryzen 9 5950X', storage: '70 GB NVMe', price_cents: 1499, location: 'Frankfurt, EU', sort_order: 2,
      features: ['High clock speed', 'Pterodactyl panel', 'DDoS protection', '3 MySQL databases', 'Daily backups', 'Free subdomain'] },
    { category: 'amd', name: 'AMD Ryzen Elite', ram: '16 GB DDR4', cpu: '6 cores · Ryzen 9 7950X', storage: '140 GB NVMe', price_cents: 2899, location: 'Singapore, APAC', sort_order: 3,
      features: ['High clock speed', 'Priority CPU', 'DDoS protection', '5 MySQL databases', 'Hourly backups', 'Free migration'] },
    { category: 'infinity', name: 'Intel Infinity', ram: 'Unlimited (as configured)', cpu: 'Unlimited (as configured)', storage: '250 GB NVMe', price_cents: 4999, location: 'Ashburn, US', sort_order: 1,
      features: ['Dedicated Intel node', 'Unlimited CPU as configured', 'Unlimited RAM as configured', 'Premium priority support', 'Hourly off-site backups', 'Free migration & setup'] },
    { category: 'infinity', name: 'AMD Infinity', ram: 'Unlimited (as configured)', cpu: 'Unlimited (as configured)', storage: '250 GB NVMe', price_cents: 5999, location: 'Frankfurt, EU', sort_order: 2,
      features: ['Dedicated AMD Ryzen node', 'Unlimited CPU as configured', 'Unlimited RAM as configured', 'Premium priority support', 'Hourly off-site backups', 'Free migration & setup'] },
  ];
  const tx = db.transaction(() => {
    for (const p of plans) insertPlan.run({ ...p, features: JSON.stringify(p.features) });
  });
  tx();
}

const locationCount = db.prepare('SELECT COUNT(*) AS c FROM locations').get().c;
if (locationCount === 0) {
  const insertLocation = db.prepare(`INSERT INTO locations (name, region, country, flag, status, latency_ms, capacity, sort_order)
    VALUES (@name, @region, @country, @flag, @status, @latency_ms, @capacity, @sort_order)`);
  const locations = [
    { name: 'Ashburn, US', region: 'North America', country: 'United States', flag: '\ud83c\uddfa\ud83c\uddf8', status: 'operational', latency_ms: 12, capacity: 'Intel \u00b7 AMD', sort_order: 1 },
    { name: 'Dallas, US', region: 'North America', country: 'United States', flag: '\ud83c\uddfa\ud83c\uddf8', status: 'operational', latency_ms: 18, capacity: 'Intel', sort_order: 2 },
    { name: 'Frankfurt, EU', region: 'Europe', country: 'Germany', flag: '\ud83c\udde9\ud83c\uddea', status: 'operational', latency_ms: 24, capacity: 'AMD \u00b7 Infinity', sort_order: 3 },
    { name: 'Singapore, APAC', region: 'Asia Pacific', country: 'Singapore', flag: '\ud83c\uddf8\ud83c\uddec', status: 'degraded', latency_ms: 87, capacity: 'AMD', sort_order: 4 },
  ];
  const tx = db.transaction(() => {
    for (const l of locations) insertLocation.run(l);
  });
  tx();
}

// Backfill monitoring metadata for any location that has none yet.
try {
  const seedNodes = [
    { name: 'Ashburn, US', node_url: 'https://www.cloudflare.com/cdn-cgi/trace', ip_address: '104.16.132.229', ip_type: 'dedicated', cloudflare: 1 },
    { name: 'Dallas, US', node_url: 'https://example.com/', ip_address: '198.51.100.11', ip_type: 'shared', cloudflare: 0 },
    { name: 'Frankfurt, EU', node_url: 'https://www.cloudflare.com/cdn-cgi/trace', ip_address: '104.16.132.229', ip_type: 'shared', cloudflare: 1 },
    { name: 'Singapore, APAC', node_url: 'http://localhost:4100/api/health', ip_address: '203.0.113.24', ip_type: 'dedicated', cloudflare: 0 },
  ];
  const upd = db.prepare(`UPDATE locations SET node_url = ?, ip_address = ?, ip_type = ?, cloudflare = ?
    WHERE name = ? AND (node_url = '' OR node_url IS NULL)`);
  for (const n of seedNodes) upd.run(n.node_url, n.ip_address, n.ip_type, n.cloudflare, n.name);
} catch { /* ignore */ }

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!existingAdmin) {
  db.prepare('INSERT INTO users (username, email, password_hash, role, full_name) VALUES (?, ?, ?, ?, ?)')
    .run(adminUsername, `${adminUsername}@swiftcloud.local`, bcrypt.hashSync(adminPassword, 12), 'admin', 'Legacy Cloud Admin');
}

const couponCount = db.prepare('SELECT COUNT(*) AS c FROM coupons').get().c;
if (couponCount === 0) {
  db.prepare('INSERT INTO coupons (code, percent_off, is_active, max_uses) VALUES (?, ?, 1, 0)').run('SWIFT10', 10);
}

db.exec(`
CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function getContent(key) {
  const row = db.prepare('SELECT value FROM content WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

export function setContent(key, value) {
  db.prepare('INSERT INTO content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, JSON.stringify(value));
}
