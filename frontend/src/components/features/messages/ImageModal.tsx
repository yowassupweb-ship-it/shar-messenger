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

  const handleClose = () => {
    onClose();
    setZoom(1);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center backdrop-blur-sm"
      onClick={handleClose}
    >
      {/* Header с кнопками - десктоп версия */}
      <div className="hidden md:flex absolute top-4 left-4 right-4 items-center justify-between z-10">
        {/* Zoom controls - слева */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.max(0.5, prev - 0.25));
            }}
            className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
            title="Уменьшить"
          >
            <span className="text-cyan-400 text-xl font-bold">−</span>
          </button>
          <div className="px-3 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-medium min-w-[60px]">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(prev => Math.min(3, prev + 0.25));
            }}
            className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
            title="Увеличить"
          >
            <span className="text-cyan-400 text-xl font-bold">+</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoom(1);
            }}
            className="px-3 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all text-cyan-400 text-sm"
            title="Сбросить"
          >
            100%
          </button>
        </div>
        
        {/* Кнопки справа */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
            title="Скачать"
          >
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all"
          >
            <X className="w-6 h-6 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Мобильная версия - кнопки НАД хедером */}
      <div className="md:hidden flex flex-col gap-2 absolute top-2 right-2 z-10">
        <button
          onClick={handleDownload}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
          title="Скачать"
        >
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
        >
          <X className="w-6 h-6 text-cyan-400" />
        </button>
      </div>

      {/* Мобильная версия - zoom controls внизу */}
      <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(prev => Math.max(0.5, prev - 0.25));
          }}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
          title="Уменьшить"
        >
          <span className="text-cyan-400 text-xl font-bold">−</span>
        </button>
        <div className="px-3 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-medium min-w-[60px] backdrop-blur-sm">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(prev => Math.min(3, prev + 0.25));
          }}
          className="w-12 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all backdrop-blur-sm"
          title="Увеличить"
        >
          <span className="text-cyan-400 text-xl font-bold">+</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
          }}
          className="px-3 h-12 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 flex items-center justify-center transition-all text-cyan-400 text-sm backdrop-blur-sm"
          title="Сбросить"
        >
          100%
        </button>
      </div>
      
      <div className="overflow-auto max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <img 
          src={imageUrl}
          alt="Full size"
          className="object-contain transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom})`,
            cursor: zoom > 1 ? 'move' : 'default',
            maxWidth: '90vw',
            maxHeight: '90vh'
          }}
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
