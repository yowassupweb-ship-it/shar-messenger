import { useState, useRef } from 'react';
import type {
  ContentPost,
  Person,
  LinkItem,
  ContentPlanMeta,
  Notification,
  Toast,
  Comment,
  ViewMode,
  InboxTab,
  Platform,
  ContentType,
  PostStatus
} from '@/types/contentPlan';

interface PostForm {
  title: string;
  postText: string;
  platform: Platform | null;
  contentType: ContentType;
  publishDate: string;
  publishTime: string;
  postStatus: PostStatus;
  assignedById?: string;
  assignedToIds: string[];
  linkId?: string;
  linkUrl?: string;
  linkTitle?: string;
}

export function useContentPlanState() {
  // Основные данные
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [availableLinks, setAvailableLinks] = useState<LinkItem[]>([]);
  const [myAccountId, setMyAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Модальные окна и UI
  const [showAddPost, setShowAddPost] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatformFilters, setSelectedPlatformFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Режимы просмотра
  const [viewMode, setViewMode] = useState<ViewMode>('columns');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay() + 1);
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Drag & Drop
  const [draggedPost, setDraggedPost] = useState<ContentPost | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Drag to scroll
  const [isDraggingBoard, setIsDraggingBoard] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Комментарии
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToComment, setReplyingToComment] = useState<Comment | null>(null);

  // Уведомления и Inbox
  const [myNotifications, setMyNotifications] = useState<Notification[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [inboxTab, setInboxTab] = useState<InboxTab>('new');

  // Toast уведомления
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Контент-планы (множественные)
  const [contentPlans, setContentPlans] = useState<ContentPlanMeta[]>([]);
  const [activePlanId, setActivePlanId] = useState<string>('default');
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ContentPlanMeta | null>(null);
  const [editingPlanName, setEditingPlanName] = useState<string | null>(null);
  const [editingPlanNameValue, setEditingPlanNameValue] = useState('');
  const [showPlanSettings, setShowPlanSettings] = useState(false);
  const [planSettingsData, setPlanSettingsData] = useState<ContentPlanMeta | null>(null);

  // Ссылки и упоминания
  const [linksSearchQuery, setLinksSearchQuery] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [showLinkUrlModal, setShowLinkUrlModal] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');

  // Форма поста
  const [postForm, setPostForm] = useState<PostForm>({
    title: '',
    postText: '',
    platform: null,
    contentType: 'post',
    publishDate: '',
    publishTime: '',
    postStatus: 'draft',
    assignedById: undefined,
    assignedToIds: [],
    linkId: undefined,
    linkUrl: undefined,
    linkTitle: undefined
  });

  // Состояние изменений
  const [isDirty, setIsDirty] = useState(false);
  const hasOpenedFromUrlRef = useRef(false);
  const initialFormRef = useRef<PostForm | null>(null);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const descriptionEditorRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  return {
    // Data
    posts, setPosts,
    users, setUsers,
    availableLinks, setAvailableLinks,
    myAccountId, setMyAccountId,
    isLoading, setIsLoading,
    
    // Modals & UI
    showAddPost, setShowAddPost,
    editingPost, setEditingPost,
    selectedPlatform, setSelectedPlatform,
    openDropdown, setOpenDropdown,
    
    // Filters
    searchQuery, setSearchQuery,
    selectedPlatformFilters, setSelectedPlatformFilters,
    showFilters, setShowFilters,
    
    // View modes
    viewMode, setViewMode,
    currentWeekStart, setCurrentWeekStart,
    currentMonth, setCurrentMonth,
    
    // Drag & Drop
    draggedPost, setDraggedPost,
    dragOverDate, setDragOverDate,
    selectedDate, setSelectedDate,
    isDraggingBoard, setIsDraggingBoard,
    startX, setStartX,
    scrollLeft, setScrollLeft,
    
    // Comments
    newComment, setNewComment,
    editingCommentId, setEditingCommentId,
    editingCommentText, setEditingCommentText,
    replyingToComment, setReplyingToComment,
    
    // Notifications
    myNotifications, setMyNotifications,
    showInbox, setShowInbox,
    inboxTab, setInboxTab,
    
    // Toasts
    toasts, setToasts,
    
    // Content Plans
    contentPlans, setContentPlans,
    activePlanId, setActivePlanId,
    showPlanSelector, setShowPlanSelector,
    showCreatePlan, setShowCreatePlan,
    editingPlan, setEditingPlan,
    editingPlanName, setEditingPlanName,
    editingPlanNameValue, setEditingPlanNameValue,
    showPlanSettings, setShowPlanSettings,
    planSettingsData, setPlanSettingsData,
    
    // Links & Mentions
    linksSearchQuery, setLinksSearchQuery,
    showMentionDropdown, setShowMentionDropdown,
    mentionFilter, setMentionFilter,
    showLinkUrlModal, setShowLinkUrlModal,
    linkUrlInput, setLinkUrlInput,
    
    // Post Form
    postForm, setPostForm,
    isDirty, setIsDirty,
    
    // Refs
    hasOpenedFromUrlRef,
    initialFormRef,
    scrollContainerRef,
    descriptionEditorRef,
    commentInputRef
  };
}
