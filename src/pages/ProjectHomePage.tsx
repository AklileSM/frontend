import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import HomePage from './HomePage';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { getProjectBySlug, type ApiProject } from '../services/apiClient';

const ProjectHomePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setActiveProjectSlug } = useProject();
  const { user } = useAuth();
  const [project, setProject] = useState<ApiProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) setActiveProjectSlug(slug);
  }, [slug, setActiveProjectSlug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    getProjectBySlug(slug)
      .then(setProject)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load project'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (!slug) return <Navigate to="/projects" replace />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-black px-4">
        <p className="text-red-500">{error ?? 'Project not found'}</p>
        <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      {user?.is_admin && (
        <Link
          to={`/projects/${slug}/settings`}
          className="absolute top-4 right-4 z-50 flex items-center gap-1.5 rounded-md border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-black shadow-sm hover:border-primary hover:text-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:border-primary dark:hover:text-primary"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      )}
      <HomePage project={project} />
    </div>
  );
};

export default ProjectHomePage;
