import { createPortal } from 'react-dom';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Icon from './icons';
import { useContent } from '../context/ContentContext';

/* ---------- Logo ---------- */
export function Logo({ compact = false, className = '' }) {
  const { data } = useContent();
  const branding = data?.branding || {};
  const logoUrl = branding.logo_url || '';
  const alt = branding.logo_alt || 'Legacy Cloud logo';
  const name = (branding.brand_name || 'LEGACY CLOUD').trim();

  if (logoUrl) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <img src={logoUrl} alt={alt} className="h-9 w-auto max-w-[220px] object-contain" />
      </span>
    );
  }

  const isDefaultName = name.toUpperCase() === 'LEGACY CLOUD';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="logo-mark relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-glow">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round">
          <path d="M17 7H9.5C7.6 7 6.5 8 6.5 9.3c0 1.4 1.1 2 3 2.4l2.4.5c2 .4 3 1.1 3 2.5 0 1.5-1.3 2.4-3.4 2.4H6" />
        </svg>
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-cyan-300 shadow-cyan" />
      </span>
      {!compact && (
        <span className="logo-word font-display text-lg font-bold tracking-tight text-white">
          {isDefaultName ? (
            <>LEGACY<span className="text-gradient-neon brand-shine"> CLOUD</span></>
          ) : (
            <span className="text-gradient-neon brand-shine">{name}</span>
          )}
        </span>
      )}
    </span>
  );
}

/* ---------- Badge ---------- */
export function Badge({ children, tone = 'bg-white/10 text-slate-300', className = '' }) {
  return <span className={`badge ${tone} ${className}`}>{children}</span>;
}

/* ---------- Spinner ---------- */
export function Spinner({ size = 20, className = '' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-white/20 border-t-violet-400 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[45vh] flex-col items-center justify-center gap-4 text-slate-400">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
        <Spinner size={38} />
      </div>
      <p className="text-sm">{label}…</p>
    </div>
  );
}

/* ---------- Skeletons ---------- */
export function Skeleton({ className = '', style, width, height }) {
  const size = {};
  if (width !== undefined) size.width = width;
  if (height !== undefined) size.height = height;
  return <div className={`skeleton ${className}`} style={{ ...size, ...style }} aria-hidden="true" />;
}

export function SkeletonLine({ width = '100%', height = 12, className = '' }) {
  return <div className={`skeleton-line ${className}`} style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCircle({ size = 40, className = '' }) {
  return <div className={`skeleton-circle ${className}`} style={{ width: size, height: size }} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  );
}

export function PlanCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-6" aria-hidden="true">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2.5">
          <SkeletonLine width={90} height={10} />
          <SkeletonLine width={140} height={22} />
        </div>
        <Skeleton width={54} height={22} className="rounded-full" />
      </div>
      <div className="mt-5 space-y-2.5">
        <SkeletonLine width="55%" height={30} />
        <SkeletonLine width="35%" height={10} />
      </div>
      <div className="mt-5 space-y-2.5 border-t border-white/5 pt-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <SkeletonCircle size={16} />
            <SkeletonLine width={`${60 + ((i * 13) % 30)}%`} height={10} />
          </div>
        ))}
      </div>
      <Skeleton height={44} className="mt-6 rounded-xl" />
    </div>
  );
}

export function PlanGridSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => <PlanCardSkeleton key={i} />)}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrap" aria-hidden="true">
      <div className="min-w-[640px]">
        <div className="flex gap-4 bg-white/[0.03] px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => <SkeletonLine key={i} width={`${100 / cols}%`} height={10} />)}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-4">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} width={c === 0 ? '60%' : `${70 + ((r + c) % 25)}%`} height={11} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5" aria-hidden="true">
      <SkeletonLine width="45%" height={10} />
      <SkeletonLine width="60%" height={28} className="mt-3" />
      <SkeletonLine width="35%" height={9} className="mt-3" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-enter space-y-6" aria-hidden="true">
      <div className="glass rounded-2xl p-6">
        <SkeletonLine width="30%" height={14} />
        <SkeletonLine width="55%" height={30} className="mt-3" />
        <SkeletonText lines={2} className="mt-4 max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <SkeletonLine width="35%" height={16} />
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-white/5 p-4">
                <SkeletonCircle size={40} />
                <div className="flex-1 space-y-2">
                  <SkeletonLine width="40%" height={11} />
                  <SkeletonLine width="65%" height={9} />
                </div>
                <Skeleton width={64} height={24} className="rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <SkeletonLine width="50%" height={16} />
          <SkeletonText lines={4} className="mt-5" />
          <Skeleton height={40} className="mt-6 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div aria-hidden="true">
      <section className="relative overflow-hidden pb-16 pt-24 sm:pt-32">
        <div className="container-x">
          <div className="mx-auto max-w-3xl text-center">
            <Skeleton width={180} height={26} className="mx-auto rounded-full" />
            <SkeletonLine width="85%" height={46} className="mx-auto mt-7" />
            <SkeletonLine width="65%" height={46} className="mx-auto mt-3" />
            <SkeletonText lines={2} className="mx-auto mt-6 max-w-xl" />
            <div className="mt-8 flex justify-center gap-3">
              <Skeleton width={160} height={48} className="rounded-xl" />
              <Skeleton width={140} height={48} className="rounded-xl" />
            </div>
          </div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
          </div>
        </div>
      </section>
      <section className="container-x pb-20">
        <SkeletonLine width={200} height={14} className="mx-auto" />
        <SkeletonLine width={340} height={30} className="mx-auto mt-4" />
        <div className="mt-10"><PlanGridSkeleton count={3} /></div>
      </section>
    </div>
  );
}

export function ThreadSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex gap-3 ${i % 2 ? 'justify-end' : ''}`}>
          <SkeletonCircle size={34} />
          <div className={`w-2/3 space-y-2 rounded-2xl border border-white/5 p-4 ${i % 2 ? 'bg-white/[0.04]' : 'bg-white/[0.02]'}`}>
            <SkeletonLine width="35%" height={9} />
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide = false, footer = null }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  // Render in a portal on <body>: an ancestor with a CSS transform/animation
  // would otherwise become the containing block for `fixed` and push the
  // dialog (and its Save button) off-screen.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`glass flex w-full max-h-[calc(100vh-2rem)] flex-col ${wide ? 'max-w-4xl' : 'max-w-lg'} animate-rise rounded-2xl shadow-card`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-3">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 rounded-b-2xl border-t border-white/10 bg-black/30 px-5 py-3 sm:px-6">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Field ---------- */
export function Field({ label, hint, error, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error ? <p className="mt-1.5 text-xs text-rose-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon = 'layers', title, description, action }) {
  return (
    <div className="glass-soft flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/20">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------- Section heading ---------- */
export function SectionHeading({ eyebrow, title, subtitle, center = true, className = '' }) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} max-w-2xl ${className}`}>
      {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>}
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-slate-400">{subtitle}</p>}
    </div>
  );
}

/* ---------- Toasts ---------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }, []);

  // Stable reference: a new object on every render made every admin manager
  // (whose load() depends on `toast`) refetch and wipe unsaved form state.
  const toastApi = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`glass animate-rise pointer-events-auto flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-card ${t.type === 'error' ? 'border-rose-500/40 text-rose-200' : t.type === 'success' ? 'border-emerald-500/40 text-emerald-200' : 'text-slate-200'}`}>
            <Icon name={t.type === 'error' ? 'x' : t.type === 'success' ? 'check' : 'sparkles'} size={17} className="mt-0.5 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

/* ---------- Confirm ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onClose, danger = false }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    setBusy(true);
    try { await onConfirm(); onClose(); } finally { setBusy(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-slate-400">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={handle} disabled={busy}>
          {busy ? <Spinner size={16} /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Stat ---------- */
export function StatCard({ label, value, icon, tone = 'text-violet-300', sub }) {
  return (
    <div className="glass card-premium sheen rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg bg-white/[0.05] ${tone}`}><Icon name={icon} size={17} /></span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

/* ---------- Status pill ---------- */
export function StatusPill({ status, toneMap }) {
  const tone = toneMap?.[status] || 'bg-white/10 text-slate-300';
  return <span className={`badge ${tone} capitalize`}>{status?.replace(/_/g, ' ')}</span>;
}
