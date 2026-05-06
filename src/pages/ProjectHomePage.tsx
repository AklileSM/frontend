import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import HomePage from './HomePage';
import { useProject } from '../context/ProjectContext';

const ProjectHomePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { setActiveProjectSlug } = useProject();

  useEffect(() => {
    if (slug) setActiveProjectSlug(slug);
  }, [slug, setActiveProjectSlug]);

  if (!slug) return <Navigate to="/projects" replace />;
  return <HomePage slug={slug} />;
};

export default ProjectHomePage;
