'use client'

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d]">
      {children}
    </div>
  )
}
