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
      <div className={`mt-2 mb-5 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} animate-pulse`}>
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
      </div>
    );
  }

  if (!preview) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 mb-5 block p-3 rounded-lg border ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-80 transition-opacity`}
      >
        <div className="flex items-start gap-2">
          <LinkIcon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-primary)] truncate">{url}</p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 mb-5 block rounded-lg border overflow-hidden ${isMyMessage ? 'bg-blue-600/20 border-blue-500/30' : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'} hover:opacity-90 transition-opacity`}
    >
      {preview.image && (
        <div className="w-full h-32 bg-black/20 overflow-hidden">
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
          <LinkIcon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--text-primary)] line-clamp-2 mb-1">
              {preview.title}
            </p>
            {preview.description && (
              <p className="text-[10px] text-[var(--text-muted)] line-clamp-2 mb-1">
                {preview.description}
              </p>
            )}
            <p className="text-[9px] text-purple-400/70 truncate">
              {preview.siteName}
            </p>
          </div>
        </div>
      </div>
    </a>
  );
}
