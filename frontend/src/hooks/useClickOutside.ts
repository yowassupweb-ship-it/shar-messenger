import { useEffect } from 'react';

interface UseClickOutsideProps {
  settingsRef: React.RefObject<HTMLDivElement | null>;
  statusFilterRef: React.RefObject<HTMLDivElement | null>;
  executorFilterRef: React.RefObject<HTMLDivElement | null>;
  setShowSettingsMenu: (show: boolean) => void;
  setShowStatusFilter: (show: boolean) => void;
  setShowExecutorFilter: (show: boolean) => void;
}

export function useClickOutside({
  settingsRef,
  statusFilterRef,
  executorFilterRef,
  setShowSettingsMenu,
  setShowStatusFilter,
  setShowExecutorFilter
}: UseClickOutsideProps) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false);
      }
      if (executorFilterRef.current && !executorFilterRef.current.contains(event.target as Node)) {
        setShowExecutorFilter(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsRef, statusFilterRef, executorFilterRef, setShowSettingsMenu, setShowStatusFilter, setShowExecutorFilter]);
}
