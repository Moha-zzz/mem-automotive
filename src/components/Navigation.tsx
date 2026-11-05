'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Target, Car, CheckSquare, Calendar,
  Calculator, Gavel, Globe, Users, Wallet, FileText,
  BookOpen, BarChart3, Settings, Search, X, Menu,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/',                 label: 'Accueil',          icon: LayoutDashboard },
  { href: '/cap-et-objectifs', label: 'Cap & Objectifs',  icon: Target          },
  { href: '/voitures',         label: 'Voitures',         icon: Car             },
  { href: '/taches',           label: 'Tâches',           icon: CheckSquare     },
  { href: '/calendrier',       label: 'Agenda',           icon: Calendar        },
  { href: '/calculer',         label: 'Calculer',         icon: Calculator      },
  { href: '/encheres',         label: 'Enchères',         icon: Gavel           },
  { href: '/sites',            label: "Sites d'achat",    icon: Globe           },
  { href: '/contacts',         label: 'Contacts',         icon: Users           },
  { href: '/argent',           label: 'Argent',           icon: Wallet          },
  { href: '/factures',         label: 'Factures',         icon: FileText        },
  { href: '/police',           label: 'Livre de police',  icon: BookOpen        },
  { href: '/statistiques',     label: 'Statistiques',     icon: BarChart3       },
  { href: '/reglages',         label: 'Réglages',         icon: Settings        },
];

const BOTTOM = [
  { href: '/',         label: 'Accueil',  icon: LayoutDashboard },
  { href: '/voitures', label: 'Voitures', icon: Car             },
  { href: '/taches',   label: 'Tâches',   icon: CheckSquare     },
  { href: '/calendrier',label: 'Agenda',  icon: Calendar        },
];

function NavItem({ href, label, icon: Icon, onClick }: {
  href: string; label: string; icon: any; onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <Link href={href} onClick={onClick} className="block">
      <div className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer',
        active
          ? 'bg-white/10 text-white'
          : 'text-[#94A3B8] hover:bg-white/5 hover:text-[#CBD5E1]'
      )} style={active ? { boxShadow: 'inset 2px 0 0 var(--accent)' } : {}}>
        <Icon size={15} strokeWidth={1.75} className="shrink-0" />
        <span>{label}</span>
        {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
      </div>
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname?.startsWith('/auth')) return null;

  const currentLabel = NAV.find(n =>
    n.href === '/' ? pathname === '/' : pathname?.startsWith(n.href)
  )?.label ?? 'MEM AUTO';

  return (
    <>
      {/* ══ Desktop Sidebar ══ */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--navy-border)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
            <span className="text-white text-[10px] font-bold tracking-wider" style={{ fontFamily: 'var(--font-barlow-cond)' }}>M</span>
          </div>
          <div>
            <div className="text-white font-semibold text-[13px] tracking-widest leading-none">MEM</div>
            <div className="text-[9px] font-medium tracking-[0.4em] uppercase mt-0.5" style={{ color: '#475569' }}>AUTOMOTIVE</div>
          </div>
        </div>

        {/* Search */}
        <button className="flex items-center gap-2 mx-3 mt-3 px-3 py-2 rounded-md text-[13px] transition-colors w-[calc(100%-24px)]"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748B' }}>
          <Search size={13} />
          <span>Rechercher…</span>
          <span className="ml-auto text-[10px] font-mono rounded px-1 py-0.5" style={{ background: 'rgba(255,255,255,0.06)', color: '#475569' }}>⌘K</span>
        </button>

        {/* Nav */}
        <nav className="px-2 mt-3 flex flex-col gap-0.5 flex-1">
          {NAV.map(item => <NavItem key={item.href} {...item} />)}
        </nav>

        <div className="px-4 py-4 text-[11px]" style={{ color: '#334155' }}>
          v1.0
        </div>
      </aside>

      {/* ══ Mobile Header ══ */}
      <header className="mobile-header">
        <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
          <span className="text-white text-[9px] font-bold" style={{ fontFamily: 'var(--font-barlow-cond)' }}>M</span>
        </div>
        <span className="flex-1 text-white text-sm font-semibold truncate">
          {pathname === '/' ? 'MEM AUTOMOTIVE' : currentLabel}
        </span>
        <button onClick={() => setMenuOpen(true)} className="p-1 rounded-md" style={{ color: '#64748B' }}>
          <Menu size={18} />
        </button>
      </header>

      {/* Mobile full-screen menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--navy)' }}>
          <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'var(--navy-border)' }}>
            <span className="text-white font-semibold tracking-widest text-sm">MEM AUTO</span>
            <button onClick={() => setMenuOpen(false)} className="p-1 rounded-md" style={{ color: '#64748B' }}>
              <X size={18} />
            </button>
          </div>
          <nav className="px-3 py-3 flex flex-col gap-0.5 overflow-y-auto flex-1">
            {NAV.map(item => (
              <NavItem key={item.href} {...item} onClick={() => setMenuOpen(false)} />
            ))}
          </nav>
        </div>
      )}

      {/* ══ Mobile Bottom Nav ══ */}
      <nav className="bottom-nav">
        {BOTTOM.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname?.startsWith(href);
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 py-1">
              <Icon size={20} strokeWidth={1.75}
                style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }} />
              <span className="text-[10px] font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                {label}
              </span>
            </Link>
          );
        })}
        {/* Plus button */}
        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-1 py-1">
          <Menu size={20} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Plus</span>
        </button>
      </nav>
    </>
  );
}
