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
    <div className="absolute top-[72px] md:top-16 left-2 right-2 z-20 px-2 md:px-4 lg:px-8 py-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
        <input
          type="text"
          placeholder="Поиск по чату..."
          value={messageSearchQuery}
          onChange={(e) => setMessageSearchQuery(e.target.value)}
          autoFocus
          className="w-full pl-10 pr-10 py-2.5 bg-gradient-to-br from-white/15 to-white/5 border border-white/20 rounded-[50px] text-sm focus:outline-none transition-all duration-200 placeholder:text-[var(--text-muted)] focus:border-white/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.1)] backdrop-blur-xl"
        />
        <button
          onClick={() => { 
            setShowMessageSearch(false); 
            setMessageSearchQuery(''); 
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
