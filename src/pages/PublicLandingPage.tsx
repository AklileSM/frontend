import React from 'react';
import { Link } from 'react-router-dom';
import DarkModeSwitcher from '../components/Header/DarkModeSwitcher';

const highlights = [
  {
    title: 'Room + date indexed archive',
    description:
      'Every capture is organized by room and date so teams can quickly answer what happened and when.',
  },
  {
    title: 'Built-in viewers for field formats',
    description:
      'Open image, panorama, video, point cloud, and PDF files in dedicated viewers without leaving the platform.',
  },
  {
    title: 'Report-ready documentation',
    description:
      'Convert observations into consistent report outputs with media context preserved from site captures.',
  },
];

const workflow = [
  'Capture media on site',
  'Upload to a project room',
  'Review in the right viewer',
  'Publish traceable reports',
];

const PublicLandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-2 dark:bg-boxdark-2 text-black dark:text-white">
      <header className="sticky top-0 z-30 border-b border-stroke bg-white/90 backdrop-blur dark:border-strokedark dark:bg-boxdark/80">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="Logo/LogoforWhite.png" alt="Logo" className="h-8 dark:hidden" />
            <img src="Logo/LogoforDark.png" alt="Logo" className="hidden h-8 dark:block" />
          </div>
          <div className="flex items-center gap-2">
            <ul className="m-0 list-none p-0">
              <DarkModeSwitcher />
            </ul>
            <Link
              to="/login"
              className="rounded-md border border-stroke px-4 py-2 text-sm font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-boxdark"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 pt-16 lg:grid-cols-2 lg:items-center lg:pt-24">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Construction Documentation Platform
            </p>
            <h1 className="text-4xl font-bold leading-tight text-black dark:text-white md:text-5xl">
              One source of truth for every site capture.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-body dark:text-bodydark">
              Track room-level progress over time with images, panoramas, videos, point clouds, and reports
              in one timeline. Keep project evidence structured, searchable, and easy to present.
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
            </div>
          </div>

          <div className="rounded-xl border border-stroke bg-white p-6 shadow-card dark:border-strokedark dark:bg-boxdark">
            <h2 className="text-lg font-semibold text-black dark:text-white">How your workflow moves</h2>
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
          </div>
        </section>

        <section className="border-y border-stroke bg-white/70 py-14 dark:border-strokedark dark:bg-boxdark/30">
          <div className="mx-auto w-full max-w-7xl px-6">
            <h2 className="text-2xl font-semibold text-black dark:text-white">Built for field documentation teams</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {highlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-xl border border-stroke bg-white p-5 shadow-card dark:border-strokedark dark:bg-boxdark"
                >
                  <h3 className="text-base font-semibold text-black dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-body dark:text-bodydark">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PublicLandingPage;
