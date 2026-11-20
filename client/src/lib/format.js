export function money(cents, { withCents = true } = {}) {
  const value = (Number(cents) || 0) / 100;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  });
}

export function dateShort(value) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function dateTime(value) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const statusTone = {
  active: 'bg-emerald-500/15 text-emerald-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  answered: 'bg-cyan-500/15 text-cyan-300',
  provisioning: 'bg-amber-500/15 text-amber-300',
  pending: 'bg-amber-500/15 text-amber-300',
  unpaid: 'bg-amber-500/15 text-amber-300',
  open: 'bg-violet-500/15 text-violet-300',
  suspended: 'bg-rose-500/15 text-rose-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  terminated: 'bg-rose-500/15 text-rose-300',
  refunded: 'bg-slate-500/20 text-slate-300',
  closed: 'bg-slate-500/20 text-slate-300',
  low: 'bg-slate-500/20 text-slate-300',
  normal: 'bg-cyan-500/15 text-cyan-300',
  high: 'bg-rose-500/15 text-rose-300',
};

export function titleCase(value = '') {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
