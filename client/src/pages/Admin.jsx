import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/icons';
import { Badge, ConfirmDialog, EmptyState, Field, Modal, Spinner, StatCard, StatusPill, useToast, TableSkeleton, StatCardSkeleton, PlanGridSkeleton, SkeletonLine, Skeleton, SkeletonText } from '../components/ui';
import { api } from '../lib/api';
import { useContent } from '../context/ContentContext';
import { useTheme } from '../context/themeContext';
import { DEFAULT_APPEARANCE, MOTIONS, normalizeAppearance } from '../lib/appearance';
import { money, dateShort, dateTime, titleCase } from '../lib/format';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: 'chart' },
  { key: 'plans', label: 'Hosting Plans', icon: 'layers' },
  { key: 'orders', label: 'Orders', icon: 'cart' },
  { key: 'servers', label: 'Servers', icon: 'server' },
  { key: 'customers', label: 'Customers', icon: 'user' },
  { key: 'tickets', label: 'Support Tickets', icon: 'ticket' },
  { key: 'inbox', label: 'Contact Inbox', icon: 'mail' },
  { key: 'announcements', label: 'Announcements', icon: 'sparkles' },
  { key: 'content', label: 'Homepage Content', icon: 'edit' },
  { key: 'branding', label: 'Branding & Links', icon: 'globe' },
  { key: 'appearance', label: 'Appearance', icon: 'sparkles' },
  { key: 'locations', label: 'Locations & Nodes', icon: 'globe' },
  { key: 'discord', label: 'Discord', icon: 'discord' },
  { key: 'coupons', label: 'Coupons', icon: 'bolt' },
  { key: 'testimonials', label: 'Testimonials', icon: 'star' },
];

const CATEGORIES = [
  { key: 'intel', label: 'Intel Hosting' },
  { key: 'amd', label: 'AMD Hosting' },
  { key: 'infinity', label: 'Infinity Servers' },
];

export default function Admin() {
  const { section = 'overview' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState({ orders: [], tickets: [] });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.stats);
      setRecent({ orders: res.recentOrders || [], tickets: res.recentTickets || [] });
    } catch (e) {
      toast.push(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return (
    <div className="container-x py-10 page-enter" aria-hidden="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0,1,2,3].map((i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[0,1].map((i) => (
          <div key={i} className="glass rounded-2xl p-6">
            <SkeletonLine width="40%" height={16} />
            <div className="mt-5 space-y-3">
              {[0,1,2].map((r) => (
                <div key={r} className="flex items-center gap-3 rounded-xl border border-white/5 p-3">
                  <Skeleton width={38} height={38} className="rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine width="45%" height={10} />
                    <SkeletonLine width="65%" height={9} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container-x py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 opacity-70 blur-[6px]" aria-hidden="true" />
            <img
              src="/admin-avatar.png"
              alt="Legacy Cloud administrator avatar"
              className="relative h-16 w-16 rounded-2xl border border-white/15 object-cover shadow-lg sm:h-20 sm:w-20"
            />
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink-950 bg-emerald-400" title="Online">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-900" />
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">Admin control room</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-white">Legacy Cloud Admin</h1>
            <p className="mt-1 text-sm text-slate-400">Every change here is written to the database and reflected on the live site.</p>
          </div>
        </div>
        <button onClick={loadStats} className="btn-ghost btn-sm self-start"><Icon name="refresh" size={16} /> Refresh stats</button>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="glass h-max rounded-2xl p-3">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {SECTIONS.map((s) => (
              <NavLink key={s.key} to={`/admin/${s.key}`} className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive ? 'sidebar-link-active' : ''}`}>
                <Icon name={s.icon} size={17} /> {s.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          {section === 'overview' && <Overview stats={stats} recent={recent} navigate={navigate} />}
          {section === 'plans' && <PlansManager toast={toast} onChanged={loadStats} />}
          {section === 'orders' && <OrdersManager toast={toast} onChanged={loadStats} />}
          {section === 'servers' && <ServersManager toast={toast} />}
          {section === 'customers' && <CustomersManager toast={toast} onChanged={loadStats} />}
          {section === 'tickets' && <TicketsManager toast={toast} onChanged={loadStats} />}
          {section === 'inbox' && <InboxManager toast={toast} />}
          {section === 'announcements' && <AnnouncementsManager toast={toast} />}
          {section === 'content' && <ContentManager toast={toast} />}
          {section === 'branding' && <BrandingManager toast={toast} />}
          {section === 'appearance' && <AppearanceManager toast={toast} />}
          {section === 'locations' && <LocationsManager toast={toast} />}
          {section === 'discord' && <DiscordManager toast={toast} />}
          {section === 'coupons' && <CouponsManager toast={toast} />}
          {section === 'testimonials' && <TestimonialsManager toast={toast} />}
        </section>
      </div>
    </div>
  );
}

/* ================= OVERVIEW ================= */
function Overview({ stats, recent, navigate }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={money(stats?.revenue || 0)} icon="billing" tone="text-emerald-300" sub="Paid invoices" />
        <StatCard label="Customers" value={stats?.customers || 0} icon="user" tone="text-cyan-300" sub="Registered accounts" />
        <StatCard label="Orders" value={stats?.orders || 0} icon="cart" tone="text-violet-300" sub={`${stats?.pendingOrders || 0} pending`} />
        <StatCard label="Open tickets" value={stats?.openTickets || 0} icon="ticket" tone="text-amber-300" sub={`${stats?.activeServers || 0} active servers`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <button onClick={() => navigate('/admin/orders')} className="text-xs font-semibold text-cyan-300 hover:underline">Manage</button>
          </div>
          <div className="mt-4 space-y-2">
            {recent.orders.length === 0 && <p className="text-sm text-slate-400">No orders yet.</p>}
            {recent.orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{o.plan_name}</p>
                  <p className="text-xs text-slate-500">@{o.username} · #{o.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={o.payment_status} />
                  <span className="text-sm font-semibold">{money(o.total_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent tickets</h2>
            <button onClick={() => navigate('/admin/tickets')} className="text-xs font-semibold text-cyan-300 hover:underline">Manage</button>
          </div>
          <div className="mt-4 space-y-2">
            {recent.tickets.length === 0 && <p className="text-sm text-slate-400">No tickets yet.</p>}
            {recent.tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                  <p className="text-xs text-slate-500">@{t.username} · #{t.id}</p>
                </div>
                <StatusPill status={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= PLANS ================= */
const emptyPlan = { category: 'intel', name: '', ram: '', cpu: '', storage: '', location: '', price: '', features: '', is_active: true, is_popular: false, sort_order: 0 };

function PlansManager({ toast, onChanged }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('intel');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyPlan);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.plans || []);
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...emptyPlan, category: cat }); setModal({ mode: 'create' }); };
  const openEdit = (plan) => {
    setForm({
      category: plan.category, name: plan.name, ram: plan.ram, cpu: plan.cpu, storage: plan.storage,
      location: plan.location, price: (plan.price_cents / 100).toFixed(2),
      features: (plan.features || []).join('\n'), is_active: plan.is_active, is_popular: !!plan.is_popular, sort_order: plan.sort_order || 0,
    });
    setModal({ mode: 'edit', plan });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
      price_cents: Math.round(parseFloat(form.price || '0') * 100),
      is_active: !!form.is_active,
      is_popular: !!form.is_popular,
    };
    try {
      if (modal.mode === 'create') await api.post('/admin/plans', payload);
      else await api.patch(`/admin/plans/${modal.plan.id}`, payload);
      toast.push('Plan saved. Public site updated instantly.', 'success');
      setModal(null);
      await load();
      onChanged?.();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    try {
      await api.del(`/admin/plans/${del.id}`);
      toast.push('Plan deleted.', 'success');
      setDel(null);
      await load();
      onChanged?.();
    } catch (e) { toast.push(e.message, 'error'); }
  };

  const filtered = plans.filter((p) => p.category === cat);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)} className={`chip ${cat === c.key ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40' : ''}`}>{c.label}</button>
          ))}
        </div>
        <button onClick={openCreate} className="btn-primary btn-sm"><Icon name="plus" size={16} /> Add plan</button>
      </div>

      {loading ? <PlanGridSkeleton count={6} /> : filtered.length === 0 ? (
        <EmptyState icon="layers" title="No plans in this category" description="Create your first plan to publish it on the public pricing page." action={<button onClick={openCreate} className="btn-primary btn-sm">Add plan</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-semibold text-white">{p.name}</h3>
                    {p.is_popular && <span className="badge-popular rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">Most Popular</span>}
                  </div>
                  <p className="text-xs text-slate-500">{p.ram} · {p.cpu}</p>
                </div>
                <Badge tone={p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}>{p.is_active ? 'Active' : 'Hidden'}</Badge>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-2xl font-bold text-white">{money(p.price_cents)}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="btn-ghost btn-sm"><Icon name="edit" size={15} /> Edit</button>
                  <button onClick={() => setDel(p)} className="btn-danger btn-sm"><Icon name="trash" size={15} /></button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{p.storage} · {p.location}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Create plan' : 'Edit plan'} wide footer={<>
        <button type="button" onClick={() => setModal(null)} className="btn-ghost btn-sm">Cancel</button>
        <button type="submit" form="plan-form" className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save plan'}</button>
      </>}>
        <form id="plan-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Plan name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="RAM"><input className="input" value={form.ram} onChange={(e) => setForm({ ...form, ram: e.target.value })} placeholder="8 GB" required /></Field>
          <Field label="CPU"><input className="input" value={form.cpu} onChange={(e) => setForm({ ...form, cpu: e.target.value })} placeholder="3 vCPU Xeon" required /></Field>
          <Field label="Storage"><input className="input" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} placeholder="60 GB NVMe" required /></Field>
          <Field label="Server location"><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ashburn, US" required /></Field>
          <Field label="Price (USD / month)"><input type="number" step="0.01" min="0" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></Field>
          <Field label="Sort order"><input type="number" className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <Field label="Features" hint="One feature per line.">
              <textarea className="input min-h-[110px]" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" />
              Visible on public website
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.is_popular} onChange={(e) => setForm({ ...form, is_popular: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-500" />
              Mark as <span className="font-semibold text-blue-300">Most Popular</span>
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} title="Delete plan" message={`Delete "${del?.name}"? Existing orders keep their snapshot.`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

/* ================= LOCATIONS & NODES ================= */
const NODE_STATUS = [
  { key: 'operational', label: 'Operational', dot: 'bg-emerald-400', tone: 'bg-emerald-500/15 text-emerald-300' },
  { key: 'degraded', label: 'Degraded', dot: 'bg-amber-400', tone: 'bg-amber-500/15 text-amber-300' },
  { key: 'maintenance', label: 'Maintenance', dot: 'bg-sky-400', tone: 'bg-sky-500/15 text-sky-300' },
  { key: 'offline', label: 'Offline', dot: 'bg-rose-500', tone: 'bg-rose-500/15 text-rose-300' },
];
const nodeMeta = (status) => NODE_STATUS.find((n) => n.key === status) || NODE_STATUS[0];
const emptyLocation = {
  name: '', region: '', country: '', flag: '', status: 'operational', latency_ms: 0, capacity: '',
  is_active: true, sort_order: 0, node_url: '', ip_address: '', ip_type: 'shared',
  cloudflare: false, check_enabled: true, check_interval_minutes: 5,
  maintenance_until: '', maintenance_note: '', status_note: '',
};

// Convert stored UTC "YYYY-MM-DD HH:MM:SS" to the value <input type="datetime-local"> expects.
function toLocalInput(value) {
  if (!value) return '';
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function remainingLabel(ms) {
  if (!ms || ms <= 0) return '';
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (days > 0) return `${days}d ${rem}h left`;
  const mins = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${mins}m left`;
}

function LocationsManager({ toast }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyLocation);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/locations');
      setLocations(res.locations || []);
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm({ ...emptyLocation, sort_order: locations.length + 1 }); setModal({ mode: 'create' }); };
  const openEdit = (loc) => {
    setForm({
      name: loc.name, region: loc.region, country: loc.country, flag: loc.flag, status: loc.status,
      latency_ms: loc.latency_ms, capacity: loc.capacity, is_active: !!loc.is_active, sort_order: loc.sort_order || 0,
      node_url: loc.node_url || '', ip_address: loc.ip_address || '', ip_type: loc.ip_type || 'shared',
      cloudflare: !!loc.cloudflare, check_enabled: !!loc.check_enabled,
      check_interval_minutes: loc.check_interval_minutes || 5,
      maintenance_until: toLocalInput(loc.maintenance_until),
      maintenance_note: loc.maintenance_note || '', status_note: loc.status_note || '',
    });
    setModal({ mode: 'edit', location: loc });
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      ...form,
      is_active: !!form.is_active,
      cloudflare: !!form.cloudflare,
      check_enabled: !!form.check_enabled,
      latency_ms: parseInt(form.latency_ms, 10) || 0,
      sort_order: parseInt(form.sort_order, 10) || 0,
      check_interval_minutes: parseInt(form.check_interval_minutes, 10) || 5,
    };
    try {
      if (modal.mode === 'create') await api.post('/admin/locations', payload);
      else await api.patch(`/admin/locations/${modal.location.id}`, payload);
      toast.push('Location saved. Dashboard & status page updated.', 'success');
      setModal(null);
      await load();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const quickPatch = async (loc, patch, message = 'Node status updated.') => {
    setSavingId(loc.id);
    try {
      const res = await api.patch(`/admin/locations/${loc.id}`, patch);
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? res.location : l)));
      toast.push(message, 'success');
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setSavingId(null); }
  };

  const runCheck = async (loc) => {
    setCheckingId(loc.id);
    try {
      const res = await api.post(`/admin/locations/${loc.id}/check`, {});
      setLocations((prev) => prev.map((l) => (l.id === loc.id ? res.location : l)));
      toast.push(
        res.ok ? `Node reachable — ${res.response_ms} ms` : `Node unreachable — ${res.detail}`,
        res.ok ? 'success' : 'error',
      );
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setCheckingId(null); }
  };

  const runAllChecks = async () => {
    setCheckingAll(true);
    try {
      const res = await api.post('/admin/locations/check-all', {});
      setLocations(res.locations || []);
      const up = (res.results || []).filter((r) => r.ok).length;
      toast.push(`Checked ${(res.results || []).length} nodes — ${up} up.`, 'success');
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setCheckingAll(false); }
  };

  const remove = async () => {
    try {
      await api.del(`/admin/locations/${del.id}`);
      toast.push('Location removed.', 'success');
      setDel(null);
      await load();
    } catch (e) { toast.push(e.message, 'error'); }
  };

  const online = locations.filter((l) => l.effective_status === 'operational').length;
  const issues = locations.filter((l) => l.effective_status !== 'operational' && l.is_active).length;
  const maint = locations.filter((l) => l.in_maintenance).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Locations &amp; Nodes</h2>
          <p className="text-sm text-slate-400">Custom locations, probe URLs, node type, uptime and maintenance windows.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAllChecks} disabled={checkingAll} className="btn-ghost btn-sm">
            {checkingAll ? <Spinner size={15} /> : <Icon name="refresh" size={15} />} Check all
          </button>
          <button onClick={openCreate} className="btn-primary btn-sm"><Icon name="plus" size={16} /> Add location</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Total nodes</p>
          <p className="mt-1 font-display text-2xl font-bold text-white">{locations.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Operational</p>
          <p className="mt-1 font-display text-2xl font-bold text-emerald-300">{online}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Needs attention</p>
          <p className={`mt-1 font-display text-2xl font-bold ${issues ? 'text-amber-300' : 'text-slate-300'}`}>{issues}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">In maintenance</p>
          <p className={`mt-1 font-display text-2xl font-bold ${maint ? 'text-sky-300' : 'text-slate-300'}`}>{maint}</p>
        </div>
      </div>

      {loading ? <TableSkeleton rows={4} cols={6} /> : locations.length === 0 ? (
        <EmptyState icon="globe" title="No locations yet" description="Add your first custom location so customers can see where their server runs." action={<button onClick={openCreate} className="btn-primary btn-sm">Add location</button>} />
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Node / IP</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uptime</th>
                  <th className="px-4 py-3">Last check</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {locations.map((loc) => {
                  const meta = nodeMeta(loc.effective_status);
                  return (
                    <tr key={loc.id} className="align-top hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{loc.flag || '\ud83c\udf10'}</span>
                          <div>
                            <p className="font-medium text-white">{loc.name}</p>
                            <p className="text-xs text-slate-500">{loc.region || '\u2014'}{loc.capacity ? ` \u00b7 ${loc.capacity}` : ''}</p>
                            {loc.in_maintenance && (
                              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                                <Icon name="clock" size={10} /> {remainingLabel(loc.maintenance_remaining_ms)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[190px] truncate text-xs text-slate-400" title={loc.node_url}>{loc.node_url || 'No probe URL'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[11px] text-slate-300">{loc.ip_address || 'no IP'}</span>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${loc.ip_type === 'dedicated' ? 'bg-violet-500/15 text-violet-300' : 'bg-white/10 text-slate-300'}`}>
                            {loc.ip_type === 'dedicated' ? 'Dedicated node' : 'Shared node'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                          <select
                            value={loc.status}
                            disabled={savingId === loc.id}
                            onChange={(e) => quickPatch(loc, { status: e.target.value })}
                            className="input h-8 w-32 py-0 text-xs"
                          >
                            {NODE_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                        {loc.effective_status !== loc.status && (
                          <p className={`mt-1 text-[10px] font-semibold ${meta.tone.split(' ')[1]}`}>live: {meta.label}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{loc.uptime_percent}%</p>
                        <div className="mt-1 flex h-4 items-stretch gap-[2px]">
                          {(Array.isArray(loc.uptime_bars) && loc.uptime_bars.length ? loc.uptime_bars : new Array(24).fill('none')).map((slot, i) => (
                            <span key={i} className={`flex-1 rounded-[1px] ${slot === 'down' ? 'bg-rose-500' : slot === 'up' ? 'bg-emerald-500' : 'bg-white/10'}`} />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300">{loc.last_checked_at ? dateTime(loc.last_checked_at) : 'Never'}</p>
                        <p className="text-[11px] text-slate-500">
                          {loc.last_check_status === 'up' ? `${loc.last_response_ms} ms` : loc.last_check_status === 'down' ? 'unreachable' : '\u2014'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => runCheck(loc)} disabled={checkingId === loc.id} className="btn-ghost btn-sm">
                            {checkingId === loc.id ? <Spinner size={14} /> : <Icon name="refresh" size={14} />} Check
                          </button>
                          <button onClick={() => openEdit(loc)} className="btn-ghost btn-sm"><Icon name="edit" size={15} /></button>
                          <button onClick={() => setDel(loc)} className="btn-danger btn-sm"><Icon name="trash" size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add location' : 'Edit location'} wide>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Location name" hint="Shown to customers, e.g. Ashburn, US">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ashburn, US" required />
          </Field>
          <Field label="Flag / emoji">
            <input className="input" value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} placeholder="\ud83c\uddfa\ud83c\uddf8" maxLength={8} />
          </Field>
          <Field label="Region">
            <input className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="North America" />
          </Field>
          <Field label="Country">
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="United States" />
          </Field>
          <Field label="Hardware / capacity" hint="e.g. Intel \u00b7 AMD">
            <input className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="Intel \u00b7 AMD" />
          </Field>
          <Field label="Sort order">
            <input type="number" className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </Field>

          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Node monitoring</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Probe URL" hint="HTTP(S) endpoint checked for health. localhost / 127.0.0.1 is detected as a local tunnel.">
                  <input className="input" value={form.node_url} onChange={(e) => setForm({ ...form, node_url: e.target.value })} placeholder="https://node.example.com/health" />
                </Field>
              </div>
              <Field label="IPv4 address" hint="Leave blank to auto-resolve from the probe URL.">
                <input className="input font-mono" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="203.0.113.10" />
              </Field>
              <Field label="Node type" hint="Shared = several nodes on one IP.">
                <select className="input" value={form.ip_type} onChange={(e) => setForm({ ...form, ip_type: e.target.value })}>
                  <option value="dedicated">Dedicated</option>
                  <option value="shared">Shared</option>
                  <option value="auto">Auto-detect</option>
                </select>
              </Field>
              <Field label="Check interval (minutes)">
                <input type="number" min="1" className="input" value={form.check_interval_minutes} onChange={(e) => setForm({ ...form, check_interval_minutes: e.target.value })} />
              </Field>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={form.check_enabled} onChange={(e) => setForm({ ...form, check_enabled: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" />
                  Enable automatic checks
                </label>
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Scheduled maintenance</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Maintenance until" hint="While this window is active the node shows as Maintenance everywhere.">
                <input type="datetime-local" className="input" value={form.maintenance_until} onChange={(e) => setForm({ ...form, maintenance_until: e.target.value })} />
              </Field>
              <Field label="Maintenance note">
                <input className="input" value={form.maintenance_note} onChange={(e) => setForm({ ...form, maintenance_note: e.target.value })} placeholder="RAM upgrade" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Public status note" hint="Optional message shown next to the node status.">
                  <input className="input" value={form.status_note} onChange={(e) => setForm({ ...form, status_note: e.target.value })} placeholder="Elevated latency from EU" />
                </Field>
              </div>
            </div>
          </div>

          <Field label="Base status" hint="Used when no maintenance window is active and the probe is healthy.">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {NODE_STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Latency (ms)" hint="Static fallback before the first probe.">
            <input type="number" min="0" className="input" value={form.latency_ms} onChange={(e) => setForm({ ...form, latency_ms: e.target.value })} placeholder="12" />
          </Field>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" />
              Show this location on the dashboard &amp; public status page
            </label>
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={() => setModal(null)} className="btn-ghost btn-sm">Cancel</button>
            <button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save location'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!del} title="Delete location" message={`Remove "${del?.name}"? It will disappear from the dashboard and status page.`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}


/* ================= ORDERS ================= */
function OrdersManager({ toast, onChanged }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/orders'); setOrders(res.orders || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const draftFor = (o) => drafts[o.id] || { payment_status: o.payment_status, status: o.status };
  const setDraft = (o, patch) => setDrafts((d) => ({ ...d, [o.id]: { ...draftFor(o), ...patch } }));
  const isDirty = (o) => {
    const d = drafts[o.id];
    return !!d && (d.payment_status !== o.payment_status || d.status !== o.status);
  };

  const update = async (order) => {
    const d = draftFor(order);
    setSavingId(order.id);
    try {
      const res = await api.patch(`/admin/orders/${order.id}`, d);
      toast.push(res.provisioned ? 'Order activated — server provisioned.' : 'Order saved.', 'success');
      setDrafts((prev) => { const next = { ...prev }; delete next[order.id]; return next; });
      await load();
      onChanged?.();
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setSavingId(null); }
  };

  const rows = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  if (loading) return <div className="page-enter"><TableSkeleton rows={5} cols={7} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {['all', 'pending', 'paid', 'provisioning', 'active', 'cancelled'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40' : ''}`}>{titleCase(f)}</button>
        ))}
      </div>

      {rows.length === 0 ? <EmptyState icon="cart" title="No orders" description="Orders placed at checkout appear here." /> : (
        <div className="table-wrap">
          <table className="table-base">
            <thead><tr><th>#</th><th>Customer</th><th>Plan</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="font-mono text-xs text-slate-400">{o.id}</td>
                  <td>
                    <p className="font-medium text-white">@{o.username}</p>
                    <p className="text-xs text-slate-500">{o.email}</p>
                  </td>
                  <td>{o.plan_name}<span className="block text-xs text-slate-500">qty {o.quantity}</span></td>
                  <td className="font-semibold">{money(o.total_cents)}</td>
                  <td>
                    <select className="input !py-1.5 text-xs" value={draftFor(o).payment_status} onChange={(e) => setDraft(o, { payment_status: e.target.value })}>
                      {['unpaid', 'pending', 'paid', 'refunded'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                    </select>
                  </td>
                  <td>
                    <select className="input !py-1.5 text-xs" value={draftFor(o).status} onChange={(e) => setDraft(o, { status: e.target.value })}>
                      {['pending', 'paid', 'provisioning', 'active', 'cancelled'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                    </select>
                  </td>
                  <td className="text-xs text-slate-400">{dateShort(o.created_at)}</td>
                  <td>
                    <button onClick={() => update(o)} disabled={!isDirty(o) || savingId === o.id}
                      className={`btn-sm ${isDirty(o) ? 'btn-primary' : 'btn-ghost opacity-50'}`}>
                      {savingId === o.id ? <Spinner size={14} /> : <><Icon name="check" size={14} /> Save</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ================= SERVERS ================= */
function ServersManager({ toast }) {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/servers'); setServers(res.servers || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const draftFor = (s) => drafts[s.id] || { name: s.name, ip: s.ip, status: s.status };
  const setDraft = (s, patch) => setDrafts((d) => ({ ...d, [s.id]: { ...draftFor(s), ...patch } }));
  const isDirty = (s) => {
    const d = drafts[s.id];
    return !!d && (d.name !== s.name || d.ip !== s.ip || d.status !== s.status);
  };

  const update = async (s) => {
    setSavingId(s.id);
    try {
      await api.patch(`/admin/servers/${s.id}`, draftFor(s));
      toast.push('Server saved.', 'success');
      setDrafts((prev) => { const next = { ...prev }; delete next[s.id]; return next; });
      await load();
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setSavingId(null); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={5} cols={6} /></div>;
  if (!servers.length) return <EmptyState icon="server" title="No servers provisioned" description="Set an order status to Active to automatically provision a server." />;

  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead><tr><th>#</th><th>Name</th><th>Customer</th><th>IP</th><th>Location</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {servers.map((s) => (
            <tr key={s.id}>
              <td className="font-mono text-xs text-slate-400">{s.id}</td>
              <td>
                <input className="input !py-1.5 text-xs" value={draftFor(s).name} onChange={(e) => setDraft(s, { name: e.target.value })} />
                <span className="mt-1 block text-xs text-slate-500">{s.plan_name}</span>
              </td>
              <td>@{s.username}</td>
              <td><input className="input !py-1.5 text-xs font-mono" value={draftFor(s).ip} onChange={(e) => setDraft(s, { ip: e.target.value })} /></td>
              <td className="text-xs text-slate-400">{s.location || '—'}</td>
              <td>
                <select className="input !py-1.5 text-xs" value={draftFor(s).status} onChange={(e) => setDraft(s, { status: e.target.value })}>
                  {['provisioning', 'active', 'suspended', 'terminated'].map((x) => <option key={x} value={x}>{titleCase(x)}</option>)}
                </select>
              </td>
              <td>
                <button onClick={() => update(s)} disabled={!isDirty(s) || savingId === s.id}
                  className={`btn-sm ${isDirty(s) ? 'btn-primary' : 'btn-ghost opacity-50'}`}>
                  {savingId === s.id ? <Spinner size={14} /> : <><Icon name="check" size={14} /> Save</>}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================= CUSTOMERS ================= */
function CustomersManager({ toast, onChanged }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/users'); setUsers(res.users || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const draftFor = (u) => drafts[u.id] || { role: u.role, is_active: !!u.is_active };
  const setDraft = (u, patch) => setDrafts((d) => ({ ...d, [u.id]: { ...draftFor(u), ...patch } }));
  const isDirty = (u) => {
    const d = drafts[u.id];
    return !!d && (d.role !== u.role || d.is_active !== !!u.is_active);
  };

  const update = async (u) => {
    setSavingId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, draftFor(u));
      toast.push('Customer saved.', 'success');
      setDrafts((prev) => { const next = { ...prev }; delete next[u.id]; return next; });
      await load();
      onChanged?.();
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setSavingId(null); }
  };

  const remove = async () => {
    try { await api.del(`/admin/users/${del.id}`); toast.push('Customer deleted.', 'success'); setDel(null); await load(); onChanged?.(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={5} cols={6} /></div>;

  return (
    <div className="space-y-4">
      <div className="table-wrap">
        <table className="table-base">
          <thead><tr><th>User</th><th>Role</th><th>Orders</th><th>Servers</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <p className="font-medium text-white">@{u.username}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </td>
                <td>
                  <select className="input !py-1.5 text-xs" value={draftFor(u).role} onChange={(e) => setDraft(u, { role: e.target.value })}>
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u.order_count}</td>
                <td>{u.server_count}</td>
                <td>
                  <button onClick={() => setDraft(u, { is_active: !draftFor(u).is_active })} className={`badge ${draftFor(u).is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
                    {draftFor(u).is_active ? 'Active' : 'Suspended'}
                  </button>
                </td>
                <td className="text-xs text-slate-400">{dateShort(u.created_at)}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => update(u)} disabled={!isDirty(u) || savingId === u.id}
                      className={`btn-sm ${isDirty(u) ? 'btn-primary' : 'btn-ghost opacity-50'}`}>
                      {savingId === u.id ? <Spinner size={14} /> : <><Icon name="check" size={14} /> Save</>}
                    </button>
                    <button onClick={() => setDel(u)} className="btn-danger btn-sm"><Icon name="trash" size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!del} title="Delete customer" message={`Permanently delete @${del?.username} and all their data?`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

/* ================= TICKETS ================= */
function TicketsManager({ toast, onChanged }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState({ ticket: null, messages: [] });
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusDrafts, setStatusDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/tickets'); setTickets(res.tickets || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!active) return;
    api.get(`/admin/tickets/${active}`).then((res) => setThread({ ticket: res.ticket, messages: res.messages || [] })).catch((e) => toast.push(e.message, 'error'));
  }, [active, toast]);

  const send = async (e) => {
    e.preventDefault();
    if (reply.trim().length < 2) return;
    setBusy(true);
    try {
      await api.post(`/admin/tickets/${active}/messages`, { body: reply.trim() });
      const res = await api.get(`/admin/tickets/${active}`);
      setThread({ ticket: res.ticket, messages: res.messages || [] });
      setReply('');
      await load();
      onChanged?.();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const setStatus = async (id) => {
    const status = statusDrafts[id];
    if (!status) return;
    setSavingId(id);
    try {
      await api.patch(`/admin/tickets/${id}`, { status });
      toast.push('Ticket status saved.', 'success');
      setStatusDrafts((prev) => { const next = { ...prev }; delete next[id]; return next; });
      await load();
      onChanged?.();
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setSavingId(null); }
  };

  const statusFor = (t) => statusDrafts[t.id] || t.status;

  if (loading) return <div className="page-enter"><TableSkeleton rows={4} cols={4} /></div>;

  return (
    <div className="space-y-3">
      {tickets.length === 0 && <EmptyState icon="ticket" title="No tickets" description="Customer tickets will appear here." />}
      {tickets.map((t) => (
        <div key={t.id} className="glass flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => setActive(t.id)} className="min-w-0 text-left">
            <p className="truncate text-sm font-medium text-white">{t.subject}</p>
            <p className="text-xs text-slate-500">@{t.username} · #{t.id} · {titleCase(t.priority)} · {dateShort(t.updated_at)}</p>
          </button>
          <div className="flex items-center gap-2">
            <StatusPill status={t.status} />
            <select className="input !py-1.5 text-xs" value={statusFor(t)} onChange={(e) => setStatusDrafts((d) => ({ ...d, [t.id]: e.target.value }))}>
              {['open', 'answered', 'closed'].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
            <button onClick={() => setStatus(t.id)} disabled={statusFor(t) === t.status || savingId === t.id}
              className={`btn-sm ${statusFor(t) !== t.status ? 'btn-primary' : 'btn-ghost opacity-50'}`}>
              {savingId === t.id ? <Spinner size={14} /> : <><Icon name="check" size={14} /> Save</>}
            </button>
            <button onClick={() => setActive(t.id)} className="btn-ghost btn-sm">Open</button>
          </div>
        </div>
      ))}

      <Modal open={!!active} onClose={() => setActive(null)} title={thread.ticket ? `#${thread.ticket.id} · ${thread.ticket.subject}` : 'Ticket'} wide>
        <div className="space-y-4">
          {thread.ticket && <div className="flex items-center gap-2 text-xs text-slate-400"><StatusPill status={thread.ticket.status} /><span>@{thread.ticket.username} · {thread.ticket.email}</span></div>}
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {thread.messages.map((m) => (
              <div key={m.id} className={`rounded-xl border px-4 py-3 text-sm ${m.is_staff ? 'border-cyan-400/25 bg-cyan-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{m.author_name}{m.is_staff ? ' · Staff' : ''}</span>
                  <span>{dateTime(m.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-slate-200">{m.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="space-y-2">
            <textarea className="input min-h-[90px]" placeholder="Reply as staff…" value={reply} onChange={(e) => setReply(e.target.value)} />
            <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Send reply'}</button></div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

/* ================= CONTACT INBOX ================= */
function InboxManager({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/messages'); setItems(res.messages || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (m, status) => {
    try { await api.patch(`/admin/messages/${m.id}`, { status }); await load(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  const remove = async () => {
    try { await api.del(`/admin/messages/${del.id}`); toast.push('Message deleted.', 'success'); setDel(null); await load(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={4} cols={5} /></div>;
  if (!items.length) return <EmptyState icon="mail" title="Inbox is empty" description="Messages sent from the public contact form land here." />;

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <div key={m.id} className="glass rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium text-white">{m.subject}</p>
              <p className="text-xs text-slate-500">{m.name} · {m.email} · {dateTime(m.created_at)}</p>
            </div>
            <Badge tone={m.status === 'new' ? 'bg-cyan-500/15 text-cyan-300' : m.status === 'archived' ? 'bg-slate-500/15 text-slate-300' : 'bg-emerald-500/15 text-emerald-300'}>{titleCase(m.status)}</Badge>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{m.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="btn-ghost btn-sm"><Icon name="mail" size={14} /> Reply by email</a>
            {m.status !== 'read' && <button onClick={() => setStatus(m, 'read')} className="btn-ghost btn-sm">Mark read</button>}
            {m.status !== 'archived' && <button onClick={() => setStatus(m, 'archived')} className="btn-ghost btn-sm">Archive</button>}
            <button onClick={() => setDel(m)} className="btn-danger btn-sm"><Icon name="trash" size={14} /></button>
          </div>
        </div>
      ))}
      <ConfirmDialog open={!!del} title="Delete message" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

/* ================= ANNOUNCEMENTS ================= */
const emptyAnn = { title: '', body: '', type: 'info', is_active: true };

function AnnouncementsManager({ toast }) {
  const { refresh } = useContent();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyAnn);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/announcements'); setItems(res.announcements || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal.mode === 'create') await api.post('/admin/announcements', form);
      else await api.patch(`/admin/announcements/${modal.item.id}`, form);
      toast.push('Announcement saved.', 'success');
      setModal(null); await load(); await refresh();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const toggle = async (item) => {
    try { await api.patch(`/admin/announcements/${item.id}`, { is_active: !item.is_active }); await load(); await refresh(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  const remove = async () => {
    try { await api.del(`/admin/announcements/${del.id}`); toast.push('Deleted.', 'success'); setDel(null); await load(); await refresh(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={4} cols={5} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => { setForm(emptyAnn); setModal({ mode: 'create' }); }} className="btn-primary btn-sm"><Icon name="plus" size={16} /> New announcement</button></div>
      {items.length === 0 ? <EmptyState icon="sparkles" title="No announcements" description="Publish a notice to show it on the homepage." /> : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="glass rounded-xl px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{a.body}</p>
                </div>
                <Badge tone={a.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}>{a.is_active ? 'Live' : 'Hidden'}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setForm({ title: a.title, body: a.body, type: a.type, is_active: !!a.is_active }); setModal({ mode: 'edit', item: a }); }} className="btn-ghost btn-sm"><Icon name="edit" size={14} /> Edit</button>
                <button onClick={() => toggle(a)} className="btn-ghost btn-sm">{a.is_active ? 'Hide' : 'Publish'}</button>
                <button onClick={() => setDel(a)} className="btn-danger btn-sm"><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'New announcement' : 'Edit announcement'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Body"><textarea className="input min-h-[100px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
          <Field label="Type">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" /> Publish immediately</label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="btn-ghost btn-sm">Cancel</button><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete announcement" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

/* ================= CONTENT ================= */
const CONTENT_BLOCKS = [
  { key: 'hero', label: 'Hero section' },
  { key: 'why_choose', label: 'Why choose us' },
  { key: 'features', label: 'Features' },
  { key: 'faq', label: 'FAQ' },
  { key: 'promo', label: 'Promo bar' },
  { key: 'branding', label: 'Branding & links' },
  { key: 'footer', label: 'Footer & links' },
  { key: 'contact', label: 'Contact info' },
];

function ContentManager({ toast }) {
  const [content, setContent] = useState(null);
  const [active, setActive] = useState('hero');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/content');
      setContent(res.content || {});
    } catch (e) { toast.push(e.message, 'error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (content) setText(JSON.stringify(content[active] ?? {}, null, 2)); }, [content, active]);

  const save = async () => {
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return toast.push('Invalid JSON — fix the syntax before saving.', 'error'); }
    setBusy(true);
    try {
      await api.put(`/admin/content/${active}`, { value: parsed });
      toast.push('Homepage content updated. Reload the site to see it.', 'success');
      await load();
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setBusy(false); }
  };

  if (!content) return <div className="page-enter space-y-4" aria-hidden="true">
        <SkeletonLine width={220} height={20} />
        <div className="glass rounded-2xl p-6 space-y-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine width={110} height={9} />
              <Skeleton height={44} className="rounded-xl" />
            </div>
          ))}
          <Skeleton height={44} width={160} className="rounded-xl" />
        </div>
      </div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CONTENT_BLOCKS.map((b) => (
          <button key={b.key} onClick={() => setActive(b.key)} className={`chip ${active === b.key ? 'bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40' : ''}`}>{b.label}</button>
        ))}
      </div>
      <div className="glass rounded-2xl p-4">
        <p className="mb-2 text-xs text-slate-400">Edit the JSON for <span className="font-mono text-cyan-300">{active}</span>. Changes publish immediately across the public site.</p>
        <textarea className="input min-h-[420px] font-mono text-xs leading-relaxed" value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={() => setText(JSON.stringify(content[active] ?? {}, null, 2))} className="btn-ghost btn-sm">Reset</button>
          <button onClick={save} className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Publish changes'}</button>
        </div>
      </div>
    </div>
  );
}

/* ================= DISCORD ================= */
function DiscordManager({ toast }) {
  const { refresh } = useContent();
  const [branding, setBranding] = useState(null);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/content');
      const b = { logo_url: '', logo_alt: 'Legacy Cloud logo', brand_name: 'LEGACY CLOUD', discord_url: '', ...(res.content?.branding || {}) };
      setBranding(b);
      setUrl(b.discord_url || '');
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed && !/^https?:\/\/.+\..+/i.test(trimmed)) {
      toast.push('Enter a full URL starting with https:// (e.g. https://discord.gg/your-invite).', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/content/branding', { value: { ...branding, discord_url: trimmed } });
      await refresh();
      setBranding((b) => ({ ...b, discord_url: trimmed }));
      toast.push('Discord server URL saved across the live site.', 'success');
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-enter space-y-4" aria-hidden="true">
        <SkeletonLine width={220} height={20} />
        <div className="glass rounded-2xl p-6 space-y-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine width={110} height={9} />
              <Skeleton height={44} className="rounded-xl" />
            </div>
          ))}
          <Skeleton height={44} width={160} className="rounded-xl" />
        </div>
      </div>;

  const places = [
    { icon: 'home', label: 'Site footer', desc: 'Discord social icon + "Discord community" link' },
    { icon: 'headset', label: 'Support page', desc: 'Discord community card on /contact' },
    { icon: 'user', label: 'Customer dashboard', desc: 'Join Discord banner + sidebar shortcut' },
  ];

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon name="discord" size={18} /></span>
          <div>
            <h2 className="font-display text-lg font-semibold">Discord server</h2>
            <p className="text-xs text-slate-400">Set the Discord invite link used everywhere on the website.</p>
          </div>
        </div>

        <div className="mt-5">
          <Field label="Discord server URL" hint="Example: https://discord.gg/your-invite-code">
            <div className="flex items-center gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon name="discord" size={18} /></span>
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.gg/your-invite" autoFocus />
            </div>
          </Field>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {url.trim() && (
              <a href={url.trim()} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                <Icon name="external" size={15} /> Test link
              </a>
            )}
            {branding?.discord_url && (
              <button type="button" onClick={() => setUrl(branding.discord_url)} className="btn-ghost btn-sm">Reset</button>
            )}
            {url.trim() && (
              <button type="button" onClick={() => setUrl('')} className="btn-ghost btn-sm">
                <Icon name="trash" size={15} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Where this link appears</h3>
        <div className="mt-3 space-y-2">
          {places.map((p) => (
            <div key={p.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-cyan-300"><Icon name={p.icon} size={16} /></span>
              <div>
                <p className="text-sm font-medium text-white">{p.label}</p>
                <p className="text-xs text-slate-500">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Tip: you can also edit this link under Branding &amp; Links together with the logo.</p>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={load} className="btn-ghost btn-sm">Discard changes</button>
        <button className="btn-primary btn-sm" disabled={saving}>{saving ? <Spinner size={16} /> : 'Save Discord URL'}</button>
      </div>
    </form>
  );
}

/* ================= APPEARANCE (theme, background, hero motion) ================= */
function ColorField({ label, hint, value, onChange }) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value || '');
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input type="color" value={valid ? value : '#ff5a0a'} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1" aria-label={label} />
        <input className="input" value={value || ''} onChange={(e) => onChange(e.target.value.trim())} placeholder="Theme default" maxLength={7} />
        {value && <button type="button" onClick={() => onChange('')} className="btn-ghost btn-sm">Reset</button>}
      </div>
    </Field>
  );
}

function Slider({ label, hint, value, min = 0, max = 100, unit = '', onChange }) {
  return (
    <Field label={`${label} — ${value}${unit}`} hint={hint}>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-violet-500" aria-label={label} />
    </Field>
  );
}

function AppearanceManager({ toast }) {
  const { refresh } = useContent();
  const { themes, backgrounds, previewAppearance } = useTheme();
  const [form, setForm] = useState(null);
  const [brand, setBrand] = useState({ brand: '', chip: '' });
  const [base, setBase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/admin/content');
      const c = res.content || {};
      const a = normalizeAppearance(c.appearance || DEFAULT_APPEARANCE);
      setForm(a);
      setBase({ branding: c.branding || {}, hero: c.hero || {} });
      setBrand({ brand: (c.branding?.brand_name || 'LEGACY CLOUD'), chip: (c.hero?.eyebrow || '') });
    } catch (e) { toast.push(e.message, 'error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  // Every change is previewed live on the real site behind this page.
  useEffect(() => { if (form) previewAppearance(form); }, [form, previewAppearance]);
  useEffect(() => () => previewAppearance(null), [previewAppearance]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) { toast.push('Please choose a PNG, JPG, WEBP, GIF or SVG image.', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.push('Image must be smaller than 2 MB.', 'error'); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const res = await api.post('/admin/upload', { dataUrl });
      set({ bg_image_url: res.url });
      toast.push('Picture uploaded — it is already showing behind this page. Click Save to publish.', 'success');
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/content/appearance', { value: form });
      const name = brand.brand.trim() || 'LEGACY CLOUD';
      if (name !== (base.branding.brand_name || 'LEGACY CLOUD')) {
        await api.put('/admin/content/branding', { value: { ...base.branding, brand_name: name } });
      }
      if (brand.chip.trim() !== (base.hero.eyebrow || '')) {
        await api.put('/admin/content/hero', { value: { ...base.hero, eyebrow: brand.chip.trim() } });
      }
      await refresh();
      previewAppearance(null);
      await load();
      toast.push('Appearance saved. Every visitor now sees it.', 'success');
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setSaving(false); }
  };

  const discard = async () => { await load(); toast.push('Changes discarded.', 'info'); };

  if (!form) return <div className="page-enter space-y-4" aria-hidden="true"><SkeletonLine width={220} height={20} /><Skeleton height={260} className="rounded-2xl" /></div>;

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon name="sparkles" size={18} /></span>
          <div>
            <h2 className="font-display text-lg font-semibold">Look &amp; feel</h2>
            <p className="text-xs text-slate-400">Changes preview live on the website behind this page. Visitors keep their own pick if they chose one in the theme button.</p>
          </div>
        </div>
        <p className="ts-label">Default theme</p>
        <div className="ts-opts grid gap-1 sm:grid-cols-2" role="radiogroup" aria-label="Default theme">
          {themes.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={form.default_theme === t.id} className="ts-opt" onClick={() => set({ default_theme: t.id })}>
              <span className="ts-thumb" data-t={t.id} aria-hidden="true"><i /><i /><i /></span>
              <span><span className="ts-name">{t.name}</span><span className="ts-note">{t.note}</span></span>
            </button>
          ))}
        </div>
        <p className="ts-label">Default background</p>
        <div className="ts-seg max-w-md" role="radiogroup" aria-label="Default background">
          {backgrounds.map((b) => (
            <button key={b.id} type="button" role="radio" aria-checked={form.default_bg === b.id} onClick={() => set({ default_bg: b.id })}>{b.label}</button>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="h-4 w-4 accent-violet-500" checked={form.visitor_switcher} onChange={(e) => set({ visitor_switcher: e.target.checked })} />
          Let visitors change the theme (shows the palette button on the site)
        </label>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Background &amp; colours</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ColorField label="Page background colour" hint="Leave empty to use the theme's own background." value={form.page_bg_color} onChange={(v) => set({ page_bg_color: v })} />
          <ColorField label="Accent colour" hint="Buttons, links, highlights and the hero glow." value={form.accent_color} onChange={(v) => set({ accent_color: v })} />
        </div>
        <div className="mt-5 border-t border-white/10 pt-5">
          <Field label="Background picture" hint="PNG, JPG, WEBP, GIF or SVG, up to 2 MB. It sits behind everything.">
            <div className="flex flex-wrap items-center gap-3">
              {form.bg_image_url && <img src={form.bg_image_url} alt="" className="h-14 w-24 rounded-lg border border-white/10 object-cover" />}
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={onFile} className="hidden" />
              <button type="button" className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? <Spinner size={16} /> : form.bg_image_url ? 'Replace picture' : 'Upload picture'}</button>
              {form.bg_image_url && <button type="button" className="btn-ghost btn-sm" onClick={() => set({ bg_image_url: '' })}><Icon name="trash" size={15} /> Remove</button>}
            </div>
          </Field>
          {form.bg_image_url && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Slider label="Picture visibility" value={form.bg_image_opacity} unit="%" onChange={(v) => set({ bg_image_opacity: v })} />
              <Slider label="Picture blur" value={form.bg_image_blur} max={24} unit="px" onChange={(v) => set({ bg_image_blur: v })} />
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Hero motion</h3>
        <p className="text-xs text-slate-400">Animated background behind the top of the homepage that reacts to the mouse.</p>
        <div className="ts-opts mt-3 grid gap-1 sm:grid-cols-3" role="radiogroup" aria-label="Hero motion">
          {MOTIONS.map((m) => (
            <button key={m.id} type="button" role="radio" aria-checked={form.hero_motion === m.id} className="ts-opt" onClick={() => set({ hero_motion: m.id })}>
              <span><span className="ts-name">{m.label}</span><span className="ts-note">{m.note}</span></span>
            </button>
          ))}
        </div>
        {form.hero_motion !== 'off' && (
          <div className="mt-4 max-w-md"><Slider label="Motion strength" value={form.motion_intensity} unit="%" onChange={(v) => set({ motion_intensity: v })} /></div>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Name &amp; small label</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" hint="Shown in the top-left logo (when no logo image is uploaded)."><input className="input" value={brand.brand} onChange={(e) => setBrand((b) => ({ ...b, brand: e.target.value }))} maxLength={40} /></Field>
          <Field label="Small label above the headline" hint="The little glowing pill on the homepage hero."><input className="input" value={brand.chip} onChange={(e) => setBrand((b) => ({ ...b, chip: e.target.value }))} maxLength={60} /></Field>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={discard} className="btn-ghost btn-sm">Discard changes</button>
        <button className="btn-primary btn-sm" disabled={saving}>{saving ? <Spinner size={16} /> : 'Save appearance'}</button>
      </div>
    </form>
  );
}

/* ================= BRANDING & LINKS ================= */
const emptyBranding = { logo_url: '', logo_alt: 'Legacy Cloud logo', brand_name: 'LEGACY CLOUD', discord_url: '' };

function BrandingManager({ toast }) {
  const { refresh } = useContent();
  const [form, setForm] = useState(emptyBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/content');
      setForm({ ...emptyBranding, ...(res.content?.branding || {}) });
    } catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) {
      toast.push('Please choose a PNG, JPG, WEBP, GIF or SVG image.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.push('Logo must be smaller than 2 MB.', 'error');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that file.'));
        reader.readAsDataURL(file);
      });
      const res = await api.post('/admin/upload', { dataUrl });
      set({ logo_url: res.url });
      toast.push('Logo uploaded. Click "Save branding" to publish it.', 'success');
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const discord = (form.discord_url || '').trim();
    if (discord && !/^https?:\/\/.+\..+/i.test(discord)) {
      toast.push('Enter a full Discord URL starting with https:// (e.g. https://discord.gg/your-invite).', 'error');
      return;
    }
    setSaving(true);
    try {
      const value = { ...form, brand_name: (form.brand_name || '').trim() || 'LEGACY CLOUD', logo_alt: (form.logo_alt || '').trim(), logo_url: (form.logo_url || '').trim(), discord_url: discord };
      await api.put('/admin/content/branding', { value });
      setForm(value);
      await refresh();
      toast.push('Branding and links updated across the live site.', 'success');
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-enter space-y-4" aria-hidden="true">
        <SkeletonLine width={220} height={20} />
        <div className="glass rounded-2xl p-6 space-y-4">
          {[0,1,2,3].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonLine width={110} height={9} />
              <Skeleton height={44} className="rounded-xl" />
            </div>
          ))}
          <Skeleton height={44} width={160} className="rounded-xl" />
        </div>
      </div>;

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><Icon name="globe" size={18} /></span>
          <div>
            <h2 className="font-display text-lg font-semibold">Branding & links</h2>
            <p className="text-xs text-slate-400">Manage the site logo and the Discord invite shown across the website.</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Site logo</h3>
        <p className="mt-1 text-xs text-slate-400">Upload an image (PNG, JPG, WEBP, GIF or SVG, max 2 MB) or paste a hosted image URL. Leave empty to use the built-in Legacy Cloud wordmark.</p>

        <div className="mt-4 grid gap-5 md:grid-cols-[200px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt={form.logo_alt || 'Logo preview'} className="max-h-20 w-auto max-w-full object-contain" />
            ) : (
              <div className="text-center text-xs text-slate-500">
                <Icon name="layers" size={26} className="mx-auto mb-2 text-slate-600" />
                Built-in wordmark
              </div>
            )}
            <span className="mt-3 text-[11px] uppercase tracking-wider text-slate-500">Preview</span>
          </div>

          <div className="space-y-4">
            <Field label="Upload logo">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={onFile}
                className="block w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-violet-200 hover:file:bg-violet-500/30" />
            </Field>
            {uploading && <p className="flex items-center gap-2 text-xs text-cyan-300"><Spinner size={14} /> Uploading logo…</p>}
            <Field label="Logo image URL" hint="A relative path like /uploads/logo.png or a full https:// URL.">
              <input className="input" value={form.logo_url} onChange={(e) => set({ logo_url: e.target.value })} placeholder="/uploads/logo.png or https://…" />
            </Field>
            <div className="flex flex-wrap gap-2">
              {form.logo_url && (
                <button type="button" onClick={() => set({ logo_url: '' })} className="btn-ghost btn-sm">
                  <Icon name="trash" size={15} /> Remove logo
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" hint="Shown when no logo image is set.">
            <input className="input" value={form.brand_name} onChange={(e) => set({ brand_name: e.target.value })} placeholder="LEGACY CLOUD" />
          </Field>
          <Field label="Logo alt text" hint="Describes the image for screen readers and SEO.">
            <input className="input" value={form.logo_alt} onChange={(e) => set({ logo_alt: e.target.value })} placeholder="Legacy Cloud logo" />
          </Field>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold">Discord server</h3>
        <p className="mt-1 text-xs text-slate-400">This invite link is used by the footer social icons, the Support page and the Discord community links.</p>
        <div className="mt-4">
          <Field label="Discord server URL" hint="Example: https://discord.gg/your-invite-code">
            <div className="flex items-center gap-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon name="discord" size={18} /></span>
              <input className="input" value={form.discord_url} onChange={(e) => set({ discord_url: e.target.value })} placeholder="https://discord.gg/your-invite" />
            </div>
          </Field>
          {form.discord_url && (
            <a href={form.discord_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline">
              <Icon name="external" size={13} /> Test Discord link
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={load} className="btn-ghost btn-sm">Reset</button>
        <button className="btn-primary btn-sm" disabled={saving}>{saving ? <Spinner size={16} /> : 'Save branding'}</button>
      </div>
    </form>
  );
}

/* ================= COUPONS ================= */
const emptyCoupon = { code: '', percent_off: 10, amount_off: '', max_uses: 0, expires_at: '', is_active: true };

function CouponsManager({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyCoupon);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/coupons'); setItems(res.coupons || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      code: form.code,
      percent_off: parseInt(form.percent_off, 10) || 0,
      amount_off: parseFloat(form.amount_off || '0') || 0,
      max_uses: parseInt(form.max_uses, 10) || 0,
      expires_at: form.expires_at || null,
      is_active: !!form.is_active,
    };
    try {
      if (modal.mode === 'create') await api.post('/admin/coupons', payload);
      else await api.patch(`/admin/coupons/${modal.item.id}`, { ...payload, amount_off_cents: Math.round(payload.amount_off * 100) });
      toast.push('Coupon saved.', 'success');
      setModal(null); await load();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    try { await api.del(`/admin/coupons/${del.id}`); toast.push('Coupon deleted.', 'success'); setDel(null); await load(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={4} cols={5} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => { setForm(emptyCoupon); setModal({ mode: 'create' }); }} className="btn-primary btn-sm"><Icon name="plus" size={16} /> New coupon</button></div>
      {items.length === 0 ? <EmptyState icon="bolt" title="No coupons" description="Create a discount code to use at checkout." /> : (
        <div className="table-wrap">
          <table className="table-base">
            <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono font-semibold text-cyan-300">{c.code}</td>
                  <td>{c.percent_off ? `${c.percent_off}%` : ''}{c.percent_off && c.amount_off_cents ? ' + ' : ''}{c.amount_off_cents ? money(c.amount_off_cents) : ''}</td>
                  <td>{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td className="text-xs text-slate-400">{c.expires_at ? dateShort(c.expires_at) : 'Never'}</td>
                  <td><Badge tone={c.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-slate-300'}>{c.is_active ? 'Active' : 'Off'}</Badge></td>
                  <td className="flex gap-2">
                    <button onClick={() => { setForm({ code: c.code, percent_off: c.percent_off, amount_off: c.amount_off_cents ? (c.amount_off_cents / 100).toFixed(2) : '', max_uses: c.max_uses, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '', is_active: !!c.is_active }); setModal({ mode: 'edit', item: c }); }} className="btn-ghost btn-sm"><Icon name="edit" size={14} /></button>
                    <button onClick={() => setDel(c)} className="btn-danger btn-sm"><Icon name="trash" size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'New coupon' : 'Edit coupon'}>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Code"><input className="input font-mono uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required disabled={modal?.mode === 'edit'} /></Field>
          <Field label="Percent off"><input type="number" min="0" max="100" className="input" value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: e.target.value })} /></Field>
          <Field label="Fixed amount off (USD)"><input type="number" step="0.01" min="0" className="input" value={form.amount_off} onChange={(e) => setForm({ ...form, amount_off: e.target.value })} /></Field>
          <Field label="Max uses" hint="0 = unlimited"><input type="number" min="0" className="input" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></Field>
          <Field label="Expires on"><input type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" /> Active</label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setModal(null)} className="btn-ghost btn-sm">Cancel</button><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save coupon'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete coupon" message={`Delete code ${del?.code}?`} confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}

/* ================= TESTIMONIALS ================= */
const emptyTesti = { name: '', role: '', quote: '', rating: 5, is_approved: false };

function TestimonialsManager({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyTesti);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/admin/testimonials'); setItems(res.testimonials || []); }
    catch (e) { toast.push(e.message, 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (modal.mode === 'create') await api.post('/admin/testimonials', form);
      else await api.patch(`/admin/testimonials/${modal.item.id}`, form);
      toast.push('Testimonial saved.', 'success');
      setModal(null); await load();
    } catch (err) { toast.push(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const toggle = async (t) => {
    try { await api.patch(`/admin/testimonials/${t.id}`, { is_approved: !t.is_approved }); await load(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  const remove = async () => {
    try { await api.del(`/admin/testimonials/${del.id}`); toast.push('Deleted.', 'success'); setDel(null); await load(); }
    catch (e) { toast.push(e.message, 'error'); }
  };

  if (loading) return <div className="page-enter"><TableSkeleton rows={4} cols={5} /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Only approved reviews appear publicly. Never publish invented reviews.</p>
        <button onClick={() => { setForm(emptyTesti); setModal({ mode: 'create' }); }} className="btn-primary btn-sm"><Icon name="plus" size={16} /> Add review</button>
      </div>
      {items.length === 0 ? <EmptyState icon="star" title="No testimonials" description="Add real customer feedback and approve it to display it." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((t) => (
            <div key={t.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-semibold text-white">{t.name}</p><p className="text-xs text-slate-500">{t.role || 'Customer'}</p></div>
                <Badge tone={t.is_approved ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}>{t.is_approved ? 'Published' : 'Pending'}</Badge>
              </div>
              <p className="mt-3 text-sm text-slate-300">“{t.quote}”</p>
              <p className="mt-2 text-amber-300">{'★'.repeat(t.rating)}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => { setForm({ name: t.name, role: t.role, quote: t.quote, rating: t.rating, is_approved: !!t.is_approved }); setModal({ mode: 'edit', item: t }); }} className="btn-ghost btn-sm"><Icon name="edit" size={14} /> Edit</button>
                <button onClick={() => toggle(t)} className="btn-ghost btn-sm">{t.is_approved ? 'Unpublish' : 'Approve'}</button>
                <button onClick={() => setDel(t)} className="btn-danger btn-sm"><Icon name="trash" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'create' ? 'Add testimonial' : 'Edit testimonial'}>
        <form onSubmit={save} className="space-y-4">
          <Field label="Customer name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Role / server"><input className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Owner, Skyblock SMP" /></Field>
          <Field label="Quote"><textarea className="input min-h-[100px]" value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} required /></Field>
          <Field label="Rating (1-5)"><input type="number" min="1" max="5" className="input" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={form.is_approved} onChange={(e) => setForm({ ...form, is_approved: e.target.checked })} className="h-4 w-4 rounded border-white/20 bg-white/5" /> Publish on homepage</label>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="btn-ghost btn-sm">Cancel</button><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save'}</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!del} title="Delete testimonial" message="This cannot be undone." confirmLabel="Delete" danger onConfirm={remove} onClose={() => setDel(null)} />
    </div>
  );
}
