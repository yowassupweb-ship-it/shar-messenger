'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
import Avatar from './Avatar';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  userName?: string;
  userId: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onAvatarChange?: (avatarUrl: string | null) => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  userName = '',
  userId,
  size = 'lg',
  onAvatarChange,
  className = '',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setError('Неподдерживаемый формат. Разрешены: JPG, PNG, GIF, WebP');
      return;
    }

    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой. Максимум 5MB');
      return;
    }

    setError(null);
    
    // Показываем превью
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Загружаем файл
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const res = await fetch('/api/avatars', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onAvatarChange?.(data.avatarUrl);
        setPreviewUrl(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Ошибка загрузки');
        setPreviewUrl(null);
      }
    } catch (err) {
      setError('Ошибка при загрузке файла');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Сбрасываем input чтобы можно было загрузить тот же файл повторно
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [userId, onAvatarChange]);

  const handleRemoveAvatar = useCallback(async () => {
    if (!currentAvatar) return;

    setIsUploading(true);
    try {
      const res = await fetch(`/api/avatars?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        onAvatarChange?.(null);
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Ошибка удаления');
      }
    } catch (err) {
      setError('Ошибка при удалении аватара');
    } finally {
      setIsUploading(false);
    }
  }, [userId, currentAvatar, onAvatarChange]);

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 ${className}`}>
      {/* Аватар с кнопкой загрузки */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Сам аватар или превью */}
        {displayAvatar ? (
          <div className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg`}>
            <img
              src={displayAvatar}
              alt={userName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <Avatar
            name={userName}
            size={size === 'sm' ? 'lg' : 'xl'}
            className={sizeClasses[size]}
          />
        )}

        {/* Оверлей при загрузке */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}

        {/* Кнопка загрузки */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
          title="Загрузить фото"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Кнопка удаления (если есть аватар) */}
        {currentAvatar && !isUploading && (
          <button
            onClick={handleRemoveAvatar}
            className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors"
            title="Удалить фото"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Скрытый input для файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Сообщение об ошибке */}
      {error && (
        <p className="text-xs text-red-500 text-center max-w-[150px]">{error}</p>
      )}

      {/* Подсказка */}
      {!error && !isUploading && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          JPG, PNG, GIF, WebP до 5MB
        </p>
      )}
    </div>
  );
};

export default AvatarUpload;
