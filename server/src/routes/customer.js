import { Router } from 'express';
import { db } from '../db.js';
import { authenticate } from '../auth.js';
import { serializePlan, clean, isEmail } from '../utils.js';

const router = Router();
router.use(authenticate);

const PAYMENT_PROVIDER = (process.env.PAYMENT_PROVIDER || 'manual').toLowerCase();

router.post('/orders', (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });
  if (items.length > 5) return res.status(400).json({ error: 'Maximum 5 different plans per order.' });

  const billingName = clean(req.body.billing_name, 100);
  const billingEmail = clean(req.body.billing_email, 120).toLowerCase();
  const billingAddress = clean(req.body.billing_address, 200);
  const notes = clean(req.body.notes, 500);
  if (!billingName) return res.status(400).json({ error: 'Billing name is required.' });
  if (!isEmail(billingEmail)) return res.status(400).json({ error: 'A valid billing email is required.' });

  let subtotal = 0;
  const prepared = [];
  for (const item of items) {
    const plan = db.prepare('SELECT * FROM plans WHERE id = ? AND is_active = 1').get(item.planId);
    if (!plan) return res.status(400).json({ error: 'One of the selected plans is no longer available.' });
    const qty = Math.min(5, Math.max(1, parseInt(item.quantity, 10) || 1));
    subtotal += plan.price_cents * qty;
    prepared.push({ plan, qty });
  }

  let discount = 0;
  let couponCode = '';
  const rawCode = clean(req.body.coupon_code, 40).toUpperCase();
  if (rawCode) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE upper(code) = ? AND is_active = 1').get(rawCode);
    if (!coupon) return res.status(400).json({ error: 'Coupon code is invalid.' });
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'Coupon has expired.' });
    if (coupon.max_uses > 0 && coupon.uses >= coupon.max_uses) return res.status(400).json({ error: 'Coupon usage limit reached.' });
    discount = Math.round(subtotal * (coupon.percent_off / 100)) + coupon.amount_off_cents;
    discount = Math.max(0, Math.min(discount, subtotal));
    couponCode = coupon.code;
    db.prepare('UPDATE coupons SET uses = uses + 1 WHERE id = ?').run(coupon.id);
  }

  const createOrder = db.prepare(`INSERT INTO orders
    (user_id, plan_id, plan_name, plan_snapshot, quantity, subtotal_cents, discount_cents, total_cents, coupon_code,
     status, payment_status, payment_method, billing_name, billing_email, billing_address, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?, ?, ?, ?)`);

  const ids = [];
  const tx = db.transaction(() => {
    for (const { plan, qty } of prepared) {
      const snapshot = { ...serializePlan(plan) };
      const info = createOrder.run(
        req.user.id, plan.id, plan.name, JSON.stringify(snapshot), qty,
        plan.price_cents * qty, 0, plan.price_cents * qty, couponCode,
        PAYMENT_PROVIDER, billingName, billingEmail, billingAddress, notes,
      );
      ids.push(info.lastInsertRowid);
    }
  });
  tx();

  const orders = db.prepare(`SELECT * FROM orders WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
  const total = orders.reduce((sum, o) => sum + o.total_cents, 0);
  res.status(201).json({
    orders,
    total_cents: total,
    payment: {
      provider: PAYMENT_PROVIDER,
      status: 'unpaid',
      instructions: PAYMENT_PROVIDER === 'manual'
        ? 'Your invoice has been created and is awaiting payment. A billing agent will contact you with payment details. Your order is not marked paid until payment is confirmed.'
        : 'A payment session would be created with the configured provider. No payment has been captured.',
    },
  });
});

router.get('/orders', (req, res) => {
  res.json({ orders: db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) });
});

router.get('/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order });
});

router.get('/servers', (req, res) => {
  res.json({ servers: db.prepare('SELECT * FROM servers WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) });
});

router.get('/subscriptions', (req, res) => {
  res.json({ subscriptions: db.prepare('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) });
});

router.get('/billing', (req, res) => {
  const rows = db.prepare(`SELECT id, plan_name, quantity, total_cents, payment_status, status, coupon_code, created_at
    FROM orders WHERE user_id = ? ORDER BY created_at DESC`).all(req.user.id);
  res.json({ invoices: rows });
});

router.get('/tickets', (req, res) => {
  const tickets = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC').all(req.user.id);
  res.json({ tickets });
});

router.get('/tickets/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  const messages = db.prepare('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
  res.json({ ticket, messages });
});

router.post('/tickets', (req, res) => {
  const subject = clean(req.body.subject, 140);
  const message = clean(req.body.message, 4000);
  const priority = ['low', 'normal', 'high'].includes(req.body.priority) ? req.body.priority : 'normal';
  if (subject.length < 4) return res.status(400).json({ error: 'Subject must be at least 4 characters.' });
  if (message.length < 10) return res.status(400).json({ error: 'Please describe your issue (10+ characters).' });
  const info = db.prepare('INSERT INTO tickets (user_id, subject, message, priority) VALUES (?, ?, ?, ?)')
    .run(req.user.id, subject, message, priority);
  db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, author_name, is_staff, body) VALUES (?, ?, ?, 0, ?)')
    .run(info.lastInsertRowid, req.user.id, req.user.username, message);
  res.status(201).json({ ticket: db.prepare('SELECT * FROM tickets WHERE id = ?').get(info.lastInsertRowid) });
});

router.post('/tickets/:id/messages', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  if (ticket.status === 'closed') return res.status(400).json({ error: 'This ticket is closed.' });
  const body = clean(req.body.body, 4000);
  if (body.length < 2) return res.status(400).json({ error: 'Message is too short.' });
  db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, author_name, is_staff, body) VALUES (?, ?, ?, 0, ?)')
    .run(ticket.id, req.user.id, req.user.username, body);
  db.prepare("UPDATE tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(ticket.id);
  res.status(201).json({ ok: true });
});

export default router;
