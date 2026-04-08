'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/domain'

interface NavbarProps {
  profile: Profile
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const links = [
    { href: '/rooms', label: 'חדרים' },
    { href: '/bookings', label: 'ההזמנות שלי' },
    ...(profile.role === 'admin' ? [{ href: '/admin/users', label: 'ניהול' }] : []),
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main row */}
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <Link href="/rooms" className="font-bold text-brand-700 text-lg ml-4">
              הזמנת חדרים
            </Link>
            {/* Desktop links */}
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href)
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop: name + sign out */}
            <span className="hidden sm:block text-sm text-gray-500">{profile.full_name}</span>
            <button
              onClick={handleSignOut}
              className="hidden sm:block text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              יציאה
            </button>

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="תפריט"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 py-3 space-y-1">
            <p className="px-3 py-1 text-xs text-gray-400">{profile.full_name}</p>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleSignOut}
              className="w-full text-right px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              יציאה
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
