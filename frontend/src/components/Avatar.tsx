'use client';

import React, { useState, useEffect } from 'react';
import { Star, Bell, Users } from 'lucide-react';
import { getColorFromName, getInitials, generateAvatarUrl, usesExternalUrl } from '@/utils/avatarUtils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
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
  '2xl': 'w-24 h-24 text-2xl',
};

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 96,
};

const iconSizes = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 36,
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
  const [imageError, setImageError] = useState(false);
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const sizeInPixels = sizePixels[size];
  
  // Сбрасываем ошибку при изменении src
  useEffect(() => {
    setImageError(false);
  }, [src]);
  
  // Генерируем URL аватара для обычных пользователей
  const generatedAvatarUrl = type === 'user' && !src ? generateAvatarUrl(name, sizeInPixels) : null;
  const finalSrc = !imageError ? (src || generatedAvatarUrl) : null;
  
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
    // Если есть изображение или сгенерированный URL и нет ошибки
    if (finalSrc) {
      return (
        <img
          src={finalSrc}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => {
            // Если изображение не загрузилось, показываем инициалы
            setImageError(true);
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
          ${!finalSrc ? getBgClass() : 'bg-gray-200 dark:bg-gray-700'}
          rounded-full
          flex items-center justify-center
          overflow-hidden
          flex-shrink-0
          shadow-sm
          select-none
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
