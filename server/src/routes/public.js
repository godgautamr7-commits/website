import { Router } from 'express';
import { db, getContent } from '../db.js';
import { serializePlan, clean } from '../utils.js';
import { decorateLocation } from '../monitor.js';

const router = Router();

router.get('/plans', (req, res) => {
  const category = clean(req.query.category, 20).toLowerCase();
  const q = clean(req.query.q, 80).toLowerCase();
  let sql = 'SELECT * FROM plans WHERE is_active = 1';
  const params = [];
  if (['intel', 'amd', 'infinity'].includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (q) {
    sql += ' AND (lower(name) LIKE ? OR lower(ram) LIKE ? OR lower(cpu) LIKE ? OR lower(storage) LIKE ? OR lower(location) LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like, like, like, like);
  }
  sql += ' ORDER BY category, sort_order, price_cents';
  res.json({ plans: db.prepare(sql).all(...params).map(serializePlan) });
});

router.get('/plans/:id', (req, res) => {
  const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found.' });
  res.json({ plan: serializePlan(plan) });
});

router.get('/stats', (req, res) => {
  const customers = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").get().c;
  const servers = db.prepare("SELECT COUNT(*) AS c FROM servers WHERE status IN ('active','provisioning')").get().c;
  const plans = db.prepare('SELECT COUNT(*) AS c FROM plans WHERE is_active = 1').get().c;
  const orders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE payment_status = 'paid'").get().c;
  res.json({ stats: { customers, servers, plans, orders } });
});

router.get('/home', (req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 5').all();
  const testimonials = db.prepare('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC LIMIT 9').all();
  res.json({
    branding: getContent('branding'),
    appearance: getContent('appearance'),
    hero: getContent('hero'),
    why_choose: getContent('why_choose'),
    features: getContent('features'),
    faq: getContent('faq'),
    promo: getContent('promo'),
    footer: getContent('footer'),
    contact: getContent('contact'),
    announcements,
    testimonials,
  });
});

router.get('/locations', (req, res) => {
  const rows = db.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY sort_order, name').all();
  const locations = rows.map(decorateLocation);
  const count = (s) => locations.filter((l) => l.effective_status === s).length;
  const summary = {
    total: locations.length,
    operational: count('operational'),
    degraded: count('degraded'),
    maintenance: count('maintenance'),
    offline: count('offline'),
  };
  summary.all_operational = summary.total > 0 && summary.operational === summary.total;
  res.json({ locations, summary });
});

router.get('/announcements', (req, res) => {
  res.json({ announcements: db.prepare('SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC').all() });
});

router.get('/testimonials', (req, res) => {
  res.json({ testimonials: db.prepare('SELECT * FROM testimonials WHERE is_approved = 1 ORDER BY created_at DESC').all() });
});

router.post('/coupons/validate', (req, res) => {
  const code = clean(req.body.code, 40).toUpperCase();
  const subtotal = Number(req.body.subtotal_cents) || 0;
  if (!code) return res.status(400).json({ error: 'Enter a coupon code.' });
  const coupon = db.prepare('SELECT * FROM coupons WHERE upper(code) = ? AND is_active = 1').get(code);
  if (!coupon) return res.status(404).json({ error: 'That coupon is not valid.' });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ error: 'That coupon has expired.' });
  }
  if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) {
    return res.status(400).json({ error: 'That coupon has reached its usage limit.' });
  }
  let discount = Math.round(subtotal * (coupon.percent_off / 100)) + coupon.amount_off_cents;
  discount = Math.max(0, Math.min(discount, subtotal));
  res.json({ coupon: { code: coupon.code, percent_off: coupon.percent_off, amount_off_cents: coupon.amount_off_cents }, discount_cents: discount });
});

router.post('/contact', (req, res) => {
  const name = clean(req.body.name, 80);
  const email = clean(req.body.email, 120).toLowerCase();
  const subject = clean(req.body.subject, 140);
  const message = clean(req.body.message, 4000);
  if (!name) return res.status(400).json({ error: 'Your name is required.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (subject.length < 3) return res.status(400).json({ error: 'Subject must be at least 3 characters.' });
  if (message.length < 10) return res.status(400).json({ error: 'Message must be at least 10 characters.' });
  db.prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(name, email, subject, message);
  res.status(201).json({ ok: true, message: 'Message received. Our team will reply by email.' });
});

export default router;
