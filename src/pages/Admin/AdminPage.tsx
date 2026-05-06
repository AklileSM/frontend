import React from 'react';
import { Link } from 'react-router-dom';
import PageTitle from '../../components/PageTitle';

const cards = [
  {
    to: '/admin/users',
    title: 'Users',
    description: 'Manage accounts, toggle admin access, activate or deactivate users.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    to: '/admin/projects',
    title: 'Projects',
    description: 'View all projects on the platform and delete any that are no longer needed.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
];

const AdminPage: React.FC = () => (
  <div className="px-6 py-8">
    <PageTitle title="Admin Panel" />
    <h1 className="mb-2 text-2xl font-bold text-black dark:text-white">Admin Panel</h1>
    <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
      Platform administration — manage users and projects.
    </p>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.to}
          to={card.to}
          className="flex flex-col gap-3 rounded-lg border border-stroke bg-white p-6 shadow-sm transition-colors hover:border-primary dark:border-strokedark dark:bg-boxdark dark:hover:border-primary"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {card.icon}
          </span>
          <div>
            <h2 className="font-semibold text-black dark:text-white">{card.title}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{card.description}</p>
          </div>
        </Link>
      ))}
    </div>
  </div>
);

export default AdminPage;
