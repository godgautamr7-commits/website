import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { money, dateShort } from '../lib/format';
import { PageLoader, Badge } from '../components/ui';
import Icon from '../components/icons';

export default function OrderConfirmation() {
  const { state } = useLocation();
  const [data, setData] = useState(state || null);
  const [loading, setLoading] = useState(!state);

  useEffect(() => {
    if (state) return;
    api.get('/account/orders')
      .then((res) => {
        if (res.orders?.length) {
          const latest = res.orders[0];
          const same = res.orders.filter((o) => o.created_at === latest.created_at);
          setData({ orders: same, payment: { instructions: 'Your invoice is awaiting payment confirmation by our billing team.' }, total: same.reduce((s, o) => s + o.total_cents, 0) });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [state]);

  if (loading) return <PageLoader label="Loading your order" />;

  if (!data?.orders?.length) {
    return (
      <div className="container-x py-20 text-center">
        <h1 className="text-2xl font-bold">No recent order found</h1>
        <p className="mt-2 text-sm text-slate-400">Head to your dashboard to see your full order history.</p>
        <Link to="/dashboard/orders" className="btn-primary mt-6">Go to my orders</Link>
      </div>
    );
  }

  return (
    <div className="container-x max-w-3xl py-14">
      <div className="glass relative overflow-hidden rounded-3xl p-6 text-center sm:p-10">
        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-[70px]" />
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
          <Icon name="check" size={30} />
        </span>
        <Badge tone="bg-amber-500/15 text-amber-300 mt-4">Awaiting payment</Badge>
        <h1 className="mt-3 text-3xl font-bold">Order received</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-400">
          Your invoice has been created. Your order is <strong className="text-slate-200">not paid yet</strong> — our billing team will send payment instructions to your account email.
        </p>

        <div className="mt-7 space-y-3 text-left">
          {data.orders.map((o) => (
            <div key={o.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500">Order #{o.id} · {dateShort(o.created_at)}</p>
                  <p className="mt-0.5 font-semibold text-white">{o.plan_name} × {o.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-bold text-white">{money(o.total_cents)}</p>
                  <p className="text-[11px] uppercase tracking-wider text-amber-300">{o.payment_status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-between rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 text-sm">
          <span className="text-slate-400">Total due</span>
          <span className="font-display text-lg font-bold text-white">{money(data.total)}</span>
        </div>

        <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4 text-left text-sm leading-relaxed text-cyan-100/80">
          <p className="mb-1 flex items-center gap-2 font-semibold text-cyan-200"><Icon name="billing" size={16} /> Payment instructions</p>
          {data.payment?.instructions}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard/orders" className="btn-primary">View my orders</Link>
          <Link to="/dashboard/support" className="btn-ghost">Contact billing</Link>
        </div>
      </div>
    </div>
  );
}
