import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast, Field, Spinner } from '../components/ui';
import Icon from '../components/icons';
import { Logo } from '../components/ui';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';

const REMEMBER_KEY = 'legacycloud_remember_user';
const readRemembered = () => { try { return localStorage.getItem(REMEMBER_KEY) || ''; } catch { return ''; } };

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="container-x flex min-h-[80vh] items-center justify-center py-14">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="auth-glass p-6 sm:p-8">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">{footer}</div>
      </div>
    </div>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { push } = useToast();
  const [form, setForm] = useState(() => ({ username: readRemembered(), password: '' }));
  const [remember, setRemember] = useState(() => !!readRemembered());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    if (!form.username || !form.password) { setError('Enter your username and password.'); return; }
    setBusy(true);
    try {
      const user = await login(form.username, form.password);
      try { if (remember) localStorage.setItem(REMEMBER_KEY, form.username); else localStorage.removeItem(REMEMBER_KEY); } catch { /* storage unavailable */ }
      push(`Welcome back, ${user.username}`, 'success');
      const redirect = params.get('redirect');
      navigate(redirect || (user.role === 'admin' ? '/admin' : '/dashboard'), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-x flex min-h-[80vh] flex-col items-center justify-center gap-4 py-14">
      <SignInCard
        title="Welcome back"
        subtitle="Sign in to manage your servers, invoices and support tickets."
        logo={<Logo compact />}
        identifierLabel="Username or email"
        identifierPlaceholder="Username or email"
        identifierType="text"
        identifier={form.username}
        onIdentifierChange={(v) => setForm((f) => ({ ...f, username: v }))}
        password={form.password}
        onPasswordChange={(v) => setForm((f) => ({ ...f, password: v }))}
        remember={remember}
        onRememberChange={setRemember}
        loading={busy}
        error={error}
        onSubmit={submit}
        forgotTo="/contact"
        signupTo="/register"
        signupPrompt="New to Legacy Cloud?"
        signupLabel="Create an account"
      />
      <p className="max-w-sm rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-center text-[11px] leading-relaxed text-slate-500 backdrop-blur">
        Admin demo access is configured through server environment variables. Default development credentials are documented in the README — never deploy them to production.
      </p>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({ username: '', email: '', full_name: '', password: '', confirm: '' });
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(form.username)) { setError('Username must be 3–32 characters (letters, numbers, . _ -).'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) { setError('Enter a valid email address.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    if (!agree) { setError('Please agree to the Terms of Service and Privacy Policy to continue.'); return; }
    setBusy(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password, full_name: form.full_name, accepted_terms: true });
      push('Account created. Welcome to Legacy Cloud!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="One account for servers, billing and support."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-cyan-300 hover:underline">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
        <Field label="Username">
          <input className="input" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="craftmaster" />
        </Field>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </Field>
        <Field label="Full name (optional)">
          <input className="input" autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Alex Carter" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password">
            <input className="input" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" />
          </Field>
          <Field label="Confirm password">
            <input className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} placeholder="Repeat password" />
          </Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 transition hover:border-white/20">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/30 bg-white/10 accent-cyan-400"
          />
          <span className="leading-relaxed">
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="font-semibold text-cyan-300 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" target="_blank" className="font-semibold text-cyan-300 hover:underline">Privacy Policy</Link>
            , and I confirm I am at least 13 years old.
          </span>
        </label>
        <button className="btn-aurora w-full" disabled={busy}>
          {busy ? <Spinner size={17} /> : <><Icon name="user" size={16} /> Create account</>}
        </button>
      </form>
    </AuthShell>
  );
}
