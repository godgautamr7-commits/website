import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useCart } from '../context/CartContext';
import { useToast, PlanGridSkeleton, Modal, Badge, SkeletonLine } from '../components/ui';
import Icon from '../components/icons';
import PlanCard from '../components/PlanCard';
import { money } from '../lib/format';

const categories = [
  { id: 'all', label: 'All plans', icon: 'layers', blurb: 'Every node we operate, in one place.' },
  { id: 'intel', label: 'Intel Hosting', icon: 'cpu', blurb: 'Reliable Intel Xeon nodes for communities that need stable, predictable performance.' },
  { id: 'amd', label: 'AMD Hosting', icon: 'bolt', blurb: 'High clock-speed Ryzen cores for plugin-heavy servers and large modpacks.' },
  { id: 'infinity', label: 'Infinity Servers', icon: 'sparkles', blurb: 'Our flagship range: dedicated Intel or AMD nodes with unlimited CPU and RAM as configured.' },
];

export default function Plans() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const category = params.get('category') || 'all';
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('recommended');
  const [compareIds, setCompareIds] = useState([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const { add } = useCart();
  const { push } = useToast();

  useEffect(() => {
    api.get('/plans', { auth: false })
      .then((d) => setPlans(d.plans))
      .catch((e) => push(e.message, 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let list = plans;
    if (category !== 'all') list = list.filter((p) => p.category === category);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((p) => [p.name, p.ram, p.cpu, p.storage, p.location, ...(p.features || [])].join(' ').toLowerCase().includes(needle));
    }
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price_cents - b.price_cents);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price_cents - a.price_cents);
    if (sort === 'ram') list = [...list].sort((a, b) => (parseInt(b.ram, 10) || 0) - (parseInt(a.ram, 10) || 0));
    return list;
  }, [plans, category, q, sort]);

  const grouped = useMemo(() => {
    if (category !== 'all') return [{ ...categories.find((c) => c.id === category), plans: filtered }];
    return categories.filter((c) => c.id !== 'all').map((c) => ({ ...c, plans: filtered.filter((p) => p.category === c.id) }));
  }, [filtered, category]);

  const comparePlans = plans.filter((p) => compareIds.includes(p.id));

  function toggleCompare(plan) {
    setCompareIds((prev) => {
      if (prev.includes(plan.id)) return prev.filter((id) => id !== plan.id);
      if (prev.length >= 3) { push('You can compare up to 3 plans at once.', 'error'); return prev; }
      return [...prev, plan.id];
    });
  }

  function handleAdd(plan) {
    add(plan);
    push(`${plan.name} added to cart`, 'success');
  }

  if (loading) {
    return (
      <div className="pb-24">
        <section className="relative overflow-hidden border-b border-white/10 py-14">
          <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
          <div className="container-x relative">
            <SkeletonLine width={150} height={22} className="rounded-full" />
            <SkeletonLine width="60%" height={44} className="mt-5" />
            <SkeletonLine width="45%" height={14} className="mt-4" />
          </div>
        </section>
        <div className="container-x py-12">
          <PlanGridSkeleton count={6} />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-white/10 py-14">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
        <div className="container-x relative">
          <Badge tone="bg-violet-500/10 text-violet-300">Hosting catalogue</Badge>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Find your perfect <span className="text-gradient-neon">Minecraft node</span></h1>
          <p className="mt-3 max-w-2xl text-slate-400">Intel, AMD Ryzen and Infinity plans — all provisioned on NVMe storage with DDoS protection. Prices are managed live by our team.</p>

          <div className="mt-7 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id}
                  onClick={() => { const next = new URLSearchParams(params); if (c.id === 'all') next.delete('category'); else next.set('category', c.id); setParams(next); }}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${category === c.id ? 'border-violet-400/50 bg-violet-500/15 text-white' : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}>
                  <Icon name={c.icon} size={14} /> {c.label}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RAM, CPU, location…" className="input !w-full !py-2.5 !pl-10 sm:!w-64" aria-label="Search hosting plans" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="input !w-full !py-2.5 sm:!w-44" aria-label="Sort plans">
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="ram">Most memory</option>
              </select>

            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Icon name="external" size={14} /> Open a plan page
            </span>
              <select
                value=""
                onChange={(e) => { if (e.target.value) navigate(`/plans/${e.target.value}`); }}
                className="input !w-full !py-2.5 sm:!flex-1"
                aria-label="Open a plan page"
              >
                <option value="">Open a plan page…</option>
                {['intel', 'amd', 'infinity'].map((cat) => (
                  <optgroup key={cat} label={categories.find((c) => c.id === cat)?.label}>
                    {plans.filter((p) => p.category === cat).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {money(p.price_cents)}/mo</option>
                    ))}
                  </optgroup>
                ))}
              </select>
          </div>
        </div>
      </section>

      <div className="container-x mt-10 space-y-14">
        {grouped.map((group) => (
          <section key={group.id} id={group.id}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold"><Icon name={group.icon} size={22} className={group.accent || 'text-violet-300'} /> {group.label}</h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">{group.blurb}</p>
              </div>
              <span className="text-xs text-slate-500">{group.plans.length} plan{group.plans.length === 1 ? '' : 's'}</span>
            </div>
            {group.plans.length ? (
              <div className="stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {group.plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} onAdd={handleAdd} compare={compareIds.includes(plan.id)} onCompare={toggleCompare} />
                ))}
              </div>
            ) : (
              <div className="glass-soft rounded-2xl px-6 py-10 text-center text-sm text-slate-400">
                No plans match your search in this category. Try clearing the search or{' '}
                <button className="font-semibold text-cyan-300 hover:underline" onClick={() => { setQ(''); setParams({}); }}>reset filters</button>.
              </div>
            )}
          </section>
        ))}
      </div>

      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="glass mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 shadow-card">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Icon name="filter" size={16} className="text-cyan-300" />
              {compareIds.length} plan{compareIds.length > 1 ? 's' : ''} selected
              <button onClick={() => setCompareIds([])} className="text-xs text-slate-500 underline hover:text-white">clear</button>
            </div>
            <button className="btn-primary btn-sm !px-4 !py-2" onClick={() => setCompareOpen(true)}>Compare plans</button>
          </div>
        </div>
      )}

      <Modal open={compareOpen} onClose={() => setCompareOpen(false)} title="Plan comparison" wide>
        <div className="table-wrap">
          <table className="table-base min-w-[560px]">
            <thead>
              <tr><th>Spec</th>{comparePlans.map((p) => <th key={p.id} className="text-white">{p.name}</th>)}</tr>
            </thead>
            <tbody>
              {[
                ['Price', (p) => `${money(p.price_cents)}/mo`],
                ['Category', (p) => p.category],
                ['RAM', (p) => p.ram],
                ['CPU', (p) => p.cpu],
                ['Storage', (p) => p.storage],
                ['Location', (p) => p.location],
                ['Features', (p) => p.features.join(', ')],
              ].map(([label, fn]) => (
                <tr key={label}>
                  <td className="font-semibold text-slate-400">{label}</td>
                  {comparePlans.map((p) => <td key={p.id}>{fn(p)}</td>)}
                </tr>
              ))}
              <tr>
                <td />
                {comparePlans.map((p) => (
                  <td key={p.id}><button className="btn-primary btn-sm" onClick={() => { handleAdd(p); setCompareOpen(false); }}>Add to cart</button></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
