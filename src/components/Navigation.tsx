'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MENU = [
  { href: '/', icon: '📊', label: 'Accueil' },
  { href: '/voitures', icon: '🚗', label: 'Voitures' },
  { href: '/calculer', icon: '🧮', label: 'Calculer' },
  { href: '/argent', icon: '💰', label: 'Argent' },
  { href: '/factures', icon: '🧾', label: 'Factures' },
  { href: '/police', icon: '📋', label: 'Police' },
  { href: '/taches', icon: '✅', label: 'Tâches' },
  { href: '/calendrier', icon: '📅', label: 'Calendrier' },
  { href: '/contacts', icon: '👥', label: 'Contacts' },
  { href: '/statistiques', icon: '📊', label: 'Stats' },
  { href: '/reglages', icon: '⚙️', label: 'Réglages' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden md:flex bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-2 overflow-x-auto shadow-sm">
        <div className="max-w-7xl mx-auto flex gap-1">
          {MENU.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <span>{item.icon}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile Header + Menu */}
      <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-2 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-slate-800">
          MEM 🚗
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg">
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-2 py-2 space-y-1">
          {MENU.map(item => (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
