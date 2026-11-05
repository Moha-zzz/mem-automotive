'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { eur, fmtDate, monthKey, today, perDay, eurDay } from '@/lib/fmt';
import { fromCts, IN_STOCK, carDays, profitHt } from '@/lib/car-calc';
import { STAGES } from '@/lib/car-calc';
import { Calculator, Car, Wallet, Plus, ChevronRight, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  cars: any[]; expenses: any[]; deals: any[];
  invoices: any[]; settings: any; moves: any[]; cashFlows: any[];
  tasks: any[]; openBalance: number; cashBalance: number;
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 12, color: '#AEB9D6', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 24, fontWeight: 700, color: color ?? '#fff', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#8F9BBB', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function AccueilClient({ cars, expenses, invoices, settings, tasks, openBalance, cashBalance }: Props) {
  const tva   = settings?.tva ?? 20;
  const mini  = settings?.mini ?? 700;
  const cible = settings?.cible ?? 1200;
  const seuil = settings?.seuil ?? 45;
  const now   = new Date();
  const mk    = monthKey(now);
  const monthStart = mk + '-01';

  const hour    = now.getHours();
  const greeting = hour < 5 ? 'Bonne nuit' : hour < 18 ? 'Bonjour' : 'Bonsoir';
  const dateStr  = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const inStock = cars.filter(c => IN_STOCK.includes(c.stage));
  const stockValue = inStock.reduce((s, c) => s + fromCts(c.buy_price_cts), 0);

  const soldMonth = cars.filter(c => c.sell_date && c.sell_date >= monthStart);
  const monthMargin = useMemo(() => soldMonth.reduce((s, c) => {
    if (!c.buy_price_cts || !c.sell_price_cts) return s;
    return s + (profitHt(c, expenses.filter(e => e.car_id === c.id), fromCts(c.sell_price_cts), tva) ?? 0);
  }, 0), [soldMonth]);

  const target = settings?.objectifs?.[mk] ?? 2;
  const targetMargin = target * cible;
  const ratio  = target > 0 ? Math.min(1, soldMonth.length / target) : 0;
  const profitRatio = targetMargin > 0 ? Math.min(1, monthMargin / targetMargin) : 0;

  // Tasks today
  const t = today();
  const todayTasks = tasks.filter((x: any) => !x.done && x.due && x.due <= t).slice(0, 5);

  // Alerts
  const alerts = cars.filter(c => IN_STOCK.includes(c.stage) && carDays(c) !== null && (carDays(c) ?? 0) > seuil);
  const unpaidInvoices = invoices.filter((i: any) => i.locked_at && !i.paid && i.type !== 'bon');

  // Pipeline counts
  const pipeline = STAGES.filter(s => !['abandon'].includes(s.k)).map(s => ({
    ...s, count: cars.filter(c => c.stage === s.k).length,
  })).filter(s => s.count > 0);

  const totalBalance = openBalance + cashBalance;
  const arcLen = 282;

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Hero */}
      <div style={{ background: 'var(--navy)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, bottom: -100, width: 350, height: 350, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <p style={{ color: '#AEB9D6', fontSize: 13, margin: '0 0 2px', textTransform: 'capitalize' }}>{dateStr}</p>
            <h1 style={{ color: '#fff', fontSize: 38, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 18px' }}>{greeting}</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <Stat label="Compte bancaire" value={eur(openBalance)} sub={`+ ${eur(cashBalance)} espèces`} color={openBalance < 0 ? 'var(--red)' : '#fff'} />
              <Stat label="Total disponible" value={eur(totalBalance)} sub={`${eur(stockValue)} bloqué en stock`} />
              <Stat label={`Vendues en ${now.toLocaleDateString('fr-FR', { month: 'long' })}`} value={String(soldMonth.length)} sub={`Marge : ${eur(monthMargin)}`} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { href: '/voitures',  label: '+ Voiture',    icon: Car },
                { href: '/calculer',  label: 'Calculer',     icon: Calculator },
                { href: '/argent',    label: '+ Dépense',    icon: Wallet },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                    <Icon size={13} /> {label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* Gauge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 24, textAlign: 'center' }}>
            <svg viewBox="0 0 220 130" style={{ width: '100%', maxWidth: 200 }}>
              <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="12" strokeLinecap="round" />
              {ratio > 0 && <path d="M20 115 A90 90 0 0 1 200 115" fill="none" stroke={ratio >= 1 ? 'var(--green)' : '#F59E0B'} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(ratio * arcLen).toFixed(1)} ${arcLen}`} />}
            </svg>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 48, fontWeight: 700, marginTop: -72, color: '#fff', lineHeight: 1 }}>
              {soldMonth.length}<span style={{ fontSize: 24, color: '#8F9BBB' }}> / {target}</span>
            </div>
            <p style={{ color: '#AEB9D6', fontSize: 13, margin: '6px 0 10px' }}>voitures vendues</p>
            <div style={{ width: '100%', maxWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#AEB9D6', marginBottom: 5 }}>
                <span>Bénéfice</span>
                <span style={{ fontFamily: 'var(--font-barlow-cond)', color: '#fff' }}>{eur(monthMargin)} / {eur(targetMargin)}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#F59E0B', borderRadius: 3, width: `${(profitRatio * 100).toFixed(0)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Tasks today */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Tâches du jour</span>
            <Link href="/taches" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Tout voir</Link>
          </div>
          <div style={{ padding: '8px' }}>
            {todayTasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Rien d'urgent</div>
            ) : todayTasks.map((task: any) => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: task.prio === 1 ? 'var(--red)' : task.prio === 2 ? 'var(--amber)' : 'var(--green)', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                {task.due && <span style={{ fontSize: 11, color: task.due < t ? 'var(--red)' : 'var(--text-muted)', flexShrink: 0 }}>{fmtDate(task.due)}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Alertes</div>
          <div style={{ padding: '8px' }}>
            {alerts.length === 0 && unpaidInvoices.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Tout est à jour</div>
            ) : (
              <>
                {alerts.slice(0, 3).map((c: any) => (
                  <Link key={c.id} href={`/voitures`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderBottom: '1px solid var(--border)' }}>
                      <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--red)', flexShrink: 0, fontFamily: 'var(--font-barlow-cond)', fontWeight: 700 }}>{carDays(c)}j</span>
                    </div>
                  </Link>
                ))}
                {unpaidInvoices.length > 0 && (
                  <Link href="/factures" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px' }}>
                      <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1 }}>{unpaidInvoices.length} facture{unpaidInvoices.length > 1 ? 's' : ''} non payée{unpaidInvoices.length > 1 ? 's' : ''}</span>
                    </div>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Quick nav */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Accès rapide</div>
          <div style={{ padding: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { href: '/voitures',    label: 'Voitures',   bg: 'rgba(249,115,22,0.1)',  color: '#F97316' },
              { href: '/calculer',    label: 'Calculer',   bg: 'rgba(59,130,246,0.1)',  color: 'var(--accent)' },
              { href: '/argent',      label: 'Argent',     bg: 'rgba(16,185,129,0.1)', color: 'var(--green)' },
              { href: '/factures',    label: 'Factures',   bg: 'rgba(245,158,11,0.1)', color: 'var(--amber)' },
              { href: '/taches',      label: 'Tâches',     bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
              { href: '/statistiques',label: 'Stats',      bg: 'rgba(100,116,139,0.1)', color: 'var(--text-muted)' },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '10px 6px', borderRadius: 8, background: item.bg, textAlign: 'center', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: item.color }}>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Pipeline stock</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pipeline.map(s => (
            <Link key={s.k} href={`/voitures?stage=${s.k}`} style={{ textDecoration: 'none', flex: '1 1 100px' }}>
              <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid var(--border)`, borderBottom: `3px solid ${s.color}`, background: 'var(--surface-2)', cursor: 'pointer' }}>
                <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{s.count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            </Link>
          ))}
          {pipeline.length === 0 && (
            <div style={{ flex: 1, padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucune voiture en stock. <Link href="/voitures">Ajouter une voiture</Link>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
