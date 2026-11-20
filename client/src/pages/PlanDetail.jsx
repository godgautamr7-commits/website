import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useToast, Badge, EmptyState, Skeleton, SkeletonLine, SkeletonText, SkeletonCircle } from '../components/ui';
import Icon from '../components/icons';
import PlanCard from '../components/PlanCard';
import { money } from '../lib/format';

const categoryMeta = {
  intel: { label: 'Intel Hosting', text: 'text-sky-300', icon: 'cpu', blurb: 'Stable, predictable Intel Xeon performance for growing communities.' },
  amd: { label: 'AMD Hosting', text: 'text-violet-300', icon: 'bolt', blurb: 'High clock-speed Ryzen cores for plugin-heavy servers and large modpacks.' },
  infinity: { label: 'Infinity Server', text: 'text-amber-300', icon: 'sparkles', blurb: 'Dedicated nodes with unlimited CPU and RAM as configured.' },
};

export default function PlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { push } = useToast();
  const [plan, setPlan] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setNotFound(false);
    api.get(`/plans/${id}`, { auth: false })
      .then((d) => {
        if (!alive) return;
        setPlan(d.plan);
        return api.get(`/plans?category=${d.plan.category}`, { auth: false });
      })
      .then((d) => {
        if (!alive || !d) return;
        setRelated((d.plans || []).filter((p) => String(p.id) !== String(id)).slice(0, 3));
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="container-x py-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <SkeletonLine width={120} height={22} className="rounded-full" />
            <SkeletonLine width="55%" height={42} />
            <SkeletonText lines={2} className="max-w-xl" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-4">
                  <SkeletonLine width="40%" height={9} />
                  <SkeletonLine width="70%" height={18} className="mt-2.5" />
                </div>
              ))}
            </div>
            <div className="glass rounded-2xl p-6">
              <SkeletonLine width="30%" height={16} />
              <div className="mt-5 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonCircle size={18} />
                    <SkeletonLine width={`${55 + ((i * 11) % 35)}%`} height={10} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="glass h-fit rounded-2xl p-6">
            <SkeletonLine width="45%" height={12} />
            <SkeletonLine width="65%" height={36} className="mt-3" />
            <Skeleton height={46} className="mt-6 rounded-xl" />
            <Skeleton height={46} className="mt-3 rounded-xl" />
            <SkeletonText lines={3} className="mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !plan) {
    return (
      <div className="container-x py-20">
        <EmptyState
          icon="layers"
          title="Plan not available"
          description="This plan may have been renamed, hidden or removed. Browse the full catalogue to find a current node."
          action={<Link to="/plans" className="btn-primary">Browse hosting plans <Icon name="arrow" size={16} /></Link>}
        />
      </div>
    );
  }

  const meta = categoryMeta[plan.category] || categoryMeta.intel;

  function handleAdd() {
    add(plan);
    push(`${plan.name} added to cart`, 'success');
  }

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-white/10 py-12">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
        <div className="container-x relative">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link to="/plans" className="hover:text-white">Hosting plans</Link>
            <span>/</span>
            <span className="text-slate-300">{plan.name}</span>
          </nav>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="bg-white/10 text-slate-200"><Icon name={meta.icon} size={13} /> {meta.label}</Badge>
                {plan.is_popular && (
                  <span className="badge-popular rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em]">
                    Most Popular
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{plan.name}</h1>
              <p className="mt-3 max-w-2xl text-slate-400">{meta.blurb}</p>

              <div className="mt-6 flex flex-wrap items-end gap-3">
                <span className="font-display text-5xl font-bold text-white">{money(plan.price_cents, { withCents: plan.price_cents % 100 !== 0 })}</span>
                <span className="mb-2 text-sm text-slate-500">/ month</span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={handleAdd} className="btn-primary"><Icon name="cart" size={17} /> Add to cart</button>
                <button onClick={() => { add(plan); navigate('/checkout'); }} className="btn-ghost"><Icon name="bolt" size={17} /> Buy now</button>
                <Link to="/contact" className="btn-ghost"><Icon name="headset" size={17} /> Ask a question</Link>
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Specifications</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  { icon: 'layers', label: 'Memory', value: plan.ram },
                  { icon: 'cpu', label: 'Processor', value: plan.cpu },
                  { icon: 'server', label: 'Storage', value: plan.storage },
                  { icon: 'globe', label: 'Location', value: plan.location },
                  { icon: 'shield', label: 'Protection', value: 'DDoS protected network' },
                  { icon: 'clock', label: 'Billing', value: 'Monthly, cancel anytime' },
                ].map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <dt className="flex items-center gap-2 text-slate-500"><Icon name={row.icon} size={15} /> {row.label}</dt>
                    <dd className="max-w-[60%] text-right font-medium text-slate-200">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold">Everything included</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {(plan.features || []).map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Icon name="check" size={16} className="mt-0.5 shrink-0 text-cyan-400" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl font-semibold">How provisioning works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-400">
            {[
              'Add the plan to your cart and complete checkout with your billing details.',
              'Your order is created as an invoice — our team confirms payment manually.',
              'Once paid, the server is provisioned and appears in your dashboard.',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-200">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <Link to="/status" className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:underline">
            Check live service status <Icon name="arrow" size={13} />
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <div className="container-x mt-14">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">More {meta.label.toLowerCase()} plans</h2>
            <Link to={`/plans?category=${plan.category}`} className="text-xs font-semibold text-cyan-300 hover:underline">View all <Icon name="arrow" size={12} /></Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <PlanCard key={p.id} plan={p} onAdd={(x) => { add(x); push(`${x.name} added to cart`, 'success'); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
