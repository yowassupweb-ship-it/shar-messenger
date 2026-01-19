'use client';

import React from 'react';
import { Star, Bell, Users } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  // Специальные типы аватарок
  type?: 'user' | 'favorites' | 'notifications' | 'group';
  // Цвет фона (если нет изображения)
  bgColor?: string;
  // Показывать онлайн статус
  isOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const iconSizes = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
};

// Генерация цвета на основе имени
const getColorFromName = (name: string): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-emerald-500',
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Получение инициалов
const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name = '',
  size = 'md',
  className = '',
  type = 'user',
  bgColor,
  isOnline,
}) => {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  // Определяем цвет фона
  const getBgClass = () => {
    if (bgColor) return bgColor;
    
    switch (type) {
      case 'favorites':
        return 'bg-gradient-to-br from-yellow-400 to-orange-500';
      case 'notifications':
        return 'bg-gradient-to-br from-blue-400 to-blue-600';
      case 'group':
        return 'bg-gradient-to-br from-purple-400 to-purple-600';
      default:
        return getColorFromName(name);
    }
  };
  
  // Рендер содержимого аватара
  const renderContent = () => {
    // Если есть изображение
    if (src) {
      return (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Если изображение не загрузилось, скрываем его
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    
    // Специальные иконки
    switch (type) {
      case 'favorites':
        return <Star className="text-white" size={iconSize} fill="currentColor" />;
      case 'notifications':
        return <Bell className="text-white" size={iconSize} />;
      case 'group':
        return <Users className="text-white" size={iconSize} />;
      default:
        return (
          <span className="text-white font-medium">
            {getInitials(name)}
          </span>
        );
    }
  };
  
  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`
          ${sizeClass}
          ${!src ? getBgClass() : 'bg-gray-200 dark:bg-gray-700'}
          rounded-full
          flex items-center justify-center
          overflow-hidden
          flex-shrink-0
          shadow-sm
        `}
      >
        {renderContent()}
      </div>
      
      {/* Онлайн индикатор */}
      {isOnline !== undefined && (
        <span
          className={`
            absolute bottom-0 right-0
            ${size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'}
            rounded-full
            border-2 border-white dark:border-gray-800
            ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
          `}
        />
      )}
    </div>
  );
};

export default Avatar;
