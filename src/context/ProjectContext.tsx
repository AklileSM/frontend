import React, { createContext, useContext, useState } from 'react';

type ProjectContextValue = {
  activeProjectSlug: string | null;
  setActiveProjectSlug: (slug: string | null) => void;
};

const ProjectContext = createContext<ProjectContextValue>({
  activeProjectSlug: null,
  setActiveProjectSlug: () => {},
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProjectSlug, setActiveProjectSlug] = useState<string | null>(null);
  return (
    <ProjectContext.Provider value={{ activeProjectSlug, setActiveProjectSlug }}>
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject() {
  return useContext(ProjectContext);
}
