import { useCallback } from 'react';
import type { ContentPost } from '@/types/contentPlan';

export function useContentPlanActions() {

  const addPost = useCallback(async (post: Omit<ContentPost, 'id'>, setPosts: (fn: (prev: ContentPost[]) => ContentPost[]) => void) => {
    try {
      const response = await fetch('/api/content-plan/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [...prev, newPost]);
        return newPost;
      }
    } catch (error) {
      console.error('[addPost] Error:', error);
    }
    return null;
  }, []);

  const updatePost = useCallback(async (post: ContentPost, setPosts: (fn: (prev: ContentPost[]) => ContentPost[]) => void) => {
    try {
      const response = await fetch('/api/content-plan/posts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(prev => prev.map(p => p.id === post.id ? updatedPost : p));
        return updatedPost;
      }
    } catch (error) {
      console.error('[updatePost] Error:', error);
    }
    return null;
  }, []);

  const deletePost = useCallback(async (postId: string, setPosts: (fn: (prev: ContentPost[]) => ContentPost[]) => void) => {
    try {
      const response = await fetch(`/api/content-plan/posts?id=${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        return true;
      }
    } catch (error) {
      console.error('[deletePost] Error:', error);
    }
    return false;
  }, []);

  const copyPost = useCallback(async (post: ContentPost, setPosts: (fn: (prev: ContentPost[]) => ContentPost[]) => void) => {
    const { id, ...postWithoutId } = post;
    const copiedPost = {
      ...postWithoutId,
      title: `${post.title} (копия)`,
      publishDate: '',
      postStatus: 'draft' as const,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return await addPost(copiedPost, setPosts);
  }, [addPost]);

  return {
    addPost,
    updatePost,
    deletePost,
    copyPost
  };
}
