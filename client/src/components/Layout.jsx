import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useContent } from '../context/ContentContext';
import { Logo } from './ui';
import Icon from './icons';
import Emoji, { Rich } from './Emoji';
import { CustomCursor, ModeToggle } from './legacy';
import { LiquidNavbar, NimbusIcons } from './ui/liquid-glass-navbar';
import { NotificationBell } from './ui/notification-bell';
import ButtonFX from './ButtonFX';

const navLinks = [
  { to: '/', label: 'Home', icon: NimbusIcons.home, fx: 'glow' },
  { to: '/minecraft', label: 'Minecraft', icon: NimbusIcons.cube, fx: 'spin' },
  { to: '/plans', label: 'Plans', icon: NimbusIcons.server, fx: 'pop' },
  { to: '/#why', label: 'Why us', icon: NimbusIcons.shield, fx: 'drop' },
  { to: '/#faq', label: 'FAQ', icon: NimbusIcons.help, fx: 'wave' },
  { to: '/contact', label: 'Support', icon: NimbusIcons.chat, fx: 'plane' },
];

/* Which nav item is the current page? -1 when the route is not in the bar. */
function activeIndexFor(pathname, hash) {
  if (pathname === '/') return hash === '#why' ? 3 : hash === '#faq' ? 4 : 0;
  if (pathname.startsWith('/minecraft')) return 1;
  if (pathname.startsWith('/plans')) return 2;
  if (pathname.startsWith('/contact')) return 5;
  return -1;
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true));
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

const ANN_STYLES = {
  info: { wrap: 'border-cyan-400/25 bg-gradient-to-r from-cyan-500/20 via-ink-900 to-violet-500/20', icon: 'text-cyan-300', emoji: 'gift' },
  success: { wrap: 'border-emerald-400/25 bg-gradient-to-r from-emerald-500/20 via-ink-900 to-cyan-500/15', icon: 'text-emerald-300', emoji: 'check' },
  warning: { wrap: 'border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-ink-900 to-rose-500/15', icon: 'text-amber-300', emoji: 'bolt' },
};

function readDismissed() {
  try { return JSON.parse(sessionStorage.getItem('swiftcloud_ann_dismissed') || '[]'); } catch { return []; }
}

function AnnouncementBar() {
  const { data } = useContent();
  const [dismissed, setDismissed] = useState(readDismissed);
  const [index, setIndex] = useState(0);
  const items = (data?.announcements || []).filter((a) => a.is_active && !dismissed.includes(a.id));

  // Rotate when several announcements are live.
  useEffect(() => {
    if (items.length < 2) return undefined;
    const t = setInterval(() => setIndex((i) => i + 1), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return null;
  const a = items[index % items.length];
  const style = ANN_STYLES[a.type] || ANN_STYLES.info;

  const dismiss = () => {
    const next = [...dismissed, a.id];
    setDismissed(next);
    try { sessionStorage.setItem('swiftcloud_ann_dismissed', JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  return (
    <div role="status" className={`relative border-b ${style.wrap}`}>
      <div className="container-x flex items-center justify-center gap-2.5 py-2.5 pr-8 text-center text-xs text-slate-100 sm:text-sm">
        <Emoji name={style.emoji} size={18} className="shrink-0" />
        <span><strong className="font-semibold text-white"><Rich text={a.title} /></strong>{a.body ? <span className="text-slate-200"> — <Rich text={a.body} /></span> : null}</span>
        {items.length > 1 && <span className="hidden text-[11px] text-slate-400 sm:inline">({(index % items.length) + 1}/{items.length})</span>}
      </div>
      <button onClick={dismiss} aria-label="Dismiss announcement" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function PromoBar() {
  const { data } = useContent();
  const promo = data?.promo;
  if (!promo?.enabled || !promo.text) return null;
  return (
    <div className="relative overflow-hidden border-b border-violet-500/20 bg-gradient-to-r from-violet-600/20 via-ink-900 to-cyan-500/15">
      <div className="container-x flex items-center justify-center gap-2 py-2 text-center text-xs text-slate-200 sm:text-sm">
        <Emoji name="gift" size={20} className="shrink-0" />
        <span><Rich text={promo.text} /></span>
        {promo.link_url && (
          <Link to={promo.link_url} className="ml-1 hidden font-semibold text-cyan-300 underline-offset-4 hover:underline sm:inline">
            {promo.link_text || 'Learn more'} →
          </Link>
        )}
      </div>
    </div>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { count } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const wide = useMediaQuery('(min-width: 1360px)');
  // keep the last matched item highlighted on pages that are not in the bar (login, dashboard…)
  const [activeNav, setActiveNav] = useState(() => Math.max(0, activeIndexFor(location.pathname, location.hash)));
  useEffect(() => {
    const idx = activeIndexFor(location.pathname, location.hash);
    if (idx >= 0) setActiveNav(idx);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/10 bg-ink-950/85 backdrop-blur-xl' : 'bg-transparent'}`}>
      <div className="container-x flex h-[70px] items-center justify-between gap-4">
        <Link to="/" aria-label="Legacy Cloud home" className="shrink-0"><Logo /></Link>

        <div className="hidden lg:block">
          <LiquidNavbar
            tone="dark"
            compact={!wide}
            active={activeNav}
            items={navLinks.map(({ label, icon, fx }) => ({ label, icon, fx }))}
            onChange={(i) => navigate(navLinks[i].to)}
          />
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
          <NotificationBell />
          <Link to="/checkout" className="btn-icon relative" aria-label={`Cart (${count} items)`}>
            <Icon name="cart" size={19} />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-1 text-[10px] font-bold text-ink-950">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-glass !px-4 !py-2.5">
                <Icon name="user" size={16} /> {user.role === 'admin' ? 'Admin' : 'Dashboard'}
              </Link>
              <button onClick={handleLogout} className="btn-icon" title="Sign out" aria-label="Sign out">
                <Icon name="logout" size={18} />
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="btn-glass !px-4 !py-2.5">Sign in</Link>
              <Link to="/plans" className="btn-aurora !px-4 !py-2.5">Get Started</Link>
            </div>
          )}

          <button className="btn-icon lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={open}>
            <Icon name={open ? 'x' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink-950/95 px-5 pb-5 pt-3 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
            {user ? (
              <>
                <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-glass">Dashboard</Link>
                <button onClick={handleLogout} className="btn-soft">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-glass">Sign in</Link>
                <Link to="/plans" className="btn-aurora">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const { data } = useContent();
  const footer = data?.footer || {};
  const branding = data?.branding || {};
  const discordUrl = branding.discord_url || footer.discord_url;
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-950/70">
      <div className="container-x py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">{footer.tagline}</p>
            <div className="mt-5 flex gap-2">
              {[
                { href: discordUrl, icon: 'discord', label: 'Discord' },
                { href: 'https://twitter.com/', icon: 'twitter', label: 'Twitter' },
                { href: 'https://github.com/', icon: 'github', label: 'GitHub' },
                { href: `mailto:${footer.support_email || 'support@legacycloud.gg'}`, icon: 'mail', label: 'Email' },
              ].map((s) => (
                <a key={s.label} href={s.href || '#'} target="_blank" rel="noreferrer" aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-300">
                  <Icon name={s.icon} size={17} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Hosting</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link to="/plans?category=intel" className="hover:text-cyan-300">Intel Hosting</Link></li>
              <li><Link to="/plans?category=amd" className="hover:text-cyan-300">AMD Hosting</Link></li>
              <li><Link to="/plans?category=infinity" className="hover:text-cyan-300">Infinity Servers</Link></li>
              <li><Link to="/plans" className="hover:text-cyan-300">Compare Plans</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link to="/minecraft" className="hover:text-cyan-300">Minecraft guide</Link></li>
              <li><Link to="/#why" className="hover:text-cyan-300">Why Legacy Cloud</Link></li>
              <li><Link to="/#faq" className="hover:text-cyan-300">FAQ</Link></li>
              <li><Link to="/status" className="hover:text-cyan-300">Service Status</Link></li>
              <li><Link to="/contact" className="hover:text-cyan-300">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Support</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a href={discordUrl || '#'} target="_blank" rel="noreferrer" className="hover:text-cyan-300">Discord community</a></li>
              <li><a href={`mailto:${footer.support_email || 'support@legacycloud.gg'}`} className="hover:text-cyan-300">{footer.support_email || 'support@legacycloud.gg'}</a></li>
              <li><Link to="/dashboard/support" className="hover:text-cyan-300">Open a ticket</Link></li>
              <li><Link to="/login" className="hover:text-cyan-300">Customer login</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} Legacy Cloud. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/terms" className="hover:text-slate-300">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> All systems operational</span>
          </div>
        </div>
        <p className="lg-footer-word" aria-hidden="true">LEGACY CLOUD</p>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);

  return (
    <div className="relative z-[1] flex min-h-screen flex-col">
      <CustomCursor />
      <ButtonFX />
      <AnnouncementBar />
      <PromoBar />
      <Navbar />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
