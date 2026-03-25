interface ChatTimelineSkeletonProps {
  isDesktopView: boolean;
  hasPinnedMessage?: boolean;
}

export default function ChatTimelineSkeleton({
  isDesktopView,
  hasPinnedMessage = false,
}: ChatTimelineSkeletonProps) {
  const topInsetClass = isDesktopView
    ? (hasPinnedMessage ? 'pt-28' : 'pt-16')
    : (hasPinnedMessage ? 'pt-[164px]' : 'pt-[120px]');

  const bubbleRows = isDesktopView
    ? [
        { side: 'left', width: 'w-[42%]', height: 'h-16' },
        { side: 'right', width: 'w-[36%]', height: 'h-20' },
        { side: 'left', width: 'w-[54%]', height: 'h-24' },
        { side: 'right', width: 'w-[30%]', height: 'h-14' },
        { side: 'left', width: 'w-[38%]', height: 'h-16' },
      ]
    : [
        { side: 'left', width: 'w-[78%]', height: 'h-[72px]' },
        { side: 'right', width: 'w-[68%]', height: 'h-[82px]' },
        { side: 'left', width: 'w-[84%]', height: 'h-[96px]' },
        { side: 'right', width: 'w-[62%]', height: 'h-[64px]' },
        { side: 'left', width: 'w-[72%]', height: 'h-[74px]' },
      ];

  return (
    <div className={`absolute inset-0 z-30 overflow-hidden pointer-events-none ${topInsetClass}`}>
      <div className="relative h-full px-3 md:px-6 lg:px-10 py-4">
        <div className="space-y-3 md:space-y-4">
          {bubbleRows.map((row, index) => {
            const alignmentClass = row.side === 'right' ? 'justify-end' : 'justify-start';

            return (
              <div key={`${row.side}-${index}`} className={`flex ${alignmentClass}`}>
                <div
                  className={[
                    row.width,
                    row.height,
                    'rounded-[24px] border border-[var(--border-light)] bg-[var(--bg-secondary)]/92 shadow-[var(--shadow-card)]',
                    row.side === 'right' ? 'rounded-br-md' : 'rounded-bl-md',
                  ].join(' ')}
                >
                  <div className="h-full w-full p-4 flex flex-col justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-3 rounded-full bg-[var(--bg-tertiary)]/95 w-5/6" />
                      <div className="h-3 rounded-full bg-[var(--bg-tertiary)]/95 w-full" />
                      <div className="h-3 rounded-full bg-[var(--bg-tertiary)]/95 w-2/3" />
                    </div>
                    <div className={`flex ${row.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                      <div className="h-2.5 rounded-full bg-[var(--bg-tertiary)]/95 w-12" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}