import { createContext, useContext } from 'react';

export type ProjectCreateContextValue = {
  openCreateProject: () => void;
};

export const ProjectCreateContext = createContext<ProjectCreateContextValue | null>(null);

export function useProjectCreate() {
  const context = useContext(ProjectCreateContext);
  if (!context) {
    throw new Error('useProjectCreate must be used within ProjectCreateProvider');
  }
  return context;
}
