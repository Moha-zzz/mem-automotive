'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { fromCents, calculate } from '@/lib/calculations';

function eur(cts: number | null | undefined, decimals = 0) {
  if (cts == null || cts === 0) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimals }).format(fromCents(cts));
}

function today() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir';
}

const STAGES = [
  { key: 'repere',      label: 'Repérées',     color: '#8B95A1' },
  { key: 'achete',      label: 'Achetées',     color: '#E07B06' },
  { key: 'preparation', label: 'Préparation',  color: '#C45E0A' },
  { key: 'vente',       label: 'En vente',     color: '#1F8A4C' },
  { key: 'reserve',     label: 'Réservées',    color: '#8A4FC4' },
  { key: 'vendu',       label: 'Vendues',      color: '#14532D' },
];

const QUICK_LINKS = [
  { href: '/voitures',          label: 'Voitures',         icon: '◫' },
  { href: '/calculer',          label: 'Calculer',         icon: '€' },
  { href: '/argent',            label: 'Argent',           icon: '₿' },
  { href: '/factures',          label: 'Factures',         icon: '≡' },
  { href: '/taches',            label: 'Tâches',           icon: '✓' },
  { href: '/calendrier',        label: 'Agenda',           icon: '▦' },
  { href: '/police',            label: 'Police',           icon: '⊞' },
  { href: '/statistiques',      label: 'Stats',            icon: '↗' },
  { href: '/cap-et-objectifs',  label: 'Cap & Objectifs',  icon: '◎' },
];

interface Props {
  cars: any[];
  expenses: any[];
  deals: any[];
  invoices: any[];
  settings: any;
  moves: any[];
  cashFlows: any[];
}

export default function AccueilClient({ cars, expenses, invoices, settings }: Props) {
  const now = useMemo(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  }, []);

  const monthStart = `${now.year}-${String(now.month + 1).padStart(2, '0')}-01`;

  // KPIs
  const inStock = useMemo(() =>
    cars.filter(c => ['achete', 'preparation', 'vente', 'reserve'].includes(c.stage)).length, [cars]);

  const soldMonth = useMemo(() =>
    cars.filter(c => c.sell_date && c.sell_date >= monthStart), [cars, monthStart]);

  const marginMonth = useMemo(() => {
    return soldMonth.reduce((sum, c) => {
      if (!c.buy_price_cts || !c.sell_price_cts) return sum;
      const r = calculate({ regime: c.regime ?? 'marge', buyPrice: fromCents(c.buy_price_cts), sellPrice: fromCents(c.sell_price_cts), fees: [] });
      return sum + r.profitHt;
    }, 0);
  }, [soldMonth]);

  const stockValue = useMemo(() =>
    cars.filter(c => ['achete', 'preparation', 'vente', 'reserve'].includes(c.stage))
        .reduce((s, c) => s + (c.buy_price_cts ?? 0), 0), [cars]);

  const bankBalance = settings?.solde_cts ?? 0;

  const unpaidInvoices = useMemo(() =>
    invoices.filter(i => i.locked_at && !i.paid && i.type !== 'bon'), [invoices]);

  const monthExpenses = useMemo(() =>
    expenses.reduce((s, e) => s + (e.ttc_cts ?? 0), 0), [expenses]);

  // Stage distribution
  const stageCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of cars) m[c.stage] = (m[c.stage] ?? 0) + 1;
    return m;
  }, [cars]);

  // Gauge (cars sold vs target 6)
  const target = 6;
  const ratio = Math.min(soldMonth.length / target, 1);
  const arcLen = 282; // circumference ≈ π * r * ratio

  return (
    <div className="app-shell" style={{ display: 'contents' }}>
      <div style={{ padding: '28px clamp(16px, 3vw, 40px) 60px', minWidth: 0 }}>

        {/* Hero */}
        <section style={{
          display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 28,
          background: 'var(--navy)', color: '#fff',
          borderRadius: 20, padding: '28px 30px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position: 'absolute', right: -60, bottom: -120,
            width: 420, height: 420, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none',
          }} />

          {/* Left */}
          <div style={{ position: 'relative' }}>
            <p style={{ margin: 0, color: '#AEB9D6', fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>
              {today()}
            </p>
            <h1 style={{ fontSize: 44, color: '#fff', margin: '4px 0 20px' }}>
              {greeting()}
            </h1>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {[
                { label: 'Sur le compte', value: eur(bankBalance), sub: `${eur(stockValue)} en stock` },
                { label: 'Vendues ce mois', value: String(soldMonth.length), sub: `Marge : ${eur(Math.round(marginMonth * 100))}` },
                { label: 'En stock', value: String(inStock), sub: `${cars.length} voiture(s) au total` },
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 13, padding: '12px 14px',
                }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#AEB9D6', fontWeight: 600, marginBottom: 2 }}>{s.label}</span>
                  <b style={{ display: 'block', fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>{s.value}</b>
                  <small style={{ display: 'block', fontSize: 11.5, color: '#8F9BBB', marginTop: 3 }}>{s.sub}</small>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
              <Link href="/voitures" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 10,
                background: '#F2A20C', borderColor: '#F2A20C', color: '#1a1a1a',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}>+ Voiture</Link>
              <Link href="/calculer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>€ Calculer</Link>
              <Link href="/argent" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff',
                fontWeight: 600, fontSize: 14, textDecoration: 'none',
              }}>₿ Argent</Link>
            </div>
          </div>

          {/* Right — Gauge */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 24,
          }}>
            <svg viewBox="0 0 220 130" style={{ width: '100%', maxWidth: 260 }} role="img" aria-label={`${soldMonth.length} voitures vendues sur ${target}`}>
              <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="14" strokeLinecap="round" />
              {ratio > 0 && (
                <path d="M20 115 A90 90 0 0 1 200 115" fill="none"
                  stroke={ratio >= 1 ? '#4CC37F' : '#F2A20C'} strokeWidth="14" strokeLinecap="round"
                  strokeDasharray={`${(ratio * arcLen).toFixed(1)} ${arcLen}`} />
              )}
            </svg>
            <div style={{ fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 56, fontWeight: 700, marginTop: -86, color: '#fff', lineHeight: 1 }}>
              {soldMonth.length}<span style={{ fontSize: 28, color: '#8F9BBB' }}> / {target}</span>
            </div>
            <p style={{ color: '#AEB9D6', fontSize: 14, margin: '6px 0 0' }}>
              voitures vendues ce mois
            </p>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: 280, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#AEB9D6', marginBottom: 6 }}>
                <span>Bénéfice</span>
                <b style={{ color: '#fff', fontFamily: 'var(--font-barlow-cond, sans-serif)' }}>
                  {eur(Math.round(marginMonth * 100))}
                </b>
              </div>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#F2A20C', borderRadius: 6, width: `${Math.min(100, (marginMonth / 10000) * 100)}%`, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STAGES.map(s => (
            <Link key={s.key} href={`/voitures?stage=${s.key}`} style={{ textDecoration: 'none', flex: '1 1 90px' }}>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderBottom: `3px solid ${s.color}`,
                borderRadius: 11, padding: '12px 14px',
                boxShadow: 'var(--shadow)', transition: 'transform 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                <b style={{ display: 'block', fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 28, fontWeight: 700, color: 'var(--text)' }}>
                  {stageCount[s.key] ?? 0}
                </b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Finances */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Finances (ce mois)</h2>
            <div>
              {[
                { label: 'Dépenses',         value: eur(monthExpenses),                     color: 'var(--red)' },
                { label: 'Factures en attente', value: String(unpaidInvoices.length),        color: unpaidInvoices.length > 0 ? 'var(--amber)' : 'var(--green)' },
                { label: 'Stock engagé',     value: eur(stockValue),                         color: 'var(--muted)' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ fontSize: 14, color: 'var(--muted)' }}>{row.label}</span>
                  <b style={{ fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 20, color: row.color }}>{row.value}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Quick nav */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)' }}>
            <h2 style={{ fontSize: 18, marginBottom: 14 }}>Accès rapide</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {QUICK_LINKS.map(link => (
                <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'grid', justifyItems: 'center', gap: 4,
                    padding: '10px 6px', borderRadius: 10,
                    border: '1px solid var(--line)', background: 'var(--surface-2)',
                    cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                    fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--blue-soft)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface-2)'; }}>
                    <span style={{ fontSize: 20 }}>{link.icon}</span>
                    {link.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Invoices alert */}
        {unpaidInvoices.length > 0 && (
          <div style={{
            background: 'var(--amber-soft)', borderRadius: 12, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
            marginBottom: 16, border: '1px solid rgba(242,162,12,0.3)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              {unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} non payée{unpaidInvoices.length > 1 ? 's' : ''}
            </span>
            <Link href="/factures" style={{
              padding: '6px 12px', borderRadius: 8, background: 'var(--amber)',
              color: '#1a1a1a', fontWeight: 700, fontSize: 13, textDecoration: 'none',
            }}>Voir les factures</Link>
          </div>
        )}

      </div>
    </div>
  );
}
