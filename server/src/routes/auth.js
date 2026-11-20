import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, publicUser, authenticate } from '../auth.js';
import { isEmail, clean } from '../utils.js';

const router = Router();

router.post('/register', (req, res) => {
  const username = clean(req.body.username, 32);
  const email = clean(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–32 characters (letters, numbers, . _ -).' });
  }
  if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (req.body.accepted_terms !== true) {
    return res.status(400).json({ error: 'You must agree to the Terms of Service and Privacy Policy to create an account.' });
  }

  const exists = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?) OR lower(email) = lower(?)').get(username, email);
  if (exists) return res.status(409).json({ error: 'An account with that username or email already exists.' });

  const hash = bcrypt.hashSync(password, 12);
  const info = db.prepare("INSERT INTO users (username, email, password_hash, role, full_name, terms_accepted_at) VALUES (?, ?, ?, ?, ?, datetime('now'))")
    .run(username, email, hash, 'customer', clean(req.body.full_name, 80));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const identifier = clean(req.body.username || req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!identifier || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?').get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  if (user.is_active === 0) {
    return res.status(403).json({ error: 'This account has been suspended. Contact support.' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.patch('/me', authenticate, (req, res) => {
  const fullName = clean(req.body.full_name, 80);
  const discord = clean(req.body.discord, 80);
  const company = clean(req.body.company, 80);
  const email = clean(req.body.email, 120).toLowerCase();

  if (email && !isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (email) {
    const taken = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(email, req.user.id);
    if (taken) return res.status(409).json({ error: 'That email is already in use.' });
  }

  db.prepare('UPDATE users SET full_name = ?, discord = ?, company = ?, email = COALESCE(NULLIF(?, \'\'), email) WHERE id = ?')
    .run(fullName, discord, company, email, req.user.id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(user) });
});

router.post('/change-password', authenticate, (req, res) => {
  const current = typeof req.body.current_password === 'string' ? req.body.current_password : '';
  const next = typeof req.body.new_password === 'string' ? req.body.new_password : '';
  if (!bcrypt.compareSync(current, req.user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 12), req.user.id);
  res.json({ ok: true });
});

export default router;
