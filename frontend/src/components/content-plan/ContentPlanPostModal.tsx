'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  X, Edit3, Link2, Copy, FileText, ChevronDown, Check, Globe, Mail, 
  ExternalLink, Search, MessageCircle, Send, Trash2, Plus, User, Users 
} from 'lucide-react';
import { ContentPost, Person, LinkItem, Comment, PostForm } from '@/types/contentPlan';
import { 
  PLATFORM_CONFIG, 
  STATUS_CONFIG, 
  CONTENT_TYPE_LABELS, 
  PLATFORM_CONTENT_TYPES 
} from '@/constants/contentPlanConfig';

interface ContentPlanPostModalProps {
  // State
  showAddPost: boolean;
  editingPost: ContentPost | null;
  selectedPlatform: string | null;
  openDropdown: string | null;
  platforms: ('telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site')[];
  postForm: PostForm;
  users: Person[];
  availableLinks: LinkItem[];
  linksSearchQuery: string;
  myAccountId: string | null;
  newComment: string;
  editingCommentId: string | null;
  editingCommentText: string;
  replyingToComment: Comment | null;
  isDirty: boolean;
  showMentionDropdown: boolean;
  mentionFilter: string;
  showLinkUrlModal: boolean;
  linkUrlInput: string;
  descriptionEditorRef: React.RefObject<HTMLDivElement>;
  commentInputRef: React.RefObject<HTMLTextAreaElement>;
  
  // Setters
  setOpenDropdown: (val: string | null) => void;
  setSelectedPlatform: (val: string | null) => void;
  setPostForm: React.Dispatch<React.SetStateAction<PostForm>>;
  setLinksSearchQuery: (val: string) => void;
  setNewComment: (val: string) => void;
  setEditingCommentId: (val: string | null) => void;
  setEditingCommentText: (val: string) => void;
  setReplyingToComment: (val: Comment | null) => void;
  setShowMentionDropdown: (val: boolean) => void;
  setMentionFilter: (val: string) => void;
  setShowLinkUrlModal: (val: boolean) => void;
  setLinkUrlInput: (val: string) => void;
  
  // Functions
  closeModal: () => void;
  copyPostLink: (postId: string) => void;
  copyPost: (post: ContentPost) => void;
  autoSaveStatus: (status: 'draft' | 'scheduled' | 'approved') => void;
  getAvailableContentTypes: () => { id: string; label: string }[];
  addPost: () => void;
  updatePost: () => void;
  deletePost: (postId: string) => void;
  addComment: () => void;
  updateComment: (postId: string, commentId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  startReply: (comment: Comment) => void;
}

export default function ContentPlanPostModal({
  showAddPost,
  editingPost,
  selectedPlatform,
  openDropdown,
  platforms,
  postForm,
  users,
  availableLinks,
  linksSearchQuery,
  myAccountId,
  newComment,
  editingCommentId,
  editingCommentText,
  replyingToComment,
  isDirty,
  showMentionDropdown,
  mentionFilter,
  showLinkUrlModal,
  linkUrlInput,
  descriptionEditorRef,
  commentInputRef,
  setOpenDropdown,
  setSelectedPlatform,
  setPostForm,
  setLinksSearchQuery,
  setNewComment,
  setEditingCommentId,
  setEditingCommentText,
  setReplyingToComment,
  setShowMentionDropdown,
  setMentionFilter,
  setShowLinkUrlModal,
  setLinkUrlInput,
  closeModal,
  copyPostLink,
  copyPost,
  autoSaveStatus,
  getAvailableContentTypes,
  addPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
  startReply
}: ContentPlanPostModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'text'>('details');

  if (!showAddPost) return null;

  return (
    <>
      {/* Main Modal */}
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
          
          <div className="px-3 sm:px-5 pt-2 border-b border-gray-200 dark:border-white/10">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/5 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
                }`}
              >
                Основное
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === 'text'
                    ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10'
                    : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'
                }`}
              >
                Текст
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-y-auto">
            {activeTab === 'details' && (
            <div className="w-full p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4">
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

              <div>
                <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Канал</label>
                <select
                  value={selectedPlatform || ''}
                  onChange={(e) => {
                    const platform = e.target.value as 'telegram' | 'vk' | 'dzen' | 'max' | 'mailing' | 'site' | '';
                    if (!platform) {
                      setSelectedPlatform(null);
                      setPostForm(prev => ({ ...prev, platform: null }));
                      return;
                    }
                    setSelectedPlatform(platform);
                    const defaultContentType = PLATFORM_CONTENT_TYPES[platform][0].id as any;
                    setPostForm(prev => ({ ...prev, platform, contentType: defaultContentType }));
                  }}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="">Выберите канал...</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{PLATFORM_CONFIG[platform].name}</option>
                  ))}
                </select>
              </div>

              {selectedPlatform && getAvailableContentTypes().length > 1 && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-white/50">Тип контента</label>
                  <select
                    value={postForm.contentType}
                    onChange={(e) => setPostForm(prev => ({ ...prev, contentType: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  >
                    {getAvailableContentTypes().map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  Заказчик
                </label>
                <select
                  value={postForm.assignedById || ''}
                  onChange={(e) => setPostForm(prev => ({ ...prev, assignedById: e.target.value || '' }))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                >
                  <option value="">Выберите заказчика</option>
                  {users.filter(p => p.role === 'customer' || p.role === 'universal').map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 dark:text-white/50 mb-1 uppercase tracking-wide flex items-center gap-1">
                  <Users className="w-2.5 h-2.5" />
                  Исполнители
                </label>
                <select
                  multiple
                  value={postForm.assignedToIds || []}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions).map(option => option.value);
                    setPostForm(prev => ({ ...prev, assignedToIds: values }));
                  }}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:border-purple-500/50 transition-colors min-h-[88px]"
                >
                  {users.filter(p => p.role === 'executor' || p.role === 'universal').map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 dark:text-white/40 mt-1">Можно выбрать нескольких исполнителей</p>
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
            )}

            {activeTab === 'text' && (
            <div className="w-full flex flex-col bg-gray-50 dark:bg-[#0d0d0d]">
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
                {/* [Uploaded media preview code remains in page.tsx for now - too complex to extract] */}
                
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
                    
                    // [Mention detection logic remains in page.tsx]
                  }}
                  onBlur={(e) => {
                    const target = e.target as HTMLDivElement;
                    setPostForm(prev => ({ ...prev, postText: target.innerHTML }));
                    setTimeout(() => setShowMentionDropdown(false), 200);
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'A' && target.getAttribute('href')) {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(target.getAttribute('href')!, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="w-full flex-1 min-h-[200px] px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm placeholder-gray-400 dark:placeholder-white/30 overflow-y-auto focus:outline-none focus:border-purple-400 dark:focus:border-purple-500/30 transition-all leading-relaxed"
                  style={{ minHeight: '200px' }}
                />
                
                {/* [Mention dropdown remains in page.tsx] */}
                
                {descriptionEditorRef.current && !descriptionEditorRef.current.innerHTML && (
                  <div className="absolute top-4 left-5 text-sm text-gray-400 dark:text-white/30 pointer-events-none">
                    Введите текст публикации... (@упомянуть)
                  </div>
                )}
              </div>
            </div>
            )}
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
    </>
  );
}
