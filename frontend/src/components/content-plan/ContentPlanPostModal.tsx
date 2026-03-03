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
  if (!showAddPost) return null;

  return (
    <>
      {/* Main Modal */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
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


          <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

              {/* Status Buttons */}
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

              <div>
                <label className="block text-xs text-white/50 mb-2">Канал</label>
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
                  className="w-full px-4 py-2.5 bg-[var(--bg-glass)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] text-sm focus:outline-none focus:border-purple-500/50"
                >
                  <option value="">Выберите канал...</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform} className="bg-[var(--bg-tertiary)]">{PLATFORM_CONFIG[platform].name}</option>
                  ))}
                </select>
              </div>

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
    </>
  );
}
