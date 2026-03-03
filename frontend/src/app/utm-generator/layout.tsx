'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Link2, Clock, ArrowLeft, Hash } from 'lucide-react'

export default function UTMGeneratorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: '/utm-generator', label: 'Генератор', Icon: Link2, exact: true },
    { href: '/utm-generator/history', label: 'История', Icon: Clock },
  ]

  const isNavItemActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <>
      {children}
    </>
  )
}