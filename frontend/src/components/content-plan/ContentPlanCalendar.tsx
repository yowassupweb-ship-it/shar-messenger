'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Mail } from 'lucide-react';
import { PLATFORM_CONFIG, WEEKDAYS } from '@/constants/contentPlanConfig';
import { formatDateKey } from '@/utils/contentPlanHelpers';
import type { ContentPost } from '@/types/contentPlan';

interface ContentPlanCalendarProps {
  calendarDays: Array<{ date: Date; isCurrentMonth: boolean }>;
  draggedPost: ContentPost | null;
  dragOverDate: string | null;
  getPostsForDay: (day: Date) => ContentPost[];
  handleDragOver: (e: React.DragEvent, dateKey: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent, date: Date) => void;
  handleDragStart: (e: React.DragEvent, post: ContentPost) => void;
  handleDragEnd: () => void;
  openEditPost: (post: ContentPost) => void;
  openAddPost: (date: Date) => void;
}

export default function ContentPlanCalendar({
  calendarDays,
  draggedPost,
  dragOverDate,
  getPostsForDay,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragStart,
  handleDragEnd,
  openEditPost,
  openAddPost
}: ContentPlanCalendarProps) {
  return (
    <div className="flex-1 overflow-auto p-2 sm:p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-white/10">
          {WEEKDAYS.map(day => (
            <div key={day} className="p-1.5 sm:p-2 text-center text-[10px] sm:text-xs font-medium text-gray-500 dark:text-white/50 border-r border-gray-100 dark:border-white/5 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, idx) => {
            const dateKey = formatDateKey(date);
            const dayPosts = getPostsForDay(date);
            const isToday = dateKey === formatDateKey(new Date());
            const isDropTarget = dragOverDate === dateKey;
            
            return (
              <div
                key={idx}
                className={`group min-h-[100px] sm:min-h-[140px] p-1.5 sm:p-2 border-r border-b border-gray-100 dark:border-white/5 last:border-r-0 transition-all ${
                  !isCurrentMonth ? 'bg-gray-100 dark:bg-black/20' : 'bg-white dark:bg-transparent'
                } ${isDropTarget ? 'bg-purple-100 dark:bg-purple-500/20 ring-2 ring-inset ring-purple-500/50' : ''} ${isToday ? 'bg-purple-50 dark:bg-purple-500/5' : ''}`}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1 px-0.5 sm:px-1">
                  <span className={`text-[10px] sm:text-xs font-medium ${
                    isToday ? 'text-purple-600 dark:text-purple-400' : isCurrentMonth ? 'text-gray-700 dark:text-white/70' : 'text-gray-400 dark:text-white/30'
                  }`}>
                    {date.getDate()}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="text-[9px] text-gray-500 dark:text-white/40 bg-gray-200 dark:bg-white/10 px-1 rounded">
                      {dayPosts.length}
                    </span>
                  )}
                </div>
                
                {/* Posts */}
                <div className="space-y-2 pt-1 pr-1">
                  {dayPosts.slice(0, 3).map(post => {
                    const platformConfig = PLATFORM_CONFIG[post.platform] || { color: '#666', name: 'Unknown', icon: '' };
                    return (
                      <div
                        key={post.id}
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, post)}
                        onDragEnd={handleDragEnd}
                        onClick={() => openEditPost(post)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] cursor-grab active:cursor-grabbing transition-all border ${
                          draggedPost?.id === post.id ? 'opacity-50 scale-95' : 'hover:brightness-110'
                        }`}
                        style={{ 
                          backgroundColor: `${platformConfig.color}15`, 
                          borderColor: `${platformConfig.color}40`
                        }}
                        title={post.title}
                      >
                        {post.publishTime && (
                          <span className="text-[9px] text-gray-600 dark:text-white/60 flex-shrink-0 font-medium">{post.publishTime}</span>
                        )}
                        <span className="truncate font-medium flex-1 text-gray-900 dark:text-white">{post.title}</span>
                        {/* Platform icon */}
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: platformConfig.color }}
                          title={platformConfig.name}
                        >
                          {platformConfig.icon ? (
                            <Image 
                              src={platformConfig.icon} 
                              alt={platformConfig.name} 
                              width={post.platform === 'telegram' || post.platform === 'vk' ? 12 : 10} 
                              height={post.platform === 'telegram' || post.platform === 'vk' ? 12 : 10} 
                              className={(post.platform === 'telegram' || post.platform === 'vk') ? "w-3 h-3 object-contain" : "w-2.5 h-2.5 object-contain"} 
                            />
                          ) : (
                            <Mail className="w-2.5 h-2.5 text-white" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {dayPosts.length > 3 && (
                    <div className="text-[10px] text-gray-500 dark:text-white/50 px-2 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-center">
                      +{dayPosts.length - 3} ещё
                    </div>
                  )}
                </div>
                
                {/* Add Button */}
                {isCurrentMonth && (
                  <button
                    onClick={() => openAddPost(date)}
                    className={`w-full mt-1 p-1 flex items-center justify-center text-gray-300 dark:text-white/20 hover:text-gray-500 dark:hover:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-all ${dayPosts.length > 0 ? 'opacity-0 group-hover:opacity-100' : ''}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
