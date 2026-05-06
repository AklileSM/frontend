import React from 'react';
import { Link } from 'react-router-dom';
import DarkModeSwitcher from '../components/Header/DarkModeSwitcher';

const highlights = [
  {
    eyebrow: 'Data model',
    title: 'Room and date indexed archive',
    description:
      'Every capture is organized by room and date so teams can quickly answer what happened and when.',
  },
  {
    eyebrow: 'Viewers',
    title: 'Built-in viewers for field formats',
    description:
      'Open image, panorama, video, point cloud, and PDF files in dedicated viewers without leaving the platform.',
  },
  {
    eyebrow: 'Reports',
    title: 'Report-ready documentation',
    description:
      'Convert observations into consistent report outputs with media context preserved from site captures.',
  },
  {
    eyebrow: 'Access',
    title: 'Role-based collaboration',
    description:
      'Project teams can review evidence across disciplines with controlled access to critical project records.',
  },
];

const workflow = [
  'Capture media on site',
  'Upload to a project room',
  'Review in the right viewer',
  'Annotate issues with context',
  'Publish traceable reports',
];

const viewers = [
  { label: '01', name: 'Image viewer', types: 'JPG, PNG', info: 'Zoom, inspect, annotate.' },
  { label: '02', name: '360 viewer', types: 'Panoramic image', info: 'Navigate immersive room captures.' },
  { label: '03', name: 'Video viewer', types: 'MP4, MOV, WEBM', info: 'Review timeline evidence frame by frame.' },
  { label: '04', name: 'Point cloud viewer', types: 'LAS, LAZ', info: 'Inspect converted cloud geometry in-browser.' },
  { label: '05', name: 'PDF viewer', types: 'PDF', info: 'Open documentation artifacts directly.' },
];

const trustPoints = [
  'Structured capture metadata for room/date traceability',
  'Single interface from field upload to report output',
  'Designed for construction documentation workflows',
];

const PublicLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2 text-black dark:text-white">
      <header className="sticky top-0 z-30 border-b border-stroke bg-white/90 backdrop-blur dark:border-strokedark dark:bg-boxdark/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="Logo/LogoforWhite.png" alt="Logo" className="h-8 dark:hidden" />
            <img src="Logo/LogoforDark.png" alt="Logo" className="hidden h-8 dark:block" />
          </div>
          <nav className="hidden items-center gap-7 lg:flex">
            <a href="#features" className="text-sm font-medium text-body transition hover:text-primary dark:text-bodydark">
              Features
            </a>
            <a href="#workflow" className="text-sm font-medium text-body transition hover:text-primary dark:text-bodydark">
              Workflow
            </a>
            <a href="#viewers" className="text-sm font-medium text-body transition hover:text-primary dark:text-bodydark">
              Viewers
            </a>
            <a href="#roles" className="text-sm font-medium text-body transition hover:text-primary dark:text-bodydark">
              Teams
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ul className="m-0 list-none p-0">
              <DarkModeSwitcher />
            </ul>
            <Link
              to="/login"
              className="rounded-md border border-stroke px-3 py-2 text-sm font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark sm:px-4"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 sm:px-4"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-stroke dark:border-strokedark">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-8 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-meta-3/10 blur-3xl dark:bg-primary/10" />
          </div>
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
            <div>
              <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Construction Documentation Platform
              </p>
              <h1 className="text-4xl font-bold leading-tight text-black dark:text-white md:text-5xl xl:text-6xl">
                One source of truth for every site capture.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-body dark:text-bodydark">
                Track room-level progress over time with images, panoramas, videos, point clouds, and reports
                in one timeline. Keep project evidence structured, searchable, and presentation-ready.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/register"
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  Create account
                </Link>
                <Link
                  to="/login"
                  className="rounded-md border border-stroke px-6 py-3 text-sm font-semibold hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark"
                >
                  I already have an account
                </Link>
                <a href="#features" className="px-2 py-3 text-sm font-semibold text-primary">
                  Explore platform
                </a>
              </div>
              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-stroke bg-white/80 px-4 py-3 text-center dark:border-strokedark dark:bg-boxdark/80">
                  <p className="text-2xl font-bold text-black dark:text-white">5</p>
                  <p className="text-xs text-body dark:text-bodydark">Media viewers</p>
                </div>
                <div className="rounded-lg border border-stroke bg-white/80 px-4 py-3 text-center dark:border-strokedark dark:bg-boxdark/80">
                  <p className="text-2xl font-bold text-black dark:text-white">1</p>
                  <p className="text-xs text-body dark:text-bodydark">Timeline per room</p>
                </div>
                <div className="rounded-lg border border-stroke bg-white/80 px-4 py-3 text-center dark:border-strokedark dark:bg-boxdark/80">
                  <p className="text-2xl font-bold text-black dark:text-white">100%</p>
                  <p className="text-xs text-body dark:text-bodydark">Traceable context</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stroke bg-white p-6 shadow-card dark:border-strokedark dark:bg-boxdark">
              <div className="flex items-center justify-between border-b border-stroke pb-4 dark:border-strokedark">
                <h2 className="text-lg font-semibold text-black dark:text-white">Platform snapshot</h2>
                <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                  Live workflow
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-3 rounded-lg border border-stroke px-4 py-3 dark:border-strokedark"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm text-body dark:text-bodydark">{step}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 overflow-hidden rounded-lg border border-stroke dark:border-strokedark">
                <PlatformDiagram />
              </div>
              <p className="mt-5 text-xs leading-5 text-body dark:text-bodydark">
                Designed for daily capture operations where every room update needs auditable media history.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-b border-stroke bg-white/70 py-20 dark:border-strokedark dark:bg-boxdark/30">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold text-black dark:text-white">Built for field documentation teams</h2>
              <p className="mt-3 text-body dark:text-bodydark">
                From upload to report publication, every capture stays connected to project context.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {highlights.map((item) => (
                <article
                  key={item.title}
                  className="group rounded-xl border border-stroke bg-white p-5 shadow-card transition hover:-translate-y-1 dark:border-strokedark dark:bg-boxdark"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{item.eyebrow}</p>
                  <h3 className="text-base font-semibold text-black dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-body dark:text-bodydark">{item.description}</p>
                  <div className="mt-4 h-1 w-16 rounded-full bg-primary/20 transition-all group-hover:w-24 group-hover:bg-primary/50" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto w-full max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-card dark:border-strokedark dark:bg-boxdark">
              <h3 className="text-xl font-semibold text-black dark:text-white">How teams use it daily</h3>
              <div className="mt-6 space-y-4">
                {workflow.map((step, index) => (
                  <div key={`${step}-timeline`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      {index < workflow.length - 1 && <span className="mt-1 h-8 w-px bg-stroke dark:bg-strokedark" />}
                    </div>
                    <div className="pb-2">
                      <p className="text-sm font-medium text-black dark:text-white">{step}</p>
                      <p className="text-xs text-body dark:text-bodydark">
                        {index === 0 && 'Capture evidence from site visits and inspections.'}
                        {index === 1 && 'Store files in the correct project room context.'}
                        {index === 2 && 'Open each format in the dedicated viewer workflow.'}
                        {index === 3 && 'Flag quality, safety, and progress observations.'}
                        {index === 4 && 'Generate and share structured report outputs.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-stroke bg-white p-6 shadow-card dark:border-strokedark dark:bg-boxdark">
              <h3 className="text-xl font-semibold text-black dark:text-white">Why teams trust this workflow</h3>
              <ul className="mt-6 space-y-3">
                {trustPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 rounded-lg border border-stroke p-3 dark:border-strokedark">
                    <span className="mt-1 inline-block h-2.5 w-2.5 rounded-full bg-primary" />
                    <span className="text-sm text-body dark:text-bodydark">{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg bg-primary/10 p-4">
                <p className="text-sm font-medium text-primary">
                  Need to prove what changed between two site dates? Keep all media and reports linked by room and timeline.
                </p>
              </div>
              <div className="mt-6 rounded-lg border border-stroke p-4 dark:border-strokedark">
                <p className="text-xs font-semibold uppercase tracking-wider text-body dark:text-bodydark">Core entities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded bg-gray-2 px-2 py-1 text-xs dark:bg-boxdark-2">project_slug</span>
                  <span className="rounded bg-gray-2 px-2 py-1 text-xs dark:bg-boxdark-2">room_slug</span>
                  <span className="rounded bg-gray-2 px-2 py-1 text-xs dark:bg-boxdark-2">capture_date</span>
                  <span className="rounded bg-gray-2 px-2 py-1 text-xs dark:bg-boxdark-2">media_type</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="viewers" className="border-y border-stroke bg-white/70 py-20 dark:border-strokedark dark:bg-boxdark/30">
          <div className="mx-auto w-full max-w-7xl px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold text-black dark:text-white">Five viewers, one documentation flow</h2>
              <p className="mt-3 text-body dark:text-bodydark">
                Each format opens in a tailored experience while sharing the same project context.
              </p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {viewers.map((viewer) => (
                <article
                  key={viewer.name}
                  className="rounded-xl border border-stroke bg-white p-5 shadow-card transition hover:-translate-y-1 dark:border-strokedark dark:bg-boxdark"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{viewer.label}</p>
                  <h3 className="mt-2 text-sm font-semibold uppercase tracking-wide text-primary">{viewer.name}</h3>
                  <p className="mt-3 text-xs font-medium text-black dark:text-white">{viewer.types}</p>
                  <p className="mt-2 text-sm leading-6 text-body dark:text-bodydark">{viewer.info}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="roles" className="mx-auto w-full max-w-7xl px-6 py-16">
          <div>
            <div className="rounded-2xl border border-stroke bg-gradient-to-r from-white to-gray-1 p-8 shadow-card dark:border-strokedark dark:from-boxdark dark:to-boxdark-2">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <h2 className="text-3xl font-semibold text-black dark:text-white">Ready to centralize your site evidence?</h2>
                  <p className="mt-4 max-w-2xl text-body dark:text-bodydark">
                    Start with project onboarding and give your team one place to upload, inspect, and report construction progress.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                  <Link
                    to="/login"
                    className="rounded-md border border-stroke px-6 py-3 text-sm font-semibold hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stroke bg-white py-7 dark:border-strokedark dark:bg-boxdark">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-3 px-6 text-sm text-body dark:text-bodydark sm:flex-row sm:items-center">
          <p>Construction documentation workspace for timeline-based project records.</p>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-primary">
              Sign in
            </Link>
            <span className="text-stroke dark:text-strokedark">|</span>
            <Link to="/register" className="text-sm font-medium text-primary">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

function PlatformDiagram() {
  return (
    <svg viewBox="0 0 560 220" className="h-auto w-full bg-white dark:bg-boxdark" role="img" aria-label="Platform flow">
      <defs>
        <linearGradient id="flow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3C50E0" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3C50E0" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="558" height="218" rx="8" fill="transparent" stroke="rgba(60,80,224,0.2)" />
      <Node x={28} y={34} title="Upload" subtitle="image, video, pcd, pdf" />
      <Node x={212} y={34} title="Index" subtitle="room + date + type" />
      <Node x={396} y={34} title="Open viewer" subtitle="by media format" />
      <Node x={120} y={130} title="Annotate" subtitle="issue + notes + ai hints" />
      <Node x={304} y={130} title="Publish" subtitle="draft or final report" />
      <line x1="164" y1="68" x2="212" y2="68" stroke="url(#flow)" strokeWidth="3" />
      <line x1="348" y1="68" x2="396" y2="68" stroke="url(#flow)" strokeWidth="3" />
      <line x1="444" y1="88" x2="352" y2="130" stroke="url(#flow)" strokeWidth="3" />
      <line x1="260" y1="88" x2="190" y2="130" stroke="url(#flow)" strokeWidth="3" />
      <line x1="260" y1="164" x2="304" y2="164" stroke="url(#flow)" strokeWidth="3" />
    </svg>
  );
}

function Node({ x, y, title, subtitle }: { x: number; y: number; title: string; subtitle: string }) {
  return (
    <g>
      <rect x={x} y={y} width="136" height="54" rx="8" fill="rgba(60,80,224,0.08)" stroke="rgba(60,80,224,0.35)" />
      <text x={x + 12} y={y + 21} fontSize="12" fontWeight="700" fill="#3C50E0">
        {title}
      </text>
      <text x={x + 12} y={y + 37} fontSize="10" fill="#64748B">
        {subtitle}
      </text>
    </g>
  );
}

export default PublicLandingPage;
