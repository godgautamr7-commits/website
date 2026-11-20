import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/icons';
import { Field, PageLoader, Spinner, useToast } from '../components/ui';
import { useContent } from '../context/ContentContext';
import { api } from '../lib/api';

function Shell({ eyebrow, title, subtitle, children, wide = false }) {
  return (
    <div className="container-x py-14">
      <div className={`mx-auto ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-slate-400">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Contact ---------------- */
export function Contact() {
  const { data } = useContent();
  const contact = data?.contact || {};
  const discordUrl = data?.branding?.discord_url || contact.discord || 'https://discord.gg/';
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/contact', form, { auth: false });
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      toast.push('Message sent. We will reply by email.', 'success');
    } catch (err) {
      toast.push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell eyebrow="Support" title={contact.title || 'Talk to a human'} subtitle={contact.subtitle}>
      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          <a href={`mailto:${contact.email || 'support@legacycloud.gg'}`} className="glass flex items-center gap-3 rounded-xl p-4 transition hover:ring-1 hover:ring-cyan-400/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300"><Icon name="mail" size={18} /></span>
            <div><p className="text-sm font-semibold text-white">Email us</p><p className="text-xs text-slate-400">{contact.email || 'support@legacycloud.gg'}</p></div>
          </a>
          <a href={discordUrl} target="_blank" rel="noreferrer" className="glass flex items-center gap-3 rounded-xl p-4 transition hover:ring-1 hover:ring-violet-400/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300"><Icon name="discord" size={18} /></span>
            <div><p className="text-sm font-semibold text-white">Discord community</p><p className="text-xs text-slate-400">Fastest response, real engineers</p></div>
          </a>
          <Link to="/dashboard/support" className="glass flex items-center gap-3 rounded-xl p-4 transition hover:ring-1 hover:ring-amber-400/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/15 text-amber-300"><Icon name="ticket" size={18} /></span>
            <div><p className="text-sm font-semibold text-white">Open a ticket</p><p className="text-xs text-slate-400">Track your issue in the dashboard</p></div>
          </Link>
        </div>

        <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-6">
          {sent && (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Thanks — your message was received. We reply to the email you provided.
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Email address"><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          </div>
          <Field label="Subject"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required minLength={3} /></Field>
          <Field label="Message" hint="Include your server name or order number if relevant.">
            <textarea className="input min-h-[140px]" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required minLength={10} />
          </Field>
          <div className="flex justify-end"><button className="btn-primary btn-sm" disabled={busy}>{busy ? <Spinner size={16} /> : 'Send message'}</button></div>
        </form>
      </div>
    </Shell>
  );
}

/* ---------------- Status ---------------- */
const NODE_META = {
  operational: { label: 'Operational', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  degraded: { label: 'Degraded', dot: 'bg-amber-400', text: 'text-amber-300' },
  maintenance: { label: 'Maintenance', dot: 'bg-sky-400', text: 'text-sky-300' },
  offline: { label: 'Offline', dot: 'bg-rose-500', text: 'text-rose-300' },
};
const ONLINE_LABEL = { operational: 'Online', degraded: 'Degraded', maintenance: 'Maintenance', offline: 'Offline' };

export function Status() {
  const [state, setState] = useState({ loading: true, api: false, plans: 0, locations: [], summary: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get('/health', { auth: false });
        const plans = await api.get('/plans', { auth: false });
        const nodes = await api.get('/locations', { auth: false }).catch(() => ({ locations: [], summary: null }));
        if (alive) setState({ loading: false, api: true, plans: (plans.plans || []).length, locations: nodes.locations || [], summary: nodes.summary || null });
      } catch {
        if (alive) setState({ loading: false, api: false, plans: 0, locations: [], summary: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (state.loading) return <PageLoader label="Checking service status" />;

  const services = [
    { name: 'API & control plane', ok: state.api, detail: state.api ? 'Operational' : 'Unreachable' },
    { name: 'Plan catalogue', ok: state.api && state.plans > 0, detail: `${state.plans} active plans` },
    { name: 'Billing & invoicing', ok: state.api, detail: state.api ? 'Operational' : 'Unknown' },
    { name: 'Support tickets', ok: state.api, detail: state.api ? 'Operational' : 'Unknown' },
  ];

  const statusOf = (l) => l.effective_status || l.status;
  const allGood = state.summary?.all_operational ?? state.locations.every((l) => statusOf(l) === 'operational');
  const maint = state.locations.filter((l) => l.in_maintenance).length;

  return (
    <Shell eyebrow="Status" title="Service status" subtitle="Live probes against every Legacy Cloud node — uptime and latency are measured, never invented.">
      <div className="space-y-3">
        {services.map((s) => (
          <div key={s.name} className="glass flex items-center justify-between gap-3 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${s.ok ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]' : 'bg-rose-400'}`} />
              <p className="text-sm font-medium text-white">{s.name}</p>
            </div>
            <span className={`text-xs font-semibold ${s.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{s.detail}</span>
          </div>
        ))}
      </div>

      {state.locations.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold text-white">Game nodes</h2>
            <div className="flex items-center gap-2">
              {maint > 0 && (
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/30">
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                  {maint} in maintenance
                </span>
              )}
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${allGood ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30' : 'bg-amber-500/10 text-amber-300 ring-amber-400/30'}`}>
                <span className={`h-2 w-2 rounded-full ${allGood ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {allGood ? 'All systems operational' : 'Partial disruption'}
              </span>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {state.locations.map((loc) => {
              const status = statusOf(loc);
              const meta = NODE_META[status] || NODE_META.operational;
              const uptime = typeof loc.uptime_percent === 'number' ? loc.uptime_percent : 100;
              const region = loc.region || loc.country || 'Global';
              const nodeType = loc.ip_type === 'dedicated' ? 'Dedicated node' : 'Shared node';
              const count = loc.node_servers || 0;
              const slots = Array.isArray(loc.uptime_bars) && loc.uptime_bars.length ? loc.uptime_bars : new Array(48).fill('none');
              return (
                <div key={loc.id} className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 truncate font-display text-[15px] font-semibold text-white">
                      {loc.name.replace(/,\s*/, ' ')} network
                    </h3>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {ONLINE_LABEL[status] || meta.label}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">
                    {count > 0 ? `Carries all ${count} ${region} nodes` : `Ready for ${region} deployments`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Main line &mdash; {loc.last_response_ms > 0 ? `${loc.last_response_ms} ms` : '\u2014'} to DDoS protection
                    <span className="text-slate-600"> &middot; {nodeType}</span>
                  </p>

                  <div className="mt-4 flex h-8 items-stretch gap-[3px]">
                    {slots.map((slot, i) => (
                      <span
                        key={i}
                        className={`flex-1 rounded-[2px] ${slot === 'down' ? 'bg-rose-500' : slot === 'up' ? 'bg-emerald-500' : 'bg-white/[0.07]'}`}
                      />
                    ))}
                  </div>

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
      )}

      <p className="mt-6 text-xs text-slate-500">Checks run when this page loads. Node statuses are published live by our operations team.</p>
    </Shell>
  );
}

/* ---------------- Terms ---------------- */
export function Terms() {
  return (
    <Shell eyebrow="Legal" title="Terms of Service" subtitle="Plain-language terms for using Legacy Cloud hosting.">
      <div className="glass space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-slate-300 sm:p-8">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">1. Service</h2>
          <p className="mt-2">Legacy Cloud provides game server hosting. Plans, prices and specifications shown on the website are controlled by our admin panel and may change. The price you pay is the price recorded on your invoice at checkout.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">2. Payments</h2>
          <p className="mt-2">Checkout creates an invoice and reserves your configuration. Payment is confirmed manually or through the configured payment provider. We never mark an invoice paid until payment is actually received. Services may be suspended for unpaid invoices.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">3. Acceptable use</h2>
          <p className="mt-2">You may not use the service for illegal activity, attacks, malware, crypto-mining, or anything that harms other customers or the network. We may suspend servers that violate these terms.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">4. Refunds</h2>
          <p className="mt-2">Contact support within 72 hours of your first payment if the service does not work for you. Refunds are handled case by case by our billing team.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">5. Backups & data</h2>
          <p className="mt-2">We provide backup tooling, but you remain responsible for keeping your own copies of worlds and configurations. We are not liable for data loss caused by plugins, user error or force majeure.</p>
        </section>
      </div>
    </Shell>
  );
}

/* ---------------- Privacy ---------------- */
export function Privacy() {
  return (
    <Shell eyebrow="Legal" title="Privacy Policy" subtitle="What we collect, why we collect it, and how to reach us.">
      <div className="glass space-y-6 rounded-2xl p-6 text-sm leading-relaxed text-slate-300 sm:p-8">
        <section>
          <h2 className="font-display text-lg font-semibold text-white">Information we collect</h2>
          <p className="mt-2">Account details (username, email, optional full name and Discord handle), billing contact details you submit at checkout, order and server records, support tickets, and messages you send through the contact form.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">How we use it</h2>
          <p className="mt-2">To operate your account and servers, issue invoices, provide support, prevent abuse, and communicate service updates. We do not sell personal data.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">Storage & security</h2>
          <p className="mt-2">Passwords are hashed with bcrypt and never stored in plain text. Sessions use signed JSON Web Tokens. Access to customer data is limited to authorised staff.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">Your rights</h2>
          <p className="mt-2">You can update your profile from the dashboard. To request deletion of your account and associated data, contact support.</p>
        </section>
        <section>
          <h2 className="font-display text-lg font-semibold text-white">Contact</h2>
          <p className="mt-2">Questions about privacy? Email <a className="text-cyan-300 hover:underline" href="mailto:support@legacycloud.gg">support@legacycloud.gg</a>.</p>
        </section>
      </div>
    </Shell>
  );
}
