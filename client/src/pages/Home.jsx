import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useContent } from '../context/ContentContext';
import { useCart } from '../context/CartContext';
import { useToast, SectionHeading, Badge, HomeSkeleton } from '../components/ui';
import Icon from '../components/icons';
import PlanCard from '../components/PlanCard';
import HeroMotion from '../components/HeroMotion';
import useReveal from '../hooks/useReveal';
import { useTheme } from '../context/themeContext';
import { isLegacy } from '../lib/themes';
import { AboutFacts, CtaBand, Explore, Guides, LegacyHero, LegacyHomeSkeleton, Premise, WorldsCarousel, WorldsPanel } from '../components/legacy';

const iconMap = ['bolt', 'shield', 'cpu', 'clock', 'headset', 'refresh'];

function Hero({ hero, stats }) {
  return (
    <section className="hero-section relative overflow-hidden pb-16 pt-12 sm:pt-20">
      <HeroMotion />
      <div className="pointer-events-none absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-violet-600/20 blur-[110px]" />
      <div className="pointer-events-none absolute -right-24 top-24 h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[110px]" />
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <span className="chip chip-live border-violet-400/30 bg-violet-500/10 text-violet-200">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" /></span>
            {hero?.eyebrow || 'Premium Minecraft Infrastructure'}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-[4.2rem]">
            <span className="text-gradient-animated">{hero?.headline || 'Power Your Gaming World.'}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-400">
            {hero?.subtitle || 'Premium Minecraft Hosting at Affordable Prices.'} Deploy on modern Intel and AMD Ryzen nodes with NVMe storage and always-on DDoS protection.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/plans" className="btn-primary !px-6 !py-3.5">
              {hero?.primary_cta || 'Get Started'} <Icon name="arrow" size={17} />
            </Link>
            <Link to="/plans#compare" className="btn-ghost !px-6 !py-3.5">
              {hero?.secondary_cta || 'View Plans'}
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            {['NVMe storage', 'DDoS protection', 'Pterodactyl panel', 'No player limits'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5"><Icon name="check" size={13} className="text-cyan-400" /> {item}</span>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-up delay-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-card">
            <img src="/images/hero-world.jpg" alt="A neon-lit voxel Minecraft world hosted on Legacy Cloud" className="h-[340px] w-full object-cover sm:h-[420px]" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
            <div className="absolute inset-x-4 bottom-4">
              <div className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><Icon name="server" size={17} /></span>
                  <div>
                    <p className="text-xs font-semibold text-white">Network status</p>
                    <p className="text-[11px] text-slate-400">All nodes operational</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                </span>
              </div>
            </div>
          </div>
          <div className="glass absolute -left-4 top-6 hidden animate-float rounded-xl px-4 py-3 sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Active servers</p>
            <p className="font-display text-xl font-bold text-white">{stats?.servers ?? 0}</p>
          </div>
          <div className="glass absolute -right-3 bottom-24 hidden animate-float rounded-xl px-4 py-3 [animation-delay:1.4s] sm:block">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Hosting plans</p>
            <p className="font-display text-xl font-bold text-white">{stats?.plans ?? 0}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBand({ stats }) {
  const items = [
    { label: 'Registered customers', value: stats?.customers ?? 0, icon: 'user' },
    { label: 'Servers deployed', value: stats?.servers ?? 0, icon: 'server' },
    { label: 'Active hosting plans', value: stats?.plans ?? 0, icon: 'layers' },
    { label: 'Paid orders processed', value: stats?.orders ?? 0, icon: 'billing' },
  ];
  return (
    <section className="container-x">
      <div className="glass grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="bg-ink-900/80 px-5 py-6 text-center">
            <span className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-lg bg-violet-500/10 text-violet-300"><Icon name={s.icon} size={16} /></span>
            <p className="font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-slate-600">Figures are pulled live from our database — no inflated marketing numbers.</p>
    </section>
  );
}

function PlanPreview({ plans, onAdd }) {
  const [category, setCategory] = useState('intel');
  const shown = plans.filter((p) => p.category === category).slice(0, 3);
  const tabs = [
    { id: 'intel', label: 'Intel', icon: 'cpu' },
    { id: 'amd', label: 'AMD Ryzen', icon: 'bolt' },
    { id: 'infinity', label: 'Infinity', icon: 'sparkles' },
  ];
  return (
    <section className="section-pad">
      <div className="container-x">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading center={false} eyebrow="Hosting plans" title="Pick the hardware that fits your world" subtitle="Every plan is database-backed and managed by our team. Prices update instantly when our admins change them." />
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setCategory(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition ${category === t.id ? 'border-violet-400/50 bg-violet-500/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
                <Icon name={t.icon} size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="stagger mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((plan) => <PlanCard key={plan.id} plan={plan} onAdd={onAdd} />)}
        </div>
        <div className="mt-8 text-center">
          <Link to="/plans" className="btn-ghost">View all plans & compare <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    </section>
  );
}

function WhyChoose({ block }) {
  if (!block) return null;
  return (
    <section id="why" className="section-pad relative scroll-mt-24">
      <div className="container-x">
        <SectionHeading eyebrow="Why Legacy Cloud" title={block.title} subtitle={block.subtitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.items?.map((item, i) => (
            <div key={item.title} className="glass card-hover reveal rounded-2xl p-6" style={{ transitionDelay: `${i * 50}ms` }}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 text-violet-300 ring-1 ring-violet-400/20">
                <Icon name={iconMap[i % iconMap.length]} size={21} />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features({ block }) {
  if (!block) return null;
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-ink-900/40 py-20">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="container-x relative">
        <SectionHeading eyebrow="Included by default" title={block.title} subtitle={block.subtitle} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.items?.map((item) => (
            <div key={item.title} className="glass-soft reveal flex gap-4 rounded-xl p-5">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-300"><Icon name="check" size={17} /></span>
              <div>
                <h3 className="text-base font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ testimonials }) {
  const { data: siteData } = useContent();
  const discordUrl = siteData?.branding?.discord_url || siteData?.footer?.discord_url || 'https://discord.gg/';
  return (
    <section className="section-pad">
      <div className="container-x">
        <SectionHeading eyebrow="Customer stories" title="Trusted by server owners" subtitle="Only reviews approved by our team appear here. We never invent customer quotes or ratings." />
        {testimonials?.length ? (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.id} className="glass reveal rounded-2xl p-6">
                <div className="flex gap-0.5 text-amber-300">
                  {Array.from({ length: t.rating }).map((_, i) => <Icon key={i} name="star" size={14} filled />)}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-300">“{t.quote}”</blockquote>
                <figcaption className="mt-4 border-t border-white/10 pt-3">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  {t.role && <p className="text-xs text-slate-500">{t.role}</p>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="glass-soft mx-auto mt-10 max-w-2xl rounded-2xl px-6 py-10 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Icon name="star" size={22} /></span>
            <h3 className="text-lg font-semibold">No published reviews yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              We are a new hosting provider and do not fabricate testimonials. Verified customer reviews appear here after they are approved by our team.
            </p>
            <a href={discordUrl} target="_blank" rel="noreferrer" className="btn-ghost mt-5"><Icon name="discord" size={16} /> Join our Discord</a>
          </div>
        )}
      </div>
    </section>
  );
}

function Faq({ block }) {
  const [open, setOpen] = useState(0);
  if (!block) return null;
  return (
    <section id="faq" className="section-pad scroll-mt-24 border-t border-white/10">
      <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading center={false} eyebrow="FAQ" title={block.title} subtitle={block.subtitle} />
          <div className="glass-soft mt-6 rounded-xl p-5">
            <p className="text-sm font-semibold text-white">Still stuck?</p>
            <p className="mt-1 text-sm text-slate-400">Our team answers tickets and Discord messages every day.</p>
            <Link to="/contact" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:underline">Contact support <Icon name="arrow" size={15} /></Link>
          </div>
        </div>
        <div className="space-y-2.5">
          {block.items?.map((item, i) => (
            <div key={item.q} className={`glass overflow-hidden rounded-xl transition ${open === i ? 'border-violet-400/30' : ''}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={open === i}>
                <span className="text-sm font-semibold text-white">{item.q}</span>
                <Icon name="chevron" size={17} className={`shrink-0 text-slate-400 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="border-t border-white/5 px-5 pb-5 pt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data, loading } = useContent();
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const { add } = useCart();
  const { push } = useToast();
  const { theme } = useTheme();
  const legacy = isLegacy(theme);
  const [panel, setPanel] = useState(false);
  const openPanel = useCallback(() => setPanel(true), []);
  const closePanel = useCallback(() => setPanel(false), []);
  useReveal([data, plans, legacy]);

  useEffect(() => {
    Promise.all([api.get('/plans', { auth: false }), api.get('/stats', { auth: false })])
      .then(([p, s]) => { setPlans(p.plans); setStats(s.stats); })
      .catch(() => {});
  }, []);

  function handleAdd(plan) {
    add(plan);
    push(`${plan.name} added to cart`, 'success');
  }

  if (loading && !data) return legacy ? <LegacyHomeSkeleton /> : <HomeSkeleton />;

  if (legacy) {
    const discordUrl = data?.branding?.discord_url || data?.footer?.discord_url || 'https://discord.gg/';
    return (
      <>
        <LegacyHero hero={data?.hero} />
        <WorldsCarousel onOpenPanel={openPanel} />
        <Premise />
        <Explore onOpenPanel={openPanel} />
        <PlanPreview plans={plans} onAdd={handleAdd} />
        <AboutFacts stats={stats} />
        <Guides />
        <WhyChoose block={data?.why_choose} />
        <Testimonials testimonials={data?.testimonials} />
        <Faq block={data?.faq} />
        <CtaBand discordUrl={discordUrl} />
        <WorldsPanel open={panel} onClose={closePanel} />
      </>
    );
  }

  return (
    <>
      <Hero hero={data?.hero} stats={stats} />
      <StatsBand stats={stats} />
      {data?.announcements?.length > 0 && (
        <section className="container-x mt-10">
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300"><Icon name="sparkles" size={15} /> Latest announcements</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {data.announcements.slice(0, 2).map((a) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <PlanPreview plans={plans} onAdd={handleAdd} />
      <WhyChoose block={data?.why_choose} />
      <Features block={data?.features} />
      <Testimonials testimonials={data?.testimonials} />
      <Faq block={data?.faq} />

      <section className="container-x pb-6">
        <div className="glass relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-violet-600/25 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-64 w-64 rounded-full bg-cyan-500/20 blur-[80px]" />
          <Badge tone="bg-cyan-500/10 text-cyan-300">Ready when you are</Badge>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Your next world deserves better hardware.</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">Choose a plan, check out, and our team provisions your node. Free migration included on every plan.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/plans" className="btn-primary !px-6">Browse hosting plans <Icon name="arrow" size={16} /></Link>
            <a href={data?.branding?.discord_url || data?.footer?.discord_url || 'https://discord.gg/'} target="_blank" rel="noreferrer" className="btn-ghost !px-6"><Icon name="discord" size={16} /> Join Discord</a>
          </div>
        </div>
      </section>
    </>
  );
}
