// 🚀 PERFORMANCE: Skeleton loader для списка чатов (LCP optimization)
// Показывается мгновенно пока загружаются данные

export default function ChatListSkeleton() {
  return (
    <div className="space-y-2 px-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="mx-2 rounded-[18px] overflow-hidden bg-gradient-to-b from-[var(--bg-glass-active)] to-[var(--bg-glass)] border border-[var(--border-light)] p-3"
        >
          <div className="flex gap-3 items-center">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-white/5 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              {/* Title skeleton */}
              <div className="h-3.5 bg-white/15 dark:bg-white/8 rounded w-3/5 mb-2" />
              
              {/* Message preview skeleton */}
              <div className="h-2.5 bg-white/10 dark:bg-white/5 rounded w-full" />
            </div>
            
            {/* Time skeleton */}
            <div className="h-2.5 bg-white/10 dark:bg-white/5 rounded w-10 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
