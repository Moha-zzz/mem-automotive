'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/',                 label: 'Accueil' },
  { href: '/cap-et-objectifs', label: 'Cap & Objectifs' },
  { href: '/voitures',         label: 'Voitures' },
  { href: '/taches',           label: 'Tâches' },
  { href: '/calendrier',       label: 'Agenda' },
  { href: '/calculer',         label: 'Calculer' },
  { href: '/encheres',         label: 'Enchères' },
  { href: '/sites',            label: 'Sites d\'achat' },
  { href: '/contacts',         label: 'Contacts' },
  { href: '/argent',           label: 'Argent' },
  { href: '/factures',         label: 'Factures' },
  { href: '/police',           label: 'Livre de police' },
  { href: '/statistiques',     label: 'Statistiques' },
  { href: '/reglages',         label: 'Réglages' },
];

const ICONS: Record<string, string> = {
  '/': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  '/voitures': 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m14-6h.01M5 16H3',
  '/calculer': 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z',
  '/argent': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '/factures': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  '/taches': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  '/calendrier': 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  '/encheres': 'M13 10V3L4 14h7v7l9-11h-7z',
  '/sites': 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  '/contacts': 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  '/police': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  '/statistiques': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  '/cap-et-objectifs': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  '/reglages': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

function Icon({ href }: { href: string }) {
  const d = ICONS[href] ?? ICONS['/reglages'];
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d.split(' M').map((part, i) => (
        <path key={i} d={i === 0 ? part : 'M' + part} />
      ))}
    </svg>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname?.startsWith('/auth')) return null;

  const currentLabel = NAV.find(n => n.href === pathname)?.label ?? 'MEM AUTOMOTIVE';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside style={{
        width: 232,
        flexShrink: 0,
        background: 'var(--navy)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        padding: '20px 10px',
      }} className="hide-on-mobile">

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 10px 24px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, background: '#1D3F9E',
            display: 'grid', placeItems: 'center', flexShrink: 0,
            color: '#fff', fontWeight: 700, fontSize: 12,
            fontFamily: 'var(--font-barlow-cond, sans-serif)', letterSpacing: '0.03em',
          }}>MEM</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 17, letterSpacing: '0.25em', lineHeight: 1 }}>MEM</div>
            <div style={{ color: '#AEB9D6', fontSize: 8.5, fontWeight: 600, letterSpacing: '0.5em', textTransform: 'uppercase', marginTop: 2 }}>AUTOMOTIVE</div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {NAV.map(({ href, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 9,
                  color: active ? '#fff' : '#AEB9D6',
                  background: active ? 'rgba(255,255,255,0.11)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 #F2A20C' : 'none',
                  fontWeight: active ? 600 : 400, fontSize: 13.5,
                  transition: 'background 0.12s, color 0.12s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                  <Icon href={href} />
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', fontSize: 11.5, color: '#5A6880', padding: '12px 10px 0' }}>
          v1.0.0
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--navy)', color: '#fff',
        padding: '11px 16px', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }} className="show-on-mobile">
        <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1D3F9E', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>M</div>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 15, letterSpacing: '0.08em' }}>
          {pathname === '/' ? 'MEM AUTOMOTIVE' : currentLabel}
        </span>
        <button onClick={() => setMenuOpen(o => !o)} style={{ background: 'none', border: 0, color: '#AEB9D6', cursor: 'pointer', padding: 4, fontSize: 20 }}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile full overlay menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--navy)', zIndex: 100, display: 'flex', flexDirection: 'column', padding: '60px 12px 100px', overflowY: 'auto' }}
          className="show-on-mobile">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {NAV.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                    padding: '14px 12px', borderRadius: 11,
                    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(242,162,12,0.5)' : '1px solid rgba(255,255,255,0.06)',
                    color: active ? '#fff' : '#AEB9D6',
                    fontWeight: active ? 600 : 400, fontSize: 13,
                    cursor: 'pointer',
                  }}>
                    <Icon href={href} />
                    <span>{label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: 'rgba(255,255,255,0.94)', borderTop: '1px solid var(--line)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        gridTemplateColumns: 'repeat(5, 1fr)',
        padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))',
      }} className="show-on-mobile show-grid">
        {[
          { href: '/',         label: 'Accueil'  },
          { href: '/voitures', label: 'Voitures' },
          { href: '/calculer', label: 'Calculer' },
          { href: '/argent',   label: 'Argent'   },
          { href: '/reglages', label: 'Plus'     },
        ].map(({ href, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              textDecoration: 'none', color: active ? 'var(--blue)' : 'var(--muted)',
              fontSize: 10.5, fontWeight: 600, padding: 4,
            }}>
              <Icon href={href} />
              {label}
            </Link>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 820px) {
          .hide-on-mobile  { display: none !important; }
          .show-on-mobile  { display: flex !important; }
          .show-grid       { display: grid !important; }
          main { padding-top: 50px; padding-bottom: 72px; }
        }
      `}</style>
    </>
  );
}
