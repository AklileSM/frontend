import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DarkModeSwitcher from '../components/Header/DarkModeSwitcher';

/* ─── animation keyframes + reveal helpers (injected once) ─────────── */
const STYLES = `
  @keyframes lp-float  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-10px)} }
  @keyframes lp-ring   { 0%{transform:scale(1);opacity:.7}   100%{transform:scale(2.6);opacity:0} }
  @keyframes lp-scan   { 0%{top:-4px}                        100%{top:110%} }
  @keyframes lp-blink  { 0%,100%{opacity:1}                  50%{opacity:.1} }
  @keyframes lp-grad   { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
  @keyframes lp-dash   { from{stroke-dashoffset:500}         to{stroke-dashoffset:0} }
  @keyframes lp-ctr    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  @keyframes lp-shimmer{ 0%{left:-80%} 100%{left:120%} }

  .lp-reveal {
    opacity: 0;
    transform: translateY(28px);
    transition: opacity .65s cubic-bezier(.22,1,.36,1), transform .65s cubic-bezier(.22,1,.36,1);
  }
  .lp-reveal.lp-in { opacity: 1; transform: none; }
  .lp-d1{transition-delay:.09s} .lp-d2{transition-delay:.17s}
  .lp-d3{transition-delay:.25s} .lp-d4{transition-delay:.33s} .lp-d5{transition-delay:.41s}
  .lp-float      { animation: lp-float 4.5s ease-in-out infinite; }
  .lp-float-slow { animation: lp-float 7s   ease-in-out 1s infinite; }
`;

/* ─── scroll-reveal wrapper ─────────────────────────────────────────── */
function Reveal({
  delay = 0,
  className = '',
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('lp-reveal');
    if (delay) el.style.transitionDelay = `${delay}s`;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('lp-in'); obs.disconnect(); } },
      { threshold: 0.08 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

/* ─── animated counter ──────────────────────────────────────────────── */
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const dur = 1200;
      const tick = (now: number) => {
        const p = Math.min((now - start) / dur, 1);
        setVal(Math.round(p * p * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref} style={{ animation: 'lp-ctr .5s ease both' }}>{val}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════
   NAV
═══════════════════════════════════════════════════════════════════════ */
const NAV_LINKS = [
  { href: '#model',   label: 'Data model' },
  { href: '#viewers', label: 'Viewers' },
  { href: '#reports', label: 'Reports' },
  { href: '#access',  label: 'Access' },
];

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-200 ${
      scrolled
        ? 'border-b border-stroke bg-white/90 backdrop-blur dark:border-strokedark dark:bg-boxdark-2/90'
        : 'border-b border-transparent'
    }`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white">S</span>
          <span className="text-[15px] font-semibold tracking-tight text-black dark:text-white">SiteScope</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}
               className="text-sm font-medium text-body transition hover:text-primary dark:text-bodydark dark:hover:text-white">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ul className="m-0 list-none p-0"><DarkModeSwitcher /></ul>
          <Link to="/login"
                className="hidden rounded-md px-4 py-2 text-sm font-medium text-body transition hover:text-primary dark:text-bodydark sm:block">
            Sign in
          </Link>
          <Link to="/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 lg:pt-36">
      {/* dot grid */}
      <div className="pointer-events-none absolute inset-0"
           style={{ backgroundImage:'radial-gradient(rgba(60,80,224,0.16) 1px,transparent 1px)', backgroundSize:'28px 28px' }} />
      {/* glow orbs */}
      <div className="pointer-events-none absolute -left-40 -top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-[28rem] w-[28rem] rounded-full bg-meta-3/10 blur-3xl dark:bg-primary/10" />

      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        {/* left */}
        <div>
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation:'lp-blink 2s ease-in-out infinite' }} />
            Construction documentation platform
          </div>
          <h1 className="text-[42px] font-bold leading-[1.04] tracking-tight text-black dark:text-white sm:text-5xl xl:text-[60px]">
            One timeline for every capture taken on site.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.75] text-body dark:text-bodydark">
            Photos, panoramas, videos, point clouds, and field reports — organised by room and
            date, each opening in the right viewer, all turning into defensible documentation.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register"
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
              Get started
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link to="/login"
                  className="inline-flex rounded-md border border-stroke px-6 py-3 text-sm font-semibold transition hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark">
              Sign in
            </Link>
            <a href="#model"
               className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-medium text-body transition hover:text-primary dark:text-bodydark">
              How it works
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2v10M3 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
          {/* stats */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { target: 5,   suffix: '',   label: 'Format viewers' },
              { target: 100, suffix: '%',  label: 'Traceable context' },
              { target: 360, suffix: '°',  label: 'Panoramic captures' },
            ].map(s => (
              <div key={s.label}
                   className="rounded-xl border border-stroke bg-white/90 px-3 py-4 text-center shadow-card dark:border-strokedark dark:bg-boxdark">
                <p className="text-[28px] font-bold text-primary">
                  <Counter target={s.target} suffix={s.suffix} />
                </p>
                <p className="mt-1 text-[11px] text-body dark:text-bodydark">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* right — platform preview */}
        <div className="lp-float">
          <PlatformPreviewCard />
        </div>
      </div>
    </section>
  );
}

/* ── platform preview card ────────────────────────────────────────────── */
function PlatformPreviewCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-stroke bg-white shadow-4 dark:border-strokedark dark:bg-boxdark">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-stroke bg-gray-2 px-4 py-3 dark:border-strokedark dark:bg-boxdark-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger/60" />
          <span className="h-3 w-3 rounded-full bg-warning/60" />
          <span className="h-3 w-3 rounded-full bg-success/60" />
        </div>
        <div className="mx-auto flex items-center gap-2 rounded-md border border-stroke bg-white px-3 py-1 text-[11px] text-body dark:border-strokedark dark:bg-boxdark dark:text-bodydark">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
          sitescope.io/A6_Stern
        </div>
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-stroke dark:bg-strokedark" />
          <span className="h-3 w-3 rounded-full bg-stroke dark:bg-strokedark" />
        </div>
      </div>
      {/* app header bar */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-2.5 dark:border-strokedark">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">File Explorer</span>
        <div className="flex gap-1">
          {['Images','Video','PCD','PDF'].map((t,i) => (
            <span key={t} className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              i === 0 ? 'bg-primary/10 text-primary' : 'text-body dark:text-bodydark'
            }`}>{t}</span>
          ))}
        </div>
      </div>
      {/* date selector */}
      <div className="flex items-center gap-2.5 border-b border-stroke bg-gray-2 px-4 py-2 dark:border-strokedark dark:bg-boxdark-2">
        <span className="text-[10px] uppercase tracking-widest text-body dark:text-bodydark">capture_date</span>
        <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
          2024-10-18
        </span>
        <div className="ml-auto flex gap-1">
          {[1,2,3,4,5].map(i => <span key={i} className="h-1.5 w-1.5 rounded-full bg-stroke dark:bg-strokedark" />)}
        </div>
      </div>
      {/* file grid with scan line */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
             style={{ animation:'lp-scan 3.5s linear infinite', top:0 }} />
        {[
          { name:'Room 2', count:4, types:['IMG','IMG','VID','IMG'] },
          { name:'Room 3', count:3, types:['IMG','PCD','PDF'] },
          { name:'Room 4', count:2, types:['IMG','IMG'] },
        ].map(room => (
          <div key={room.name} className="border-b border-stroke px-4 py-3 dark:border-strokedark">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-black dark:text-white">{room.name}</span>
              <span className="font-mono text-[10px] text-body dark:text-bodydark">{room.count} files</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {room.types.map((type, i) => <PreviewThumb key={i} type={type} />)}
            </div>
          </div>
        ))}
        {/* status bar */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <span className="h-2 w-2 rounded-full bg-success" style={{ animation:'lp-ring 2s ease-out infinite' }} />
          <span className="text-[10px] text-body dark:text-bodydark">Processing 1 point cloud…</span>
          <div className="relative ml-auto h-1 w-24 overflow-hidden rounded-full bg-stroke dark:bg-strokedark">
            <div className="absolute inset-y-0 left-0 w-[62%] rounded-full bg-primary">
              <div className="absolute inset-y-0 w-8 bg-white/30"
                   style={{ animation:'lp-shimmer 1.4s linear infinite', left:'-80%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewThumb({ type }: { type: string }) {
  return (
    <div className={`relative aspect-square overflow-hidden rounded ring-1 ring-stroke dark:ring-strokedark ${
      type==='IMG' ? 'bg-primary/10' : type==='PCD' ? 'bg-meta-3/15' : type==='VID' ? 'bg-meta-5/15' : 'bg-meta-6/15'
    }`}>
      {type==='IMG' && <div className="absolute inset-x-0 top-1/2 h-px bg-stroke dark:bg-strokedark" />}
      {type==='VID' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2.5 w-2.5 translate-x-px rotate-90 bg-meta-5/80"
               style={{ clipPath:'polygon(50% 0%,0% 100%,100% 100%)' }} />
        </div>
      )}
      {type==='PCD' && (
        <div className="absolute inset-1 grid grid-cols-4 gap-0.5 opacity-70">
          {Array.from({length:8}).map((_,i) => (
            <span key={i} className="block h-0.5 w-0.5 rounded-full bg-meta-3" />
          ))}
        </div>
      )}
      {type==='PDF' && (
        <div className="absolute inset-1.5 flex flex-col gap-1">
          <span className="block h-0.5 w-3/4 rounded bg-warning/70" />
          <span className="block h-0.5 w-1/2 rounded bg-warning/50" />
        </div>
      )}
      <span className="absolute right-0.5 top-0.5 rounded bg-black/40 px-0.5 text-[7px] text-white">{type}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FEATURES
═══════════════════════════════════════════════════════════════════════ */
const FEATURES = [
  {
    eyebrow:'Data model',
    title:'Room and date archive',
    desc:'Every upload is keyed by room_slug and capture_date. Browse by room or by date — same data, different lens.',
    icon:(
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
        <rect x="3" y="6" width="22" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M3 12h22" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M9 6V4M14 6V4M19 6V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M8 17h4M16 17h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    eyebrow:'Viewers',
    title:'Five format viewers',
    desc:'Image, 360° panorama, video, point cloud, and PDF — each opens in a dedicated viewer with the same annotation panel.',
    icon:(
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8"/>
        <ellipse cx="14" cy="14" rx="10" ry="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4 14h20" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="14" cy="14" r="2.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    eyebrow:'Reports',
    title:'Observation to PDF',
    desc:'Annotate in the viewer, flag safety or quality issues, save a draft or publish a report PDF — all in one surface.',
    icon:(
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
        <rect x="6" y="3" width="16" height="22" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M10 9h8M10 13h8M10 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17 19l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    eyebrow:'Access',
    title:'Three-role access',
    desc:'Admin, manager, and viewer roles. Permissions are read live from the database on every request — no token refresh.',
    icon:(
      <svg viewBox="0 0 28 28" width="28" height="28" fill="none">
        <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="19" cy="9" r="4" stroke="currentColor" strokeWidth="1.8"/>
        <path d="M3 23c0-3.866 2.686-7 6-7s6 3.134 6 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M19 16c2.5 0 5 2 5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function FeatureCard({ f, delay }: { f: typeof FEATURES[0]; delay: number }) {
  return (
    <Reveal delay={delay} className="group rounded-2xl border border-stroke bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-4 dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
        {f.icon}
      </div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">{f.eyebrow}</p>
      <h3 className="text-base font-semibold text-black dark:text-white">{f.title}</h3>
      <p className="mt-2 text-sm leading-6 text-body dark:text-bodydark">{f.desc}</p>
      <div className="mt-5 h-px overflow-hidden bg-stroke dark:bg-strokedark">
        <div className="h-full w-0 bg-primary transition-[width] duration-500 group-hover:w-full" />
      </div>
    </Reveal>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="border-t border-stroke py-24 dark:border-strokedark">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary/60" /> Platform
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
            Built for field documentation teams.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-body dark:text-bodydark">
            From first upload to published report, every capture stays connected to the room it came from.
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f, i) => <FeatureCard key={f.title} f={f} delay={i * 0.08} />)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA MODEL — explorer wireframes
═══════════════════════════════════════════════════════════════════════ */
type WFKind = 'by-room' | 'by-date';

function WFThumb({ idx, kind, sIdx }: { idx: number; kind: WFKind; sIdx: number }) {
  const types = ['IMG','IMG','IMG','PCD','VID','PDF'];
  const t = types[(idx + sIdx + (kind === 'by-room' ? 0 : 1)) % types.length];
  return (
    <div className={`relative aspect-square overflow-hidden rounded ring-1 ring-stroke dark:ring-strokedark ${
      t==='IMG' ? 'bg-primary/10' : t==='PCD' ? 'bg-meta-3/15' : t==='VID' ? 'bg-meta-5/15' : 'bg-meta-6/15'
    }`}>
      {t==='IMG' && <div className="absolute inset-x-0 top-1/2 h-px bg-stroke dark:bg-strokedark" />}
      {t==='PCD' && (
        <div className="absolute inset-1 grid grid-cols-4 gap-0.5 opacity-70">
          {Array.from({length:8}).map((_,j) => <span key={j} className="block h-0.5 w-0.5 rounded-full bg-meta-3" />)}
        </div>
      )}
      {t==='VID' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2.5 w-2.5 translate-x-px rotate-90 bg-meta-5/80"
               style={{ clipPath:'polygon(50% 0%,0% 100%,100% 100%)' }} />
        </div>
      )}
      {t==='PDF' && (
        <div className="absolute inset-1.5 flex flex-col gap-1">
          <span className="block h-0.5 w-3/4 rounded bg-warning/70" />
          <span className="block h-0.5 w-1/2 rounded bg-warning/50" />
        </div>
      )}
      <span className="absolute right-0.5 top-0.5 rounded bg-black/40 px-0.5 text-[7px] text-white">{t}</span>
    </div>
  );
}

function ExplorerWireframe({
  kind, label, scope, primary, primaryNote, sections,
}: {
  kind: WFKind; label: string; scope: string;
  primary: string; primaryNote: string; sections: string[];
}) {
  return (
    <Reveal>
      <div className="group overflow-hidden rounded-xl border border-stroke bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-4 dark:border-strokedark dark:bg-boxdark">
        {/* title bar */}
        <div className="flex items-center justify-between border-b border-stroke bg-gray-2 px-5 py-3.5 dark:border-strokedark dark:bg-boxdark-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">{label}</span>
            <span className="text-[11px] text-body dark:text-bodydark">{scope}</span>
          </div>
          <div className="flex items-center gap-1">
            {['Images','Video','PCD','PDF'].map((t,i) => (
              <span key={t} className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                i===0 ? 'bg-primary/10 text-primary' : 'text-body dark:text-bodydark'
              }`}>{t}</span>
            ))}
          </div>
        </div>
        {/* selector strip */}
        <div className="flex items-center gap-3 border-b border-stroke px-5 py-3 dark:border-strokedark">
          <span className="text-[10px] uppercase tracking-widest text-body dark:text-bodydark">{primaryNote}</span>
          <span className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-xs font-semibold text-primary">
            {primary}
          </span>
          <div className="ml-auto flex gap-1">
            {Array.from({length:5}).map((_,i) => <span key={i} className="block h-1.5 w-1.5 rounded-full bg-stroke dark:bg-strokedark" />)}
          </div>
        </div>
        {/* sections */}
        <div className="divide-y divide-stroke dark:divide-strokedark">
          {sections.map((name,sIdx) => (
            <div key={name} className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-black dark:text-white">{name}</span>
                <span className="font-mono text-[10px] text-body dark:text-bodydark">
                  {kind==='by-room' ? `${2+(sIdx%2)} files` : `${1+(sIdx%3)} files`}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({length:6}).map((_,i) => <WFThumb key={i} idx={i} kind={kind} sIdx={sIdx} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function DataModelSection() {
  return (
    <section id="model" className="border-t border-stroke bg-gray-2/50 py-24 dark:border-strokedark dark:bg-boxdark/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary/60" /> Data model
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white md:text-4xl">Two views. One pivot.</h2>
          <p className="mt-4 text-[16px] leading-7 text-body dark:text-bodydark">
            Every file is keyed by{' '}
            <code className="rounded border border-stroke bg-white px-1.5 py-0.5 font-mono text-sm dark:border-strokedark dark:bg-boxdark">
              (room_slug, capture_date, media_type)
            </code>
            . The explorer offers two lenses: hold a date and group by room, or hold a room and group by date.
          </p>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <ExplorerWireframe kind="by-room" label="File explorer" scope="One date · all rooms"
            primary="2024-10-18" primaryNote="capture_date"
            sections={['Room 2','Room 3','Room 4','Room 5']} />
          <ExplorerWireframe kind="by-date" label="Room explorer" scope="One room · all dates"
            primary="Room 2" primaryNote="room_slug"
            sections={['2024-10-09','2024-10-14','2024-10-16','2024-10-18']} />
        </div>
        <Reveal className="mt-8 text-center">
          <p className="font-mono text-xs text-body dark:text-bodydark">
            Wireframes only — both views render with real thumbnails when you sign in.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   VIEWERS
═══════════════════════════════════════════════════════════════════════ */
function ImageVisual() {
  return (
    <svg viewBox="0 0 240 100" className="h-full w-full" role="img">
      <rect x="20" y="14" width="200" height="72" rx="2" fill="#1A222C" stroke="#2E3A47"/>
      <line x1="20" y1="55" x2="220" y2="55" stroke="#2E3A47" strokeWidth="0.8"/>
      {[{x:72,y:38},{x:132,y:68},{x:180,y:30}].map((p,i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#3C50E0"/>
          <circle cx={p.x} cy={p.y} r="6.5" fill="none" stroke="#3C50E0" strokeOpacity="0.35"/>
        </g>
      ))}
      <g transform="translate(187 60)">
        <circle cx="0" cy="0" r="6" fill="none" stroke="#64748B"/>
        <line x1="4" y1="4" x2="9" y2="9" stroke="#64748B" strokeWidth="1.3"/>
      </g>
    </svg>
  );
}

function PanoramaVisual() {
  return (
    <svg viewBox="0 0 240 100" className="h-full w-full" role="img">
      <defs>
        <radialGradient id="pano-g" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(60,80,224,0.22)"/>
          <stop offset="100%" stopColor="rgba(60,80,224,0)"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="50" r="36" fill="url(#pano-g)"/>
      <circle cx="120" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.15)"/>
      {[-28,-14,0,14,28].map(deg => (
        <ellipse key={deg} cx="120" cy="50" rx={36*Math.cos(deg*Math.PI/180)} ry="36"
          fill="none" stroke={deg===0?'rgba(60,80,224,0.55)':'rgba(255,255,255,0.1)'}
          strokeWidth={deg===0?.9:.4}/>
      ))}
      {[-24,-12,0,12,24].map(y => (
        <ellipse key={y} cx="120" cy={50+y} rx={Math.sqrt(Math.max(0,36*36-y*y))} ry="3"
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
      ))}
      <circle cx="120" cy="50" r="2.5" fill="#3C50E0"/>
    </svg>
  );
}

function VideoVisual() {
  return (
    <svg viewBox="0 0 240 100" className="h-full w-full" role="img">
      <rect x="30" y="12" width="180" height="62" rx="2" fill="#1A222C" stroke="#2E3A47"/>
      <polygon points="115,30 115,56 138,43" fill="#3C50E0"/>
      <rect x="30" y="80" width="180" height="6" rx="3" fill="#2E3A47"/>
      <rect x="30" y="80" width="66" height="6" rx="3" fill="#3C50E0"/>
      <circle cx="96" cy="83" r="4" fill="#3C50E0"/>
      <text x="30" y="98" fontSize="7" fontFamily="monospace" fill="#64748B">0:24</text>
      <text x="210" y="98" textAnchor="end" fontSize="7" fontFamily="monospace" fill="#64748B">1:12</text>
    </svg>
  );
}

function PcdVisual() {
  const pts = Array.from({length:48},(_,i)=>({
    x: 12 + ((i*37+11) % 86),
    y: 8  + ((i*53+7)  % 72),
    r: 0.8 + (i%3)*0.6,
    c: i%7===0?'#3C50E0': i%4===0?'#10B981':'rgba(174,183,192,0.5)',
    d: `${1.2+(i%5)*0.5}s`,
  }));
  return (
    <div className="relative h-full w-full overflow-hidden bg-boxdark-2">
      {pts.map((p,i) => (
        <span key={i} style={{
          position:'absolute', left:`${p.x}%`, top:`${p.y}%`,
          width:`${p.r*2}px`, height:`${p.r*2}px`,
          borderRadius:'50%', background:p.c,
          animation:`lp-blink ${p.d} ease-in-out ${(i%7)*.15}s infinite`,
        }}/>
      ))}
    </div>
  );
}

function PdfVisual() {
  return (
    <svg viewBox="0 0 240 100" className="h-full w-full" role="img">
      <rect x="80" y="8" width="80" height="84" rx="2" fill="#1A222C" stroke="#2E3A47"/>
      <rect x="88" y="18" width="38" height="4" rx="1.5" fill="#3C50E0"/>
      <rect x="88" y="27" width="64" height="2.5" rx="1" fill="#2E3A47"/>
      {[35,44,53,62,71].map(y => (
        <rect key={y} x="88" y={y} width={y%9===0?64:54} height="2" rx="1" fill="#1d2a39"/>
      ))}
      <rect x="88" y="78" width="24" height="6" rx="1.5" fill="rgba(60,80,224,0.4)"/>
      <text x="120" y="96" textAnchor="middle" fontSize="6.5" fontFamily="monospace" fill="#64748B">
        report.pdf
      </text>
    </svg>
  );
}

const VIEWERS = [
  { label:'01', name:'Image viewer',      types:'JPG · PNG',           info:'Zoom, pan, drop annotation pins. AI analysis on demand.', visual:<ImageVisual /> },
  { label:'02', name:'360° viewer',       types:'Equirectangular JPG', info:'Three.js sphere with orbit controls and persistent annotations.', visual:<PanoramaVisual /> },
  { label:'03', name:'Video player',      types:'MP4 · WEBM · MOV',    info:'HTML5 player with auth headers. Observations logged against timestamp.', visual:<VideoVisual /> },
  { label:'04', name:'Point cloud viewer',types:'LAS · LAZ',           info:'Converted to Potree server-side. Embedded viewer with the report overlay.', visual:<PcdVisual /> },
  { label:'05', name:'PDF viewer',        types:'PDF',                 info:'Field reports stream through the same auth path as media files.', visual:<PdfVisual /> },
];

function ViewerCard({ v, delay }: { v: typeof VIEWERS[0]; delay: number }) {
  return (
    <Reveal delay={delay}
            className="group flex flex-col overflow-hidden rounded-xl border border-stroke bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-4 dark:border-strokedark dark:bg-boxdark">
      <div className="h-36 overflow-hidden border-b border-stroke bg-boxdark-2 transition-colors group-hover:border-primary/30 dark:border-strokedark">
        {v.visual}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-primary">{v.label}</span>
        <h3 className="mt-1 text-base font-semibold text-black dark:text-white">{v.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-[1.65] text-body dark:text-bodydark">{v.info}</p>
        <div className="mt-4 flex items-center gap-2 border-t border-stroke pt-3 dark:border-strokedark">
          <span className="text-[10px] font-bold uppercase tracking-widest text-body dark:text-bodydark">Accepts</span>
          <code className="rounded bg-gray-2 px-1.5 py-0.5 font-mono text-[11px] dark:bg-boxdark-2">{v.types}</code>
        </div>
      </div>
    </Reveal>
  );
}

function ViewersSection() {
  return (
    <section id="viewers" className="border-t border-stroke py-24 dark:border-strokedark">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary/60" /> Viewers
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
            Five viewers. One report builder.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-body dark:text-bodydark">
            Each capture format opens in a viewer that understands it. The same annotation and report panel attaches to all of them.
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {VIEWERS.map((v,i) => <ViewerCard key={v.name} v={v} delay={i*0.07} />)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   REPORT LOOP
═══════════════════════════════════════════════════════════════════════ */
const STEPS = [
  { n:'01', title:'Open',    body:'Click any capture from the timeline grid to launch the matching viewer.',          notes:['Static · Panorama · Video · PCD · PDF'] },
  { n:'02', title:'Observe', body:'Place annotation pins, run AI analysis on the frame, type manual observations.',  notes:['AI image analysis','free-text observations'] },
  { n:'03', title:'Flag',    body:"Mark the report with your team's categories: safety, quality, schedule.",         notes:['safety_issue','quality_issue','schedule_delayed'] },
  { n:'04', title:'Publish', body:'Save a draft to return to later, or publish a PDF — both use the same form.',     notes:['save_draft','publish_report'] },
];

function ReportStep({ s, delay, last }: { s: typeof STEPS[0]; delay: number; last: boolean }) {
  return (
    <Reveal delay={delay}
            className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-stroke bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-4 dark:border-strokedark dark:bg-boxdark">
      <div className="flex items-start justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-primary">{s.n}</span>
        {!last && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-stroke opacity-0 transition group-hover:opacity-100 dark:text-strokedark">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <h3 className="mt-3 text-xl font-bold tracking-tight text-black dark:text-white">{s.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-[1.65] text-body dark:text-bodydark">{s.body}</p>
      <ul className="mt-5 space-y-2 border-t border-stroke pt-4 dark:border-strokedark">
        {s.notes.map(n => (
          <li key={n} className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-primary/50" />
            <code className="rounded bg-gray-2 px-1.5 py-0.5 font-mono text-[11px] dark:bg-boxdark-2">{n}</code>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

function ReportLoopSection() {
  return (
    <section id="reports" className="border-t border-stroke bg-gray-2/50 py-24 dark:border-strokedark dark:bg-boxdark/20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary/60" /> Report loop
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
            What you do with a capture, and what comes out.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-body dark:text-bodydark">
            The viewer panel is the same surface for notes, AI help, and the final PDF. Drafts and reports share the same schema.
          </p>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((s,i) => <ReportStep key={s.n} s={s} delay={i*0.08} last={i===STEPS.length-1} />)}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROLES
═══════════════════════════════════════════════════════════════════════ */
const ROLE_MATRIX = {
  admin:   { browse:true,  upload:true,  delete:true,  reports:true    },
  manager: { browse:true,  upload:false, delete:true,  reports:'self'  },
  viewer:  { browse:true,  upload:false, delete:false, reports:'self'  },
} as const;

const ROLE_DEFS = [
  { key:'admin'   as const, name:'Admin',   sub:'First user on a project becomes admin' },
  { key:'manager' as const, name:'Manager', sub:'Reviews captures, deletes incorrect uploads' },
  { key:'viewer'  as const, name:'Viewer',  sub:'Read-only field access' },
];

const CAPS = [
  { key:'browse'  as const, label:'Browse',  note:'Open the timeline and viewers' },
  { key:'upload'  as const, label:'Upload',  note:'Add captures to a project' },
  { key:'delete'  as const, label:'Delete',  note:'Remove file assets' },
  { key:'reports' as const, label:'Reports', note:'Publish and download PDFs' },
];

function PermMark({ value }: { value: boolean | 'self' }) {
  if (value === true)
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l3.5 3.5 6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  if (value === 'self')
    return (
      <span className="inline-flex h-7 items-center rounded-md bg-gray-2 px-2.5 font-mono text-[10px] uppercase tracking-wide text-body dark:bg-boxdark-2 dark:text-bodydark">
        Own only
      </span>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-2 text-body dark:bg-boxdark-2 dark:text-bodydark">
      <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
        <path d="M1 1h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </span>
  );
}

function RolesSection() {
  return (
    <section id="access" className="border-t border-stroke py-24 dark:border-strokedark">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="h-px w-6 bg-primary/60" /> Access
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white md:text-4xl">
            Three roles. Permissions read live from the database.
          </h2>
          <p className="mt-4 text-[16px] leading-7 text-body dark:text-bodydark">
            The{' '}
            <code className="rounded border border-stroke bg-white px-1.5 py-0.5 font-mono text-sm dark:border-strokedark dark:bg-boxdark">
              role
            </code>{' '}
            claim in the JWT is ignored on the server — authorisation always reads the live user row, so permission changes take effect immediately.
          </p>
        </Reveal>
        <Reveal>
          <div className="overflow-hidden rounded-xl border border-stroke shadow-card dark:border-strokedark">
            <table className="w-full border-collapse bg-white dark:bg-boxdark">
              <thead>
                <tr className="border-b border-stroke dark:border-strokedark">
                  <th className="w-[28%] px-6 py-4 text-left font-mono text-[10px] uppercase tracking-widest text-body dark:text-bodydark">
                    Role
                  </th>
                  {CAPS.map(c => (
                    <th key={c.key} className="px-6 py-4 text-left">
                      <div className="text-sm font-semibold text-black dark:text-white">{c.label}</div>
                      <div className="mt-0.5 text-[11px] text-body dark:text-bodydark">{c.note}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_DEFS.map(r => (
                  <tr key={r.key} className="border-b border-stroke transition-colors last:border-b-0 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark-2">
                    <th scope="row" className="px-6 py-5 text-left">
                      <div className="text-sm font-semibold text-black dark:text-white">{r.name}</div>
                      <div className="mt-0.5 text-xs text-body dark:text-bodydark">{r.sub}</div>
                    </th>
                    {CAPS.map(c => (
                      <td key={c.key} className="px-6 py-5">
                        <PermMark value={ROLE_MATRIX[r.key][c.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CTA
═══════════════════════════════════════════════════════════════════════ */
function CTASection() {
  return (
    <section className="border-t border-stroke py-24 dark:border-strokedark">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl px-10 py-16 text-center"
               style={{
                 background:'linear-gradient(135deg,#3C50E0 0%,#259AE6 50%,#10B981 100%)',
                 backgroundSize:'200% 200%',
                 animation:'lp-grad 8s ease infinite',
               }}>
            {/* grid overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-20"
                 style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.3) 1px,transparent 1px)', backgroundSize:'22px 22px' }} />
            {/* pulsing ring */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-[28rem] w-[28rem] rounded-full border border-white/10"
                   style={{ animation:'lp-ring 4s ease-out infinite' }} />
            </div>
            <div className="relative">
              <p className="mb-4 font-mono text-xs uppercase tracking-widest text-white/70">Ready to start?</p>
              <h2 className="text-3xl font-bold text-white md:text-4xl xl:text-[48px]">
                Centralise your site evidence today.
              </h2>
              <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-7 text-white/80">
                Give your team one place to upload, inspect, and report construction progress from every room on site.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link to="/register"
                      className="inline-flex items-center gap-2 rounded-md bg-white px-7 py-3.5 text-sm font-bold text-primary transition hover:opacity-90">
                  Create account
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
                <Link to="/login"
                      className="inline-flex rounded-md border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════════════════ */
function LandingFooter() {
  return (
    <footer className="border-t border-stroke bg-white py-8 dark:border-strokedark dark:bg-boxdark">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-white">S</span>
          <span className="text-sm font-semibold text-black dark:text-white">SiteScope</span>
          <span className="text-sm text-body dark:text-bodydark">— construction documentation.</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/login" className="text-sm text-body transition hover:text-primary dark:text-bodydark">Sign in</Link>
          <Link to="/register" className="text-sm font-semibold text-primary transition hover:opacity-80">Get started →</Link>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE ROOT
═══════════════════════════════════════════════════════════════════════ */
const PublicLandingPage: React.FC = () => (
  <>
    <style>{STYLES}</style>
    <div className="min-h-screen overflow-x-hidden bg-white text-black dark:bg-boxdark-2 dark:text-white">
      <LandingNav />
      <Hero />
      <FeaturesSection />
      <DataModelSection />
      <ViewersSection />
      <ReportLoopSection />
      <RolesSection />
      <CTASection />
      <LandingFooter />
    </div>
  </>
);

export default PublicLandingPage;
