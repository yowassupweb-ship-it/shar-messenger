'use client'

export default function TodosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-screen flex flex-col">
      {children}
    </div>
  )
}
