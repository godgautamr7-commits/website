export function serializePlan(row) {
  if (!row) return null;
  let features = [];
  try { features = JSON.parse(row.features || '[]'); } catch { features = []; }
  return { ...row, features, is_active: !!row.is_active, is_popular: !!row.is_popular };
}

export function parseMoneyToCents(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100);
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.]/g, '');
    if (!cleaned) return NaN;
    return Math.round(parseFloat(cleaned) * 100);
  }
  return NaN;
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function clean(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
