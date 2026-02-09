'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  Calendar as CalendarIcon,
  Calendar,
  X,
  ArrowLeft,
  Users,
  Check,
  Search,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Send,
  FileText,
  Mail,
  Clock,
  GripVertical,
  Edit3,
  MessageCircle,
  Filter,
  LayoutGrid,
  CalendarDays,
  Link2,
  Copy,
  Trash2,
  ExternalLink,
  Globe,
  Settings
} from 'lucide-react';
import { 
  ContentPlanNotificationManager, 
  getPostRelatedUsers,
  getStatusLabel 
} from '@/services/notificationService';
import type {
  ContentPost,
  Person,
  LinkItem,
  Toast,
  Notification,
  Comment,
  ContentPlanMeta,
  Platform,
  ContentType,
  PostStatus
} from '@/types/contentPlan';
import {
  PLATFORM_CONFIG,
  PLATFORM_CONTENT_TYPES,
  STATUS_CONFIG,
  CONTENT_TYPE_LABELS,
  WEEKDAYS,
  MONTHS,
  PLAN_COLORS
} from '@/constants/contentPlanConfig';
import {
  formatDateKey,
  getWeekDays,
  getCalendarDays,
  goToPreviousWeek,
  goToNextWeek,
  goToCurrentWeek,
  goToPreviousMonth,
  goToNextMonth,
  goToCurrentMonth
} from '@/utils/contentPlanHelpers';
import { useContentPlanState } from '@/hooks/useContentPlanState';
import ContentPlanPostModal from '@/components/content-plan/ContentPlanPostModal';
import ContentPlanHeader from '@/components/content-plan/ContentPlanHeader';
import ContentPlanColumns from '@/components/content-plan/ContentPlanColumns';
import ContentPlanCalendar from '@/components/content-plan/ContentPlanCalendar';
import CreatePlanModal from '@/components/content-plan/CreatePlanModal';
import PlanSettingsModal from '@/components/content-plan/PlanSettingsModal';
import ToastNotifications from '@/components/content-plan/ToastNotifications';

export default function ContentPlanPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Используем hook для состояния
  const state = useContentPlanState();
  const {
    posts, setPosts,
    users, setUsers,
    availableLinks, setAvailableLinks,
    myAccountId, setMyAccountId,
    isLoading, setIsLoading,
    showAddPost, setShowAddPost,
    editingPost, setEditingPost,
    selectedPlatform, setSelectedPlatform,
    openDropdown, setOpenDropdown,
    searchQuery, setSearchQuery,
    selectedPlatformFilters, setSelectedPlatformFilters,
    showFilters, setShowFilters,
    viewMode, setViewMode,
    currentWeekStart, setCurrentWeekStart,
    currentMonth, setCurrentMonth,
    draggedPost, setDraggedPost,
    dragOverDate, setDragOverDate,
    selectedDate, setSelectedDate,
    isDraggingBoard, setIsDraggingBoard,
    startX, setStartX,
    scrollLeft, setScrollLeft,
    newComment, setNewComment,
    editingCommentId, setEditingCommentId,
    editingCommentText, setEditingCommentText,
    replyingToComment, setReplyingToComment,

    toasts, setToasts,
    contentPlans, setContentPlans,
    activePlanId, setActivePlanId,
    showPlanSelector, setShowPlanSelector,
    showCreatePlan, setShowCreatePlan,
    editingPlan, setEditingPlan,
    editingPlanName, setEditingPlanName,
    editingPlanNameValue, setEditingPlanNameValue,
    showPlanSettings, setShowPlanSettings,
    planSettingsData, setPlanSettingsData,
    linksSearchQuery, setLinksSearchQuery,
    showMentionDropdown, setShowMentionDropdown,
    mentionFilter, setMentionFilter,
    showLinkUrlModal, setShowLinkUrlModal,
    linkUrlInput, setLinkUrlInput,
    postForm, setPostForm,
    isDirty, setIsDirty,
    hasOpenedFromUrlRef,
    initialFormRef,
    scrollContainerRef,
    descriptionEditorRef,
    commentInputRef
  } = state;
  
  const unreadCount = myNotifications.filter(n => !n.read).length;
  

  const removeToast = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);
  
  // Добавление toast
  const addToast = useCallback((toast: Omit<Toast, 'id' | 'createdAt'>) => {
    const newToast: Toast = {
      ...toast,
      id: `toast_${Date.now()}`,
      createdAt: Date.now()
    };
    setToasts(prev => [...prev.slice(-4), newToast]);
  }, []);
  
  // Функции для работы с уведомлениями
  const loadNotifications = useCallback(async () => {
    if (!myAccountId) return;
    // Не запрашиваем данные если вкладка не активна
    if (typeof document !== 'undefined' && document.hidden) return;
    
    try {
      const res = await fetch(`/api/notifications?userId=${myAccountId}`);
      if (res.ok) {
        const data = await res.json();

      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, [myAccountId]);
  
  const markNotificationRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      setMyNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllNotificationsRead = async () => {
    if (!myAccountId) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myAccountId })
      });
      setMyNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const [postForm, setPostForm] = useState({
    title: '',
    postText: '',
    platform: 'telegram' as 'telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site',
    contentType: 'post' as 'post' | 'story' | 'article' | 'mailing',
    publishDate: '',
    publishTime: '12:00',
    mediaUrls: [] as string[],
    roles: [] as ('smm' | 'manager')[],
    participants: [] as string[],
    postStatus: 'draft' as 'draft' | 'scheduled' | 'approved',
    assignedById: '' as string,
    assignedToIds: [] as string[],
    linkId: undefined as string | undefined,
    linkUrl: undefined as string | undefined,
    linkTitle: undefined as string | undefined
  });

  const weekDays = getWeekDays(currentWeekStart);
  const platforms = ['telegram', 'vk', 'dzen', 'max', 'mailing', 'site'] as const;

  // Загрузка пользователей
  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/todos/people');
      const data = await res.json();
      // API возвращает {people: [...]} как в todos
      const peopleArray = data.people || [];
      setUsers(peopleArray);
    } catch (error) {
      console.error('Error loading people:', error);
      setUsers([]);
    }
  }, []);

  // Автоматический аккаунтинг по привязке в админке (как в todos)
  useEffect(() => {
    const loadUserSettings = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        // Fallback на сохранённый accountId
        const savedAccountId = localStorage.getItem('todos_myAccountId');
        if (savedAccountId) {
          setMyAccountId(savedAccountId);
        }
        return;
      }
      
      try {
        const res = await fetch(`/api/auth/me?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const userData = await res.json();
          
          // Используем ID пользователя напрямую как ID профиля
          setMyAccountId(userData.id);
          localStorage.setItem('todos_myAccountId', userData.id);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
        // При ошибке загружаем из localStorage
        const savedAccountId = localStorage.getItem('todos_myAccountId');
        if (savedAccountId) {
          setMyAccountId(savedAccountId);
        }
      }
    };
    
    loadUserSettings();
  }, []);

  // Загрузка постов
  const loadPosts = useCallback(async (planIdOverride?: string) => {
    const targetPlanId = planIdOverride || activePlanId;
    try {
      const [postsRes, linksRes] = await Promise.all([
        fetch(`/api/content-plan?planId=${targetPlanId}`),
        fetch('/api/links')
      ]);
      
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
      
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setAvailableLinks(linksData.links || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activePlanId]);

  // Загрузка контент-планов
  const loadContentPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/content-plans');
      if (res.ok) {
        const data = await res.json();
        setContentPlans(data.plans || []);
        if (data.activePlanId) {
          setActivePlanId(data.activePlanId);
        }
      }
    } catch (error) {
      console.error('Error loading content plans:', error);
    }
  }, []);

  useEffect(() => {
    loadContentPlans();
  }, [loadContentPlans]);

  useEffect(() => {
    loadUsers();
    loadPosts();
    if (myAccountId) {
      loadNotifications();
    }
  }, [loadUsers, loadPosts, loadNotifications, myAccountId]);

  // Поллинг уведомлений
  useEffect(() => {
    if (!myAccountId) return;
    
    const interval = setInterval(() => {
      loadNotifications();
    }, 10000); // Каждые 10 секунд
    
    return () => clearInterval(interval);
  }, [myAccountId, loadNotifications]);

  // Открытие поста по URL параметру
  useEffect(() => {
    if (!isLoading && posts.length > 0 && !hasOpenedFromUrlRef.current) {
      const postId = searchParams.get('post');
      if (postId) {
        const post = posts.find(p => p.id === postId);
        if (post) {
          openEditPost(post);
          hasOpenedFromUrlRef.current = true;
        }
      }
    }
  }, [isLoading, posts, searchParams]);

  // Инициализация редактора описания при открытии модалки (как в todos)
  useEffect(() => {
    if (showAddPost && descriptionEditorRef.current) {
      // Устанавливаем начальный контент только если он отличается
      if (descriptionEditorRef.current.innerHTML !== (postForm.postText || '')) {
        descriptionEditorRef.current.innerHTML = postForm.postText || '';
      }
    }
  }, [showAddPost, editingPost?.id]); // При открытии модалки или смене поста

  // Поллинг комментариев когда модалка открыта (как в todos)
  useEffect(() => {
    if (!editingPost) return;
    
    const pollComments = async () => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      
      try {
        const res = await fetch(`/api/content-plan?planId=${activePlanId}`);
        if (res.ok) {
          const data = await res.json();
          const newPosts = data.posts || [];
          const updatedPost = newPosts.find((p: ContentPost) => p.id === editingPost.id);
          
          if (updatedPost) {
            // Обновляем editingPost если комментарии изменились (как в todos)
            setEditingPost(prev => {
              if (!prev) return null;
              // Сравниваем JSON комментариев
              if (JSON.stringify(prev.comments) !== JSON.stringify(updatedPost.comments)) {
                // Автоскролл к новым комментариям
                const prevCommentsLength = prev.comments?.length || 0;
                const newCommentsLength = updatedPost.comments?.length || 0;
                if (newCommentsLength > prevCommentsLength) {
                  setTimeout(() => {
                    const commentsEnd = document.getElementById('comments-end');
                    commentsEnd?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }
                return { ...prev, comments: updatedPost.comments };
              }
              return prev;
            });
          }
          
          // Обновляем весь список постов
          setPosts(newPosts);
        }
      } catch (error) {
        console.error('Error polling comments:', error);
      }
    };
    
    const interval = setInterval(pollComments, 10000); // Уменьшено с 2s для производительности
    return () => clearInterval(interval);
  }, [editingPost?.id]); // Только от id, не от comments

  // Глобальный поллинг для уведомлений о новых комментариях (когда модалка закрыта)
  useEffect(() => {
    if (editingPost) return; // Если модалка открыта - пропускаем
    
    const pollForNotifications = async () => {
      // Не запрашиваем данные если вкладка не активна
      if (typeof document !== 'undefined' && document.hidden) return;
      
      try {
        const res = await fetch(`/api/content-plan?planId=${activePlanId}`);
        if (res.ok) {
          const data = await res.json();
          const newPosts: ContentPost[] = data.posts || [];
          
          // Проверяем новые комментарии в постах где я участник
          setPosts(prev => {
            const prevMap = new Map(prev.map(p => [p.id, p]));
            
            if (myAccountId) {
              newPosts.forEach((newPost) => {
                const oldPost = prevMap.get(newPost.id);
                
                // Новый комментарий в посте где я участник
                const isMyPost = newPost.createdBy === myAccountId || 
                  newPost.assignedToIds?.includes(myAccountId) ||
                  newPost.assignedById === myAccountId;
                  
                if (oldPost && isMyPost && newPost.comments && oldPost.comments) {
                  const oldCommentsCount = oldPost.comments.length;
                  const newCommentsCount = newPost.comments.length;
                  
                  if (newCommentsCount > oldCommentsCount) {
                    const lastComment = newPost.comments[newPost.comments.length - 1];
                    // Не показываем уведомление о своём комментарии
                    if (lastComment && lastComment.authorId !== myAccountId) {
                      const author = users.find(u => u.id === lastComment.authorId);
                      addToast({
                        type: 'info',
                        title: '💬 Новый комментарий',
                        message: `${author?.name || 'Кто-то'}: ${lastComment.text.slice(0, 50)}${lastComment.text.length > 50 ? '...' : ''}`,
                        postId: newPost.id
                      });
                    }
                  }
                }
              });
            }
            
            return newPosts;
          });
        }
      } catch (error) {
        // Silently fail
      }
    };

    const interval = setInterval(pollForNotifications, 10000); // Уменьшено с 3s
    return () => clearInterval(interval);
  }, [myAccountId, editingPost, users, addToast]);

  // Нормализация HTML для сравнения (убираем лишние пробелы и теги)
  const normalizeHtml = (html: string) => {
    if (!html) return '';
    // Убираем множественные пробелы/переносы, trim
    return html.replace(/\s+/g, ' ').trim();
  };

  // Отслеживание изменений формы для isDirty (кроме статуса - он сохраняется автоматически)
  useEffect(() => {
    if (!initialFormRef.current || !showAddPost) return;
    
    const initial = initialFormRef.current;
    const hasChanges = 
      postForm.title.trim() !== (initial.title || '').trim() ||
      normalizeHtml(postForm.postText || '') !== normalizeHtml(initial.postText || '') ||
      postForm.platform !== initial.platform ||
      postForm.contentType !== initial.contentType ||
      postForm.publishDate !== initial.publishDate ||
      postForm.publishTime !== initial.publishTime ||
      postForm.assignedById !== initial.assignedById ||
      postForm.linkId !== initial.linkId ||
      postForm.linkUrl !== initial.linkUrl ||
      postForm.linkTitle !== initial.linkTitle ||
      JSON.stringify(postForm.assignedToIds) !== JSON.stringify(initial.assignedToIds) ||
      JSON.stringify(postForm.mediaUrls) !== JSON.stringify(initial.mediaUrls) ||
      JSON.stringify(postForm.roles) !== JSON.stringify(initial.roles) ||
      JSON.stringify(postForm.participants) !== JSON.stringify(initial.participants);
    
    setIsDirty(hasChanges);
  }, [postForm, showAddPost]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Закрытие меню фильтров при клике вне
      const target = event.target as HTMLElement;
      if (showFilters && !target.closest('[data-filter-menu]')) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

  // Навигация по неделям (теперь используем импортированные функции)
  const handleGoToPreviousWeek = () => goToPreviousWeek(currentWeekStart, setCurrentWeekStart);
  const handleGoToNextWeek = () => goToNextWeek(currentWeekStart, setCurrentWeekStart);
  const handleGoToCurrentWeek = () => goToCurrentWeek(setCurrentWeekStart);

  // Календарные функции (теперь используем импортированные функции)
  const handleGetCalendarDays = () => getCalendarDays(currentMonth);
  const handleGoToPreviousMonth = () => goToPreviousMonth(currentMonth, setCurrentMonth);
  const handleGoToNextMonth = () => goToNextMonth(currentMonth, setCurrentMonth);
  const handleGoToCurrentMonth = () => goToCurrentMonth(setCurrentMonth);

  // Получение постов для дня
  const getPostsForDay = (date: Date) => {
    const dateKey = formatDateKey(date);
    return posts.filter(p => {
      // Фильтр по платформам
      if (selectedPlatformFilters.length > 0 && !selectedPlatformFilters.includes(p.platform)) {
        return false;
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!p.title.toLowerCase().includes(query) && 
            !p.postText?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return p.publishDate === dateKey;
    }).sort((a, b) => {
      if (a.publishTime && b.publishTime) {
        return a.publishTime.localeCompare(b.publishTime);
      }
      return 0;
    });
  };

  // Toggle platform filter
  const togglePlatformFilter = (platform: string) => {
    setSelectedPlatformFilters(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, post: ContentPost) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', post.id);
    // Add drag image styling
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDate(null);
    
    if (draggedPost) {
      const newDateKey = formatDateKey(date);
      if (draggedPost.publishDate !== newDateKey) {
        // Optimistic update - сразу обновляем UI
        setPosts(prev => prev.map(p => 
          p.id === draggedPost.id 
            ? { ...p, publishDate: newDateKey }
            : p
        ));
        
        try {
          const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: draggedPost.id,
              publishDate: newDateKey
            })
          });
          
          if (res.ok) {
            // Показываем toast о успешном переносе
            const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            addToast({
              type: 'success',
              title: 'Пост перенесён',
              message: `"${draggedPost.title}" → ${dateStr}`,
              postId: draggedPost.id
            });
          } else {
            // Rollback on error
            loadPosts();
            addToast({
              type: 'error',
              title: 'Ошибка',
              message: 'Не удалось переместить пост'
            });
          }
        } catch (error) {
          console.error('Error moving post:', error);
          // Rollback on error
          loadPosts();
          addToast({
            type: 'error',
            title: 'Ошибка',
            message: 'Не удалось переместить пост'
          });
        }
      }
    }
    setDraggedPost(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedPost(null);
    setDragOverDate(null);
  };

  // Добавление поста
  const addPost = async () => {
    if (!postForm.title.trim() || !selectedPlatform || !postForm.publishDate) return;
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postForm.title,
          postText: postForm.postText,
          platform: selectedPlatform,
          contentType: postForm.contentType,
          publishDate: postForm.publishDate,
          publishTime: postForm.publishTime,
          mediaUrls: postForm.mediaUrls,
          postStatus: postForm.postStatus,
          roles: postForm.roles,
          participants: postForm.participants,
          assignedById: postForm.assignedById,
          assignedToIds: postForm.assignedToIds,
          linkId: postForm.linkId,
          linkUrl: postForm.linkUrl,
          linkTitle: postForm.linkTitle,
          createdBy: myAccountId || undefined
        })
      });
      
      if (res.ok) {
        loadPosts();
        setShowAddPost(false);
        resetPostForm();
      }
    } catch (error) {
      console.error('Error adding post:', error);
    }
  };

  // Обновление поста
  const updatePost = async () => {
    if (!editingPost || !postForm.title.trim()) return;
    
    // Сохраняем старый статус для уведомлений
    const oldStatus = editingPost.postStatus;
    const statusChanged = oldStatus !== postForm.postStatus;
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPost.id,
          title: postForm.title,
          postText: postForm.postText,
          platform: postForm.platform,
          contentType: postForm.contentType,
          publishDate: postForm.publishDate,
          publishTime: postForm.publishTime,
          mediaUrls: postForm.mediaUrls,
          postStatus: postForm.postStatus,
          roles: postForm.roles,
          participants: postForm.participants,
          assignedById: postForm.assignedById,
          assignedToIds: postForm.assignedToIds,
          linkId: postForm.linkId,
          linkUrl: postForm.linkUrl,
          linkTitle: postForm.linkTitle
        })
      });
      
      if (res.ok) {
        // Отправляем уведомления
        if (myAccountId) {
          const author = users.find(u => u.id === myAccountId);
          if (author) {
            const manager = new ContentPlanNotificationManager(myAccountId, author.name || 'Пользователь');
            const relatedUsers = getPostRelatedUsers({
              createdById: editingPost.createdBy,
              assignedById: postForm.assignedById,
              assignedToId: postForm.assignedToIds?.[0]
            });
            
            if (statusChanged) {
              await manager.notifyStatusChanged(
                relatedUsers,
                editingPost.id,
                postForm.title,
                oldStatus,
                postForm.postStatus
              );
            } else {
              await manager.notifyPostUpdated(
                relatedUsers,
                editingPost.id,
                postForm.title
              );
            }
          }
        }
        
        loadPosts();
        setIsDirty(false);
        setEditingPost(null);
        setShowAddPost(false);
        resetPostForm();
        router.replace('/content-plan', { scroll: false });
      }
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  // Автосохранение статуса (без закрытия модалки)
  const autoSaveStatus = async (newStatus: 'draft' | 'scheduled' | 'approved') => {
    if (!editingPost) return;
    
    const oldStatus = editingPost.postStatus;
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPost.id,
          postStatus: newStatus
        })
      });
      
      if (res.ok) {
        // Обновляем локальное состояние
        setEditingPost(prev => prev ? { ...prev, postStatus: newStatus } : null);
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, postStatus: newStatus } : p));
        
        // Отправляем уведомление об изменении статуса
        if (myAccountId && oldStatus !== newStatus) {
          const author = users.find(u => u.id === myAccountId);
          if (author) {
            const manager = new ContentPlanNotificationManager(myAccountId, author.name || 'Пользователь');
            const relatedUsers = getPostRelatedUsers({
              createdById: editingPost.createdBy,
              assignedById: editingPost.assignedById,
              assignedToId: editingPost.assignedToIds?.[0]
            });
            
            await manager.notifyStatusChanged(
              relatedUsers,
              editingPost.id,
              editingPost.title,
              oldStatus,
              newStatus
            );
          }
        }
      }
    } catch (error) {
      console.error('Error auto-saving status:', error);
    }
  };

  // Закрытие модалки с проверкой несохранённых изменений
  const closeModal = () => {
    if (isDirty) {
      if (!confirm('У вас есть несохранённые изменения. Закрыть без сохранения?')) {
        return;
      }
    }
    setShowAddPost(false);
    setEditingPost(null);
    resetPostForm();
    setOpenDropdown(null);
    setIsDirty(false);
    router.replace('/content-plan', { scroll: false });
  };

  // Удаление поста
  const deletePost = async (id: string) => {
    if (!confirm('Удалить эту публикацию?')) return;
    
    try {
      const res = await fetch(`/api/content-plan?id=${id}&planId=${activePlanId}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
        if (editingPost?.id === id) {
          setEditingPost(null);
          setShowAddPost(false);
        }
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Добавление комментария
  const addComment = async () => {
    if (!editingPost || !newComment.trim() || !myAccountId) return;
    
    // Парсим @упоминания из комментария
    const mentionRegex = /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      const mentionText = match[1].trim();
      const mentionedUser = users.find(u => 
        u.name?.toLowerCase() === mentionText.toLowerCase() ||
        u.name?.toLowerCase().startsWith(mentionText.toLowerCase())
      );
      if (mentionedUser) {
        mentions.push(mentionedUser.id);
      }
    }
    
    // Optimistic update - сразу добавляем комментарий в UI
    const newCommentObj: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: newComment,
      authorId: myAccountId,
      createdAt: new Date().toISOString()
    };
    
    const updatedComments = [...(editingPost.comments || []), newCommentObj];
    
    // Обновляем UI сразу
    setEditingPost(prev => prev ? { ...prev, comments: updatedComments } : null);
    setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, comments: updatedComments } : p));
    setNewComment('');
    setReplyingToComment(null);
    
    // Автоскролл к новому комментарию
    setTimeout(() => {
      const commentsEnd = document.getElementById('comments-end');
      commentsEnd?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    
    try {
      const res = await fetch('/api/content-plan/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: editingPost.id,
          text: newCommentObj.text,
          authorId: myAccountId
        })
      });
      
      if (res.ok) {
        // Отправляем уведомления в чат уведомлений
        const author = users.find(u => u.id === myAccountId);
        if (author) {
          const manager = new ContentPlanNotificationManager(myAccountId, author.name || 'Пользователь');
          const relatedUsers = getPostRelatedUsers({
            createdById: editingPost.createdBy,
            assignedById: editingPost.assignedById,
            assignedToId: editingPost.assignedToIds?.[0]
          });
          
          await manager.notifyNewComment(
            relatedUsers,
            editingPost.id,
            editingPost.title,
            mentions
          );
        }
      } else {
        // Rollback при ошибке
        setEditingPost(prev => prev ? { ...prev, comments: editingPost.comments } : null);
        setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, comments: editingPost.comments } : p));
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      // Rollback при ошибке
      setEditingPost(prev => prev ? { ...prev, comments: editingPost.comments } : null);
      setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, comments: editingPost.comments } : p));
    }
  };

  // Обновление комментария
  const updateComment = async (postId: string, commentId: string, newText: string) => {
    if (!editingPost || !editingPost.comments) return;
    
    const originalComments = editingPost.comments;
    const updatedComments = editingPost.comments.map(c => 
      c.id === commentId ? { ...c, text: newText } : c
    );
    
    // Optimistic update - сразу обновляем UI
    setEditingPost(prev => prev ? { ...prev, comments: updatedComments } : null);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
    setEditingCommentId(null);
    setEditingCommentText('');
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          comments: updatedComments
        })
      });
      
      if (!res.ok) {
        // Rollback при ошибке
        setEditingPost(prev => prev ? { ...prev, comments: originalComments } : null);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: originalComments } : p));
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      // Rollback при ошибке
      setEditingPost(prev => prev ? { ...prev, comments: originalComments } : null);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: originalComments } : p));
    }
  };

  // Удаление комментария
  const deleteComment = async (postId: string, commentId: string) => {
    if (!editingPost || !editingPost.comments) return;
    
    const originalComments = editingPost.comments;
    const updatedComments = editingPost.comments.filter(c => c.id !== commentId);
    
    // Optimistic update - сразу обновляем UI
    setEditingPost(prev => prev ? { ...prev, comments: updatedComments } : null);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: updatedComments } : p));
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: postId,
          comments: updatedComments
        })
      });
      
      if (!res.ok) {
        // Rollback при ошибке
        setEditingPost(prev => prev ? { ...prev, comments: originalComments } : null);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: originalComments } : p));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      // Rollback при ошибке
      setEditingPost(prev => prev ? { ...prev, comments: originalComments } : null);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: originalComments } : p));
    }
  };

  // Ответ на комментарий
  const startReply = (comment: Comment) => {
    const author = users.find(u => u.id === comment.authorId);
    setReplyingToComment(comment);
    setNewComment(`@${author?.name || 'Пользователь'} `);
    commentInputRef.current?.focus();
  };

  const resetPostForm = () => {
    setPostForm({
      title: '',
      postText: '',
      platform: 'telegram',
      contentType: 'post',
      publishDate: '',
      publishTime: '12:00',
      mediaUrls: [],
      roles: [],
      participants: [],
      postStatus: 'draft',
      assignedById: '',
      assignedToIds: [],
      linkId: undefined,
      linkUrl: undefined,
      linkTitle: undefined
    });
    setSelectedPlatform(null);
    setSelectedDate(null);
  };

  // Drag to scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current || draggedPost) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, [draggable="true"], a')) return;
    setIsDraggingBoard(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingBoard || !scrollContainerRef.current || draggedPost) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDraggingBoard(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingBoard) {
      setIsDraggingBoard(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = 'grab';
        scrollContainerRef.current.style.userSelect = 'auto';
      }
    }
  };

  // Переключение участника
  const toggleParticipant = (userId: string) => {
    setPostForm(prev => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter(p => p !== userId)
        : [...prev.participants, userId]
    }));
  };

  const openAddPost = (date?: Date) => {
    setSelectedDate(date || null);
    setSelectedPlatform('telegram');
    const newForm = {
      title: '',
      postText: '',
      platform: 'telegram' as const,
      contentType: 'post' as const,
      publishDate: date ? formatDateKey(date) : new Date().toISOString().split('T')[0],
      publishTime: '12:00',
      mediaUrls: [] as string[],
      roles: [] as ('smm' | 'manager')[],
      participants: [] as string[],
      postStatus: 'draft' as const,
      assignedById: myAccountId || '',
      assignedToIds: [] as string[],
      linkId: undefined,
      linkUrl: undefined,
      linkTitle: undefined
    };
    setPostForm(newForm);
    initialFormRef.current = newForm;
    setIsDirty(false);
    setEditingPost(null);
    setShowAddPost(true);
    // Убираем параметр из URL
    router.replace('/content-plan', { scroll: false });
  };

  const openEditPost = (post: ContentPost) => {
    // Отмечаем комментарии как прочитанные
    let updatedPost = post;
    if (myAccountId && post.comments && post.comments.length > 0) {
      const isParticipant = post.assignedById === myAccountId || post.assignedToIds?.includes(myAccountId);
      const hasUnread = isParticipant && post.comments.some(c => 
        c.authorId !== myAccountId && (!c.readBy || !c.readBy.includes(myAccountId))
      );
      
      if (hasUnread) {
        const updatedComments = post.comments.map(c => {
          if (c.authorId !== myAccountId && (!c.readBy || !c.readBy.includes(myAccountId))) {
            return {
              ...c,
              readBy: c.readBy ? [...c.readBy, myAccountId] : [myAccountId]
            };
          }
          return c;
        });
        
        updatedPost = { ...post, comments: updatedComments };
        
        // Обновляем состояние posts
        setPosts(prevPosts => prevPosts.map(p => p.id === post.id ? updatedPost : p));
        
        // Отправляем на сервер
        fetch(`/api/content-plan?id=${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments: updatedComments })
        })
        .then(res => {
          if (!res.ok) {
            console.error('Failed to mark comments as read:', res.status, res.statusText);
          }
          return res.json();
        })
        .then(data => {
          console.log('Comments marked as read successfully:', data);
        })
        .catch(err => console.error('Failed to mark comments as read:', err));
      }
    }
    
    setEditingPost(updatedPost);
    setSelectedPlatform(updatedPost.platform);
    const newForm = {
      title: updatedPost.title,
      postText: updatedPost.postText || '',
      platform: updatedPost.platform,
      contentType: updatedPost.contentType,
      publishDate: updatedPost.publishDate,
      publishTime: updatedPost.publishTime || '12:00',
      mediaUrls: updatedPost.mediaUrls || [],
      roles: updatedPost.roles || [],
      participants: updatedPost.participants || [],
      postStatus: updatedPost.postStatus,
      assignedById: (updatedPost as any).assignedById || '',
      assignedToIds: (updatedPost as any).assignedToIds || [],
      linkId: updatedPost.linkId,
      linkUrl: updatedPost.linkUrl,
      linkTitle: updatedPost.linkTitle
    };
    setPostForm(newForm);
    initialFormRef.current = newForm;
    setIsDirty(false);
    setShowAddPost(true);
    // Обновляем URL с id поста
    router.replace(`/content-plan?post=${updatedPost.id}`, { scroll: false });
  };

  // Копирование поста
  const copyPost = async (post: ContentPost, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    try {
      const res = await fetch(`/api/content-plan?planId=${activePlanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${post.title} (копия)`,
          postText: post.postText,
          platform: post.platform,
          contentType: post.contentType,
          publishDate: post.publishDate,
          publishTime: post.publishTime,
          mediaUrls: post.mediaUrls,
          postStatus: 'draft',
          roles: post.roles,
          participants: post.participants,
          assignedById: (post as any).assignedById,
          assignedToIds: (post as any).assignedToIds,
          linkId: post.linkId,
          linkUrl: post.linkUrl,
          linkTitle: post.linkTitle,
          createdBy: myAccountId || undefined
        })
      });
      
      if (res.ok) {
        loadPosts();
      }
    } catch (error) {
      console.error('Error copying post:', error);
    }
  };

  // Копировать ссылку на пост
  const copyPostLink = (postId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const url = `${window.location.origin}/content-plan?post=${postId}`;
    navigator.clipboard.writeText(url);
  };

  // Получение доступных типов контента для выбранной платформы
  const getAvailableContentTypes = () => {
    if (!selectedPlatform) return [];
    return PLATFORM_CONTENT_TYPES[selectedPlatform] || [];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#ededed] dark:bg-[#0d0d0d] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-400 dark:border-white/30 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  return (
    <div className="h-screen flex flex-col bg-[#ededed] dark:bg-[#0d0d0d] text-gray-900 dark:text-white overflow-hidden">
      {/* Header */}
      <header className="h-12 sm:h-14 bg-[#e3e3e3] dark:bg-[#0d0d0d] border-b border-gray-300 dark:border-white/5 flex items-center px-2 sm:px-4 flex-shrink-0">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-200 dark:hover:bg-white/5 transition-all mr-2 sm:mr-3"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>
        
        <div className="flex items-center gap-1.5 sm:gap-2 mr-2 sm:mr-6">
          <span className="font-semibold text-sm sm:text-base">Контент-план</span>
        </div>

        {/* Content Plan Selector */}
        <div className="relative mr-2 sm:mr-4">
          <button
            onClick={() => setShowPlanSelector(!showPlanSelector)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 rounded-lg transition-all text-sm"
            style={{ borderLeft: `3px solid ${contentPlans.find(p => p.id === activePlanId)?.color || '#8B5CF6'}` }}
          >
            <span className="max-w-[120px] truncate">
              {contentPlans.find(p => p.id === activePlanId)?.name || 'Основной план'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-white/50" />
          </button>
          
          {showPlanSelector && (
            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-white/50 font-medium px-2">Контент-планы</span>
                <span className="text-[10px] text-gray-400 dark:text-white/30 px-2">2× клик для переименования</span>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {contentPlans.map(plan => (
                  <div
                    key={plan.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                      plan.id === activePlanId ? 'bg-purple-50 dark:bg-purple-500/10' : ''
                    }`}
                    onClick={async () => {
                      if (editingPlanName === plan.id) return;
                      setActivePlanId(plan.id);
                      setShowPlanSelector(false);
                      await fetch('/api/content-plans', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ activePlanId: plan.id })
                      });
                      loadPosts(plan.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingPlanName(plan.id);
                      setEditingPlanNameValue(plan.name);
                    }}
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: plan.color }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      {editingPlanName === plan.id ? (
                        <input
                          type="text"
                          value={editingPlanNameValue}
                          onChange={(e) => setEditingPlanNameValue(e.target.value)}
                          onBlur={async () => {
                            if (editingPlanNameValue.trim() && editingPlanNameValue !== plan.name) {
                              await fetch('/api/content-plans', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: plan.id, name: editingPlanNameValue.trim() })
                              });
                              setContentPlans(prev => prev.map(p => 
                                p.id === plan.id ? { ...p, name: editingPlanNameValue.trim() } : p
                              ));
                            }
                            setEditingPlanName(null);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              if (editingPlanNameValue.trim() && editingPlanNameValue !== plan.name) {
                                await fetch('/api/content-plans', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ id: plan.id, name: editingPlanNameValue.trim() })
                                });
                                setContentPlans(prev => prev.map(p => 
                                  p.id === plan.id ? { ...p, name: editingPlanNameValue.trim() } : p
                                ));
                              }
                              setEditingPlanName(null);
                            } else if (e.key === 'Escape') {
                              setEditingPlanName(null);
                            }
                          }}
                          autoFocus
                          className="w-full text-sm font-medium bg-white dark:bg-white/10 border border-purple-500 rounded px-1 py-0.5 outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="text-sm font-medium truncate">{plan.name}</div>
                          {plan.description && (
                            <div className="text-xs text-gray-500 dark:text-white/40 truncate">{plan.description}</div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {plan.id === activePlanId && (
                        <Check className="w-4 h-4 text-purple-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlanSettingsData(plan);
                          setShowPlanSettings(true);
                          setShowPlanSelector(false);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
                        title="Настройки доступа"
                      >
                        <Settings className="w-3.5 h-3.5 text-gray-400 dark:text-white/40" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-white/10">
                <button
                  onClick={() => {
                    setShowCreatePlan(true);
                    setShowPlanSelector(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать план</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <ContentPlanHeader
          viewMode={viewMode}
          setViewMode={setViewMode}
          weekDays={weekDays}
          currentMonth={currentMonth}
          platforms={platforms}
          selectedPlatformFilters={selectedPlatformFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleGoToPreviousWeek={handleGoToPreviousWeek}
          handleGoToCurrentWeek={handleGoToCurrentWeek}
          handleGoToNextWeek={handleGoToNextWeek}
          handleGoToPreviousMonth={handleGoToPreviousMonth}
          handleGoToCurrentMonth={handleGoToCurrentMonth}
          handleGoToNextMonth={handleGoToNextMonth}
          togglePlatformFilter={togglePlatformFilter}
        />
      </header>

      {/* Main Content */}
      {viewMode === 'columns' ? (
        <ContentPlanColumns
          weekDays={weekDays}
          draggedPost={draggedPost}
          dragOverDate={dragOverDate}
          myAccountId={myAccountId}
          users={users}
          scrollContainerRef={scrollContainerRef}
          getPostsForDay={getPostsForDay}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleMouseLeave={handleMouseLeave}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          openEditPost={openEditPost}
          openAddPost={openAddPost}
          copyPost={copyPost}
          copyPostLink={copyPostLink}
        />
      ) : (
        <ContentPlanCalendar
          calendarDays={handleGetCalendarDays()}
          draggedPost={draggedPost}
          dragOverDate={dragOverDate}
          getPostsForDay={getPostsForDay}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          openEditPost={openEditPost}
          openAddPost={openAddPost}
        />
      )}

      {/* Modal - 3-column layout like todos */}
      {showAddPost && (
        <div 
          className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 w-full h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold">
                  {editingPost ? 'Редактировать публикацию' : 'Новая публикация'}
                </h3>
                {/* Действия с постом */}
                {editingPost && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => copyPostLink(editingPost.id)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70"
                      title="Копировать ссылку"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => copyPost(editingPost)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70"
                      title="Создать копию"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
              </button>
            </div>
            
            {/* 3-column content */}
            <div className="flex flex-1 overflow-y-auto lg:overflow-hidden flex-col lg:flex-row">
              {/* Left column - Fields */}
              <div className="w-full lg:flex-1 flex-shrink-0 p-3 sm:p-4 overflow-y-auto border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-white/10 space-y-3 sm:space-y-4">
                {/* Title */}
                <div>
                  <input
                    type="text"
                    value={postForm.title}
                    onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Заголовок публикации..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm sm:text-base font-medium focus:outline-none focus:border-purple-500/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Status Buttons */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Статус</label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          const newStatus = key as 'draft' | 'scheduled' | 'approved';
                          setPostForm(prev => ({ ...prev, postStatus: newStatus }));
                          // Автосохранение статуса для существующих постов
                          if (editingPost) {
                            autoSaveStatus(newStatus);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          postForm.postStatus === key
                            ? `${config.bg} ${config.color} ring-1 ring-current`
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/10'
                        }`}
                      >
                        {config.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Канал</label>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'platform' ? null : 'platform')}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      {selectedPlatform && (
                        <>
                          {PLATFORM_CONFIG[selectedPlatform].icon ? (
                            <div className={`flex items-center justify-center ${selectedPlatform === 'dzen' ? 'bg-white rounded-full p-0.5' : ''}`}>
                              <Image 
                                src={PLATFORM_CONFIG[selectedPlatform].icon} 
                                alt="" 
                                width={(selectedPlatform === 'telegram' || selectedPlatform === 'vk') ? 22 : 18} 
                                height={(selectedPlatform === 'telegram' || selectedPlatform === 'vk') ? 22 : 18}
                                className={(selectedPlatform === 'telegram' || selectedPlatform === 'vk') ? 'w-5 h-5 object-contain' : 'w-4 h-4 object-contain'}
                              />
                            </div>
                          ) : selectedPlatform === 'site' ? (
                            <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                          ) : (
                            <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                          )}
                          <span>{PLATFORM_CONFIG[selectedPlatform].name}</span>
                        </>
                      )}
                      {!selectedPlatform && <span className="text-gray-400 dark:text-white/40">Выберите канал...</span>}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/40 transition-transform ${openDropdown === 'platform' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'platform' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      {platforms.map(platform => {
                        const config = PLATFORM_CONFIG[platform];
                        const isLargeIcon = platform === 'telegram' || platform === 'vk';
                        return (
                          <button
                            key={platform}
                            onClick={() => {
                              setSelectedPlatform(platform);
                              const defaultContentType = PLATFORM_CONTENT_TYPES[platform][0].id as any;
                              setPostForm(prev => ({ ...prev, platform, contentType: defaultContentType }));
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              selectedPlatform === platform ? 'bg-gray-50 dark:bg-white/5' : 'text-gray-600 dark:text-white/70'
                            }`}
                          >
                            {config.icon ? (
                              <div className={`flex items-center justify-center ${platform === 'dzen' ? 'bg-white rounded-full p-0.5' : ''}`}>
                                <Image 
                                  src={config.icon} 
                                  alt="" 
                                  width={isLargeIcon ? 22 : 18} 
                                  height={isLargeIcon ? 22 : 18}
                                  className={isLargeIcon ? 'w-5 h-5 object-contain' : 'w-4 h-4 object-contain'}
                                />
                              </div>
                            ) : platform === 'site' ? (
                              <Globe className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Mail className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            )}
                            <span className="text-sm">{config.name}</span>
                            {selectedPlatform === platform && (
                              <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Content Type */}
                {selectedPlatform && getAvailableContentTypes().length > 1 && (
                  <div className="relative">
                    <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Тип контента</label>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === 'contentType' ? null : 'contentType')}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400 dark:text-white/40" />
                        <span>{CONTENT_TYPE_LABELS[postForm.contentType]}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-white/40 transition-transform ${openDropdown === 'contentType' ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === 'contentType' && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                        {getAvailableContentTypes().map(type => (
                          <button
                            key={type.id}
                            onClick={() => {
                              setPostForm(prev => ({ ...prev, contentType: type.id as any }));
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-2.5 text-left flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                              postForm.contentType === type.id ? 'bg-gray-50 dark:bg-white/5' : 'text-gray-600 dark:text-white/70'
                            }`}
                          >
                            <FileText className="w-4 h-4 text-gray-400 dark:text-white/40" />
                            <span className="text-sm">{type.label}</span>
                            {postForm.contentType === type.id && (
                              <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Заказчик */}
                <div className="relative">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    Заказчик
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'assignedBy' ? null : 'assignedBy')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-all"
                  >
                    <span className={postForm.assignedById ? '' : 'text-gray-400 dark:text-white/40'}>
                      {postForm.assignedById 
                        ? users.find(p => p.id === postForm.assignedById)?.name || 'Выберите заказчика'
                        : 'Выберите заказчика'}
                    </span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-white/40 transition-transform ${openDropdown === 'assignedBy' ? 'rotate-180' : ''}`} />
                  </button>
                  {openDropdown === 'assignedBy' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setPostForm(prev => ({ ...prev, assignedById: '' }));
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs border-b border-gray-200 dark:border-white/10"
                      >
                        Очистить выбор
                      </button>
                      {users.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => {
                            setPostForm(prev => ({ ...prev, assignedById: person.id }));
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs flex items-center justify-between ${
                            postForm.assignedById === person.id ? 'bg-gray-50 dark:bg-white/5' : 'text-gray-600 dark:text-white/70'
                          }`}
                        >
                          <span>{person.name}</span>
                        </button>
                      ))}
                      {users.filter(p => p.role === 'customer' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400 dark:text-white/40">
                          Нет пользователей с ролью «заказчик»
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Исполнители */}
                <div className="relative">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    Исполнители
                  </label>
                  <div
                    onClick={() => setOpenDropdown(openDropdown === 'assignedTo' ? null : 'assignedTo')}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-all min-h-[38px] cursor-pointer"
                  >
                    <div className="flex flex-wrap gap-1">
                      {postForm.assignedToIds && postForm.assignedToIds.length > 0 ? (
                        postForm.assignedToIds.map(id => {
                          const person = users.find(p => p.id === id);
                          return person ? (
                            <span key={id} className="text-xs bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {person.name}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPostForm(prev => ({
                                    ...prev,
                                    assignedToIds: prev.assignedToIds.filter(i => i !== id)
                                  }));
                                }}
                                className="hover:text-green-800 dark:hover:text-white"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-gray-400 dark:text-white/40">Выберите исполнителей</span>
                      )}
                    </div>
                    <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-white/40 transition-transform flex-shrink-0 ${openDropdown === 'assignedTo' ? 'rotate-180' : ''}`} />
                  </div>
                  {openDropdown === 'assignedTo' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setPostForm(prev => ({ ...prev, assignedToIds: [] }));
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-1.5 text-left text-gray-500 dark:text-white/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs border-b border-gray-200 dark:border-white/10"
                      >
                        Очистить выбор
                      </button>
                      {users.filter(p => p.role === 'executor' || p.role === 'universal').map(person => {
                        const isSelected = postForm.assignedToIds?.includes(person.id);
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => {
                              const currentIds = postForm.assignedToIds || [];
                              let newIds: string[];
                              
                              if (isSelected) {
                                newIds = currentIds.filter(id => id !== person.id);
                              } else {
                                newIds = [...currentIds, person.id];
                              }
                              
                              setPostForm(prev => ({ ...prev, assignedToIds: newIds }));
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-xs flex items-center justify-between ${
                              isSelected ? 'bg-green-50 dark:bg-green-500/10' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-white/30'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={isSelected ? '' : 'text-gray-600 dark:text-white/70'}>{person.name}</span>
                            </div>
                          </button>
                        );
                      })}
                      {users.filter(p => p.role === 'executor' || p.role === 'universal').length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400 dark:text-white/40">
                          Нет пользователей с ролью «исполнитель»
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Дата</label>
                    <input
                      type="date"
                      value={postForm.publishDate}
                      onChange={(e) => setPostForm(prev => ({ ...prev, publishDate: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors dark:[color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Время</label>
                    <input
                      type="time"
                      value={postForm.publishTime}
                      onChange={(e) => setPostForm(prev => ({ ...prev, publishTime: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Link */}
                <div className="relative">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                    <Link2 className="w-2.5 h-2.5" />
                    Прикреплённая ссылка
                  </label>
                  {postForm.linkId ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                      <Link2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                      <a 
                        href={postForm.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 truncate flex-1"
                        title={postForm.linkUrl}
                      >
                        {postForm.linkTitle || postForm.linkUrl}
                      </a>
                      <button
                        type="button"
                        onClick={() => setPostForm(prev => ({ ...prev, linkId: undefined, linkUrl: undefined, linkTitle: undefined }))}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <a 
                        href={postForm.linkUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400 dark:text-white/40 hover:text-blue-500 dark:hover:text-blue-400 flex-shrink-0"
                        title="Открыть ссылку"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setOpenDropdown(openDropdown === 'link' ? null : 'link')}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-left flex items-center justify-between hover:border-gray-300 dark:hover:border-white/20 transition-all"
                      >
                        <span className="text-gray-400 dark:text-white/40 text-xs">Выбрать ссылку из базы...</span>
                        <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-white/40 transition-transform ${openDropdown === 'link' ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === 'link' && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col">
                          <div className="p-2 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
                              <Search className="w-3 h-3 text-gray-400 dark:text-white/40" />
                              <input
                                type="text"
                                value={linksSearchQuery}
                                onChange={(e) => setLinksSearchQuery(e.target.value)}
                                placeholder="Поиск ссылки..."
                                className="bg-transparent text-xs placeholder-gray-400 dark:placeholder-white/30 outline-none flex-1"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto flex-1">
                            {availableLinks.length === 0 ? (
                              <div className="px-3 py-4 text-center text-gray-400 dark:text-white/40 text-xs">
                                Нет сохранённых ссылок
                              </div>
                            ) : (
                              availableLinks
                                .filter(link => 
                                  !linksSearchQuery || 
                                  link.title.toLowerCase().includes(linksSearchQuery.toLowerCase()) ||
                                  link.url.toLowerCase().includes(linksSearchQuery.toLowerCase())
                                )
                                .slice(0, 20)
                                .map(link => (
                                  <button
                                    key={link.id}
                                    type="button"
                                    onClick={() => {
                                      setPostForm(prev => ({ 
                                        ...prev, 
                                        linkId: link.id, 
                                        linkUrl: link.url, 
                                        linkTitle: link.title 
                                      }));
                                      setOpenDropdown(null);
                                      setLinksSearchQuery('');
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-white/5 last:border-0"
                                  >
                                    {link.favicon ? (
                                      <img src={link.favicon} alt="" className="w-4 h-4 rounded flex-shrink-0" />
                                    ) : (
                                      <Link2 className="w-4 h-4 text-gray-400 dark:text-white/40 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="text-xs truncate">{link.title}</div>
                                      <div className="text-[10px] text-gray-400 dark:text-white/40 truncate">{link.url}</div>
                                    </div>
                                  </button>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Created info */}
                {editingPost && (
                  <div className="pt-3 border-t border-gray-200 dark:border-white/10 text-[10px] text-gray-400 dark:text-white/30 space-y-1">
                    <div>Создано: {new Date(editingPost.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    {editingPost.createdBy && users.find(u => u.id === editingPost.createdBy) && (
                      <div className="flex items-center gap-1.5">
                        <span>Автор:</span>
                        <span 
                          className="px-1.5 py-0.5 rounded text-white text-[9px]"
                          style={{ backgroundColor: users.find(u => u.id === editingPost.createdBy)?.color }}
                        >
                          {users.find(u => u.id === editingPost.createdBy)?.name}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Middle column - Description */}
              <div className="w-full lg:flex-1 flex flex-col bg-gray-50 dark:bg-[#0d0d0d] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-white/10">
                {/* Description Header with Formatting */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-white/70">Текст публикации</span>
                    </div>
                  </div>
                  {/* Compact formatting toolbar - single row */}
                  <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
                    <button type="button" onClick={() => { document.execCommand('bold', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Жирный">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
                    </button>
                    <button type="button" onClick={() => { document.execCommand('italic', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Курсив">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
                    </button>
                    <button type="button" onClick={() => { document.execCommand('underline', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Подчёркнутый">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>
                    </button>
                    <button type="button" onClick={() => { document.execCommand('strikeThrough', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Зачёркнутый">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                    <button type="button" onClick={() => { document.execCommand('insertUnorderedList', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Список">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
                    </button>
                    <button type="button" onClick={() => { document.execCommand('insertOrderedList', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Нумерация">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                    <div className="relative">
                      <button type="button" onClick={() => setOpenDropdown(openDropdown === 'textSize' ? null : 'textSize')} className="flex items-center gap-0.5 p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Размер">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4v3h5v12h3V7h5V4H9zm-6 8h3v7h3v-7h3V9H3v3z"/></svg>
                        <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      {openDropdown === 'textSize' && (
                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-50 min-w-[100px] overflow-hidden">
                          <button type="button" onClick={() => { document.execCommand('formatBlock', false, '<h1>'); document.getElementById('post-text-editor')?.focus(); setOpenDropdown(null); }} className="w-full px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-sm font-bold">H1</button>
                          <button type="button" onClick={() => { document.execCommand('formatBlock', false, '<h2>'); document.getElementById('post-text-editor')?.focus(); setOpenDropdown(null); }} className="w-full px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-semibold">H2</button>
                          <button type="button" onClick={() => { document.execCommand('formatBlock', false, '<h3>'); document.getElementById('post-text-editor')?.focus(); setOpenDropdown(null); }} className="w-full px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-medium">H3</button>
                          <button type="button" onClick={() => { document.execCommand('formatBlock', false, '<div>'); document.getElementById('post-text-editor')?.focus(); setOpenDropdown(null); }} className="w-full px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-white/5 text-xs text-gray-500">Текст</button>
                        </div>
                      )}
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
                    <button type="button" onClick={() => { setLinkUrlInput(''); setShowLinkUrlModal(true); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Ссылка">
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => { document.execCommand('removeFormat', false); document.getElementById('post-text-editor')?.focus(); }} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white transition-colors" title="Очистить">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* WYSIWYG Editor */}
                <div className="flex-1 p-2 overflow-y-auto flex flex-col relative">
                  {/* Uploaded media preview - Telegram-style grid up to 6 photos */}
                  {postForm.mediaUrls.length > 0 && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                      {(() => {
                        const urls = postForm.mediaUrls.slice(0, 6);
                        const count = urls.length;
                        
                        // Telegram-style layouts
                        if (count === 1) {
                          return (
                            <div className="relative group">
                              <img src={urls[0]} alt="" className="w-full max-h-[280px] object-cover" />
                              <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== 0) }))} className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-4 h-4 text-white" /></button>
                            </div>
                          );
                        }
                        
                        if (count === 2) {
                          return (
                            <div className="grid grid-cols-2 gap-0.5">
                              {urls.map((url, idx) => (
                                <div key={idx} className="relative group">
                                  <img src={url} alt="" className="w-full h-[140px] object-cover" />
                                  <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== idx) }))} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        if (count === 3) {
                          return (
                            <div className="grid grid-cols-3 gap-0.5" style={{ gridTemplateRows: '140px 70px' }}>
                              <div className="relative group row-span-2 col-span-2">
                                <img src={urls[0]} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== 0) }))} className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5 text-white" /></button>
                              </div>
                              {urls.slice(1).map((url, idx) => (
                                <div key={idx} className="relative group">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== idx + 1) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        if (count === 4) {
                          return (
                            <div className="grid grid-cols-2 gap-0.5">
                              {urls.map((url, idx) => (
                                <div key={idx} className="relative group">
                                  <img src={url} alt="" className="w-full h-[100px] object-cover" />
                                  <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        if (count === 5) {
                          return (
                            <div className="grid grid-cols-6 gap-0.5" style={{ gridTemplateRows: '120px 80px' }}>
                              <div className="relative group col-span-3">
                                <img src={urls[0]} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== 0) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                              </div>
                              <div className="relative group col-span-3">
                                <img src={urls[1]} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== 1) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                              </div>
                              {urls.slice(2).map((url, idx) => (
                                <div key={idx} className="relative group col-span-2">
                                  <img src={url} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== idx + 2) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        
                        // 6 photos: 3 + 3
                        return (
                          <div className="grid grid-cols-3 gap-0.5">
                            {urls.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img src={url} alt="" className="w-full h-[80px] object-cover" />
                                <button type="button" onClick={() => setPostForm(prev => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3 text-white" /></button>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {postForm.mediaUrls.length > 6 && (
                        <div className="text-center text-xs text-white/40 py-1 bg-white/5">
                          +{postForm.mediaUrls.length - 6} ещё
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div
                    ref={descriptionEditorRef}
                    id="post-text-editor"
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck="true"
                    lang="ru"
                    onInput={(e) => {
                      const target = e.target as HTMLDivElement;
                      setPostForm(prev => ({ ...prev, postText: target.innerHTML }));
                      
                      // Проверяем @ для упоминаний
                      const text = target.innerText || '';
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const cursorPos = range.startOffset;
                        const textBeforeCursor = text.slice(0, text.lastIndexOf(target.innerText.slice(0, cursorPos)) + cursorPos);
                        
                        // Находим последний @ перед курсором
                        let lastAtIndex = -1;
                        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
                          if (textBeforeCursor[i] === '@') {
                            if (i === 0 || /[\s\n]/.test(textBeforeCursor[i - 1])) {
                              lastAtIndex = i;
                              break;
                            }
                          }
                          if (/\s/.test(textBeforeCursor[i])) break;
                        }
                        
                        if (lastAtIndex !== -1) {
                          const afterAt = textBeforeCursor.slice(lastAtIndex + 1);
                          if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
                            setShowMentionDropdown(true);
                            setMentionFilter(afterAt);
                          } else {
                            setShowMentionDropdown(false);
                          }
                        } else {
                          setShowMentionDropdown(false);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLDivElement;
                      setPostForm(prev => ({ ...prev, postText: target.innerHTML }));
                      // Закрываем dropdown с небольшой задержкой, чтобы клик по элементу сработал
                      setTimeout(() => setShowMentionDropdown(false), 200);
                    }}
                    onClick={(e) => {
                      // Обрабатываем клики по ссылкам
                      const target = e.target as HTMLElement;
                      if (target.tagName === 'A' && target.getAttribute('href')) {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(target.getAttribute('href')!, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = 'rgb(147, 51, 234)';
                      e.currentTarget.style.backgroundColor = 'rgba(147, 51, 234, 0.05)';
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.currentTarget.style.borderColor = '';
                      e.currentTarget.style.backgroundColor = '';
                      
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
                        if (imageFiles.length > 0) {
                          // Upload images and add to mediaUrls
                          for (const file of imageFiles) {
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (uploadRes.ok) {
                                const { url } = await uploadRes.json();
                                setPostForm(prev => ({ ...prev, mediaUrls: [...prev.mediaUrls, url] }));
                              }
                            } catch (error) {
                              console.error('Error uploading image:', error);
                            }
                          }
                        }
                      }
                    }}
                    onPaste={async (e) => {
                      // Check for images in clipboard
                      const items = e.clipboardData.items;
                      let hasImage = false;
                      for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        if (item.type.indexOf('image') !== -1) {
                          hasImage = true;
                          e.preventDefault();
                          const blob = item.getAsFile();
                          if (blob) {
                            const formData = new FormData();
                            formData.append('file', blob, 'pasted-image.png');
                            try {
                              const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                              });
                              if (uploadRes.ok) {
                                const { url } = await uploadRes.json();
                                setPostForm(prev => ({ ...prev, mediaUrls: [...prev.mediaUrls, url] }));
                              }
                            } catch (error) {
                              console.error('Error uploading pasted image:', error);
                            }
                          }
                          break;
                        }
                      }
                      // If no image, paste as text/html
                      if (!hasImage) {
                        e.preventDefault();
                        const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
                        document.execCommand('insertHTML', false, text);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Ctrl+B for bold
                      if (e.ctrlKey && e.key === 'b') {
                        e.preventDefault();
                        document.execCommand('bold', false);
                      }
                      // Ctrl+I for italic
                      if (e.ctrlKey && e.key === 'i') {
                        e.preventDefault();
                        document.execCommand('italic', false);
                      }
                      // Ctrl+U for underline
                      if (e.ctrlKey && e.key === 'u') {
                        e.preventDefault();
                        document.execCommand('underline', false);
                      }
                      // ESC закрывает dropdown
                      if (e.key === 'Escape' && showMentionDropdown) {
                        e.preventDefault();
                        setShowMentionDropdown(false);
                      }
                    }}
                    className="w-full flex-1 min-h-[200px] px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm placeholder-gray-400 dark:placeholder-white/30 overflow-y-auto focus:outline-none focus:border-purple-400 dark:focus:border-purple-500/30 transition-all leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-medium [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_a]:text-blue-500 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:cursor-pointer [&_li]:ml-2 [&_div]:text-sm [&_div]:font-normal [&_p]:text-sm [&_p]:font-normal [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline"
                    style={{ minHeight: '200px' }}
                  />
                  
                  {/* Dropdown упоминаний */}
                  {showMentionDropdown && (
                    <div className="absolute bottom-2 left-2 right-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10">
                      {users
                        .filter(p => !mentionFilter || p.name.toLowerCase().includes(mentionFilter.toLowerCase()))
                        .slice(0, 8)
                        .map(person => (
                          <button
                            key={person.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault(); // Предотвращаем onBlur
                              // Вставляем упоминание
                              if (descriptionEditorRef.current) {
                                const text = descriptionEditorRef.current.innerText || '';
                                let lastAtIndex = -1;
                                for (let i = text.length - 1; i >= 0; i--) {
                                  if (text[i] === '@') {
                                    if (i === 0 || /[\s\n]/.test(text[i - 1])) {
                                      lastAtIndex = i;
                                      break;
                                    }
                                  }
                                  if (/\s/.test(text[i])) break;
                                }
                                if (lastAtIndex !== -1) {
                                  const beforeAt = text.slice(0, lastAtIndex);
                                  const afterMention = text.slice(lastAtIndex + 1 + mentionFilter.length);
                                  const newText = beforeAt + '@' + person.name + ' ' + afterMention;
                                  descriptionEditorRef.current.innerText = newText;
                                  setPostForm(prev => ({ ...prev, postText: descriptionEditorRef.current!.innerHTML }));
                                  
                                  // Устанавливаем курсор после упоминания
                                  const range = document.createRange();
                                  const sel = window.getSelection();
                                  const textNode = descriptionEditorRef.current.firstChild;
                                  if (textNode) {
                                    range.setStart(textNode, beforeAt.length + person.name.length + 2);
                                    range.collapse(true);
                                    sel?.removeAllRanges();
                                    sel?.addRange(range);
                                  }
                                }
                              }
                              setShowMentionDropdown(false);
                              descriptionEditorRef.current?.focus();
                            }}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0"
                          >
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px]"
                              style={{ backgroundColor: person.color }}
                            >
                              {person.name.charAt(0)}
                            </div>
                            <span className="text-gray-700 dark:text-white/80">{person.name}</span>
                            <span className="text-[9px] text-gray-400 dark:text-white/30 ml-auto">{person.role === 'executor' ? 'Исполнитель' : person.role === 'customer' ? 'Заказчик' : 'Универсал'}</span>
                          </button>
                        ))}
                      {users.filter(p => !mentionFilter || p.name.toLowerCase().includes(mentionFilter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-400 dark:text-white/40 text-xs">
                          Пользователи не найдены
                        </div>
                      )}
                    </div>
                  )}
                  
                  {descriptionEditorRef.current && !descriptionEditorRef.current.innerHTML && (
                    <div className="absolute top-4 left-5 text-sm text-gray-400 dark:text-white/30 pointer-events-none">
                      Введите текст публикации... (@упомянуть)
                    </div>
                  )}
                </div>
              </div>

              {/* Right column - Comments */}
              <div className="w-full lg:flex-1 flex flex-col bg-gray-50 dark:bg-[#0d0d0d]">
                {/* Comments Header */}
                <div className="px-3 py-2 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span className="text-xs font-medium text-gray-600 dark:text-white/70">Комментарии</span>
                    {editingPost?.comments && editingPost.comments.length > 0 && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                        {editingPost.comments.length}
                      </span>
                    )}
                  </div>
                  {!myAccountId && (
                    <div className="flex items-center gap-1 text-[10px] text-orange-400" title="Выберите профиль для комментирования">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                    </div>
                  )}
                </div>
                
                {/* Comments List - Chat Style */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[150px] lg:min-h-[200px]">
                  {!editingPost ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/30 py-8">
                      <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">Комментарии доступны после сохранения</p>
                    </div>
                  ) : (!editingPost.comments || editingPost.comments.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-white/30 py-8">
                      <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">Нет комментариев</p>
                      <p className="text-[10px] mt-1">Начните обсуждение</p>
                    </div>
                  ) : (
                    editingPost.comments.map(comment => {
                      const author = users.find(u => u.id === comment.authorId);
                      const isMyComment = comment.authorId === myAccountId;
                      const isEditing = editingCommentId === comment.id;
                      
                      return (
                        <div
                          key={comment.id}
                          className={`flex ${isMyComment ? 'justify-end' : 'justify-start'} group`}
                        >
                          <div className={`max-w-[90%] ${isMyComment ? 'order-2' : ''}`}>
                            <div className={`rounded-xl px-3 py-2 relative ${
                              isMyComment 
                                ? 'bg-blue-100 dark:bg-blue-500/20 rounded-br-sm' 
                                : 'bg-gray-100 dark:bg-white/5 rounded-bl-sm'
                            }`}>
                              {/* Автор комментария */}
                              <p className={`text-[10px] font-medium mb-0.5 ${isMyComment ? 'text-blue-600 dark:text-blue-300' : 'text-blue-500 dark:text-blue-400'}`}>
                                {author?.name || 'Неизвестный'}
                              </p>
                              
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full px-2 py-1 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded text-xs resize-none focus:outline-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentText('');
                                      }}
                                      className="px-2 py-0.5 text-[10px] text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white"
                                    >
                                      Отмена
                                    </button>
                                    <button
                                      onClick={() => updateComment(editingPost.id, comment.id, editingCommentText)}
                                      className="px-2 py-0.5 text-[10px] bg-blue-100 dark:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-500/40"
                                    >
                                      Сохранить
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-700 dark:text-white/90 whitespace-pre-wrap break-words"
                                     dangerouslySetInnerHTML={{ 
                                       __html: comment.text
                                         .replace(
                                           /(https?:\/\/[^\s<>"']+)/gi,
                                           '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>'
                                         )
                                         .replace(
                                           /@([a-zA-Zа-яА-ЯёЁ0-9_]+(?:\s+[a-zA-Zа-яА-ЯёЁ0-9_]+)?)/g, 
                                           '<span class="text-blue-400 font-medium">@$1</span>'
                                         ) 
                                     }}
                                  />
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-[9px] text-gray-400 dark:text-white/30">
                                      {new Date(comment.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {/* Действия с комментарием */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {/* Ответить */}
                                      <button
                                        onClick={() => startReply(comment)}
                                        className="p-0.5 text-gray-400 dark:text-white/30 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                                        title="Ответить"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                      </button>
                                      
                                      {/* Редактировать (только свои) */}
                                      {isMyComment && (
                                        <button
                                          onClick={() => {
                                            setEditingCommentId(comment.id);
                                            setEditingCommentText(comment.text);
                                          }}
                                          className="p-0.5 text-gray-400 dark:text-white/30 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
                                          title="Редактировать"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                      
                                      {/* Удалить (только свои) */}
                                      {isMyComment && (
                                        <button
                                          onClick={() => {
                                            if (confirm('Удалить комментарий?')) {
                                              deleteComment(editingPost.id, comment.id);
                                            }
                                          }}
                                          className="p-0.5 text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                          title="Удалить"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Ответ на комментарий */}
                {replyingToComment && (
                  <div className="px-2 py-1 border-t border-gray-200 dark:border-white/10 bg-blue-50 dark:bg-blue-500/5 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span>Ответ для {users.find(u => u.id === replyingToComment.authorId)?.name || 'Пользователь'}</span>
                    </div>
                    <button
                      onClick={() => {
                        setReplyingToComment(null);
                        setNewComment('');
                      }}
                      className="p-0.5 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                {/* Add Comment - Chat Style */}
                {editingPost && myAccountId ? (
                  <div className="p-2 border-t border-gray-200 dark:border-white/10">
                    <div className="relative">
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (newComment.trim()) {
                              addComment();
                            }
                          }
                        }}
                        placeholder="Написать комментарий..."
                        className="w-full px-3 py-2 pr-12 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/30 resize-none focus:outline-none focus:border-blue-500/30 transition-all"
                        rows={1}
                        style={{
                          minHeight: '40px',
                          maxHeight: '120px',
                          overflowY: newComment.split('\n').length > 5 ? 'auto' : 'hidden',
                          height: 'auto'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          const lines = target.value.split('\n').length;
                          if (lines <= 5) {
                            target.style.height = `${target.scrollHeight}px`;
                          } else {
                            target.style.height = '120px';
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newComment.trim()) {
                            addComment();
                          }
                        }}
                        disabled={!newComment.trim()}
                        className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-white/10 disabled:text-gray-400 dark:disabled:text-white/30 text-white rounded-full transition-all shadow-lg"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : editingPost ? (
                  <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-orange-50 dark:bg-orange-500/5">
                    <div className="flex items-center justify-center gap-2 text-orange-500 dark:text-orange-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                      <p className="text-[10px]">
                        Выберите профиль в настройках для комментирования
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* Footer with save button */}
            <div className="flex justify-between items-center px-4 py-2.5 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] rounded-b-xl flex-shrink-0">
              <div className="text-[10px] text-gray-400 dark:text-white/30">
                {!editingPost && 'Новая публикация'}
                {isDirty && <span className="ml-2 text-amber-500 dark:text-amber-400">• Несохранённые изменения</span>}
              </div>
              <div className="flex gap-2">
                {editingPost && (
                  <button
                    onClick={() => deletePost(editingPost.id)}
                    className="px-3 py-1.5 text-red-500 dark:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-xs"
                  >
                    Удалить
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="px-3 py-1.5 text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-xs font-medium"
                >
                  Отмена
                </button>
                <button
                  onClick={editingPost ? updatePost : addPost}
                  disabled={!postForm.title.trim() || !postForm.platform || !postForm.publishDate}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/15 transition-all text-xs font-medium border border-gray-200 dark:border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingPost ? 'Сохранить изменения' : 'Создать публикацию'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Link URL Input Modal */}
      {showLinkUrlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="text-sm font-semibold">Вставить ссылку</h3>
              <button 
                onClick={() => setShowLinkUrlModal(false)} 
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-white/60" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-white/60 mb-1.5">URL ссылки</label>
                <input
                  type="url"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-400 dark:focus:border-purple-500/30"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && linkUrlInput) {
                      const editor = document.getElementById('post-text-editor');
                      if (editor) {
                        document.execCommand('createLink', false, linkUrlInput);
                        editor.focus();
                      }
                      setShowLinkUrlModal(false);
                      setLinkUrlInput('');
                    }
                    if (e.key === 'Escape') {
                      setShowLinkUrlModal(false);
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkUrlModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (linkUrlInput) {
                      const editor = document.getElementById('post-text-editor');
                      if (editor) {
                        document.execCommand('createLink', false, linkUrlInput);
                        editor.focus();
                      }
                      setShowLinkUrlModal(false);
                      setLinkUrlInput('');
                    }
                  }}
                  disabled={!linkUrlInput}
                  className="px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Вставить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ToastNotifications
        toasts={toasts}
        posts={posts}
        onRemove={removeToast}
        onClearAll={() => setToasts([])}
        onOpenPost={openEditPost}
      />

      {/* Create Content Plan Modal */}
      <CreatePlanModal
        isOpen={showCreatePlan}
        onClose={() => setShowCreatePlan(false)}
        myAccountId={myAccountId}
        onPlanCreated={(newPlan) => {
          setContentPlans(prev => [...prev, newPlan]);
          setActivePlanId(newPlan.id);
          loadPosts(newPlan.id);
        }}
        onActivePlanChange={(planId) => setActivePlanId(planId)}
        addToast={addToast}
      />

      <PlanSettingsModal
        isOpen={showPlanSettings}
        planData={planSettingsData}
        users={users}
        contentPlans={contentPlans}
        activePlanId={activePlanId}
        onClose={() => {
          setShowPlanSettings(false);
          setPlanSettingsData(null);
        }}
        onUpdate={(updated) => {
          setContentPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
        onDelete={(planId) => {
          setContentPlans(prev => prev.filter(p => p.id !== planId));
        }}
        onActivePlanChange={(planId) => {
          setActivePlanId(planId);
          loadPosts(planId);
        }}
        addToast={addToast}
      />
    </div>
  );
}
