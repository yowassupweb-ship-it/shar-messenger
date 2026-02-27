import { Search, X } from 'lucide-react';

interface MessageSearchBarProps {
  showMessageSearch: boolean;
  messageSearchQuery: string;
  setMessageSearchQuery: (value: string) => void;
  setShowMessageSearch: (show: boolean) => void;
}

export default function MessageSearchBar({
  showMessageSearch,
  messageSearchQuery,
  setMessageSearchQuery,
  setShowMessageSearch,
}: MessageSearchBarProps) {
  if (!showMessageSearch) return null;

  return (
    <div className="absolute top-[72px] md:hidden left-2 right-2 z-20 px-2 py-2">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] shadow-[var(--shadow-glass)] flex items-center justify-center pointer-events-none">
          <Search className="w-4 h-4 text-[var(--text-primary)]" strokeWidth={2.6} />
        </div>
        <input
          type="text"
          placeholder="Поиск по чату..."
          value={messageSearchQuery}
          onChange={(e) => setMessageSearchQuery(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-10 py-2.5 bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] rounded-[50px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--border-primary)] shadow-[var(--shadow-glass)] backdrop-blur-xl"
        />
        <button
          onClick={() => { 
            setShowMessageSearch(false); 
            setMessageSearchQuery(''); 
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6.5 h-6.5 rounded-full hover:bg-[var(--bg-glass-hover)] flex items-center justify-center transition-all"
        >
          <X className="w-4.5 h-4.5 text-[var(--text-primary)]" />
        </button>
      </div>
    </div>
  );
}
