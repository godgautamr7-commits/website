import { Router } from 'express';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, getContent, setContent } from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';
import { serializePlan, parseMoneyToCents, clean, addMonths } from '../utils.js';
import { checkLocation, runDueChecks, decorateLocation } from '../monitor.js';

const router = Router();
router.use(authenticate, requireAdmin);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'data', 'uploads');

/* ---------------- BRANDING UPLOAD ---------------- */
// Accepts a base64 data URL (png/jpeg/webp/gif/svg), stores it on disk and
// returns a public /uploads/... URL that can be saved into the branding block.
router.post('/upload', (req, res) => {
  const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
  const match = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return res.status(400).json({ error: 'Please upload a PNG, JPG, WEBP, GIF or SVG image.' });
  const rawType = match[1].toLowerCase();
  const ext = rawType === 'jpeg' ? 'jpg' : rawType === 'svg+xml' ? 'svg' : rawType;
  let buffer;
  try { buffer = Buffer.from(match[2], 'base64'); } catch { return res.status(400).json({ error: 'The image could not be read.' }); }
  if (!buffer.length) return res.status(400).json({ error: 'The image is empty.' });
  if (buffer.length > 2 * 1024 * 1024) return res.status(413).json({ error: 'Image must be smaller than 2 MB.' });
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
    res.status(201).json({ url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Logo upload failed:', err);
    res.status(500).json({ error: 'Could not save the uploaded logo.' });
  }
});

router.get('/stats', (req, res) => {
  const revenue = db.prepare("SELECT COALESCE(SUM(total_cents),0) AS v FROM orders WHERE payment_status = 'paid'").get().v;
  const customers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get().c;
  const orders = db.prepare('SELECT COUNT(*) AS c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").get().c;
  const openTickets = db.prepare("SELECT COUNT(*) AS c FROM tickets WHERE status != 'closed'").get().c;
  const activeServers = db.prepare("SELECT COUNT(*) AS c FROM servers WHERE status = 'active'").get().c;
  const plans = db.prepare('SELECT COUNT(*) AS c FROM plans WHERE is_active = 1').get().c;
  const recentOrders = db.prepare(`SELECT o.*, u.username, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 8`).all();
  const recentTickets = db.prepare(`SELECT t.*, u.username FROM tickets t JOIN users u ON u.id = t.user_id ORDER BY t.updated_at DESC LIMIT 5`).all();
  res.json({ stats: { revenue, customers, orders, pendingOrders, openTickets, activeServers, plans }, recentOrders, recentTickets });
});

/* ---------------- PLANS ---------------- */
router.get('/plans', (req, res) => {
  res.json({ plans: db.prepare('SELECT * FROM plans ORDER BY category, sort_order, price_cents').all().map(serializePlan) });
});

function validatePlan(body) {
  const category = clean(body.category, 20).toLowerCase();
  const name = clean(body.name, 80);
  const ram = clean(body.ram, 80);
  const cpu = clean(body.cpu, 120);
  const storage = clean(body.storage, 80);
  const location = clean(body.location, 80);
  // Accept either an integer amount in cents (price_cents) or a dollar amount (price).
  const price = body.price_cents !== undefined && body.price_cents !== ''
    ? Math.round(Number(body.price_cents))
    : parseMoneyToCents(body.price);
  const features = Array.isArray(body.features)
    ? body.features.map((f) => clean(f, 120)).filter(Boolean).slice(0, 15)
    : [];
  if (!['intel', 'amd', 'infinity'].includes(category)) return { error: 'Category must be intel, amd or infinity.' };
  if (!name) return { error: 'Plan name is required.' };
  if (!ram) return { error: 'RAM is required.' };
  if (!cpu) return { error: 'CPU is required.' };
  if (!storage) return { error: 'Storage is required.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a valid non-negative number.' };
  if (!location) return { error: 'Server location is required.' };
  return {
    value: {
      category, name, ram, cpu, storage, location, price_cents: price, features,
      is_active: body.is_active === false || body.is_active === 0 ? 0 : 1,
      is_popular: body.is_popular === true || body.is_popular === 1 ? 1 : 0,
      sort_order: parseInt(body.sort_order, 10) || 0,
    },
  };
}

router.post('/plans', (req, res) => {
  const { error, value } = validatePlan(req.body);
  if (error) return res.status(400).json({ error });
  const info = db.prepare(`INSERT INTO plans (category, name, ram, cpu, storage, price_cents, location, features, is_active, is_popular, sort_order)
    VALUES (@category, @name, @ram, @cpu, @storage, @price_cents, @location, @features, @is_active, @is_popular, @sort_order)`)
    .run({ ...value, features: JSON.stringify(value.features) });
  res.status(201).json({ plan: serializePlan(db.prepare('SELECT * FROM plans WHERE id = ?').get(info.lastInsertRowid)) });
});

router.patch('/plans/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Plan not found.' });
  const merged = { ...serializePlan(existing), ...req.body };
  const { error, value } = validatePlan(merged);
  if (error) return res.status(400).json({ error });
  db.prepare(`UPDATE plans SET category=@category, name=@name, ram=@ram, cpu=@cpu, storage=@storage,
    price_cents=@price_cents, location=@location, features=@features, is_active=@is_active, is_popular=@is_popular, sort_order=@sort_order,
    updated_at=datetime('now') WHERE id=@id`)
    .run({ ...value, features: JSON.stringify(value.features), id: existing.id });
  res.json({ plan: serializePlan(db.prepare('SELECT * FROM plans WHERE id = ?').get(existing.id)) });
});

router.delete('/plans/:id', (req, res) => {
  const info = db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ ok: true });
});

/* ---------------- USERS ---------------- */
router.get('/users', (req, res) => {
  const users = db.prepare(`SELECT u.id, u.username, u.email, u.role, u.full_name, u.discord, u.company, u.is_active, u.created_at,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
    (SELECT COUNT(*) FROM servers s WHERE s.user_id = u.id) AS server_count
    FROM users u ORDER BY u.created_at DESC`).all();
  res.json({ users });
});

router.patch('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id && req.body.role && req.body.role !== 'admin') {
    return res.status(400).json({ error: 'You cannot demote your own admin account.' });
  }
  const role = ['admin', 'customer'].includes(req.body.role) ? req.body.role : user.role;
  const isActive = req.body.is_active === undefined ? user.is_active : (req.body.is_active ? 1 : 0);
  const fullName = req.body.full_name === undefined ? user.full_name : clean(req.body.full_name, 80);
  db.prepare('UPDATE users SET role = ?, is_active = ?, full_name = ? WHERE id = ?').run(role, isActive, fullName, user.id);
  res.json({ ok: true });
});

router.delete('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ ok: true });
});

/* ---------------- ORDERS / SERVERS ---------------- */
router.get('/orders', (req, res) => {
  const rows = db.prepare(`SELECT o.*, u.username, u.email FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`).all();
  res.json({ orders: rows });
});

router.patch('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const statuses = ['pending', 'paid', 'provisioning', 'active', 'cancelled'];
  const paymentStatuses = ['unpaid', 'pending', 'paid', 'refunded'];
  const status = statuses.includes(req.body.status) ? req.body.status : order.status;
  const paymentStatus = paymentStatuses.includes(req.body.payment_status) ? req.body.payment_status : order.payment_status;

  db.prepare("UPDATE orders SET status = ?, payment_status = ?, notes = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, paymentStatus, req.body.notes === undefined ? order.notes : clean(req.body.notes, 500), order.id);

  let provisioned = null;
  if (status === 'active') {
    const existingServer = db.prepare('SELECT * FROM servers WHERE order_id = ?').get(order.id);
    if (!existingServer) {
      const snapshot = (() => { try { return JSON.parse(order.plan_snapshot || '{}'); } catch { return {}; } })();
      const info = db.prepare('INSERT INTO servers (user_id, order_id, name, plan_name, ip, location, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(order.user_id, order.id, `${order.plan_name} #${order.id}`, order.plan_name, 'Pending assignment', snapshot.location || '', 'provisioning');
      const serverId = info.lastInsertRowid;
      db.prepare('INSERT INTO subscriptions (user_id, server_id, plan_name, price_cents, status, renews_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(order.user_id, serverId, order.plan_name, order.total_cents, 'active', addMonths(new Date(), 1));
      provisioned = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
    }
  }
  res.json({ ok: true, provisioned });
});

router.get('/servers', (req, res) => {
  res.json({ servers: db.prepare(`SELECT s.*, u.username FROM servers s JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC`).all() });
});

router.patch('/servers/:id', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ?').get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found.' });
  const statuses = ['provisioning', 'active', 'suspended', 'terminated'];
  db.prepare('UPDATE servers SET name = ?, ip = ?, location = ?, status = ? WHERE id = ?').run(
    req.body.name === undefined ? server.name : clean(req.body.name, 80),
    req.body.ip === undefined ? server.ip : clean(req.body.ip, 80),
    req.body.location === undefined ? server.location : clean(req.body.location, 80),
    statuses.includes(req.body.status) ? req.body.status : server.status,
    server.id,
  );
  res.json({ ok: true });
});

/* ---------------- TICKETS ---------------- */
router.get('/tickets', (req, res) => {
  res.json({ tickets: db.prepare(`SELECT t.*, u.username, u.email FROM tickets t JOIN users u ON u.id = t.user_id ORDER BY t.updated_at DESC`).all() });
});

router.get('/tickets/:id', (req, res) => {
  const ticket = db.prepare(`SELECT t.*, u.username, u.email FROM tickets t JOIN users u ON u.id = t.user_id WHERE t.id = ?`).get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  res.json({ ticket, messages: db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id) });
});

router.post('/tickets/:id/messages', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const body = clean(req.body.body, 4000);
  if (body.length < 2) return res.status(400).json({ error: 'Message is too short.' });
  db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, author_name, is_staff, body) VALUES (?, ?, ?, 1, ?)')
    .run(ticket.id, req.user.id, `${req.user.username} (Staff)`, body);
  db.prepare("UPDATE tickets SET status = 'answered', updated_at = datetime('now') WHERE id = ?").run(ticket.id);
  res.status(201).json({ ok: true });
});

router.patch('/tickets/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const statuses = ['open', 'answered', 'closed'];
  db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(statuses.includes(req.body.status) ? req.body.status : ticket.status, ticket.id);
  res.json({ ok: true });
});

/* ---------------- ANNOUNCEMENTS ---------------- */
router.get('/announcements', (req, res) => {
  res.json({ announcements: db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all() });
});

router.post('/announcements', (req, res) => {
  const title = clean(req.body.title, 140);
  const body = clean(req.body.body, 2000);
  if (!title || !body) return res.status(400).json({ error: 'Title and body are required.' });
  const type = ['info', 'success', 'warning'].includes(req.body.type) ? req.body.type : 'info';
  const info = db.prepare('INSERT INTO announcements (title, body, type, is_active) VALUES (?, ?, ?, ?)')
    .run(title, body, type, req.body.is_active === false ? 0 : 1);
  res.status(201).json({ announcement: db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid) });
});

router.patch('/announcements/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Announcement not found.' });
  db.prepare('UPDATE announcements SET title = ?, body = ?, type = ?, is_active = ? WHERE id = ?').run(
    req.body.title === undefined ? a.title : clean(req.body.title, 140),
    req.body.body === undefined ? a.body : clean(req.body.body, 2000),
    ['info', 'success', 'warning'].includes(req.body.type) ? req.body.type : a.type,
    req.body.is_active === undefined ? a.is_active : (req.body.is_active ? 1 : 0),
    a.id,
  );
  res.json({ ok: true });
});

router.delete('/announcements/:id', (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});


/* Appearance block: only accept known, well-formed values (it ends up in CSS). */
function sanitizeAppearance(v) {
  if (!v || typeof v !== 'object') return null;
  const THEMES = ['legacy-dark', 'legacy-light', 'cyber', 'neu', 'bento', 'material', 'glass'];
  const BGS = ['animated', 'texture', 'plain'];
  const MOTIONS = ['orbs', 'spotlight', 'off'];
  const hex = (x) => (typeof x === 'string' && /^#[0-9a-fA-F]{6}$/.test(x.trim()) ? x.trim().toLowerCase() : '');
  const num = (x, min, max, d) => { const n = Number(x); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d; };
  let img = typeof v.bg_image_url === 'string' ? v.bg_image_url.trim() : '';
  if (img && !/^(\/uploads\/[A-Za-z0-9._-]+|https:\/\/[^\s"'()\\]+)$/.test(img)) img = '';
  return {
    default_theme: THEMES.includes(v.default_theme) ? v.default_theme : 'legacy-dark',
    default_bg: BGS.includes(v.default_bg) ? v.default_bg : 'animated',
    visitor_switcher: v.visitor_switcher !== false,
    hero_motion: MOTIONS.includes(v.hero_motion) ? v.hero_motion : 'orbs',
    motion_intensity: num(v.motion_intensity, 0, 100, 60),
    page_bg_color: hex(v.page_bg_color),
    accent_color: hex(v.accent_color),
    bg_image_url: img,
    bg_image_opacity: num(v.bg_image_opacity, 0, 100, 35),
    bg_image_blur: num(v.bg_image_blur, 0, 24, 0),
  };
}

/* ---------------- CONTENT ---------------- */
router.get('/content', (req, res) => {
  const rows = db.prepare('SELECT * FROM content').all();
  const out = {};
  for (const row of rows) { try { out[row.key] = JSON.parse(row.value); } catch { out[row.key] = row.value; } }
  res.json({ content: out });
});

router.put('/content/:key', (req, res) => {
  const allowed = ['branding', 'appearance', 'hero', 'why_choose', 'features', 'faq', 'promo', 'footer', 'contact'];
  if (!allowed.includes(req.params.key)) return res.status(400).json({ error: 'Unknown content block.' });
  if (req.body.value === undefined) return res.status(400).json({ error: 'Value is required.' });
  const value = req.params.key === 'appearance' ? sanitizeAppearance(req.body.value) : req.body.value;
  if (value === null) return res.status(400).json({ error: 'Invalid appearance settings.' });
  setContent(req.params.key, value);
  // Keep every Discord link on the site in sync with the branding block.
  if (req.params.key === 'branding' && typeof req.body.value?.discord_url === 'string') {
    const url = req.body.value.discord_url.trim();
    const footer = getContent('footer') || {};
    const contact = getContent('contact') || {};
    setContent('footer', { ...footer, discord_url: url });
    setContent('contact', { ...contact, discord: url });
  }
  res.json({ ok: true, content: getContent(req.params.key) });
});

/* ---------------- CONTACT MESSAGES ---------------- */
router.get('/messages', (req, res) => {
  res.json({ messages: db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all() });
});

router.patch('/messages/:id', (req, res) => {
  const msg = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });
  const statuses = ['new', 'read', 'archived'];
  db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?')
    .run(statuses.includes(req.body.status) ? req.body.status : msg.status, msg.id);
  res.json({ ok: true });
});

router.delete('/messages/:id', (req, res) => {
  db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- COUPONS ---------------- */
router.get('/coupons', (req, res) => {
  res.json({ coupons: db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all() });
});

router.post('/coupons', (req, res) => {
  const code = clean(req.body.code, 40).toUpperCase().replace(/\s+/g, '');
  if (code.length < 3) return res.status(400).json({ error: 'Coupon code must be at least 3 characters.' });
  const percent = Math.min(100, Math.max(0, parseInt(req.body.percent_off, 10) || 0));
  const amount = Math.max(0, parseMoneyToCents(req.body.amount_off || 0) || 0);
  if (!percent && !amount) return res.status(400).json({ error: 'Set a percentage or fixed amount discount.' });
  try {
    const info = db.prepare('INSERT INTO coupons (code, percent_off, amount_off_cents, is_active, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, percent, amount, req.body.is_active === false ? 0 : 1, parseInt(req.body.max_uses, 10) || 0, req.body.expires_at || null);
    res.status(201).json({ coupon: db.prepare('SELECT * FROM coupons WHERE id = ?').get(info.lastInsertRowid) });
  } catch {
    res.status(409).json({ error: 'That coupon code already exists.' });
  }
});

router.patch('/coupons/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Coupon not found.' });
  db.prepare('UPDATE coupons SET percent_off = ?, amount_off_cents = ?, is_active = ?, max_uses = ?, expires_at = ? WHERE id = ?').run(
    req.body.percent_off === undefined ? c.percent_off : Math.min(100, Math.max(0, parseInt(req.body.percent_off, 10) || 0)),
    req.body.amount_off_cents === undefined ? c.amount_off_cents : Math.max(0, parseInt(req.body.amount_off_cents, 10) || 0),
    req.body.is_active === undefined ? c.is_active : (req.body.is_active ? 1 : 0),
    req.body.max_uses === undefined ? c.max_uses : Math.max(0, parseInt(req.body.max_uses, 10) || 0),
    req.body.expires_at === undefined ? c.expires_at : (req.body.expires_at || null),
    c.id,
  );
  res.json({ ok: true });
});

router.delete('/coupons/:id', (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- TESTIMONIALS ---------------- */
router.get('/testimonials', (req, res) => {
  res.json({ testimonials: db.prepare('SELECT * FROM testimonials ORDER BY created_at DESC').all() });
});

router.post('/testimonials', (req, res) => {
  const name = clean(req.body.name, 80);
  const quote = clean(req.body.quote, 600);
  if (!name || !quote) return res.status(400).json({ error: 'Name and quote are required.' });
  const info = db.prepare('INSERT INTO testimonials (name, role, quote, rating, is_approved) VALUES (?, ?, ?, ?, ?)')
    .run(name, clean(req.body.role, 80), quote, Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 5)), req.body.is_approved ? 1 : 0);
  res.status(201).json({ testimonial: db.prepare('SELECT * FROM testimonials WHERE id = ?').get(info.lastInsertRowid) });
});

router.patch('/testimonials/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Testimonial not found.' });
  db.prepare('UPDATE testimonials SET name = ?, role = ?, quote = ?, rating = ?, is_approved = ? WHERE id = ?').run(
    req.body.name === undefined ? t.name : clean(req.body.name, 80),
    req.body.role === undefined ? t.role : clean(req.body.role, 80),
    req.body.quote === undefined ? t.quote : clean(req.body.quote, 600),
    req.body.rating === undefined ? t.rating : Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 5)),
    req.body.is_approved === undefined ? t.is_approved : (req.body.is_approved ? 1 : 0),
    t.id,
  );
  res.json({ ok: true });
});

router.delete('/testimonials/:id', (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------------- LOCATIONS & NODE STATUS ---------------- */
const LOCATION_STATUSES = ['operational', 'degraded', 'maintenance', 'offline'];

function validateLocation(body) {
  const name = clean(body.name, 80);
  if (!name) return { error: 'Location name is required.' };
  const status = LOCATION_STATUSES.includes(body.status) ? body.status : 'operational';
  const latency = parseInt(body.latency_ms, 10);
  const nodeUrl = clean(body.node_url, 300);
  if (nodeUrl && !/^https?:\/\//i.test(nodeUrl)) {
    return { error: 'Probe URL must start with http:// or https://' };
  }
  const ipAddress = clean(body.ip_address, 60);
  if (ipAddress && !/^(\d{1,3}\.){3}\d{1,3}$/.test(ipAddress)) {
    return { error: 'IP address must be a valid IPv4 address (e.g. 203.0.113.10).' };
  }
  const ipType = ['dedicated', 'shared', 'auto'].includes(body.ip_type) ? body.ip_type : 'shared';
  const interval = parseInt(body.check_interval_minutes, 10);
  const maintenanceUntil = normalizeMaintenance(body.maintenance_until);
  return {
    value: {
      name,
      region: clean(body.region, 60),
      country: clean(body.country, 60),
      flag: clean(body.flag, 8),
      status,
      latency_ms: Number.isFinite(latency) && latency >= 0 ? latency : 0,
      capacity: clean(body.capacity, 80),
      is_active: body.is_active === false || body.is_active === 0 ? 0 : 1,
      sort_order: parseInt(body.sort_order, 10) || 0,
      node_url: nodeUrl,
      ip_address: ipAddress,
      ip_type: ipType,
      cloudflare: body.cloudflare === true || body.cloudflare === 1 ? 1 : 0,
      check_enabled: body.check_enabled === false || body.check_enabled === 0 ? 0 : 1,
      check_interval_minutes: Number.isFinite(interval) && interval >= 1 ? interval : 5,
      maintenance_until: maintenanceUntil,
      maintenance_note: clean(body.maintenance_note, 200),
      status_note: clean(body.status_note, 200),
    },
  };
}

// Accepts an ISO string from <input type="datetime-local"> and stores UTC "YYYY-MM-DD HH:MM:SS".
function normalizeMaintenance(value) {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return '';
  return new Date(parsed).toISOString().slice(0, 19).replace('T', ' ');
}

router.get('/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations ORDER BY sort_order, name').all();
  res.json({ locations: rows.map(decorateLocation) });
});

router.post('/locations/:id/check', async (req, res) => {
  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found.' });
  try {
    const result = await checkLocation(loc);
    if (result.skipped) return res.status(400).json({ error: result.reason });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/locations/check-all', async (req, res) => {
  try {
    const results = await runDueChecks({ force: true });
    const rows = db.prepare('SELECT * FROM locations ORDER BY sort_order, name').all();
    res.json({ results, locations: rows.map(decorateLocation) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/locations/:id/checks', (req, res) => {
  const checks = db.prepare('SELECT * FROM location_checks WHERE location_id = ? ORDER BY id DESC LIMIT 50').all(req.params.id);
  res.json({ checks });
});

router.post('/locations', (req, res) => {
  const { error, value } = validateLocation(req.body);
  if (error) return res.status(400).json({ error });
  const info = db.prepare(`INSERT INTO locations (name, region, country, flag, status, latency_ms, capacity, is_active, sort_order,
      node_url, ip_address, ip_type, cloudflare, check_enabled, check_interval_minutes, maintenance_until, maintenance_note, status_note)
    VALUES (@name, @region, @country, @flag, @status, @latency_ms, @capacity, @is_active, @sort_order,
      @node_url, @ip_address, @ip_type, @cloudflare, @check_enabled, @check_interval_minutes, @maintenance_until, @maintenance_note, @status_note)`).run(value);
  res.status(201).json({ location: decorateLocation(db.prepare('SELECT * FROM locations WHERE id = ?').get(info.lastInsertRowid)) });
});

router.patch('/locations/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Location not found.' });
  const { error, value } = validateLocation({ ...existing, ...req.body });
  if (error) return res.status(400).json({ error });
  db.prepare(`UPDATE locations SET name=@name, region=@region, country=@country, flag=@flag, status=@status,
    latency_ms=@latency_ms, capacity=@capacity, is_active=@is_active, sort_order=@sort_order,
    node_url=@node_url, ip_address=@ip_address, ip_type=@ip_type, cloudflare=@cloudflare,
    check_enabled=@check_enabled, check_interval_minutes=@check_interval_minutes,
    maintenance_until=@maintenance_until, maintenance_note=@maintenance_note, status_note=@status_note,
    updated_at=datetime('now')
    WHERE id=@id`).run({ ...value, id: existing.id });
  res.json({ location: decorateLocation(db.prepare('SELECT * FROM locations WHERE id = ?').get(existing.id)) });
});

router.delete('/locations/:id', (req, res) => {
  const info = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Location not found.' });
  res.json({ ok: true });
});

export default router;
