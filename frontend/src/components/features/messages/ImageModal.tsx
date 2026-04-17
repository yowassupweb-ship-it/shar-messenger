import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, setZoom]);

  if (!isOpen || !imageUrl) return null;
  if (typeof document === 'undefined') return null;

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

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;

    const normalizedUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
      ? imageUrl
      : imageUrl.startsWith('/')
        ? imageUrl
        : `/${imageUrl}`;

    try {
      const response = await fetch(normalizedUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

      const blob = await response.blob();
      const clipboardItemCtor = (window as any).ClipboardItem;
      if (clipboardItemCtor) {
        const clipboardItem = new clipboardItemCtor({ [blob.type || 'image/png']: blob });
        await navigator.clipboard.write([clipboardItem]);
        return;
      }

      await navigator.clipboard.writeText(normalizedUrl);
    } catch {
      try {
        await navigator.clipboard.writeText(normalizedUrl);
      } catch {
        // Ignore clipboard errors to keep modal interaction non-blocking.
      }
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center"
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
            onClick={handleCopyToClipboard}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all"
            title="Копировать"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H7a2 2 0 01-2-2V7a2 2 0 012-2h7a2 2 0 012 2v1m-3 13h4a2 2 0 002-2v-5a2 2 0 00-2-2h-4a2 2 0 00-2 2v5a2 2 0 002 2z" />
            </svg>
          </button>
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
          onClick={handleCopyToClipboard}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition-all backdrop-blur-xl shadow-lg"
          title="Копировать"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H7a2 2 0 01-2-2V7a2 2 0 012-2h7a2 2 0 012 2v1m-3 13h4a2 2 0 002-2v-5a2 2 0 00-2-2h-4a2 2 0 00-2 2v5a2 2 0 002 2z" />
          </svg>
        </button>
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
      
      <div className="w-screen h-[100dvh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl}
          alt="Full size"
          className="w-full h-full object-contain transition-transform duration-200 select-none"
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

  return createPortal(modalContent, document.body);
}
