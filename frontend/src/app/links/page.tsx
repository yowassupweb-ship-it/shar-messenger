'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Search, Star, ExternalLink, Trash2, Edit3, 
  MoreHorizontal, X, ChevronDown, ChevronRight,
  Globe, Pin, Tag, Loader2, RefreshCw, Copy,
  Home, MessageCircle, CheckSquare, Calendar
} from 'lucide-react';

interface LinkCategory {
  id: string;
  name: string;
  color: string;
  order: number;
}

interface LinkList {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: string;
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

const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [lists, setLists] = useState<LinkList[]>([]);
  const [categories, setCategories] = useState<LinkCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'clicks' | 'alpha'>('date');
  
  // Expanded sections
  const [listsExpanded, setListsExpanded] = useState(true);
  const [categoriesExpanded, setCategoriesExpanded] = useState(true);
  
  // Modal State
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
  const [editingList, setEditingList] = useState<LinkList | null>(null);
  const [editingCategory, setEditingCategory] = useState<LinkCategory | null>(null);
  
  // Add Link Form
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newListId, setNewListId] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fetchedMeta, setFetchedMeta] = useState<Partial<LinkItem> | null>(null);
  
  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'list' | 'category' | 'link'; item: any } | null>(null);
  
  // Custom dropdowns
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  
  // Dropdown refs
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const listDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/links');
      const data = await res.json();
      setLinks(data.links || []);
      setLists(data.lists || []);
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading links:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Close context menu and dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
      if (listDropdownRef.current && !listDropdownRef.current.contains(event.target as Node)) {
        setListDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch URL metadata
  const fetchUrlMetadata = async (url: string) => {
    if (!url) return;
    
    try {
      setIsFetchingMeta(true);
      const res = await fetch(`/api/links?fetchMeta=true&url=${encodeURIComponent(url)}`);
      const meta = await res.json();
      setFetchedMeta(meta);
      if (meta.title && !newTitle) setNewTitle(meta.title);
      if (meta.description && !newDescription) setNewDescription(meta.description);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // CRUD Operations
  const addLink = async () => {
    if (!newUrl) return;
    
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          url: newUrl,
          listId: newListId || selectedListId || lists[0]?.id,
          categoryId: newCategoryId || undefined,
          tags: newTags ? newTags.split(',').map(t => t.trim()) : []
        })
      });
      
      const newLink = await res.json();
      setLinks([...links, newLink]);
      resetAddForm();
      setShowAddLinkModal(false);
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const updateLink = async (link: LinkItem) => {
    try {
      const res = await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link', ...link })
      });
      
      const updatedLink = await res.json();
      setLinks(links.map(l => l.id === link.id ? updatedLink : l));
      setEditingLink(null);
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      await fetch(`/api/links?id=${id}&type=link`, { method: 'DELETE' });
      setLinks(links.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  const toggleBookmark = async (link: LinkItem) => {
    const updated = { ...link, isBookmarked: !link.isBookmarked };
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link', ...updated })
      });
      setLinks(links.map(l => l.id === link.id ? updated : l));
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  const togglePin = async (link: LinkItem) => {
    const updated = { ...link, isPinned: !link.isPinned };
    try {
      await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link', ...updated })
      });
      setLinks(links.map(l => l.id === link.id ? updated : l));
    } catch (error) {
      console.error('Error updating link:', error);
    }
  };

  // List CRUD
  const saveList = async (name: string, color: string) => {
    try {
      if (editingList) {
        await fetch('/api/links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'list', id: editingList.id, name, color })
        });
        setLists(lists.map(l => l.id === editingList.id ? { ...l, name, color } : l));
      } else {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'list', name, color, icon: '' })
        });
        const newList = await res.json();
        setLists([...lists, newList]);
      }
      setShowListModal(false);
      setEditingList(null);
    } catch (error) {
      console.error('Error saving list:', error);
    }
  };

  const deleteList = async (id: string) => {
    if (lists.length <= 1) return;
    
    try {
      await fetch(`/api/links?id=${id}&type=list`, { method: 'DELETE' });
      setLists(lists.filter(l => l.id !== id));
      if (selectedListId === id) {
        setSelectedListId(null);
      }
      loadData();
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  // Category CRUD
  const saveCategory = async (name: string, color: string) => {
    try {
      if (editingCategory) {
        await fetch('/api/links', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'category', id: editingCategory.id, name, color })
        });
        setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name, color } : c));
      } else {
        const res = await fetch('/api/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'category', name, color, icon: '' })
        });
        const newCategory = await res.json();
        setCategories([...categories, newCategory]);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await fetch(`/api/links?id=${id}&type=category`, { method: 'DELETE' });
      setCategories(categories.filter(c => c.id !== id));
      if (selectedCategoryId === id) {
        setSelectedCategoryId(null);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const resetAddForm = () => {
    setNewUrl('');
    setNewTitle('');
    setNewDescription('');
    setNewListId('');
    setNewCategoryId('');
    setNewTags('');
    setFetchedMeta(null);
  };

  // Filter and sort links
  const filteredLinks = useMemo(() => {
    return links
      .filter(link => {
        if (selectedListId && link.listId !== selectedListId) return false;
        if (selectedCategoryId && link.categoryId !== selectedCategoryId) return false;
        if (showBookmarksOnly && !link.isBookmarked) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return link.title.toLowerCase().includes(q) ||
                 link.url.toLowerCase().includes(q) ||
                 link.description?.toLowerCase().includes(q) ||
                 link.tags.some(t => t.toLowerCase().includes(q));
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        
        switch (sortBy) {
          case 'clicks':
            return b.clickCount - a.clickCount;
          case 'alpha':
            return a.title.localeCompare(b.title);
          case 'date':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [links, selectedListId, selectedCategoryId, showBookmarksOnly, searchQuery, sortBy]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'list' | 'category' | 'link', item: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, item });
  };

  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white pb-16 md:pb-12">
      {/* Header */}
      <header className="h-12 bg-[#1a1a1a] border-b border-white/5 flex items-center px-3 md:px-4 flex-shrink-0">
        <Link href="/account" className="flex items-center gap-2 mr-3 md:mr-6 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm hidden md:inline">Назад</span>
        </Link>
        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className="md:hidden flex items-center gap-2 text-white/60 hover:text-white transition-colors mr-3"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showMobileSidebar ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm md:text-base">База ссылок</span>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddLinkModal(true)}
          className="flex items-center gap-2 px-2 md:px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить</span>
        </button>
      </header>

      {/* Mobile Sidebar Dropdown */}
      {showMobileSidebar && (
        <div className="md:hidden bg-[#0d0d0d] border-b border-white/5 p-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
            />
          </div>
          
          {/* Quick filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedListId(null); setSelectedCategoryId(null); setShowBookmarksOnly(false); setShowMobileSidebar(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                !selectedListId && !selectedCategoryId && !showBookmarksOnly
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Все ({links.length})</span>
            </button>
            <button
              onClick={() => { setShowBookmarksOnly(true); setSelectedListId(null); setSelectedCategoryId(null); setShowMobileSidebar(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                showBookmarksOnly
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'bg-white/5 text-white/60 border border-white/10'
              }`}
            >
              <Star className="w-3 h-3" fill={showBookmarksOnly ? 'currentColor' : 'none'} />
              <span>Избранное ({links.filter(l => l.isBookmarked).length})</span>
            </button>
          </div>

          {/* Lists */}
          {lists.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Списки</div>
              <div className="flex flex-wrap gap-2">
                {lists.map(list => (
                  <button
                    key={list.id}
                    onClick={() => { setSelectedListId(list.id); setSelectedCategoryId(null); setShowBookmarksOnly(false); setShowMobileSidebar(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      selectedListId === list.id
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                    <span>{list.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2">Категории</div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategoryId(cat.id); setSelectedListId(null); setShowBookmarksOnly(false); setShowMobileSidebar(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                      selectedCategoryId === cat.id
                        ? 'bg-white/10 text-white border border-white/20' 
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" style={{ color: cat.color }} />
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Desktop only */}
        <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-white/5 flex-col bg-[#0d0d0d] overflow-hidden">

        {/* Search */}
        <div className="p-3 border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* All Links */}
          <button
            onClick={() => { setSelectedListId(null); setSelectedCategoryId(null); setShowBookmarksOnly(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedListId && !selectedCategoryId && !showBookmarksOnly
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Все ссылки</span>
            <span className="ml-auto text-xs text-white/40">{links.length}</span>
          </button>

          {/* Bookmarks */}
          <button
            onClick={() => { setShowBookmarksOnly(true); setSelectedListId(null); setSelectedCategoryId(null); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              showBookmarksOnly
                ? 'bg-yellow-500/20 text-yellow-400' 
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <Star className="w-4 h-4" fill={showBookmarksOnly ? 'currentColor' : 'none'} />
            <span>Избранное</span>
            <span className="ml-auto text-xs text-white/40">{links.filter(l => l.isBookmarked).length}</span>
          </button>

          {/* Lists Section */}
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                onClick={() => setListsExpanded(!listsExpanded)}
                className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                {listsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wide">Списки</span>
              </button>
              <button
                onClick={() => { setEditingList(null); setShowListModal(true); }}
                className="ml-auto w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-full transition-colors"
                title="Добавить список"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
            
            {listsExpanded && (
              <div className="mt-1 space-y-0.5">
                {lists.sort((a, b) => a.order - b.order).map(list => (
                  <div
                    key={list.id}
                    onContextMenu={(e) => handleContextMenu(e, 'list', list)}
                    className="group relative"
                  >
                    <button
                      onClick={() => { setSelectedListId(list.id); setSelectedCategoryId(null); setShowBookmarksOnly(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedListId === list.id 
                          ? 'bg-white/10 text-white' 
                          : 'text-white/60 hover:bg-white/5'
                      }`}
                    >
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      <span className="truncate flex-1 text-left">{list.name}</span>
                      <span className="text-xs text-white/40 mr-6">
                        {links.filter(l => l.listId === list.id).length}
                      </span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, 'list', list);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories Section */}
          <div>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                className="flex items-center gap-2 text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                {categoriesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span className="uppercase tracking-wide">Категории</span>
              </button>
              <button
                onClick={() => { setEditingCategory(null); setShowCategoryModal(true); }}
                className="ml-auto w-5 h-5 flex items-center justify-center bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-full transition-colors"
                title="Добавить категорию"
              >
                <Plus className="w-2.5 h-2.5" />
              </button>
            </div>
            
            {categoriesExpanded && (
              <div className="mt-1 space-y-0.5">
                {categories.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-white/30">Нет категорий</p>
                ) : (
                  categories.sort((a, b) => a.order - b.order).map(cat => (
                    <div
                      key={cat.id}
                      onContextMenu={(e) => handleContextMenu(e, 'category', cat)}
                      className="group relative"
                    >
                      <button
                        onClick={() => { setSelectedCategoryId(cat.id); setSelectedListId(null); setShowBookmarksOnly(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategoryId === cat.id 
                            ? 'bg-white/10 text-white' 
                            : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        <Tag 
                          className="w-3.5 h-3.5 flex-shrink-0"
                          style={{ color: cat.color }}
                        />
                        <span className="truncate flex-1 text-left">{cat.name}</span>
                        <span className="text-xs text-white/40 mr-6">
                          {links.filter(l => l.categoryId === cat.id).length}
                        </span>
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, 'category', cat);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5 text-white/40" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span>Сортировка:</span>
            <div className="relative" ref={sortDropdownRef}>
              <button
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white/80 transition-all duration-200"
              >
                <span>{sortBy === 'date' ? 'По дате' : sortBy === 'alpha' ? 'По алфавиту' : 'По кликам'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${sortDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown */}
              <div className={`absolute bottom-full left-0 mb-1 w-36 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden transition-all duration-200 origin-bottom ${
                sortDropdownOpen 
                  ? 'opacity-100 scale-100 translate-y-0' 
                  : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
              }`}>
                {[
                  { value: 'date', label: 'По дате' },
                  { value: 'alpha', label: 'По алфавиту' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setSortBy(option.value as 'date' | 'alpha'); setSortDropdownOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${
                      sortBy === option.value
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Sub-header with current section info */}
          <div className="px-4 py-3 border-b border-white/5 bg-[#0d0d0d]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-white">
                  {selectedListId 
                    ? lists.find(l => l.id === selectedListId)?.name 
                    : selectedCategoryId
                      ? categories.find(c => c.id === selectedCategoryId)?.name
                      : showBookmarksOnly
                        ? 'Избранное'
                        : 'Все ссылки'
                  }
                </h2>
                <p className="text-xs text-white/40">{filteredLinks.length} ссылок</p>
              </div>
            </div>
          </div>

        {/* Links Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Globe className="w-12 h-12 text-white/20 mb-4" />
              <h3 className="text-lg font-medium text-white/60 mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Нет ссылок'}
              </h3>
              <p className="text-sm text-white/40 mb-4">
                {searchQuery 
                  ? 'Попробуйте изменить поисковый запрос' 
                  : 'Добавьте первую ссылку для начала работы'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowAddLinkModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Добавить ссылку
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLinks.map(link => {
                const category = categories.find(c => c.id === link.categoryId);
                const list = lists.find(l => l.id === link.listId);
                
                return (
                  <div
                    key={link.id}
                    onContextMenu={(e) => handleContextMenu(e, 'link', link)}
                    className={`group p-3 bg-[#1a1a1a] rounded-xl border transition-all hover:border-white/20 ${
                      link.isPinned ? 'border-blue-500/30' : 'border-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Favicon */}
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {link.favicon ? (
                          <img src={link.favicon} alt="" className="w-5 h-5 md:w-6 md:h-6" />
                        ) : (
                          <Globe className="w-4 h-4 md:w-5 md:h-5 text-white/30" />
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-sm text-white hover:text-blue-400 transition-colors line-clamp-2"
                          >
                            {link.title}
                          </a>
                          {link.isPinned && <Pin className="w-3 h-3 text-blue-400 flex-shrink-0" fill="currentColor" />}
                          {link.isBookmarked && <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" fill="currentColor" />}
                        </div>
                        <p className="text-xs text-white/40 truncate mt-0.5">{new URL(link.url).hostname}</p>
                        {link.description && (
                          <p className="text-xs text-white/30 mt-1 line-clamp-2">{link.description}</p>
                        )}
                        
                        {/* Tags */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {list && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${list.color}20`, color: list.color }}
                            >
                              {list.name}
                            </span>
                          )}
                          
                          {category && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs"
                              style={{ backgroundColor: `${category.color}20`, color: category.color }}
                            >
                              {category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                      
                    {/* Actions - всегда под текстом */}
                    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => toggleBookmark(link)}
                          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                            link.isBookmarked 
                              ? 'text-yellow-400 bg-yellow-500/10' 
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          }`}
                          title="В избранное"
                        >
                          <Star className="w-4 h-4" fill={link.isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={() => togglePin(link)}
                          className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                            link.isPinned 
                              ? 'text-blue-400 bg-blue-500/10' 
                              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                          }`}
                          title="Закрепить"
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => copyToClipboard(link.url)} 
                          className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-colors"
                          title="Копировать URL"
                        >
                          <Copy className="w-4 h-4 text-white/40 hover:text-white/60" />
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-colors"
                          title="Открыть"
                        >
                          <ExternalLink className="w-4 h-4 text-white/40 hover:text-white/60" />
                        </a>
                        <button 
                          onClick={() => setEditingLink(link)} 
                          className="p-1.5 md:p-2 hover:bg-white/5 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <Edit3 className="w-4 h-4 text-white/40 hover:text-white/60" />
                        </button>
                        <button 
                          onClick={() => deleteLink(link.id)} 
                          className="p-1.5 md:p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4 text-red-400/50 hover:text-red-400" />
                        </button>
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
        >
          {contextMenu.type === 'list' && (
            <>
              <button
                onClick={() => { setEditingList(contextMenu.item); setShowListModal(true); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              {lists.length > 1 && (
                <button
                  onClick={() => { deleteList(contextMenu.item.id); setContextMenu(null); }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </button>
              )}
            </>
          )}
          
          {contextMenu.type === 'category' && (
            <>
              <button
                onClick={() => { setEditingCategory(contextMenu.item); setShowCategoryModal(true); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              <button
                onClick={() => { deleteCategory(contextMenu.item.id); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </>
          )}
          
          {contextMenu.type === 'link' && (
            <>
              <button
                onClick={() => { window.open(contextMenu.item.url, '_blank'); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть
              </button>
              <button
                onClick={() => { copyToClipboard(contextMenu.item.url); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Copy className="w-4 h-4" />
                Копировать URL
              </button>
              <button
                onClick={() => { toggleBookmark(contextMenu.item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Star className="w-4 h-4" />
                {contextMenu.item.isBookmarked ? 'Убрать из избранного' : 'В избранное'}
              </button>
              <button
                onClick={() => { togglePin(contextMenu.item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Pin className="w-4 h-4" />
                {contextMenu.item.isPinned ? 'Открепить' : 'Закрепить'}
              </button>
              <hr className="my-1 border-white/10" />
              <button
                onClick={() => { setEditingLink(contextMenu.item); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/5 text-white/70"
              >
                <Edit3 className="w-4 h-4" />
                Редактировать
              </button>
              <button
                onClick={() => { deleteLink(contextMenu.item.id); setContextMenu(null); }}
                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </>
          )}
        </div>
      )}

      {/* Add/Edit Link Modal */}
      {(showAddLinkModal || editingLink) && (
        <Modal
          title={editingLink ? 'Редактировать ссылку' : 'Добавить ссылку'}
          onClose={() => { setShowAddLinkModal(false); setEditingLink(null); resetAddForm(); }}
        >
          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={editingLink ? editingLink.url : newUrl}
                  onChange={(e) => editingLink ? setEditingLink({ ...editingLink, url: e.target.value }) : setNewUrl(e.target.value)}
                  onBlur={(e) => !editingLink && e.target.value && fetchUrlMetadata(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
                />
                {!editingLink && (
                  <button
                    onClick={() => fetchUrlMetadata(newUrl)}
                    disabled={isFetchingMeta || !newUrl}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 rounded-lg transition-colors"
                    title="Получить данные"
                  >
                    {isFetchingMeta ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-white/40" />
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Название</label>
              <input
                type="text"
                value={editingLink ? editingLink.title : (newTitle || fetchedMeta?.title || '')}
                onChange={(e) => editingLink ? setEditingLink({ ...editingLink, title: e.target.value }) : setNewTitle(e.target.value)}
                placeholder="Название ссылки"
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Описание</label>
              <textarea
                value={editingLink ? (editingLink.description || '') : (newDescription || fetchedMeta?.description || '')}
                onChange={(e) => editingLink ? setEditingLink({ ...editingLink, description: e.target.value }) : setNewDescription(e.target.value)}
                placeholder="Краткое описание..."
                rows={2}
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30 resize-none"
              />
            </div>
            
            {/* List & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Список</label>
                <div className="relative" ref={listDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setListDropdownOpen(!listDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {(() => {
                        const currentListId = editingLink ? editingLink.listId : (newListId || selectedListId || lists[0]?.id || '');
                        const currentList = lists.find(l => l.id === currentListId);
                        return currentList ? (
                          <>
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: currentList.color }} />
                            <span className="truncate">{currentList.name}</span>
                          </>
                        ) : <span className="text-white/40">Выберите список</span>;
                      })()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-200 ${listDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 transition-all duration-200 origin-top ${
                    listDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}>
                    <div className="max-h-48 overflow-y-auto">
                      {lists.map(list => {
                        const currentListId = editingLink ? editingLink.listId : (newListId || selectedListId || lists[0]?.id || '');
                        return (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              if (editingLink) {
                                setEditingLink({ ...editingLink, listId: list.id });
                              } else {
                                setNewListId(list.id);
                              }
                              setListDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                              currentListId === list.id
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: list.color }} />
                            <span className="truncate">{list.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1.5">Категория</label>
                <div className="relative" ref={categoryDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm text-white hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {(() => {
                        const currentCatId = editingLink ? (editingLink.categoryId || '') : newCategoryId;
                        const currentCat = categories.find(c => c.id === currentCatId);
                        return currentCat ? (
                          <>
                            <Tag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: currentCat.color }} />
                            <span className="truncate">{currentCat.name}</span>
                          </>
                        ) : <span className="text-white/40">Без категории</span>;
                      })()}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div className={`absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50 transition-all duration-200 origin-top ${
                    categoryDropdownOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  }`}>
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingLink) {
                            setEditingLink({ ...editingLink, categoryId: undefined });
                          } else {
                            setNewCategoryId('');
                          }
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          !(editingLink ? editingLink.categoryId : newCategoryId)
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span>Без категории</span>
                      </button>
                      {categories.map(cat => {
                        const currentCatId = editingLink ? (editingLink.categoryId || '') : newCategoryId;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              if (editingLink) {
                                setEditingLink({ ...editingLink, categoryId: cat.id });
                              } else {
                                setNewCategoryId(cat.id);
                              }
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                              currentCatId === cat.id
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <Tag className="w-3.5 h-3.5 flex-shrink-0" style={{ color: cat.color }} />
                            <span className="truncate">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-white/50 mb-1.5">Теги (через запятую)</label>
              <input
                type="text"
                value={editingLink ? editingLink.tags.join(', ') : newTags}
                onChange={(e) => editingLink 
                  ? setEditingLink({ ...editingLink, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }) 
                  : setNewTags(e.target.value)
                }
                placeholder="seo, marketing, tools"
                className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={() => { setShowAddLinkModal(false); setEditingLink(null); resetAddForm(); }}
              className="px-4 py-2 text-sm text-white/60 hover:bg-white/5 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => editingLink ? updateLink(editingLink) : addLink()}
              disabled={editingLink ? !editingLink.url : !newUrl}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              {editingLink ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </Modal>
      )}

      {/* List Modal */}
      {showListModal && (
        <ItemModal
          title={editingList ? 'Редактировать список' : 'Новый список'}
          item={editingList}
          onSave={saveList}
          onClose={() => { setShowListModal(false); setEditingList(null); }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <ItemModal
          title={editingCategory ? 'Редактировать категорию' : 'Новая категория'}
          item={editingCategory}
          onSave={saveCategory}
          onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        />
      )}

      {/* Mobile Bottom Navigation - pill style like account page */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 h-[52px] bg-gradient-to-b from-[var(--bg-glass,#1a1a1a/95)] to-[var(--bg-glass-darker,#0f0f0f/95)] backdrop-blur-xl border border-white/20 rounded-full flex items-center gap-1 px-2 z-40 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
        <Link
          href="/account"
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
        >
          <Home className="w-4 h-4" strokeWidth={2} />
        </Link>

        <Link
          href="/messages"
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={2} />
        </Link>

        <Link
          href="/todos"
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
        >
          <CheckSquare className="w-4 h-4" strokeWidth={2} />
        </Link>

        <Link
          href="/content-plan"
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 text-white/50 hover:text-white hover:bg-white/10"
        >
          <Calendar className="w-4 h-4" strokeWidth={2} />
        </Link>

        <button
          className="w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30"
        >
          <Globe className="w-4 h-4" strokeWidth={2} />
        </button>

        <button
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${showMobileSidebar ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
        >
          <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {/* Desktop Bottom Bar - glassmorphism style like account page */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 h-[48px] backdrop-blur-xl border-t border-white/20 z-40 items-center justify-between px-4 bg-gradient-to-b from-[#1a1a1a]/95 to-[#0f0f0f]/95">
        {/* Left side - Navigation */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/account"
            className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-white/60 hover:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Главная</span>
          </Link>

          <Link
            href="/messages"
            className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-white/60 hover:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Сообщения</span>
          </Link>

          <Link
            href="/todos"
            className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-white/60 hover:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Задачи</span>
          </Link>

          <Link
            href="/content-plan"
            className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-gradient-to-b from-white/10 to-white/5 border border-white/20 text-white/60 hover:text-white hover:from-white/15 hover:to-white/8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_8px_rgba(0,0,0,0.2)]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Календарь</span>
          </Link>

          <button
            className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-[#007aff]/20 text-[#007aff] border border-[#007aff]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Ссылки</span>
          </button>
        </div>

        {/* Right side - Add button */}
        <button
          onClick={() => setShowAddLinkModal(true)}
          className="px-4 py-2 min-h-[36px] rounded-[20px] flex items-center gap-2 text-[12px] font-medium transition-all whitespace-nowrap bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Добавить</span>
        </button>
      </div>
    </div>
  );
}

// Modal wrapper component
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        <div className="px-5 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// List/Category Modal
function ItemModal({
  title,
  item,
  onSave,
  onClose
}: {
  title: string;
  item: { name: string; color: string } | null;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [color, setColor] = useState(item?.color || COLOR_OPTIONS[0]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
        
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название..."
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500/50 text-white placeholder-white/30"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Цвет</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:bg-white/5 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => onSave(name, color)}
            disabled={!name}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
