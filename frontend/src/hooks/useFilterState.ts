import { useState, useCallback, useEffect } from 'react';

interface UseFilterStateProps {
  myAccountId: string | null;
}

export function useFilterState({ myAccountId }: UseFilterStateProps) {
  const [filter, setFilter] = useState({
    status: null as string | null,
    assignedById: null as string | null,
    assignedToId: null as string | null,
    onlyMy: false,
    categoryId: null as string | null,
    priority: null as string | null
  });

  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showExecutorFilter, setShowExecutorFilter] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showArchivedSection, setShowArchivedSection] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = searchQuery;

  const resetFilters = useCallback(() => {
    setFilter({
      status: null,
      assignedById: null,
      assignedToId: null,
      onlyMy: false,
      categoryId: null,
      priority: null
    });
    setSearchQuery('');
  }, []);

  const toggleOnlyMy = useCallback(() => {
    setFilter(prev => ({ ...prev, onlyMy: !prev.onlyMy }));
  }, []);

  const setStatusFilter = useCallback((status: string | null) => {
    setFilter(prev => ({ ...prev, status }));
  }, []);

  const setAssignedByFilter = useCallback((assignedById: string | null) => {
    setFilter(prev => ({ ...prev, assignedById }));
  }, []);

  const setAssignedToFilter = useCallback((assignedToId: string | null) => {
    setFilter(prev => ({ ...prev, assignedToId }));
  }, []);

  const setCategoryFilter = useCallback((categoryId: string | null) => {
    setFilter(prev => ({ ...prev, categoryId }));
  }, []);

  const setPriorityFilter = useCallback((priority: string | null) => {
    setFilter(prev => ({ ...prev, priority }));
  }, []);

  return {
    filter,
    setFilter,
    showStatusFilter,
    setShowStatusFilter,
    showExecutorFilter,
    setShowExecutorFilter,
    showSettingsMenu,
    setShowSettingsMenu,
    showArchivedSection,
    setShowArchivedSection,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    resetFilters,
    toggleOnlyMy,
    setStatusFilter,
    setAssignedByFilter,
    setAssignedToFilter,
    setCategoryFilter,
    setPriorityFilter
  };
}
