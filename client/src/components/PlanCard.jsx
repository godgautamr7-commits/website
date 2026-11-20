import { Link } from 'react-router-dom';
import Icon from './icons';
import { money } from '../lib/format';

const categoryMeta = {
  intel: { label: 'Intel Hosting', accent: 'from-sky-500/20 to-cyan-400/10', ring: 'ring-sky-400/25', text: 'text-sky-300', icon: 'cpu' },
  amd: { label: 'AMD Hosting', accent: 'from-violet-500/20 to-fuchsia-400/10', ring: 'ring-violet-400/25', text: 'text-violet-300', icon: 'bolt' },
  infinity: { label: 'Infinity Server', accent: 'from-amber-400/20 to-cyan-400/10', ring: 'ring-amber-300/30', text: 'text-amber-300', icon: 'sparkles' },
};

export default function PlanCard({ plan, onAdd, compare, onCompare, featured = false }) {
  const meta = categoryMeta[plan.category] || categoryMeta.intel;
  const isInfinity = plan.category === 'infinity';

  return (
    <article className={`glass card-premium sheen relative flex flex-col rounded-2xl p-6 ${plan.is_popular ? 'ring-1 ring-blue-400/45' : ''} ${isInfinity ? 'ring-1 ring-amber-300/30' : ''} ${featured ? 'ring-1 ring-violet-400/40' : ''}`}>
      {plan.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full badge-popular px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em]">
          Most Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${meta.text}`}>{meta.label}</p>
          <h3 className="mt-1.5 text-xl font-bold">
            <Link to={`/plans/${plan.id}`} className="transition hover:text-cyan-300">{plan.name}</Link>
          </h3>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${meta.accent} ${meta.text} ring-1 ${meta.ring}`}>
          <Icon name={meta.icon} size={19} />
        </span>
      </div>

      <div className="mt-5 flex items-end gap-1">
        <span className="font-display text-4xl font-bold text-white">{money(plan.price_cents, { withCents: plan.price_cents % 100 !== 0 })}</span>
        <span className="mb-1.5 text-sm text-slate-500">/mo</span>
      </div>

      <dl className="mt-5 space-y-2.5 border-y border-white/10 py-5 text-sm">
        {[
          { icon: 'layers', label: 'Memory', value: plan.ram },
          { icon: 'cpu', label: 'Processor', value: plan.cpu },
          { icon: 'server', label: 'Storage', value: plan.storage },
          { icon: 'globe', label: 'Location', value: plan.location },
        ].map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className="flex items-center gap-2 text-slate-500"><Icon name={row.icon} size={15} /> {row.label}</dt>
            <dd className="max-w-[60%] text-right font-medium text-slate-200">{row.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {(plan.features || []).map((f) => (
          <li key={f} className="flex items-start gap-2 text-slate-300">
            <Icon name="check" size={15} className="mt-0.5 shrink-0 text-cyan-400" /> {f}
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2">
        <button onClick={() => onAdd?.(plan)} className="btn-primary w-full">
          <Icon name="cart" size={16} /> Add to cart
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link to={`/plans/${plan.id}`} className="text-xs font-semibold text-cyan-300 hover:underline">View details</Link>
            <Link to="/contact" className="text-xs text-slate-500 hover:text-cyan-300">Ask a question</Link>
          </div>
          {onCompare && (
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 hover:text-white">
              <input type="checkbox" checked={!!compare} onChange={() => onCompare(plan)} className="h-3.5 w-3.5 rounded border-white/20 bg-ink-900 accent-violet-500" />
              Compare
            </label>
          )}
        </div>
      </div>
    </article>
  );
}
