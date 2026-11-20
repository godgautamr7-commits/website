import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/icons';
import { Badge, EmptyState, Field, Modal, PageLoader, Spinner, StatCard, StatusPill, useToast, DashboardSkeleton, ThreadSkeleton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useContent } from '../context/ContentContext';
import { api } from '../lib/api';
import { money, dateShort, dateTime, titleCase } from '../lib/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'servers', label: 'My Servers', icon: 'server' },
  { key: 'orders', label: 'My Orders', icon: 'layers' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'refresh' },
  { key: 'billing', label: 'Billing History', icon: 'billing' },
  { key: 'support', label: 'Support Tickets', icon: 'ticket' },
  { key: 'profile', label: 'Profile Settings', icon: 'user' },
];

const SERVER_TONE = { running: 'bg-emerald-500/15 text-emerald-300', provisioning: 'bg-amber-500/15 text-amber-300', suspended: 'bg-rose-500/15 text-rose-300', stopped: 'bg-slate-500/15 text-slate-300' };

export default function Dashboard() {
  const { tab = 'overview' } = useParams();
  const navigate = useNavigate();
  const { user, refresh: refreshAuth } = useAuth();
  const toast = useToast();
  const { data: content } = useContent();
  const discordUrl = content?.branding?.discord_url || content?.contact?.discord || 'https://discord.gg/';

  const [data, setData] = useState({ orders: [], servers: [], subscriptions: [], invoices: [], tickets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [orders, servers, subs, billing, tickets, nodes] = await Promise.all([
        api.get('/account/orders'),
        api.get('/account/servers'),
        api.get('/account/subscriptions'),
        api.get('/account/billing'),
        api.get('/account/tickets'),
        api.get('/locations').catch(() => ({ locations: [], summary: null })),
      ]);
      setData({
        orders: orders.orders || [],
        servers: servers.servers || [],
        subscriptions: subs.subscriptions || [],
        invoices: billing.invoices || [],
        tickets: tickets.tickets || [],
        locations: nodes.locations || [],
        nodeSummary: nodes.summary || null,
      });
    } catch (e) {
      setError(e.message || 'Could not load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const activeServers = data.servers.filter((s) => s.status === 'running').length;
    const openTickets = data.tickets.filter((t) => t.status !== 'closed').length;
    const due = data.orders.filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled').reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const activeSubs = data.subscriptions.filter((s) => s.status === 'active').length;
    return { activeServers, openTickets, due, activeSubs };
  }, [data]);

  if (loading) return <div className="container-x py-10"><DashboardSkeleton /></div>;

  return (
    <div className="container-x py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Customer area</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">Welcome back, {user?.full_name || user?.username}</h1>
          <p className="mt-1 text-sm text-slate-400">Manage your servers, invoices and support in one place.</p>
        </div>
        <Link to="/plans" className="btn-primary btn-sm self-start sm:self-auto"><Icon name="plus" size={16} /> Deploy a server</Link>
      </div>

      {error && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <span>{error}</span>
          <button onClick={load} className="btn-ghost btn-sm">Retry</button>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="glass h-max rounded-2xl p-3">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar lg:flex-col">
            {TABS.map((t) => (
              <NavLink
                key={t.key}
                to={`/dashboard/${t.key}`}
                className={({ isActive }) => `sidebar-link whitespace-nowrap ${isActive || (tab === 'overview' && t.key === 'overview') ? 'sidebar-link-active' : ''}`}
              >
                <Icon name={t.icon} size={17} /> {t.label}
              </NavLink>
            ))}
          </nav>
          <a
            href={discordUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2.5 text-sm font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/15"
          >
            <Icon name="discord" size={17} /> Join our Discord
          </a>
        </aside>

        <section className="min-w-0">
          {tab === 'overview' && (
            <Overview data={data} stats={stats} navigate={navigate} discordUrl={discordUrl} />
          )}
          {tab === 'servers' && <Servers servers={data.servers} />}
          {tab === 'orders' && <Orders orders={data.orders} />}
          {tab === 'subscriptions' && <Subscriptions subscriptions={data.subscriptions} />}
          {tab === 'billing' && <Billing invoices={data.invoices} />}
          {tab === 'support' && <Support tickets={data.tickets} reload={load} toast={toast} />}
          {tab === 'profile' && <Profile user={user} refreshAuth={refreshAuth} toast={toast} />}
        </section>
      </div>
    </div>
  );
}

/* ---------------- Node status ---------------- */
const NODE_META = {
  operational: { label: 'Operational', dot: 'bg-emerald-400', text: 'text-emerald-300', ring: 'ring-emerald-400/30' },
  degraded: { label: 'Degraded', dot: 'bg-amber-400', text: 'text-amber-300', ring: 'ring-amber-400/30' },
  maintenance: { label: 'Maintenance', dot: 'bg-sky-400', text: 'text-sky-300', ring: 'ring-sky-400/30' },
  offline: { label: 'Offline', dot: 'bg-rose-500', text: 'text-rose-300', ring: 'ring-rose-400/30' },
};
const nodeMeta = (s) => NODE_META[s] || NODE_META.operational;

const ONLINE_LABEL = { operational: 'Online', degraded: 'Degraded', maintenance: 'Maintenance', offline: 'Offline' };

function UptimeBar({ bars, tone }) {
  const slots = Array.isArray(bars) && bars.length ? bars : new Array(48).fill('none');
  return (
    <div className="mt-4 flex h-8 items-stretch gap-[3px]">
      {slots.map((slot, i) => (
        <span
          key={i}
          title={slot === 'down' ? 'Downtime' : slot === 'up' ? 'Online' : 'No data'}
          className={`flex-1 rounded-[2px] ${
            slot === 'down' ? 'bg-rose-500' : slot === 'up' ? tone : 'bg-white/[0.07]'
          }`}
        />
      ))}
    </div>
  );
}

function NodeStatus({ locations, summary }) {
  if (!locations || locations.length === 0) return null;
  const statusOf = (l) => l.effective_status || l.status;
  const allGood = summary?.all_operational ?? locations.every((l) => statusOf(l) === 'operational');
  const issues = locations.filter((l) => statusOf(l) !== 'operational').length;
  const maint = locations.filter((l) => l.in_maintenance).length;
  return (
    <div className="glass card-premium rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-lg bg-white/[0.05] ${allGood ? 'text-emerald-300' : 'text-amber-300'}`}>
            <Icon name="globe" size={17} />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Network & node status</h2>
            <p className="text-xs text-slate-400">
              Live health of every Legacy Cloud location.
              {maint > 0 && <span className="text-sky-300"> {maint} in scheduled maintenance.</span>}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${allGood ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30' : 'bg-amber-500/10 text-amber-300 ring-amber-400/30'}`}>
          <span className={`h-2 w-2 rounded-full ${allGood ? 'bg-emerald-400 animate-glow-pulse' : 'bg-amber-400'}`} />
          {allGood ? 'All systems operational' : `${issues} node${issues === 1 ? ' needs' : 's need'} attention`}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {locations.map((loc) => {
          const status = statusOf(loc);
          const meta = nodeMeta(status);
          const uptime = typeof loc.uptime_percent === 'number' ? loc.uptime_percent : 100;
          const region = loc.region || loc.country || 'Global';
          const nodeType = loc.ip_type === 'dedicated' ? 'Dedicated node' : 'Shared node';
          const count = loc.node_servers || 0;
          return (
            <div key={loc.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate font-display text-[15px] font-semibold text-white">
                  {loc.name.replace(/,\s*/, ' ')} network
                </h3>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${meta.text} ${meta.ring} bg-white/[0.03]`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {ONLINE_LABEL[status] || meta.label}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                {count > 0 ? `Carries all ${count} ${region} nodes` : `Ready for ${region} deployments`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Main line &mdash; {loc.last_response_ms > 0 ? `${loc.last_response_ms} ms` : '—'} to DDoS protection
                <span className="text-slate-600"> &middot; {nodeType}</span>
              </p>

              <UptimeBar bars={loc.uptime_bars} tone="bg-emerald-500" />

              <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>24h ago</span>
                <span className={uptime >= 99 ? 'text-emerald-400' : uptime >= 95 ? 'text-amber-400' : 'text-rose-400'}>
                  {uptime.toFixed(uptime === 100 ? 0 : 1)}% uptime
                </span>
                <span>Now</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function Overview({ data, stats, navigate, discordUrl }) {
  const recentOrders = data.orders.slice(0, 4);
  const recentTickets = data.tickets.slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active servers" value={stats.activeServers} icon="server" tone="text-cyan-300" sub={`${data.servers.length} total`} />
        <StatCard label="Open tickets" value={stats.openTickets} icon="ticket" tone="text-violet-300" sub={`${data.tickets.length} total`} />
        <StatCard label="Amount due" value={money(stats.due)} icon="billing" tone="text-amber-300" sub="Unpaid invoices" />
        <StatCard label="Subscriptions" value={stats.activeSubs} icon="refresh" tone="text-emerald-300" sub="Active plans" />
      </div>

      <NodeStatus locations={data.locations} summary={data.nodeSummary} />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <button onClick={() => navigate('/dashboard/orders')} className="text-xs font-semibold text-cyan-300 hover:underline">View all</button>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders.length === 0 && <EmptyState icon="layers" title="No orders yet" description="Pick a plan to get your first server online." action={<Link to="/plans" className="btn-primary btn-sm">Browse plans</Link>} />}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{o.plan_name}</p>
                  <p className="text-xs text-slate-500">#{o.id} · {dateShort(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={o.payment_status} />
                  <span className="text-sm font-semibold text-white">{money(o.total_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Support snapshot</h2>
            <button onClick={() => navigate('/dashboard/support')} className="text-xs font-semibold text-cyan-300 hover:underline">Open support</button>
          </div>
          <div className="mt-4 space-y-3">
            {recentTickets.length === 0 && <EmptyState icon="ticket" title="No tickets" description="Need a hand? Our engineers reply fast." action={<Link to="/dashboard/support" className="btn-ghost btn-sm">Create ticket</Link>} />}
            {recentTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                  <p className="text-xs text-slate-500">#{t.id} · {dateShort(t.updated_at)}</p>
                </div>
                <StatusPill status={t.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your servers</h2>
          <button onClick={() => navigate('/dashboard/servers')} className="text-xs font-semibold text-cyan-300 hover:underline">Manage</button>
        </div>
        {data.servers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No servers provisioned yet. Once an order is marked active by our team, your server appears here.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.servers.slice(0, 4).map((s) => (
              <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-white">{s.name}</p>
                  <StatusPill status={s.status} toneMap={SERVER_TONE} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{s.plan_name} · {s.location || 'Location pending'}</p>
                <p className="mt-2 font-mono text-xs text-cyan-300">{s.ip}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-violet-400/25 bg-gradient-to-r from-violet-600/20 via-ink-900 to-cyan-500/15 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-[70px]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/30">
              <Icon name="discord" size={22} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Join the Legacy Cloud Discord</h2>
              <p className="mt-1 max-w-lg text-sm text-slate-300">Chat with our engineers, get setup help, migration tips and community events — the fastest way to reach support.</p>
            </div>
          </div>
          <a href={discordUrl} target="_blank" rel="noreferrer" className="btn-primary shrink-0 self-start sm:self-auto">
            <Icon name="discord" size={17} /> Join Discord
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Servers ---------------- */
function Servers({ servers }) {
  if (!servers.length) {
    return <EmptyState icon="server" title="No servers yet" description="Your deployed servers will show up here with their IP address and status." action={<Link to="/plans" className="btn-primary btn-sm">Deploy a server</Link>} />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {servers.map((s) => (
        <div key={s.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-white">{s.name}</h3>
              <p className="text-xs text-slate-500">{s.plan_name}</p>
            </div>
            <StatusPill status={s.status} toneMap={SERVER_TONE} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">IP address</dt><dd className="font-mono text-cyan-300">{s.ip}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Location</dt><dd className="text-slate-200">{s.location || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-200">{dateShort(s.created_at)}</dd></div>
          </dl>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Orders ---------------- */
function Orders({ orders }) {
  if (!orders.length) {
    return <EmptyState icon="layers" title="No orders yet" description="Your order history will appear here after your first checkout." action={<Link to="/plans" className="btn-primary btn-sm">Browse plans</Link>} />;
  }
  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead><tr><th>Order</th><th>Plan</th><th>Qty</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="font-mono text-xs text-slate-400">#{o.id}</td>
              <td className="font-medium text-white">{o.plan_name}</td>
              <td>{o.quantity}</td>
              <td className="font-semibold text-white">{money(o.total_cents)}</td>
              <td><StatusPill status={o.payment_status} /></td>
              <td><StatusPill status={o.status} /></td>
              <td className="text-xs text-slate-400">{dateShort(o.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Subscriptions ---------------- */
function Subscriptions({ subscriptions }) {
  if (!subscriptions.length) {
    return <EmptyState icon="refresh" title="No active subscriptions" description="Subscriptions are created automatically when an order is activated." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {subscriptions.map((s) => (
        <div key={s.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-white">{s.plan_name}</h3>
            <StatusPill status={s.status} />
          </div>
          <p className="mt-3 font-display text-2xl font-bold text-white">{money(s.price_cents)}<span className="text-sm font-normal text-slate-500">/mo</span></p>
          <p className="mt-2 text-xs text-slate-500">Renews {s.renews_at ? dateShort(s.renews_at) : '—'}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Billing ---------------- */
function Billing({ invoices }) {
  if (!invoices.length) {
    return <EmptyState icon="billing" title="No billing history" description="Invoices appear here once you place an order." />;
  }
  return (
    <div className="table-wrap">
      <table className="table-base">
        <thead><tr><th>Invoice</th><th>Plan</th><th>Amount</th><th>Coupon</th><th>Payment</th><th>Date</th></tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td className="font-mono text-xs text-slate-400">INV-{String(i.id).padStart(5, '0')}</td>
              <td className="font-medium text-white">{i.plan_name}</td>
              <td className="font-semibold text-white">{money(i.total_cents)}</td>
              <td className="text-xs text-slate-400">{i.coupon_code || '—'}</td>
              <td><StatusPill status={i.payment_status} /></td>
              <td className="text-xs text-slate-400">{dateShort(i.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Support ---------------- */
function Support({ tickets, reload, toast }) {
  const [creating, setCreating] = useState(false);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ subject: '', priority: 'normal', message: '' });
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/account/tickets', form);
      toast.push('Ticket created. Our team will reply soon.', 'success');
      setCreating(false);
      setForm({ subject: '', priority: 'normal', message: '' });
      await reload();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Support tickets</h2>
        <button onClick={() => setCreating(true)} className="btn-primary btn-sm"><Icon name="plus" size={16} /> New ticket</button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon="ticket" title="No tickets yet" description="Open a ticket and a real engineer will help you out." action={<button onClick={() => setCreating(true)} className="btn-ghost btn-sm">Create ticket</button>} />
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className="glass flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:ring-1 hover:ring-violet-400/40">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                <p className="text-xs text-slate-500">#{t.id} · {titleCase(t.priority)} priority · updated {dateShort(t.updated_at)}</p>
              </div>
              <StatusPill status={t.status} />
            </button>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Open a support ticket">
        <form onSubmit={create} className="space-y-4">
          <Field label="Subject">
            <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Server won't start after update" required minLength={4} />
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Describe the issue" hint="Include your server name and any error messages.">
            <textarea className="input min-h-[120px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={10} />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="btn-ghost btn-sm">Cancel</button>
            <button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Create ticket'}</button>
          </div>
        </form>
      </Modal>

      <TicketThread ticketId={active} onClose={() => setActive(null)} reload={reload} toast={toast} />
    </div>
  );
}

function TicketThread({ ticketId, onClose, reload, toast }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    let alive = true;
    setLoading(true);
    api.get(`/account/tickets/${ticketId}`)
      .then((res) => { if (alive) { setTicket(res.ticket); setMessages(res.messages || []); } })
      .catch((e) => toast.push(e.message, 'error'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [ticketId, toast]);

  const send = async (e) => {
    e.preventDefault();
    if (reply.trim().length < 2) return;
    setBusy(true);
    try {
      await api.post(`/account/tickets/${ticketId}/messages`, { body: reply.trim() });
      setReply('');
      const res = await api.get(`/account/tickets/${ticketId}`);
      setTicket(res.ticket);
      setMessages(res.messages || []);
      await reload();
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!ticketId} onClose={onClose} title={ticket ? `#${ticket.id} · ${ticket.subject}` : 'Ticket'} wide>
      {loading ? <ThreadSkeleton /> : (
        <div className="space-y-4">
          {ticket && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <StatusPill status={ticket.status} />
              <Badge>{titleCase(ticket.priority)} priority</Badge>
              <span>opened {dateTime(ticket.created_at)}</span>
            </div>
          )}
          <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((m) => (
              <div key={m.id} className={`rounded-xl border px-4 py-3 text-sm ${m.is_staff ? 'border-cyan-400/25 bg-cyan-500/10' : 'border-white/10 bg-white/[0.03]'}`}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{m.author_name}{m.is_staff ? ' · Staff' : ''}</span>
                  <span>{dateTime(m.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-slate-200">{m.body}</p>
              </div>
            ))}
          </div>
          {ticket?.status === 'closed' ? (
            <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">This ticket is closed. Open a new ticket if you still need help.</p>
          ) : (
            <form onSubmit={send} className="space-y-2">
              <textarea className="input min-h-[90px]" placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <div className="flex justify-end">
                <button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Send reply'}</button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Profile ---------------- */
function Profile({ user, refreshAuth, toast }) {
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' });
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch('/auth/me', form);
      await refreshAuth();
      toast.push('Profile updated.', 'success');
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) return toast.push('New passwords do not match.', 'error');
    setPwBusy(true);
    try {
      await api.post('/auth/change-password', { current_password: pw.current_password, new_password: pw.new_password });
      setPw({ current_password: '', new_password: '', confirm: '' });
      toast.push('Password changed.', 'success');
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={saveProfile} className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Profile details</h2>
        <Field label="Username"><input className="input" value={user?.username || ''} disabled /></Field>
        <Field label="Full name"><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Steve" /></Field>
        <Field label="Email address"><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
        <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Save changes'}</button></div>
      </form>

      <form onSubmit={changePassword} className="glass space-y-4 rounded-2xl p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <Field label="Current password"><input type="password" className="input" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} required /></Field>
        <Field label="New password" hint="At least 8 characters."><input type="password" className="input" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} required minLength={8} /></Field>
        <Field label="Confirm new password"><input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required minLength={8} /></Field>
        <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={pwBusy}>{pwBusy ? <Spinner size={16} /> : 'Update password'}</button></div>
      </form>
    </div>
  );
}
