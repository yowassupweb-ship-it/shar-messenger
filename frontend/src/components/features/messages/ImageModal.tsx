import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  zoom: number;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  onClose,
  zoom,
  setZoom,
}: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setZoom(1);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const normalizedUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
      ? imageUrl
      : imageUrl.startsWith('/')
        ? imageUrl
        : `/${imageUrl}`;

    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');
      link.href = normalizedUrl;
      link.download = 'image.jpg';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Header с кнопками - десктоп версия */}
      <div className="hidden md:flex absolute top-4 left-4 right-4 items-center justify-between z-10" onClick={(e) => e.stopPropagation()}>
        {/* Zoom controls - слева */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.max(0.5, prev - 0.25));
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all"
            title="Уменьшить"
          >
            <span className="text-white text-xl font-bold">−</span>
          </button>
          <div className="px-3 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white text-sm font-medium min-w-[60px]">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.min(3, prev + 0.25));
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all"
            title="Увеличить"
          >
            <span className="text-white text-xl font-bold">+</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1);
            }}
            className="px-3 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all text-white text-sm"
            title="Сбросить"
          >
            100%
          </button>
        </div>
        
        {/* Кнопки справа */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all"
            title="Скачать"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Мобильная версия - кнопки НАД хедером */}
      <div className="md:hidden flex flex-col gap-2 absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownload}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all backdrop-blur-xl shadow-lg"
          title="Скачать"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all backdrop-blur-xl shadow-lg"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Мобильная версия - zoom controls внизу */}
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(prev => Math.max(0.5, prev - 0.25));
          }}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all backdrop-blur-xl shadow-lg"
          title="Уменьшить"
        >
          <span className="text-white text-xl font-bold">−</span>
        </button>
        <div className="px-3 h-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-white text-sm font-medium min-w-[60px] backdrop-blur-xl shadow-lg">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(prev => Math.min(3, prev + 0.25));
          }}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all backdrop-blur-xl shadow-lg"
          title="Увеличить"
        >
          <span className="text-white text-xl font-bold">+</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
          }}
          className="px-3 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all text-white text-sm backdrop-blur-xl shadow-lg"
          title="Сбросить"
        >
          100%
        </button>
      </div>
      
      <div className="w-full h-full flex items-center justify-center p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl}
          alt="Full size"
          className="object-contain transition-transform duration-200 select-none max-w-full max-h-full"
          style={{ 
            transform: `scale(${zoom})`,
            cursor: zoom > 1 ? 'grab' : 'default',
            touchAction: 'none'
          }}
          draggable={false}
          onWheel={(e) => {
            e.stopPropagation();
            if (e.deltaY < 0) {
              setZoom(prev => Math.min(3, prev + 0.1));
            } else {
              setZoom(prev => Math.max(0.5, prev - 0.1));
            }
          }}
        />
      </div>
    </div>
  );
}
