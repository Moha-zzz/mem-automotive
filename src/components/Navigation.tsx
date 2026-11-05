'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const MENU = [
  { href: '/', icon: '📊', label: 'Accueil', color: 'from-blue-500 to-cyan-500' },
  { href: '/voitures', icon: '🚗', label: 'Voitures', color: 'from-orange-500 to-red-500' },
  { href: '/calculer', icon: '🧮', label: 'Calculer', color: 'from-purple-500 to-pink-500' },
  { href: '/argent', icon: '💰', label: 'Argent', color: 'from-green-500 to-emerald-500' },
  { href: '/factures', icon: '🧾', label: 'Factures', color: 'from-amber-500 to-yellow-500' },
  { href: '/police', icon: '📋', label: 'Police', color: 'from-slate-500 to-blue-500' },
  { href: '/taches', icon: '✅', label: 'Tâches', color: 'from-rose-500 to-pink-500' },
  { href: '/calendrier', icon: '📅', label: 'Calendrier', color: 'from-indigo-500 to-purple-500' },
  { href: '/contacts', icon: '👥', label: 'Contacts', color: 'from-teal-500 to-cyan-500' },
  { href: '/statistiques', icon: '📊', label: 'Stats', color: 'from-violet-500 to-purple-500' },
  { href: '/reglages', icon: '⚙️', label: 'Réglages', color: 'from-gray-500 to-slate-500' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden md:block sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {MENU.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 cursor-pointer ${
                      isActive
                        ? `bg-gradient-to-r ${item.color} text-white shadow-lg`
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-50 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shadow-lg">
        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          MEM 🚗
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
        >
          <motion.div
            animate={{ rotate: mobileOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ☰
          </motion.div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="md:hidden bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 px-2 py-2 space-y-1"
        >
          {MENU.map(item => (
            <Link key={item.href} href={item.href}
              onClick={() => setMobileOpen(false)}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  pathname === item.href
                    ? `bg-gradient-to-r ${item.color} text-white`
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}
    </>
  );
}
