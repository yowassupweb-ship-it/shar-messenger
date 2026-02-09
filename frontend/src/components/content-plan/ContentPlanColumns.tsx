'use client';

import React from 'react';
import Image from 'next/image';
import {
  Plus,
  Clock,
  GripVertical,
  MessageCircle,
  Copy,
  Link2,
  Globe,
  Mail
} from 'lucide-react';
import { PLATFORM_CONFIG, STATUS_CONFIG, CONTENT_TYPE_LABELS } from '@/constants/contentPlanConfig';
import { formatDateKey } from '@/utils/contentPlanHelpers';
import type { ContentPost, Person } from '@/types/contentPlan';

interface ContentPlanColumnsProps {
  weekDays: Date[];
  draggedPost: ContentPost | null;
  dragOverDate: string | null;
  myAccountId: string | null;
  users: Person[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  getPostsForDay: (day: Date) => ContentPost[];
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleMouseLeave: () => void;
  handleDragOver: (e: React.DragEvent, dateKey: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, date: Date) => void;
  handleDragStart: (e: React.DragEvent, post: ContentPost) => void;
  handleDragEnd: () => void;
  openEditPost: (post: ContentPost) => void;
  openAddPost: (date: Date) => void;
  copyPost: (post: ContentPost, e?: React.MouseEvent) => void;
  copyPostLink: (postId: string, e?: React.MouseEvent) => void;
}

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function ContentPlanColumns({
  weekDays,
  draggedPost,
  dragOverDate,
  myAccountId,
  users,
  scrollContainerRef,
  getPostsForDay,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  openEditPost,
  openAddPost,
  copyPost,
  copyPostLink
}: ContentPlanColumnsProps) {
  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-x-auto overflow-y-auto p-4 cursor-grab"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {weekDays.map((day, idx) => {
          const dateKey = formatDateKey(day);
          const dayPosts = getPostsForDay(day);
          const isToday = dateKey === formatDateKey(new Date());
          const isDropTarget = dragOverDate === dateKey;
          
          return (
            <div
              key={dateKey}
              style={{ width: '260px', minWidth: '260px', flexShrink: 0 }}
              className={`flex flex-col rounded-xl border transition-all ${
                isDropTarget ? 'ring-2 ring-purple-500/50 border-purple-500/50' : 'border-gray-300 dark:border-white/10'
              } ${
                isToday ? 'border-purple-500/40' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
            >
              {/* Column Header */}
              <div className={`px-2.5 py-1.5 rounded-t-xl border-b flex items-center justify-between ${
                isToday 
                  ? 'bg-purple-500/20 border-purple-500/30' 
                  : 'bg-gray-100 dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                    {day.getDate()}
                  </span>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-purple-500 dark:text-purple-400/70' : 'text-gray-500 dark:text-white/40'}`}>
                    {day.toLocaleDateString('ru-RU', { month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${isToday ? 'text-purple-500 dark:text-purple-400/70' : 'text-gray-500 dark:text-white/40'}`}>
                    {dayNames[idx]}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-white/30 bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded font-medium">
                    {dayPosts.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className={`flex-1 p-2.5 space-y-3 rounded-b-xl min-h-[100px] ${
                isToday ? 'bg-purple-50 dark:bg-purple-500/5' : 'bg-gray-50 dark:bg-[#141414]'
              }`}>
                {dayPosts.map(post => {
                  const platformConfig = PLATFORM_CONFIG[post.platform] || { color: '#666', name: 'Unknown', icon: '' };
                  const isLargeIcon = post.platform === 'telegram' || post.platform === 'vk';
                  return (
                    <div
                      key={post.id}
                      className="relative"
                    >
                      <div
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, post)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openEditPost(post)}
                        className={`relative p-2.5 rounded-lg bg-gradient-to-br from-white dark:from-[#1a1a1a] to-gray-50 dark:to-[#161616] border cursor-grab active:cursor-grabbing transition-all ${
                          draggedPost?.id === post.id 
                            ? 'opacity-50 scale-95 border-gray-300 dark:border-white/20' 
                            : 'border-gray-200 dark:border-white/10 hover:border-purple-400 dark:hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10'
                        }`}
                      >
                        {/* Platform icon badge */}
                        <div 
                          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center z-10 border-2 shadow-md ${
                            isToday ? 'border-purple-200 dark:border-purple-500/30' : 'border-gray-100 dark:border-[#141414]'
                          }`}
                          style={{ backgroundColor: platformConfig.color }}
                          title={platformConfig.name}
                        >
                          {platformConfig.icon === 'globe' ? (
                            <Globe className="w-3 h-3 text-white" />
                          ) : platformConfig.icon ? (
                            <Image 
                              src={platformConfig.icon} 
                              alt={platformConfig.name} 
                              width={isLargeIcon ? 20 : 16} 
                              height={isLargeIcon ? 20 : 16} 
                              className={isLargeIcon ? "w-5 h-5 object-contain" : "w-4 h-4 object-contain"} 
                            />
                          ) : (
                            <Mail className="w-3 h-3 text-white" />
                          )}
                        </div>
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-1.5">
                            <GripVertical className="w-3 h-3 text-white/30 cursor-grab flex-shrink-0 hover:text-white/50" />
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${STATUS_CONFIG[post.postStatus].bg} ${STATUS_CONFIG[post.postStatus].color}`}>
                              {STATUS_CONFIG[post.postStatus].label}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/20">
                              {CONTENT_TYPE_LABELS[post.contentType]}
                            </span>
                          </div>
                          {post.publishTime && (
                            <span className="text-[10px] text-gray-500 dark:text-white/60 flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3" />
                              {post.publishTime}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 leading-tight">
                          {post.title}
                        </div>

                        {/* Tags & Badges */}
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          {post.assignedById && (() => {
                            const customer = users.find(u => u.id === post.assignedById);
                            return customer ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                                {customer.name}
                              </span>
                            ) : null;
                          })()}
                          {post.assignedToIds?.map(execId => {
                            const executor = users.find(u => u.id === execId);
                            return executor ? (
                              <span key={execId} className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                                {executor.name}
                              </span>
                            ) : null;
                          })}
                          {post.linkId && post.linkUrl && (
                            <a 
                              href={post.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors font-semibold border border-cyan-500/30"
                              title={post.linkTitle || post.linkUrl}
                            >
                              <Link2 className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate max-w-[90px]">{post.linkTitle || 'Ссылка'}</span>
                            </a>
                          )}
                        </div>

                        {/* Text Preview */}
                        {post.postText && (
                          <div className="text-[10px] text-gray-400 dark:text-white/40 line-clamp-2 mb-2 leading-relaxed italic" dangerouslySetInnerHTML={{ __html: post.postText.replace(/<[^>]*>/g, ' ').slice(0, 70) + '...' }} />
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-1">
                            {post.comments && post.comments.length > 0 && (() => {
                              const isParticipant = post.assignedById === myAccountId || post.assignedToIds?.includes(myAccountId || '');
                              const hasUnread = isParticipant && post.comments.some(c => 
                                c.authorId !== myAccountId && (!c.readBy || !c.readBy.includes(myAccountId || ''))
                              );
                              
                              return (
                                <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold border relative ${
                                  hasUnread 
                                    ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                }`}>
                                  <MessageCircle className="w-3 h-3" />
                                  <span>{post.comments.length}</span>
                                  {hasUnread && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => copyPost(post, e)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 text-gray-400 dark:text-white/40 hover:text-purple-500 dark:hover:text-purple-300 transition-all"
                              title="Копировать"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => copyPostLink(post.id, e)}
                              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-purple-100 dark:hover:bg-purple-500/20 border border-gray-200 dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500/30 text-gray-400 dark:text-white/40 hover:text-purple-500 dark:hover:text-purple-300 transition-all"
                              title="Скопировать ссылку"
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Add Button */}
                <button
                  onClick={() => openAddPost(day)}
                  className="w-full p-2 flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-white/10 rounded-lg hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-100 dark:hover:bg-white/[0.02] transition-all group"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/50" />
                  <span className="text-xs text-gray-400 dark:text-white/30 group-hover:text-gray-600 dark:group-hover:text-white/50 font-medium">Добавить</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
