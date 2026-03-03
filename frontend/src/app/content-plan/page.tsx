'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
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
  Settings,
  Share2
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
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
  const { theme } = useTheme();
  const [chatSettings, setChatSettings] = useState({
    chatBackgroundDark: '#0f172a',
    chatBackgroundLight: '#f8fafc',
    chatBackgroundImageDark: '',
    chatBackgroundImageLight: '',
    chatOverlayImageDark: '',
    chatOverlayImageLight: '',
    chatOverlayScale: 100,
    chatOverlayOpacity: 1,
  });
  
  // Используем hook для состояния
  const state = useContentPlanState();
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'media' | 'extra'>('main');
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
    myNotifications, setMyNotifications,
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
  const { availableEvents, setAvailableEvents } = state;
  
  const unreadCount = myNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const loadChatSettings = () => {
      const raw = localStorage.getItem('chatSettings');
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setChatSettings(prev => ({ ...prev, ...parsed }));
      } catch {
        return;
      }
    };

    const handleChatSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setChatSettings(prev => ({ ...prev, ...(customEvent.detail || {}) }));
      } else {
        loadChatSettings();
      }
    };

    loadChatSettings();
    window.addEventListener('chatSettingsChanged', handleChatSettingsChanged as EventListener);
    return () => window.removeEventListener('chatSettingsChanged', handleChatSettingsChanged as EventListener);
  }, []);
  

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

  const weekDays = getWeekDays(currentWeekStart);
  const platforms: Platform[] = ['telegram', 'vk', 'dzen', 'max', 'mailing', 'site'];

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
      const [postsRes, linksRes, eventsRes] = await Promise.all([
        fetch(`/api/content-plan?planId=${targetPlanId}`),
        fetch('/api/links'),
        fetch('/api/calendar-events')
      ]);
      
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
      
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setAvailableLinks(linksData.links || []);
      }
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const eventsArray = Array.isArray(eventsData) ? eventsData : (eventsData.events || []);
        setAvailableEvents(eventsArray);
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
      const target = event.target as HTMLElement;

      if (showFilters && !target.closest('[data-filter-menu]')) {
        setShowFilters(false);
      }

      if (showPlanSelector && !target.closest('[data-plan-selector]')) {
        setShowPlanSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters, showPlanSelector]);

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
    const filtered = posts.filter(p => {
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
    });

    // Дедупликация по ID
    const unique = filtered.reduce((acc, current) => {
      if (!acc.find(item => item.id === current.id)) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof posts);

    return unique.sort((a, b) => {
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

  const handleDragLeave = (e?: React.DragEvent) => {
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
          eventId: postForm.eventId,
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
          linkTitle: postForm.linkTitle,
          eventId: postForm.eventId
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
    setPostForm(prev => {
      const currentParticipants = prev.participants || [];
      return {
        ...prev,
        participants: currentParticipants.includes(userId)
          ? currentParticipants.filter(p => p !== userId)
          : [...currentParticipants, userId]
      };
    });
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
      linkTitle: updatedPost.linkTitle,
      eventId: updatedPost.eventId
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
    const loadingBackgroundColor = theme === 'dark'
      ? (chatSettings?.chatBackgroundDark || '#0f172a')
      : (chatSettings?.chatBackgroundLight || '#f8fafc');
    const loadingBackgroundImage = theme === 'dark'
      ? String(chatSettings?.chatBackgroundImageDark || '').trim()
      : String(chatSettings?.chatBackgroundImageLight || '').trim();

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: loadingBackgroundColor,
          ...(loadingBackgroundImage
            ? {
                backgroundImage: `url('${loadingBackgroundImage}')`,
                backgroundSize: 'cover',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center center'
              }
            : {})
        }}
      >
        <div className="animate-spin w-8 h-8 border-2 border-gray-400 dark:border-white/30 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const dayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const pageBackgroundColor = theme === 'dark'
    ? (chatSettings?.chatBackgroundDark || '#0f172a')
    : (chatSettings?.chatBackgroundLight || '#f8fafc');
  const pageBackgroundImage = theme === 'dark'
    ? String(chatSettings?.chatBackgroundImageDark || '').trim()
    : String(chatSettings?.chatBackgroundImageLight || '').trim();
  const pageOverlayImage = theme === 'dark'
    ? String(chatSettings?.chatOverlayImageDark || '').trim()
    : String(chatSettings?.chatOverlayImageLight || '').trim();
  const pageOverlayScale = Math.max(20, Math.min(200, Number(chatSettings?.chatOverlayScale ?? 100) || 100));
  const pageOverlayOpacity = Math.max(0, Math.min(1, Number(chatSettings?.chatOverlayOpacity ?? 1) || 1));

  return (
    <div
      className="h-screen flex flex-col text-gray-900 dark:text-white relative"
      style={{
        backgroundColor: pageBackgroundColor,
        ...(pageBackgroundImage
          ? {
              backgroundImage: `url('${pageBackgroundImage}')`,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center center'
            }
          : {})
      }}
    >
      {pageOverlayImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url('${pageOverlayImage}')`,
            backgroundSize: `${pageOverlayScale * 3}px`,
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center center',
            opacity: pageOverlayOpacity,
            zIndex: 1,
          }}
        />
      )}

      <div className="relative z-10 h-full flex flex-col min-h-0 pt-[100px] md:pt-[110px]">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 flex-shrink-0 px-3 md:px-4 py-2 md:py-3 border-none flex items-center gap-2 overflow-visible">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl text-[var(--text-primary)] transition-all mr-2"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>

        {/* Content Plan Selector */}
        <div className="relative mr-2 sm:mr-3" data-plan-selector>
          <button
            onClick={() => setShowPlanSelector(!showPlanSelector)}
            className="flex items-center gap-2 px-3 h-10 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] rounded-[20px] transition-all text-sm border border-[var(--border-light)] shadow-[var(--shadow-card)] backdrop-blur-xl"
            style={{ borderLeft: `3px solid ${contentPlans.find(p => p.id === activePlanId)?.color || '#8B5CF6'}` }}
          >
            <span className="max-w-[130px] truncate text-gray-900 dark:text-white">
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
          currentWeekStart={currentWeekStart}
          weekDays={weekDays}
          currentMonth={currentMonth}
          platforms={platforms}
          selectedPlatformFilters={selectedPlatformFilters as Platform[]}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          setSelectedPlatformFilters={setSelectedPlatformFilters as (filters: Platform[]) => void}
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

      {/* Modal - Compact layout */}
      {showAddPost && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl md:max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header with tabs */}
            <div className="flex-shrink-0">
              <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-purple-400" />
                  {editingPost ? 'Редактировать публикацию' : 'Новая публикация'}
                </h2>

                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-[var(--bg-glass-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 px-4 md:px-6 border-b border-white/[0.06]">
                <button
                  onClick={() => setActiveTab('main')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'main'
                      ? 'text-purple-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Основное
                </button>
                <button
                  onClick={() => setActiveTab('media')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'media'
                      ? 'text-purple-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Медиа
                </button>
                <button
                  onClick={() => setActiveTab('extra')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'extra'
                      ? 'text-purple-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Дополнительно
                </button>
              </div>
            </div>

            {/* Content with tabs */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {activeTab === 'main' && (
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2">Заголовок</label>
                    <input
                      type="text"
                      value={postForm.title}
                      onChange={(e) => setPostForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Заголовок публикации..."
                      className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50"
                      autoFocus
                    />
                  </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-white/50 mb-2">Статус</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const newStatus = key as 'draft' | 'scheduled' | 'approved';
                        setPostForm(prev => ({ ...prev, postStatus: newStatus }));
                        if (editingPost) {
                          autoSaveStatus(newStatus);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        postForm.postStatus === key
                          ? `${config.bg} ${config.color} ring-1 ring-current`
                          : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
                      }`}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-xs text-white/50 mb-2">Канал</label>
                <select
                  value={selectedPlatform || ''}
                  onChange={(e) => {
                    const platform = e.target.value as Platform | '';
                    if (!platform) {
                      setSelectedPlatform(null);
                      setPostForm(prev => ({ ...prev, platform: null }));
                      return;
                    }
                    setSelectedPlatform(platform);
                    const defaultContentType = PLATFORM_CONTENT_TYPES[platform][0].id as any;
                    setPostForm(prev => ({ ...prev, platform, contentType: defaultContentType }));
                  }}
                  className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="" className="bg-[var(--bg-tertiary)]">Выберите канал...</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform} className="bg-[var(--bg-tertiary)]">{PLATFORM_CONFIG[platform].name}</option>
                  ))}
                </select>
              </div>

              {/* Content Type */}
              {selectedPlatform && getAvailableContentTypes().length > 1 && (
                <div>
                  <label className="block text-xs text-white/50 mb-2">Тип контента</label>
                  <select
                    value={postForm.contentType}
                    onChange={(e) => setPostForm(prev => ({ ...prev, contentType: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50"
                  >
                    {getAvailableContentTypes().map(type => (
                      <option key={type.id} value={type.id} className="bg-[var(--bg-tertiary)]">{type.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Text Content */}
              <div>
                <label className="block text-xs text-white/50 mb-2">Текст публикации</label>
                <textarea
                  value={postForm.postText}
                  onChange={(e) => setPostForm(prev => ({ ...prev, postText: e.target.value }))}
                  placeholder="Введите текст публикации..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-2">Дата</label>
                  <input
                    type="date"
                    value={postForm.publishDate}
                    onChange={(e) => setPostForm(prev => ({ ...prev, publishDate: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50 dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-2">Время</label>
                  <input
                    type="time"
                    value={postForm.publishTime}
                    onChange={(e) => setPostForm(prev => ({ ...prev, publishTime: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Event Attachment */}
              <div>
                <label className="block text-xs text-white/50 mb-2">Привязка к событию (опционально)</label>
                <select
                  value={postForm.eventId || ''}
                  onChange={(e) => setPostForm(prev => ({ ...prev, eventId: e.target.value || undefined }))}
                  className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="" className="bg-[var(--bg-tertiary)]">Без привязки к событию</option>
                  {availableEvents.length === 0 ? (
                    <option disabled className="bg-[var(--bg-tertiary)]">Нет доступных мероприятий</option>
                  ) : (
                    availableEvents.map(event => (
                      <option key={event.id} value={event.id} className="bg-[var(--bg-tertiary)]">
                        {event.title} {event.startDate && `(${new Date(event.startDate).toLocaleDateString('ru-RU')})`}
                      </option>
                    ))
                  )}
                </select>
              </div>
                </>
              )}

              {activeTab === 'media' && (
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Медиа контент будет добавлен позже</p>
                </div>
              )}

              {activeTab === 'extra' && (
                <div>
                  <p className="text-[var(--text-muted)] text-sm">Дополнительные настройки будут добавлены позже</p>
                </div>
              )}
            </div>

            {/* Footer with buttons */}
            <div className="flex gap-3 pt-2 px-6 pb-6">
              <button
                onClick={editingPost ? updatePost : addPost}
                disabled={!postForm.title.trim() || !postForm.platform || !postForm.publishDate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingPost ? 'Сохранить изменения' : 'Создать публикацию'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] transition-all"
              >
                Отмена
              </button>
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
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceType="content-plan"
        resourceId={activePlanId}
        resourceName={contentPlans.find(p => p.id === activePlanId)?.name || 'Контент-план'}
      />
      </div>
    </div>
  );
}
