'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ExternalLink,
  FolderPlus,
  Link2,
  Menu,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Star,
  X,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface LinkCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

interface LinkList {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  createdAt: string;
  createdBy?: string;
  allowedUsers: string[];
  allowedDepartments: string[];
  isPublic: boolean;
}

interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  image?: string;
  siteName?: string;
  listId: string;
  categoryId?: string;
  tags: string[];
  isBookmarked: boolean;
  isPinned: boolean;
  clickCount: number;
  lastClickedAt?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

interface LinksData {
  links: LinkItem[];
  lists: LinkList[];
  categories: LinkCategory[];
}

interface ChatItem {
  id: string;
  title?: string;
  name?: string;
  isGroup?: boolean;
}

interface AccessUser {
  id: string;
  name?: string;
  username?: string;
  department?: string;
}

type SortType = 'date' | 'clicks' | 'alpha';

const LIST_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

const sortLinks = (links: LinkItem[], sortBy: SortType): LinkItem[] => {
  const sorted = [...links];
  if (sortBy === 'alpha') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return sorted;
  }
  if (sortBy === 'clicks') {
    sorted.sort((a, b) => b.clickCount - a.clickCount);
    return sorted;
  }
  sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return sorted;
};

export default function LinksPage() {
  const [data, setData] = useState<LinksData>({ links: [], lists: [], categories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentDepartment, setCurrentDepartment] = useState('');

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>('date');

  const [isMobileListsOpen, setIsMobileListsOpen] = useState(false);

  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showAddListModal, setShowAddListModal] = useState(false);

  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newListId, setNewListId] = useState('');
  const [newTags, setNewTags] = useState('');

  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLORS[0]);
  const [newListAllowedUsers, setNewListAllowedUsers] = useState<string[]>([]);
  const [newListAllowedDepartments, setNewListAllowedDepartments] = useState<string[]>([]);
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [accessDepartments, setAccessDepartments] = useState<string[]>([]);
  const [userAccessSearch, setUserAccessSearch] = useState('');
  const [departmentAccessSearch, setDepartmentAccessSearch] = useState('');
  const [isUsersAccessOpen, setIsUsersAccessOpen] = useState(false);
  const [isDepartmentsAccessOpen, setIsDepartmentsAccessOpen] = useState(false);

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editListId, setEditListId] = useState('');
  const [editTags, setEditTags] = useState('');
  const [showSendToChatModal, setShowSendToChatModal] = useState(false);
  const [sendTargetLink, setSendTargetLink] = useState<LinkItem | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState('');
  const [isSendingToChat, setIsSendingToChat] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (currentUserId) params.set('userId', currentUserId);
      if (currentUsername) params.set('username', currentUsername);
      if (currentDepartment) params.set('department', currentDepartment);

      const query = params.toString();
      const res = await fetch(query ? `/api/links?${query}` : '/api/links');
      const payload = (await res.json()) as LinksData;
      const lists = [...(payload.lists || [])].sort((a, b) => a.order - b.order);
      const links = payload.links || [];
      const categories = payload.categories || [];
      setData({ links, lists, categories });

      if (lists.length > 0) {
        setSelectedListId((prev) => prev ?? lists[0].id);
      } else {
        setSelectedListId(null);
      }
    } catch (error) {
      console.error('Failed to load links data', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentDepartment, currentUserId, currentUsername]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('myAccount');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { id?: string; username?: string; department?: string };
      setCurrentUserId(parsed.id || '');
      setCurrentUsername(parsed.username || '');
      setCurrentDepartment(parsed.department || '');
    } catch {
      setCurrentUserId('');
      setCurrentUsername('');
      setCurrentDepartment('');
    }
  }, []);

  useEffect(() => {
    if (!showAddListModal) return;
    const loadAccessData = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) return;
        const users = (await response.json()) as AccessUser[];
        setAccessUsers(users || []);

        const departments = Array.from(
          new Set((users || []).map((user) => (user.department || '').trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'ru'));
        setAccessDepartments(departments);
      } catch (error) {
        console.error('Failed to load access users/departments', error);
      }
    };

    loadAccessData();
  }, [showAddListModal]);

  const listStats = useMemo(() => {
    return data.lists.reduce<Record<string, number>>((acc, list) => {
      acc[list.id] = data.links.filter((item) => item.listId === list.id).length;
      return acc;
    }, {});
  }, [data.links, data.lists]);

  const visibleLinks = useMemo(() => {
    let filtered = [...data.links];

    if (selectedListId) {
      filtered = filtered.filter((item) => item.listId === selectedListId);
    }

    if (showBookmarksOnly) {
      filtered = filtered.filter((item) => item.isBookmarked);
    }

    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((item) => {
        const categoryName = data.categories.find((c) => c.id === item.categoryId)?.name || '';
        return (
          item.title.toLowerCase().includes(needle) ||
          item.url.toLowerCase().includes(needle) ||
          (item.description || '').toLowerCase().includes(needle) ||
          item.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
          categoryName.toLowerCase().includes(needle)
        );
      });
    }

    return sortLinks(filtered, sortBy);
  }, [data.links, data.categories, selectedListId, showBookmarksOnly, searchQuery, sortBy]);

  const filteredAccessUsers = useMemo(() => {
    const query = userAccessSearch.trim().toLowerCase();
    if (!query) return accessUsers;
    return accessUsers.filter((user) => {
      const label = `${user.name || ''} ${user.username || ''} ${user.department || ''}`.toLowerCase();
      return label.includes(query);
    });
  }, [accessUsers, userAccessSearch]);

  const filteredAccessDepartments = useMemo(() => {
    const query = departmentAccessSearch.trim().toLowerCase();
    if (!query) return accessDepartments;
    return accessDepartments.filter((department) => department.toLowerCase().includes(query));
  }, [accessDepartments, departmentAccessSearch]);

  const toggleAllowedUser = useCallback((userId: string) => {
    setNewListAllowedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const toggleAllowedDepartment = useCallback((department: string) => {
    setNewListAllowedDepartments((prev) =>
      prev.includes(department) ? prev.filter((dep) => dep !== department) : [...prev, department]
    );
  }, []);

  const resetLinkForm = () => {
    setNewUrl('');
    setNewTitle('');
    setNewDescription('');
    setNewListId('');
    setNewTags('');
  };

  const addLink = async () => {
    if (!newUrl.trim()) return;
    try {
      await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          url: newUrl.trim(),
          listId: newListId || selectedListId || data.lists[0]?.id,
          tags: newTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      setShowAddLinkModal(false);
      resetLinkForm();
      await loadData();
    } catch (error) {
      console.error('Failed to add link', error);
    }
  };

  const addList = async () => {
    if (!newListName.trim()) return;
    try {
      await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'list',
          name: newListName.trim(),
          color: newListColor,
          icon: '📁',
          createdBy: currentUserId,
          allowedUsers: newListAllowedUsers,
          allowedDepartments: newListAllowedDepartments,
        }),
      });

      setShowAddListModal(false);
      setNewListName('');
      setNewListColor(LIST_COLORS[0]);
      setNewListAllowedUsers([]);
      setNewListAllowedDepartments([]);
      setUserAccessSearch('');
      setDepartmentAccessSearch('');
      setIsUsersAccessOpen(false);
      setIsDepartmentsAccessOpen(false);
      await loadData();
    } catch (error) {
      console.error('Failed to add list', error);
    }
  };

  const toggleBookmark = async (item: LinkItem) => {
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          id: item.id,
          isBookmarked: !item.isBookmarked,
        }),
      });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle bookmark', error);
    }
  };

  const togglePin = async (item: LinkItem) => {
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          id: item.id,
          isPinned: !item.isPinned,
        }),
      });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle pin', error);
    }
  };

  const openLink = async (item: LinkItem) => {
    window.open(item.url, '_blank', 'noopener,noreferrer');
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'click', id: item.id }),
      });
      await loadData();
    } catch (error) {
      console.error('Failed to track click', error);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await fetch(`/api/links?id=${id}&type=link`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete link', error);
    }
  };

  const startEditList = (list: LinkList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  const saveListName = async (listId: string) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'list', id: listId, name: editingListName.trim() }),
      });
      setEditingListId(null);
      await loadData();
    } catch (error) {
      console.error('Failed to rename list', error);
    }
  };

  const deleteList = async (listId: string) => {
    if (data.lists.length <= 1) return;
    try {
      await fetch(`/api/links?id=${listId}&type=list`, { method: 'DELETE' });
      if (selectedListId === listId) {
        setSelectedListId(null);
      }
      await loadData();
    } catch (error) {
      console.error('Failed to delete list', error);
    }
  };

  const openEditLinkModal = (item: LinkItem) => {
    setEditingLink(item);
    setEditUrl(item.url);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditListId(item.listId || selectedListId || data.lists[0]?.id || '');
    setEditTags((item.tags || []).join(', '));
  };

  const saveLinkEdit = async () => {
    if (!editingLink || !editUrl.trim()) return;
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          id: editingLink.id,
          url: editUrl.trim(),
          title: editTitle.trim(),
          description: editDescription.trim(),
          listId: editListId || selectedListId || data.lists[0]?.id,
          tags: editTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      setEditingLink(null);
      await loadData();
    } catch (error) {
      console.error('Failed to update link', error);
    }
  };

  const openSendToChatModal = async (item: LinkItem) => {
    if (!currentUserId) return;
    setSendTargetLink(item);
    setShowSendToChatModal(true);
    setChatSearchQuery('');
    setIsChatDropdownOpen(false);

    try {
      const response = await fetch(`/api/chats?user_id=${encodeURIComponent(currentUserId)}`);
      if (!response.ok) return;
      const payload = await response.json();
      const list = Array.isArray(payload) ? payload : [];
      setChats(list);
      setSelectedChatId(list[0]?.id || '');
    } catch (error) {
      console.error('Failed to load chats', error);
    }
  };

  const getChatLabel = useCallback((chat: ChatItem) => {
    if (chat.title?.trim()) return chat.title.trim();
    if (chat.name?.trim()) return chat.name.trim();
    if (chat.id?.startsWith('favorites_')) return 'Избранное';
    if (chat.isGroup) return `Групповой чат ${chat.id.slice(0, 6)}`;
    return `Чат ${chat.id.slice(0, 8)}`;
  }, []);

  const filteredChats = useMemo(() => {
    const query = chatSearchQuery.trim().toLowerCase();
    if (!query) return chats;
    return chats.filter((chat) => getChatLabel(chat).toLowerCase().includes(query));
  }, [chats, chatSearchQuery, getChatLabel]);

  const selectedChatLabel = useMemo(() => {
    const selected = chats.find((chat) => chat.id === selectedChatId);
    return selected ? getChatLabel(selected) : 'Выберите чат';
  }, [chats, selectedChatId, getChatLabel]);

  const sendToSelectedChat = async () => {
    if (!sendTargetLink || !selectedChatId || !currentUserId) return;

    setIsSendingToChat(true);
    try {
      const content = `${sendTargetLink.title || 'Ссылка'}\n${sendTargetLink.url}`;
      const response = await fetch(`/api/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUserId,
          content,
          mentions: [],
        }),
      });

      if (!response.ok) {
        console.error('Failed to send message to chat');
        return;
      }

      setShowSendToChatModal(false);
      setSendTargetLink(null);
    } catch (error) {
      console.error('Failed to send to chat', error);
    } finally {
      setIsSendingToChat(false);
    }
  };

  return (
    <div className="h-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex min-w-0 overflow-hidden">
      {isMobileListsOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 min-[900px]:hidden"
          onClick={() => setIsMobileListsOpen(false)}
        />
      )}

      <aside
        className={`fixed min-[900px]:static top-0 left-0 z-50 h-full w-[290px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-3 transition-transform duration-200 min-w-0 ${
          isMobileListsOpen ? 'translate-x-0' : '-translate-x-full min-[900px]:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">База ссылок</h2>
          <button
            onClick={() => setShowAddListModal(true)}
            className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center"
            title="Новый список"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
          {data.lists.map((list) => {
            const isActive = selectedListId === list.id;
            return (
              <div key={list.id} className="group rounded-xl border border-transparent hover:border-[var(--border-color)]">
                <button
                  onClick={() => {
                    setSelectedListId(list.id);
                    setIsMobileListsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl flex items-center gap-2 text-left ${
                    isActive ? 'bg-[var(--bg-glass-active)]' : 'hover:bg-[var(--bg-glass)]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                  <span className="flex-1 truncate text-sm font-medium">{list.name}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {list.isPublic ? 'Все' : 'Доступ'}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{listStats[list.id] || 0}</span>
                </button>

                <div className="hidden group-hover:flex items-center gap-1 px-3 pb-2">
                  <button
                    onClick={() => startEditList(list)}
                    className="w-6 h-6 rounded-md hover:bg-[var(--bg-glass)] flex items-center justify-center"
                    title="Переименовать"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteList(list.id)}
                    className="w-6 h-6 rounded-md hover:bg-[var(--bg-glass)] flex items-center justify-center"
                    title="Удалить список"
                    disabled={data.lists.length <= 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {editingListId === list.id && (
                  <div className="px-3 pb-2">
                    <input
                      value={editingListName}
                      onChange={(e) => setEditingListName(e.target.value)}
                      onBlur={() => saveListName(list.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveListName(list.id);
                        if (e.key === 'Escape') setEditingListId(null);
                      }}
                      autoFocus
                      className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className="p-3 min-[900px]:p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setIsMobileListsOpen(true)}
              className="min-[900px]:hidden w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] flex items-center justify-center"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ссылкам"
                className="w-full h-10 pl-9 pr-3 rounded-[20px] bg-[var(--bg-glass)] border border-[var(--border-color)]"
              />
            </div>

            <button
              onClick={() => setShowAddLinkModal(true)}
              className="w-10 h-10 rounded-full bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center"
              title="Добавить ссылку"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowBookmarksOnly((prev) => !prev)}
              className={`px-3 h-8 rounded-full border text-sm ${
                showBookmarksOnly
                  ? 'bg-[var(--bg-glass-active)] border-[var(--border-light)]'
                  : 'bg-[var(--bg-glass)] border-[var(--border-color)]'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Избранное
              </span>
            </button>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="h-8 pl-3 pr-8 rounded-full bg-[var(--bg-glass)] border border-[var(--border-color)] text-sm appearance-none"
              >
                <option value="date">Сначала новые</option>
                <option value="clicks">По кликам</option>
                <option value="alpha">По алфавиту</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
            </div>

            <button
              onClick={loadData}
              className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] flex items-center justify-center"
              title="Обновить"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-[900px]:p-4 pb-[calc(env(safe-area-inset-bottom)+92px)] min-[900px]:pb-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">Загрузка ссылок...</div>
          ) : visibleLinks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <Link2 className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Ссылок не найдено</p>
              <p className="text-xs opacity-80 mt-1">Добавьте первую ссылку в выбранный список</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3 gap-3">
              {visibleLinks.map((item) => {
                const categoryName = data.categories.find((c) => c.id === item.categoryId)?.name;
                return (
                  <article
                    key={item.id}
                    onDoubleClick={() => openEditLinkModal(item)}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 min-w-0 hover:bg-[var(--bg-glass)] transition-colors flex flex-col h-full"
                  >
                    <div className="flex items-start gap-2">
                      <img
                        src={item.favicon || `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=64`}
                        alt="favicon"
                        className="w-6 h-6 rounded shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{item.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] truncate">{item.siteName || new URL(item.url).hostname}</p>
                      </div>
                    </div>

                    {item.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">{item.description}</p>
                    )}

                    {(item.tags.length > 0 || categoryName) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {categoryName && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--bg-glass)] border border-[var(--border-color)]">
                            {categoryName}
                          </span>
                        )}
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--bg-glass)] border border-[var(--border-color)]">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-3 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleBookmark(item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center border bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)] border-[var(--border-color)] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.12)]"
                          title="Избранное"
                        >
                          <Star className={`w-3.5 h-3.5 text-amber-500 ${item.isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => togglePin(item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center border bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)] border-[var(--border-color)] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.12)]"
                          title="Закрепить"
                        >
                          <Pin className={`w-3.5 h-3.5 text-blue-500 ${item.isPinned ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => openSendToChatModal(item)}
                          className="w-8 h-8 rounded-full flex items-center justify-center border bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)] border-[var(--border-color)] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.12)]"
                          title="Отправить в чат"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />
                        </button>
                        <button
                          onClick={() => deleteLink(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center border bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)] border-[var(--border-color)] backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.12)]"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </button>
                      </div>

                      <button
                        onClick={() => openLink(item)}
                        className="h-8 px-3 rounded-full border border-[var(--border-color)] bg-gradient-to-br from-[var(--bg-glass)] to-[var(--bg-secondary)] hover:from-[var(--bg-glass-hover)] hover:to-[var(--bg-glass)] text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_12px_rgba(0,0,0,0.12)]"
                      >
                        Открыть
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showAddLinkModal && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-3" onClick={() => setShowAddLinkModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Новая ссылка</h3>
              <button onClick={() => setShowAddLinkModal(false)} className="w-8 h-8 rounded-full bg-[var(--bg-glass)] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
              />
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Заголовок (опционально)"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
              />
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Описание (опционально)"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] min-h-[90px]"
              />

              <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={newListId}
                    onChange={(e) => setNewListId(e.target.value)}
                    className="w-full h-10 pl-3 pr-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] appearance-none"
                  >
                    <option value="">Текущий список</option>
                    {data.lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                </div>

                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="Теги через запятую"
                  className="h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={addLink}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass-active)] border border-[var(--border-light)] text-sm font-medium"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddListModal && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-3" onClick={() => setShowAddListModal(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Новый список</h3>
              <button onClick={() => setShowAddListModal(false)} className="w-8 h-8 rounded-full bg-[var(--bg-glass)] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Название списка"
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] mb-3"
            />

            <div className="flex flex-wrap gap-2 mb-4">
              {LIST_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewListColor(color)}
                  className={`w-7 h-7 rounded-full border ${newListColor === color ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)] ring-[var(--text-primary)]' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="space-y-2 mb-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUsersAccessOpen((prev) => !prev)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between"
                >
                  <span className="text-sm text-[var(--text-secondary)]">Контакты с доступом ({newListAllowedUsers.length})</span>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isUsersAccessOpen ? 'rotate-180' : ''}`} />
                </button>

                {newListAllowedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newListAllowedUsers.map((userId) => {
                      const user = accessUsers.find((item) => item.id === userId);
                      const label = user?.name || user?.username || userId;
                      return (
                        <button
                          key={userId}
                          type="button"
                          onClick={() => toggleAllowedUser(userId)}
                          className="px-2 py-1 rounded-full text-xs bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)]"
                        >
                          {label} ×
                        </button>
                      );
                    })}
                  </div>
                )}

                {isUsersAccessOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] z-20 overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                    <div className="p-2 border-b border-[var(--border-color)]">
                      <input
                        value={userAccessSearch}
                        onChange={(e) => setUserAccessSearch(e.target.value)}
                        placeholder="Поиск контакта..."
                        className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAccessUsers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Контакты не найдены</div>
                      ) : (
                        filteredAccessUsers.map((user) => {
                          const label = user.name || user.username || user.id;
                          const selected = newListAllowedUsers.includes(user.id);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => toggleAllowedUser(user.id)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-glass)] ${selected ? 'bg-[var(--bg-glass-active)]' : ''}`}
                            >
                              <div className="truncate">{label}</div>
                              {user.department && <div className="text-xs text-[var(--text-muted)] truncate">{user.department}</div>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDepartmentsAccessOpen((prev) => !prev)}
                  className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between"
                >
                  <span className="text-sm text-[var(--text-secondary)]">Отделы с доступом ({newListAllowedDepartments.length})</span>
                  <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isDepartmentsAccessOpen ? 'rotate-180' : ''}`} />
                </button>

                {newListAllowedDepartments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {newListAllowedDepartments.map((department) => (
                      <button
                        key={department}
                        type="button"
                        onClick={() => toggleAllowedDepartment(department)}
                        className="px-2 py-1 rounded-full text-xs bg-[var(--bg-glass)] border border-[var(--border-color)] hover:bg-[var(--bg-glass-hover)]"
                      >
                        {department} ×
                      </button>
                    ))}
                  </div>
                )}

                {isDepartmentsAccessOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] z-20 overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
                    <div className="p-2 border-b border-[var(--border-color)]">
                      <input
                        value={departmentAccessSearch}
                        onChange={(e) => setDepartmentAccessSearch(e.target.value)}
                        placeholder="Поиск отдела..."
                        className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto">
                      {filteredAccessDepartments.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-[var(--text-muted)]">Отделы не найдены</div>
                      ) : (
                        filteredAccessDepartments.map((department) => {
                          const selected = newListAllowedDepartments.includes(department);
                          return (
                            <button
                              key={department}
                              type="button"
                              onClick={() => toggleAllowedDepartment(department)}
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-glass)] ${selected ? 'bg-[var(--bg-glass-active)]' : ''}`}
                            >
                              {department}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={addList}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass-active)] border border-[var(--border-light)] text-sm font-medium"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center p-3" onClick={() => setEditingLink(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Редактирование ссылки</h3>
              <button onClick={() => setEditingLink(null)} className="w-8 h-8 rounded-full bg-[var(--bg-glass)] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
              />
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Заголовок"
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Описание"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] min-h-[90px]"
              />

              <div className="grid grid-cols-1 min-[700px]:grid-cols-2 gap-2">
                <div className="relative">
                  <select
                    value={editListId}
                    onChange={(e) => setEditListId(e.target.value)}
                    className="w-full h-10 pl-3 pr-9 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] appearance-none"
                  >
                    {data.lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                </div>

                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Теги через запятую"
                  className="h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setEditingLink(null)}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass)] border border-[var(--border-color)] text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={saveLinkEdit}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass-active)] border border-[var(--border-light)] text-sm font-medium"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendToChatModal && sendTargetLink && (
        <div className="fixed inset-0 z-[125] bg-black/40 flex items-center justify-center p-3" onClick={() => { setShowSendToChatModal(false); setIsChatDropdownOpen(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Отправить в чат</h3>
              <button onClick={() => { setShowSendToChatModal(false); setIsChatDropdownOpen(false); }} className="w-8 h-8 rounded-full bg-[var(--bg-glass)] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] mb-2 truncate">{sendTargetLink.title || sendTargetLink.url}</p>

            <div className="relative mb-4">
              <button
                type="button"
                onClick={() => setIsChatDropdownOpen((prev) => !prev)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between text-left"
              >
                <span className="truncate text-sm">{selectedChatLabel}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isChatDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isChatDropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] overflow-hidden z-20">
                  <div className="p-2 border-b border-[var(--border-color)]">
                    <input
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Поиск чата..."
                      className="w-full h-9 px-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-sm"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {filteredChats.length === 0 ? (
                      <div className="px-3 py-2.5 text-sm text-[var(--text-muted)]">Чаты не найдены</div>
                    ) : (
                      filteredChats.map((chat) => (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => {
                            setSelectedChatId(chat.id);
                            setIsChatDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left text-sm hover:bg-[var(--bg-glass)] transition-colors ${selectedChatId === chat.id ? 'bg-[var(--bg-glass-active)]' : ''}`}
                        >
                          <span className="truncate block">{getChatLabel(chat)}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSendToChatModal(false)}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass)] border border-[var(--border-color)] text-sm font-medium"
              >
                Отмена
              </button>
              <button
                onClick={sendToSelectedChat}
                disabled={!selectedChatId || isSendingToChat}
                className="h-10 px-4 rounded-xl bg-[var(--bg-glass-active)] border border-[var(--border-light)] text-sm font-medium disabled:opacity-60"
              >
                {isSendingToChat ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
