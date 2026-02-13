'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Plus, ExternalLink, Trash2, Settings, 
  Link2, User, Users, Shield, ChevronDown, X, Check
} from 'lucide-react';
import FormField from '@/components/ui/FormField';

interface LinkList {
  id: string;
  name: string;
  color: string;
  allowedUsers: string[];
  allowedDepartments: string[];
  createdBy: string;
  createdAt: string;
}

interface Link {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  listId: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

export default function LinksPageNew() {
  const router = useRouter();
  
  // Data states
  const [linkLists, setLinkLists] = useState<LinkList[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // UI states
  const [activeListId, setActiveListId] = useState<string>('');
  const [showAddLink, setShowAddLink] = useState(false);
  const [showListSettings, setShowListSettings] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);
  const [listSettingsData, setListSettingsData] = useState<LinkList | null>(null);
  
  // Form states
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3B82F6');
  
  // Advanced access management states (как в календаре)
  const [accessPermission, setAccessPermission] = useState<'viewer' | 'editor'>('viewer');
  const [accessShareTarget, setAccessShareTarget] = useState<'user' | 'department'>('user');
  const [accessSelectedUserId, setAccessSelectedUserId] = useState('');
  const [accessSelectedDepartmentId, setAccessSelectedDepartmentId] = useState('');
  const [searchUserAccess, setSearchUserAccess] = useState('');
  const [searchDepartmentAccess, setSearchDepartmentAccess] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [showShareTargetDropdown, setShowShareTargetDropdown] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [linksRes, usersRes, deptsRes] = await Promise.all([
        fetch('/api/links'),
        fetch('/api/users'),
        fetch('/api/departments')
      ]);
      
      if (linksRes.ok) {
        const data = await linksRes.json();
        setLinks(data.links || []);
        setLinkLists(data.lists || []);
        
        // Set active list
        const savedListId = localStorage.getItem('activeLinksListId');
        if (savedListId && data.lists.some((l: LinkList) => l.id === savedListId)) {
          setActiveListId(savedListId);
        } else if (data.lists.length > 0) {
          setActiveListId(data.lists[0].id);
        }
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      
      if (deptsRes.ok) {
        const data = await deptsRes.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save active list to localStorage
  useEffect(() => {
    if (activeListId) {
      localStorage.setItem('activeLinksListId', activeListId);
    }
  }, [activeListId]);

  // Filter links by active list
  const activeLinks = links.filter(link => link.listId === activeListId);

  // Add link
  const handleAddLink = async () => {
    if (!newLinkUrl || !activeListId) return;
    
    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'link',
          url: newLinkUrl,
          title: newLinkTitle || newLinkUrl,
          description: newLinkDescription,
          listId: activeListId
        })
      });
      
      if (res.ok) {
        const newLink = await res.json();
        setLinks([...links, newLink]);
        setNewLinkUrl('');
        setNewLinkTitle('');
        setNewLinkDescription('');
        setShow AddLink(false);
      }
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  // Delete link
  const handleDeleteLink = async (id: string) => {
    if (!confirm('Удалить ссылку?')) return;
    
    try {
      await fetch(`/api/links?id=${id}&type=link`, { method: 'DELETE' });
      setLinks(links.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting link:', error);
    }
  };

  // Create list
  const handleCreateList = async () => {
    if (!newListName) return;
    
    try {
      const res = await fetch('/api/link-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newListName,
          color: newListColor,
          createdBy: localStorage.getItem('username') || '',
          allowedUsers: [],
          allowedDepartments: []
        })
      });
      
      if (res.ok) {
        const newList = await res.json();
        setLinkLists([...linkLists, newList]);
        setActiveListId(newList.id);
        setNewListName('');
        setShowCreateList(false);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  };

  // Update list (with access management)
  const handleUpdateList = async () => {
    if (!listSettingsData) return;
    
    try {
      const res = await fetch('/api/link-lists', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listSettingsData)
      });
      
      if (res.ok) {
        const updated = await res.json();
        setLinkLists(linkLists.map(l => l.id === updated.id ? updated : l));
        setShowListSettings(false);
      }
    } catch (error) {
      console.error('Error updating list:', error);
    }
  };

  // Delete list
  const handleDeleteList = async (id: string) => {
    if (!confirm('Удалить список ссылок? Все ссылки в нем будут удалены.')) return;
    
    try {
      await fetch(`/api/link-lists?id=${id}`, { method: 'DELETE' });
      setLinkLists(linkLists.filter(l => l.id !== id));
      if (activeListId === id && linkLists.length > 1) {
        setActiveListId(linkLists[0].id);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="bg-white dark:bg-[var(--bg-secondary)] border-b border-gray-200 dark:border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">База ссылок</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* List selector */}
            <div className="relative">
              <button
                onClick={() => setShowListSelector(!showListSelector)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                {linkLists.find(l => l.id === activeListId)?.name || 'Выберите список'}
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showListSelector && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    {linkLists.map(list => (
                      <div key={list.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                        <button
                          onClick={() => {
                            setActiveListId(list.id);
                            setShowListSelector(false);
                          }}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: list.color }} />
                          <span className="text-sm">{list.name}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setListSettingsData(list);
                            setShowListSettings(true);
                            setShowListSelector(false);
                          }}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-white/10 p-2">
                    <button
                      onClick={() => {
                        setShowCreateList(true);
                        setShowListSelector(false);
                      }}
                      className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Создать список
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowAddLink(true)}
              disabled={!activeListId}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить ссылку
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto p-4">
        {activeLinks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-white/50">
            {activeListId ? 'Нет ссылок в этом списке' : 'Выберите или создайте список'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLinks.map(link => (
              <div key={link.id} className="bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{link.title}</h3>
                    {link.description && (
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-1 line-clamp-2">{link.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 mt-3"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate">{link.url}</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddLink(false)}>
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Добавить ссылку</h3>
              <button onClick={() => setShowAddLink(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">URL *</label>
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Название</label>
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Название ссылки"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Описание</label>
                <textarea
                  value={newLinkDescription}
                  onChange={(e) => setNewLinkDescription(e.target.value)}
                  placeholder="Краткое описание"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-white/10 px-5 py-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddLink(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleAddLink}
                disabled={!newLinkUrl}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {showCreateList && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateList(false)}>
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Создать список</h3>
              <button onClick={() => setShowCreateList(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название *</label>
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Мой список ссылок"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Цвет</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewListColor(color)}
                      className={`w-8 h-8 rounded-lg transition-all ${newListColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-white/10 px-5 py-4 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateList(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Settings Modal (с системой доступа как в календаре) */}
      {showListSettings && listSettingsData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowListSettings(false)}>
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="border-b border-gray-200 dark:border-white/10 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold">Настройки списка</h3>
              <button onClick={() => setShowListSettings(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium mb-1.5">Название</label>
                <input
                  type="text"
                  value={listSettingsData.name}
                  onChange={(e) => setListSettingsData({ ...listSettingsData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Access Management (как в календаре) */}
              <div className="space-y-3 rounded-2xl p-3 bg-white dark:bg-[var(--bg-tertiary)] border border-gray-200 dark:border-white/10">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/50">Управление доступом</div>

                <FormField label="Куда выдать доступ">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowShareTargetDropdown(!showShareTargetDropdown)}
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                    >
                      <span>
                        {accessShareTarget === 'user' && 'Пользователю'}
                        {accessShareTarget === 'department' && 'Отделу'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showShareTargetDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showShareTargetDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 p-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140]">
                        {[
                          { id: 'user', label: 'Пользователю' },
                          { id: 'department', label: 'Отделу' }
                        ].map((option) => {
                          const isActive = accessShareTarget === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setAccessShareTarget(option.id as 'department' | 'user');
                                setShowShareTargetDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                                  : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormField>

                {accessShareTarget === 'user' && (
                  <FormField label="Пользователь">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                      >
                        <span className="truncate">
                          {accessSelectedUserId 
                            ? users.find(u => u.id === accessSelectedUserId)?.name || 'Выберите пользователя'
                            : 'Выберите пользователя'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showUserDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140] max-h-64 overflow-hidden flex flex-col">
                          <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchUserAccess}
                            onChange={(e) => setSearchUserAccess(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                          />
                          <div className="overflow-y-auto p-1">
                            {users.filter(u => 
                              u.name.toLowerCase().includes(searchUserAccess.toLowerCase())
                            ).map((user) => {
                              const alreadyHasAccess = listSettingsData.allowedUsers?.includes(user.id);
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  disabled={alreadyHasAccess}
                                  onClick={() => {
                                    setAccessSelectedUserId(user.id);
                                    setShowUserDropdown(false);
                                    setSearchUserAccess('');
                                  }}
                                  className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                                    alreadyHasAccess
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <span className="flex-1">{user.name}</span>
                                  {alreadyHasAccess && <Check className="w-4 h-4 text-green-500" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                )}

                {accessShareTarget === 'department' && (
                  <FormField label="Отдел">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm text-left flex items-center justify-between hover:bg-gray-100 dark:hover:bg-white/10 hover:border-blue-500/50 transition-all rounded-xl"
                      >
                        <span className="truncate">
                          {accessSelectedDepartmentId 
                            ? departments.find(d => d.id === accessSelectedDepartmentId)?.name || 'Выберите отдел'
                            : 'Выберите отдел'}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showDepartmentDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-white/15 shadow-2xl z-[140] max-h-64 overflow-hidden flex flex-col">
                          <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchDepartmentAccess}
                            onChange={(e) => setSearchDepartmentAccess(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-sm focus:outline-none"
                          />
                          <div className="overflow-y-auto p-1">
                            {departments.filter(d => 
                              d.name.toLowerCase().includes(searchDepartmentAccess.toLowerCase())
                            ).map((dept) => {
                              const alreadyHasAccess = listSettingsData.allowedDepartments?.includes(dept.id);
                              return (
                                <button
                                  key={dept.id}
                                  type="button"
                                  disabled={alreadyHasAccess}
                                  onClick={() => {
                                    setAccessSelectedDepartmentId(dept.id);
                                    setShowDepartmentDropdown(false);
                                    setSearchDepartmentAccess('');
                                  }}
                                  className={`w-full px-3 py-2 text-sm text-left rounded-lg transition-colors flex items-center gap-2 ${
                                    alreadyHasAccess
                                      ? 'opacity-50 cursor-not-allowed'
                                      : 'hover:bg-gray-100 dark:hover:bg-white/[0.08]'
                                  }`}
                                >
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: dept.color }} />
                                  <span className="flex-1">{dept.name}</span>
                                  {alreadyHasAccess && <Check className="w-4 h-4 text-green-500" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </FormField>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (accessShareTarget === 'user' && accessSelectedUserId) {
                      setListSettingsData({
                        ...listSettingsData,
                        allowedUsers: [...(listSettingsData.allowedUsers || []), accessSelectedUserId]
                      });
                      setAccessSelectedUserId('');
                    } else if (accessShareTarget === 'department' && accessSelectedDepartmentId) {
                      setListSettingsData({
                        ...listSettingsData,
                        allowedDepartments: [...(listSettingsData.allowedDepartments || []), accessSelectedDepartmentId]
                      });
                      setAccessSelectedDepartmentId('');
                    }
                  }}
                  disabled={
                    (accessShareTarget === 'user' && !accessSelectedUserId) ||
                    (accessShareTarget === 'department' && !accessSelectedDepartmentId)
                  }
                  className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить доступ
                </button>

                {/* Current Access List */}
                {((listSettingsData.allowedUsers && listSettingsData.allowedUsers.length > 0) ||
                  (listSettingsData.allowedDepartments && listSettingsData.allowedDepartments.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                    <div className="text-xs font-medium text-gray-500 dark:text-white/50 mb-2">Имеют доступ:</div>
                    <div className="space-y-1.5">
                      {listSettingsData.allowedUsers?.map(userId => {
                        const user = users.find(u => u.id === userId);
                        if (!user) return null;
                        return (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{user.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setListSettingsData({
                                  ...listSettingsData,
                                  allowedUsers: listSettingsData.allowedUsers?.filter(id => id !== userId)
                                });
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {listSettingsData.allowedDepartments?.map(deptId => {
                        const dept = departments.find(d => d.id === deptId);
                        if (!dept) return null;
                        return (
                          <div
                            key={deptId}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-white/5 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: dept.color }} />
                              <span className="text-sm">{dept.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setListSettingsData({
                                  ...listSettingsData,
                                  allowedDepartments: listSettingsData.allowedDepartments?.filter(id => id !== deptId)
                                });
                              }}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!listSettingsData.allowedUsers?.length && !listSettingsData.allowedDepartments?.length && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Доступен всем
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-white/10 px-5 py-4 flex justify-between flex-shrink-0">
              <button
                onClick={() => {
                  if (!confirm(`Удалить список "${listSettingsData.name}"?`)) return;
                  handleDeleteList(listSettingsData.id);
                  setShowListSettings(false);
                }}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
              >
                Удалить
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowListSettings(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleUpdateList}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
