// 🚀 PERFORMANCE: Skeleton loader для списка чатов (LCP optimization)
// Показывается мгновенно пока загружаются данные

export default function ChatListSkeleton() {
  return (
    <div className="space-y-1 px-2 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="mx-2 rounded-[50px] overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 p-2"
        >
          <div className="flex gap-2 items-center">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              {/* Title skeleton */}
              <div className="h-3 bg-white/10 rounded w-2/3 mb-2" />
              
              {/* Message preview skeleton */}
              <div className="h-2 bg-white/5 rounded w-full" />
            </div>
            
            {/* Time skeleton */}
            <div className="h-2 bg-white/5 rounded w-8 flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
