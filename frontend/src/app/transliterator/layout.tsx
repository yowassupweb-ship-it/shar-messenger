'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Languages, Settings } from 'lucide-react'

export default function TransliteratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: '/transliterator', label: 'Транслитерация', Icon: Languages, exact: true },
    { href: '/transliterator/settings', label: 'Настройки', Icon: Settings },
  ]

  const isNavItemActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-12 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4">
        <Link
          href="/"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all mr-3"
          title="На главную"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
        </Link>
        
        <div className="flex items-center gap-2 mr-6">
          <Languages className="w-4 h-4 text-[#4a9eff]" />
          <span className="font-medium text-sm">Транслитератор</span>
        </div>
        
        <nav className="flex gap-1">
          {navItems.map((item) => {
            const isActive = isNavItemActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${
                  isActive 
                    ? 'bg-white/10 text-[#4a9eff] border border-white/10' 
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <item.Icon className="w-3.5 h-3.5" strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-[#0d0d0d]">
        {children}
      </main>

      {/* Status Bar */}
      <footer className="h-6 bg-[#1a1a1a] border-t border-white/5 flex items-center px-4 text-[10px]">
        <div className="flex items-center gap-4 text-white/30">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Готово
          </span>
        </div>
        <div className="flex-1" />
      </footer>
    </div>
  )
}
