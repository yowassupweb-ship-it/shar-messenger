'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Link as LinkIcon, Copy, Check, Users, Trash2, ChevronDown } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'calendar' | 'todos' | 'content-plan' | 'task' | 'list';
  resourceId?: string;
  resourceName: string;
}

interface ShareLink {
  id: string;
  token: string;
  permission: 'viewer' | 'editor';
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface ContactUser {
  id: string;
  name?: string;
  username?: string;
  department?: string;
}

export default function ShareModal({ isOpen, onClose, resourceType, resourceId, resourceName }: ShareModalProps) {
  const [permission, setPermission] = useState<'viewer' | 'editor'>('viewer');
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false);
  const [shareTarget, setShareTarget] = useState<'link' | 'chat' | 'department' | 'user'>('link');
  const [chatId, setChatId] = useState('');
  const [department, setDepartment] = useState('');
  const [userId, setUserId] = useState('');
  const [contactUsers, setContactUsers] = useState<ContactUser[]>([]);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const modalId = useRef(`share-modal-${Date.now()}-${Math.random()}`).current;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const departmentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('closeOtherShareModals', { detail: { modalId } }));
      loadShareLinks();
    }
  }, [isOpen, resourceType, resourceId, modalId]);

  useEffect(() => {
    if (!isOpen || contactUsers.length > 0) return;

    const loadContacts = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.users || []);
        setContactUsers(list);
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };

    loadContacts();
  }, [isOpen, contactUsers.length]);
  useEffect(() => {
    const handleCloseOthers = (e: CustomEvent) => {
      if (e.detail.modalId !== modalId && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('closeOtherShareModals' as any, handleCloseOthers as any);
    return () => window.removeEventListener('closeOtherShareModals' as any, handleCloseOthers as any);
  }, [modalId, isOpen, onClose]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPermissionDropdown(false);
      }
    };
    
    if (showPermissionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPermissionDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(e.target as Node)) {
        setIsDepartmentDropdownOpen(false);
      }
    };

    if (isDepartmentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDepartmentDropdownOpen]);

  const loadShareLinks = async () => {
    try {
      if (!resourceId) return;
      
      const params = new URLSearchParams({ resource_type: resourceType, resource_id: resourceId });
      const res = await fetch(`/api/share?${params}`);
      
      if (res.ok) {
        const data = await res.json();
        setShareLinks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading share links:', error);
      setShareLinks([]);
    }
  };

  const departmentOptions = Array.from(
    new Set(contactUsers.map(user => user.department).filter(Boolean))
  ).sort() as string[];

  const filteredDepartments = departmentOptions.filter((dept) =>
    dept.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const createShareLink = async () => {
    if (!resourceId) return;
    
    setIsLoading(true);
    try {
      const username = localStorage.getItem('username') || 'anonymous';
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType,
          resourceId,
          permission,
          createdBy: username,
          shareTarget,
          chatId: chatId || undefined,
          department: department || undefined,
          userId: userId || undefined
        })
      });

      if (res.ok) {
        const newLink = await res.json();
        setShareLinks(prev => [newLink, ...prev]);
        copyToClipboard(newLink.token);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShareLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/share?link_id=${linkId}`, { method: 'DELETE' });
      if (res.ok) {
        setShareLinks(prev => prev.filter(l => l.id !== linkId));
      }
    } catch (error) {
      console.error('Error deleting share link:', error);
    }
  };

  const copyToClipboard = async (token: string) => {
    const url = `${window.location.origin}/${resourceType}?share=${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#252525] rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-200 dark:border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/20">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Настройки доступа
            </h3>
            <p className="text-sm text-gray-500 dark:text-white/60 mt-1">
              {resourceName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Create Link Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-3">
                Уровень доступа
              </label>
              
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPermissionDropdown(!showPermissionDropdown)}
                  className="w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/20 rounded-xl text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all flex items-center justify-between"
                >
                  <span className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-gray-500 dark:text-white/60" />
                    {permission === 'viewer' ? 'Читатель — только просмотр' : 'Редактор — полный доступ'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-white/60 transition-transform ${showPermissionDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPermissionDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/20 rounded-xl shadow-2xl z-10 overflow-hidden">
                    <button
                      onClick={() => {
                        setPermission('viewer');
                        setShowPermissionDropdown(false);
                      }}
                      className={`w-full px-4 py-3.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
                        permission === 'viewer' ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${permission === 'viewer' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          Читатель
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white/60 mt-1">
                          Может только просматривать содержимое
                        </div>
                      </div>
                      {permission === 'viewer' && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                    <div className="border-t border-gray-100 dark:border-white/10" />
                    <button
                      onClick={() => {
                        setPermission('editor');
                        setShowPermissionDropdown(false);
                      }}
                      className={`w-full px-4 py-3.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between ${
                        permission === 'editor' ? 'bg-blue-50 dark:bg-blue-500/10' : ''
                      }`}
                    >
                      <div>
                        <div className={`font-medium ${permission === 'editor' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                          Редактор
                        </div>
                        <div className="text-xs text-gray-500 dark:text-white/60 mt-1">
                          Может редактировать и добавлять элементы
                        </div>
                      </div>
                      {permission === 'editor' && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Куда выдать доступ
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'link', label: 'Ссылка' },
                  { id: 'chat', label: 'Чат' },
                  { id: 'department', label: 'Отдел' },
                  { id: 'user', label: 'Контакт' }
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setShareTarget(option.id as 'link' | 'chat' | 'department' | 'user')}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      shareTarget === option.id
                        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-500/20 dark:text-blue-300'
                        : 'border-gray-200 dark:border-white/20 hover:border-blue-300 dark:hover:border-blue-400/40 text-gray-700 dark:text-white/90 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {shareTarget === 'chat' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 dark:text-white/60">ID или название чата</label>
                  <input
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="chat_123 или URL"
                  />
                </div>
              )}

              {shareTarget === 'department' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 dark:text-white/60">Название отдела</label>
                  <div className="relative" ref={departmentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm text-left text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 flex items-center justify-between"
                    >
                      <span className={department ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/50'}>
                        {department || 'Выберите отдел'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-white/60 transition-transform ${isDepartmentDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDepartmentDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#252525] border border-gray-200 dark:border-white/20 rounded-xl shadow-2xl z-10 overflow-hidden">
                        <div className="p-2 border-b border-gray-100 dark:border-white/10">
                          <input
                            value={departmentSearch}
                            onChange={(e) => setDepartmentSearch(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            placeholder="Поиск по отделам"
                          />
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          {filteredDepartments.length === 0 && (
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-white/60">Отделы не найдены</div>
                          )}
                          {filteredDepartments.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => {
                                setDepartment(dept);
                                setIsDepartmentDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left transition-colors text-sm flex items-center justify-between ${
                                dept === department
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                  : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-900 dark:text-white'
                              }`}
                            >
                              <span className="truncate">{dept}</span>
                              {dept === department && <Check className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {shareTarget === 'user' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-500 dark:text-white/60">ID или логин контакта</label>
                  <input
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    placeholder="contact_123 или @username"
                  />
                </div>
              )}
            </div>
            
            <button
              onClick={createShareLink}
              disabled={isLoading}
              className="w-full px-5 py-3.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
            >
              <LinkIcon className="w-4 h-4" />
              {isLoading ? 'Создание...' : shareTarget === 'link' ? 'Создать ссылку' : 'Сохранить доступ'}
            </button>
          </div>

          {/* Existing Links */}
          {shareLinks.length > 0 && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-white">
                Активные ссылки ({shareLinks.length})
              </label>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {shareLinks.map(link => (
                  <div
                    key={link.id}
                    className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {link.permission === 'viewer' ? (
                            <span className="text-xs px-2.5 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/80 rounded-lg font-medium">
                              Читатель
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                              Редактор
                            </span>
                          )}
                          <span className="text-xs text-gray-500 dark:text-white/50">
                            {new Date(link.createdAt).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-gray-600 dark:text-white/60 truncate bg-white dark:bg-white/5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10">
                          {window.location.origin}/{resourceType}?share={link.token}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(link.token)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Копировать ссылку"
                        >
                          {copiedToken === link.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-500 dark:text-white/50" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => deleteShareLink(link.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Удалить ссылку"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-white/20 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
