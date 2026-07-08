import { useCallback, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/api/query-keys';
import { CreateProjectModal } from '@/widgets/modals';
import { ProjectCreateContext } from '../model/project-create-context';

export type ProjectCreateProviderProps = {
  children: ReactNode;
};

export function ProjectCreateProvider({ children }: ProjectCreateProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const openCreateProject = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all() });
  };

  return (
    <ProjectCreateContext.Provider value={{ openCreateProject }}>
      {children}
      <CreateProjectModal isOpen={isOpen} onClose={handleClose} onCreated={handleCreated} />
    </ProjectCreateContext.Provider>
  );
}
