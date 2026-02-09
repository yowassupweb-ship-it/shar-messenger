import { useCallback } from 'react';
import type { ContentPost, Person } from '@/types/contentPlan';

export function useContentPlanData() {
  
  const loadUsers = useCallback(async (setUsers: (users: Person[]) => void) => {
    try {
      const response = await fetch('/api/todos/people');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setUsers(data.people || []);
    } catch (error) {
      console.error('[loadUsers] Error:', error);
    }
  }, []);

  const loadPosts = useCallback(async (planId: string, setPosts: (posts: ContentPost[]) => void, setIsLoading: (loading: boolean) => void) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/content-plan/posts?planId=${planId}`);
      if (!response.ok) throw new Error('Failed to fetch posts');
      
      const data = await response.json();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('[loadPosts] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadContentPlans = useCallback(async (setContentPlans: (plans: any[]) => void, setIsLoading: (loading: boolean) => void) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/content-plan/plans');
      if (!response.ok) throw new Error('Failed to fetch plans');
      
      const data = await response.json();
      setContentPlans(data.plans || []);
    } catch (error) {
      console.error('[loadContentPlans] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAvailableLinks = useCallback(async (setAvailableLinks: (links: any[]) => void) => {
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) throw new Error('Failed to fetch todos');
      
      const data = await response.json();
      const todos = data.todos || [];
      
      const links = todos
        .filter((todo: any) => todo.linkUrl)
        .map((todo: any) => ({
          id: todo.id,
          url: todo.linkUrl,
          title: todo.linkTitle || todo.title || 'Без названия',
          description: todo.description
        }));
      
      setAvailableLinks(links);
    } catch (error) {
      console.error('[loadAvailableLinks] Error:', error);
    }
  }, []);

  return {
    loadUsers,
    loadPosts,
    loadContentPlans,
    loadAvailableLinks
  };
}
