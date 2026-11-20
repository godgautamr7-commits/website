import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { money } from '../lib/format';
import { useToast, Field, Spinner, EmptyState } from '../components/ui';
import Icon from '../components/icons';

export default function Checkout() {
  const { items, subtotal, setQuantity, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({
    billing_name: user?.full_name || user?.username || '',
    billing_email: user?.email || '',
    billing_address: '',
    notes: '',
  });
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const discount = applied ? applied.discount_cents : 0;
  const total = Math.max(0, subtotal - discount);

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setCouponBusy(true);
    setError('');
    try {
      const res = await api.post('/coupons/validate', { code: coupon, subtotal_cents: subtotal }, { auth: false });
      setApplied(res);
      push(`Coupon ${res.coupon.code} applied`, 'success');
    } catch (e) {
      setApplied(null);
      setError(e.message);
    } finally {
      setCouponBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.billing_name.trim()) { setError('Billing name is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.billing_email)) { setError('Enter a valid billing email.'); return; }
    setBusy(true);
    try {
      const res = await api.post('/account/orders', {
        items: items.map((i) => ({ planId: i.plan.id, quantity: i.quantity })),
        coupon_code: applied?.coupon?.code || '',
        ...form,
      });
      clear();
      navigate('/order-confirmation', { state: { orders: res.orders, payment: res.payment, total: res.total_cents } });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="container-x py-20">
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          description="Add a hosting plan to get started. You can compare Intel, AMD and Infinity plans before choosing."
          action={<Link to="/plans" className="btn-primary">Browse hosting plans <Icon name="arrow" size={16} /></Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-x py-12">
      <div className="mb-8">
        <Link to="/plans" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-300"><Icon name="arrow" size={14} className="rotate-180" /> Back to plans</Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-slate-400">Review your order and billing details. Payment is confirmed manually by our billing team — nothing is charged automatically.</p>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" noValidate>
        <div className="space-y-6">
          <section className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Your items</h2>
            <div className="mt-4 divide-y divide-white/10">
              {items.map(({ plan, quantity }) => (
                <div key={plan.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-white">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{plan.ram} · {plan.cpu} · {plan.storage} · {plan.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center rounded-lg border border-white/10">
                      <button type="button" onClick={() => setQuantity(plan.id, quantity - 1)} className="px-2.5 py-1.5 text-slate-400 hover:text-white" aria-label="Decrease quantity">−</button>
                      <span className="w-8 text-center text-sm">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(plan.id, quantity + 1)} className="px-2.5 py-1.5 text-slate-400 hover:text-white" aria-label="Increase quantity">+</button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-white">{money(plan.price_cents * quantity)}</span>
                    <button type="button" onClick={() => remove(plan.id)} className="text-slate-500 hover:text-rose-300" aria-label={`Remove ${plan.name}`}><Icon name="trash" size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Billing details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Billing name *">
                <input className="input" value={form.billing_name} onChange={(e) => setForm({ ...form, billing_name: e.target.value })} placeholder="Alex Carter" autoComplete="name" />
              </Field>
              <Field label="Billing email *">
                <input className="input" type="email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} placeholder="you@example.com" autoComplete="email" />
              </Field>
              <Field label="Billing address" className="sm:col-span-2">
                <input className="input" value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} placeholder="Street, city, country" autoComplete="street-address" />
              </Field>
              <Field label="Order notes" hint="Server name, region preference, migration requests…" className="sm:col-span-2">
                <textarea className="input min-h-[90px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything we should know before provisioning?" />
              </Field>
            </div>
          </section>

          <section className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm text-amber-100/90">
              <Icon name="lock" size={18} className="mt-0.5 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-amber-200">Invoice-based checkout</p>
                <p className="mt-1 leading-relaxed text-amber-100/70">
                  Your order will be created with payment status <strong>unpaid</strong>. Our billing team will contact you with payment instructions, and an administrator marks the invoice paid once funds are confirmed. We never simulate a successful payment.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-slate-400">Subtotal</dt><dd className="text-white">{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Discount</dt><dd className={discount ? 'text-emerald-300' : 'text-slate-500'}>−{money(discount)}</dd></div>
              <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold"><dt>Total due</dt><dd className="text-gradient-neon">{money(total)}</dd></div>
              <p className="text-[11px] text-slate-500">Billed monthly. First invoice is due before provisioning.</p>
            </dl>

            <div className="mt-5">
              <label className="label">Coupon code</label>
              <div className="flex gap-2">
                <input className="input" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="SWIFT10" />
                <button type="button" onClick={applyCoupon} className="btn-ghost shrink-0 !px-4" disabled={couponBusy}>
                  {couponBusy ? <Spinner size={16} /> : 'Apply'}
                </button>
              </div>
              {applied && <p className="mt-2 text-xs text-emerald-300">Applied {applied.coupon.code} — saving {money(applied.discount_cents)}</p>}
            </div>

            {error && <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}

            <button className="btn-primary mt-5 w-full" disabled={busy}>
              {busy ? <Spinner size={17} /> : <>Place order · {money(total)}</>}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-500">By ordering you agree to our <Link to="/terms" className="underline hover:text-slate-300">Terms</Link>.</p>
          </div>
          <div className="glass-soft rounded-xl p-4 text-xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-200">Need help choosing?</p>
            <p className="mt-1">Message us on Discord or open a ticket — we will recommend the right node for your player count and plugins.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
