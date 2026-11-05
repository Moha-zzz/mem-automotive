'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',                 icon: '⌂', label: 'Accueil' },
  { href: '/cap-et-objectifs', icon: '◎', label: 'Cap & Objectifs' },
  { href: '/voitures',         icon: '◫', label: 'Voitures' },
  { href: '/taches',           icon: '✓', label: 'Tâches' },
  { href: '/calendrier',       icon: '▦', label: 'Agenda' },
  { href: '/calculer',         icon: '€', label: 'Calculer' },
  { href: '/encheres',         icon: '⬆', label: 'Enchères' },
  { href: '/sites',            icon: '⌘', label: 'Sites' },
  { href: '/contacts',         icon: '◉', label: 'Contacts' },
  { href: '/argent',           icon: '₿', label: 'Argent' },
  { href: '/factures',         icon: '≡', label: 'Factures' },
  { href: '/police',           icon: '⊞', label: 'Livre de police' },
  { href: '/statistiques',     icon: '↗', label: 'Statistiques' },
  { href: '/reglages',         icon: '⚙', label: 'Réglages' },
];

const BOTTOM_NAV = [
  { href: '/',         icon: '⌂', label: 'Accueil' },
  { href: '/voitures', icon: '◫', label: 'Voitures' },
  { href: '/calculer', icon: '€', label: 'Calculer' },
  { href: '/argent',   icon: '₿', label: 'Argent' },
  { href: '/reglages', icon: '⚙', label: 'Plus' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide nav on auth pages
  if (pathname?.startsWith('/auth')) return null;

  const currentLabel = NAV.find(n => n.href === pathname)?.label ?? 'MEM AUTOMOTIVE';

  return (
    <>
      {/* Desktop sidebar */}
      <aside style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '232px',
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 12px',
        overflowY: 'auto',
        flexShrink: 0,
      }} className="sidebar-nav hidden-mobile">
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 10px 26px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: '#1D3F9E', display: 'grid', placeItems: 'center',
            color: '#fff', fontFamily: 'var(--font-barlow-cond, sans-serif)',
            fontWeight: 700, fontSize: 13, letterSpacing: '0.03em', flexShrink: 0,
          }}>
            MEM
          </div>
          <div>
            <b style={{ display: 'block', color: '#fff', font: '500 20px var(--font-barlow, sans-serif)', letterSpacing: '0.3em' }}>MEM</b>
            <small style={{ color: '#AEB9D6', fontSize: 9, fontWeight: 600, letterSpacing: '0.5em', textTransform: 'uppercase' }}>AUTOMOTIVE</small>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  color: active ? '#fff' : '#AEB9D6',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 #F2A20C' : 'none',
                  fontWeight: active ? 600 : 500, fontSize: 14,
                  transition: 'background 0.15s, color 0.15s',
                  cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: 'center', opacity: 0.9 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', fontSize: 12, color: '#7F8BAA', padding: '10px 10px 0' }}>
          MEM AUTOMOTIVE v1.0.0
        </div>
      </aside>

      {/* Mobile top bar */}
      <header style={{
        display: 'none',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 25,
        background: 'var(--navy)',
        color: '#fff',
        padding: '11px 16px',
      }} className="mobile-topbar">
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: '#1D3F9E', display: 'grid', placeItems: 'center',
          color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
        }}>M</div>
        <span style={{ font: '500 15px var(--font-barlow, sans-serif)', letterSpacing: '0.14em' }}>
          {pathname === '/' ? 'MEM AUTOMOTIVE' : currentLabel}
        </span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#AEB9D6', cursor: 'pointer', fontSize: 20, padding: 4 }}
          aria-label="Menu"
        >
          ☰
        </button>
      </header>

      {/* Mobile full-screen menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--navy)', zIndex: 100,
          display: 'flex', flexDirection: 'column', padding: '16px 12px', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px 20px' }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '0.3em' }}>MEM AUTO</span>
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 0, color: '#AEB9D6', fontSize: 24, cursor: 'pointer' }}>✕</button>
          </div>
          {NAV.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 14px', borderRadius: 10, marginBottom: 2,
                  color: active ? '#fff' : '#AEB9D6',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 #F2A20C' : 'none',
                  fontWeight: active ? 600 : 500, fontSize: 15,
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav style={{
        display: 'none',
        gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, 1fr)`,
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 30,
        background: 'rgba(255,255,255,0.92)',
        borderTop: '1px solid var(--line)',
        padding: '6px 4px calc(6px + env(safe-area-inset-bottom, 0px))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }} className="mobile-bottomnav">
        {BOTTOM_NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'grid', justifyItems: 'center', gap: 2,
              fontSize: 10.5, fontWeight: 600, textDecoration: 'none',
              color: active ? 'var(--blue)' : 'var(--muted)',
              padding: 4,
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: 820px) {
          .hidden-mobile { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-bottomnav { display: grid !important; }
        }
      `}</style>
    </>
  );
}
