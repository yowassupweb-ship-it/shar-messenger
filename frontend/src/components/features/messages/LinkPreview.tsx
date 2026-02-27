'use client';

import { useState, useEffect } from 'react';
import { Link as LinkIcon } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
  isMyMessage: boolean;
}

interface PreviewData {
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export default function LinkPreview({ url, isMyMessage }: LinkPreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const containerClass = isMyMessage
    ? 'bg-gradient-to-b from-white/28 to-white/14 dark:from-white/10 dark:to-white/5 border-white/40 dark:border-white/20'
    : 'bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border-[var(--border-light)]';
  const titleClass = isMyMessage ? 'text-white dark:text-[var(--text-primary)]' : 'text-[var(--text-primary)]';
  const secondaryClass = isMyMessage ? 'text-white/80 dark:text-[var(--text-muted)]' : 'text-[var(--text-muted)]';

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        if (res.ok) {
          const data = await res.json();
          setPreview(data);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (loading) {
    return (
      <div className={`mt-2 mb-5 block p-3 rounded-xl border backdrop-blur-md shadow-[var(--shadow-glass)] ${containerClass} animate-pulse`}>
        <div className="h-4 bg-black/10 dark:bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-black/10 dark:bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 mb-5 block p-3 rounded-xl border backdrop-blur-md shadow-[var(--shadow-glass)] ${containerClass} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-start gap-2">
          <LinkIcon className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
          <p className={`text-xs truncate ${titleClass}`}>{url}</p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 mb-5 block rounded-xl border overflow-hidden backdrop-blur-md shadow-[var(--shadow-glass)] ${containerClass} hover:opacity-95 transition-opacity`}
    >
      {preview.image && (
        <div className="w-full h-32 bg-[var(--bg-glass)] overflow-hidden">
          <img 
            src={preview.image} 
            alt={preview.title}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => {
              console.log('Image load error:', preview.image);
              const target = e.target as HTMLImageElement;
              target.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-1">
          <LinkIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold line-clamp-2 mb-1 ${titleClass}`}>
              {preview.title}
            </p>
            {preview.description && (
              <p className={`text-[10px] line-clamp-2 mb-1 ${secondaryClass}`}>
                {preview.description}
              </p>
            )}
            <p className={`text-[9px] truncate ${secondaryClass}`}>
              {preview.siteName}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}
