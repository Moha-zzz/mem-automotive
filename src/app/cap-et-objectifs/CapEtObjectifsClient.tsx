'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fromCents, calculate } from '@/lib/calculations';

function eur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const PHASES = [
  { key: 'lancement',  label: 'Lancement',  range: '0–3 mois',   color: '#1D3F9E', desc: 'Stabilisation des processus' },
  { key: 'rodage',     label: 'Rodage',     range: '3–6 mois',   color: '#E07B06', desc: 'Montée en charge progressive' },
  { key: 'croissance', label: 'Croissance', range: '6–12 mois',  color: '#1F8A4C', desc: 'Augmentation du volume' },
  { key: 'showroom',   label: 'Showroom',   range: '12+ mois',   color: '#8A4FC4', desc: 'Infrastructure professionnelle' },
];

const OBJECTIVES = [
  { phase: 'lancement',  label: 'Voitures vendues / mois',      target: 2,      metric: 'sold_month'   as const },
  { phase: 'lancement',  label: 'Marge moyenne par voiture (€)', target: 1000,   metric: 'avg_margin'   as const },
  { phase: 'rodage',     label: 'Voitures vendues / mois',      target: 4,      metric: 'sold_month'   as const },
  { phase: 'rodage',     label: 'CA mensuel (€)',                target: 20000,  metric: 'revenue_month' as const },
  { phase: 'croissance', label: 'Voitures vendues / mois',      target: 7,      metric: 'sold_month'   as const },
  { phase: 'croissance', label: 'Marge brute totale (€)',        target: 50000,  metric: 'total_margin' as const },
  { phase: 'showroom',   label: 'Voitures en stock permanent',   target: 10,     metric: 'in_stock'     as const },
  { phase: 'showroom',   label: 'CA annuel (€)',                 target: 300000, metric: 'revenue_year' as const },
];

type MetricKey = 'sold_month' | 'avg_margin' | 'revenue_month' | 'total_margin' | 'in_stock' | 'revenue_year';

interface Props {
  cars: any[];
  expenses: any[];
  settings: any;
}

export default function CapEtObjectifsClient({ cars, expenses, settings }: Props) {
  const sb = createClient();
  const [vision, setVision] = useState<string>(settings?.vision ?? 'Devenir un acteur incontournable du négoce automobile, reconnu pour son sérieux et ses prix justes.');
  const [editVision, setEditVision] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string>(settings?.current_phase ?? 'lancement');
  const [savingVision, setSavingVision] = useState(false);

  const metrics = useMemo((): Record<MetricKey, number> => {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const yearStart  = `${now.getFullYear()}-01-01`;

    const soldMonthCars = cars.filter(c => c.sell_date && c.sell_date >= monthStart);
    const soldYearCars  = cars.filter(c => c.sell_date && c.sell_date >= yearStart);
    const inStock       = cars.filter(c => ['achete', 'preparation', 'vente', 'reserve'].includes(c.stage)).length;

    const marginFor = (list: any[]) => list.reduce((sum, c) => {
      if (!c.buy_price_cts || !c.sell_price_cts) return sum;
      const r = calculate({ regime: c.regime ?? 'marge', buyPrice: fromCents(c.buy_price_cts), sellPrice: fromCents(c.sell_price_cts), fees: [] });
      return sum + r.profitHt;
    }, 0);

    const revenueFor = (list: any[]) => list.reduce((sum, c) => sum + fromCents(c.sell_price_cts ?? 0), 0);

    const totalMargin = marginFor(cars.filter(c => c.sell_price_cts));
    const monthMargin = marginFor(soldMonthCars);
    const avgMargin   = soldMonthCars.length > 0 ? monthMargin / soldMonthCars.length : 0;

    return {
      sold_month:    soldMonthCars.length,
      avg_margin:    avgMargin,
      revenue_month: revenueFor(soldMonthCars),
      total_margin:  totalMargin,
      in_stock:      inStock,
      revenue_year:  revenueFor(soldYearCars),
    };
  }, [cars]);

  const saveVision = async () => {
    setSavingVision(true);
    await sb.from('settings').upsert({ id: 'main', vision, current_phase: currentPhase });
    setSavingVision(false);
    setEditVision(false);
  };

  const pct = (current: number, target: number) => Math.min(100, Math.round((current / Math.max(target, 1)) * 100));

  const fmtMetric = (key: MetricKey, val: number) => {
    if (key === 'sold_month' || key === 'in_stock') return String(Math.round(val));
    return eur(Math.round(val));
  };

  const PANEL: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)',
  };

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px) 60px' }}>
      {/* Topbar */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 36 }}>Cap et Objectifs</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>Vision, phases de développement et suivi des objectifs</p>
      </div>

      {/* Vision */}
      <div style={{ background: 'var(--navy)', color: '#fff', borderRadius: 18, padding: '22px 26px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#AEB9D6', marginBottom: 8 }}>Vision</div>
          {editVision ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea value={vision} onChange={e => setVision(e.target.value)} rows={2}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveVision} disabled={savingVision} style={{ padding: '7px 14px', borderRadius: 8, background: '#F2A20C', border: 'none', color: '#1a1a1a', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {savingVision ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button onClick={() => setEditVision(false)} style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-barlow-cond, sans-serif)', margin: 0, lineHeight: 1.4, maxWidth: 700 }}>{vision}</p>
          )}
        </div>
        {!editVision && (
          <button onClick={() => setEditVision(true)} style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
            ✎ Modifier
          </button>
        )}
      </div>

      {/* Phase selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {PHASES.map(p => {
          const isCurrent = currentPhase === p.key;
          return (
            <button key={p.key} onClick={() => setCurrentPhase(p.key)}
              style={{
                background: isCurrent ? p.color : 'var(--surface)',
                border: `1px solid ${isCurrent ? p.color : 'var(--line)'}`,
                borderTop: `4px solid ${p.color}`,
                borderRadius: 'var(--radius)', padding: '14px 16px',
                boxShadow: 'var(--shadow)', cursor: 'pointer', textAlign: 'left',
                color: isCurrent ? '#fff' : 'var(--text)', transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginBottom: 4 }}>{p.range}</div>
              <div style={{ fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 20, fontWeight: 700 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: isCurrent ? 'rgba(255,255,255,0.7)' : 'var(--muted)', marginTop: 3 }}>{p.desc}</div>
              {isCurrent && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 8px', display: 'inline-block' }}>Phase actuelle</div>}
            </button>
          );
        })}
      </div>

      {/* Objectives */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        {PHASES.map(phase => {
          const objs = OBJECTIVES.filter(o => o.phase === phase.key);
          return (
            <div key={phase.key} style={PANEL}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                <h2 style={{ fontSize: 17 }}>{phase.label}</h2>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>{phase.range}</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {objs.map((obj, i) => {
                  const current = metrics[obj.metric] ?? 0;
                  const p = pct(current, obj.target);
                  const done = p >= 100;
                  return (
                    <div key={i} style={{ background: done ? 'var(--green-soft)' : 'var(--surface-2)', borderRadius: 11, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.3 }}>{obj.label}</span>
                        <span style={{ fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 15, fontWeight: 700, color: done ? 'var(--green)' : phase.color, flexShrink: 0 }}>
                          {p}%
                        </span>
                      </div>
                      {/* Bar */}
                      <div style={{ height: 7, background: 'var(--line)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                        <div style={{ height: '100%', background: done ? 'var(--green)' : phase.color, borderRadius: 4, width: `${p}%`, transition: 'width 0.6s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                        <span>Actuel : <b style={{ color: 'var(--text)' }}>{fmtMetric(obj.metric, current)}</b></span>
                        <span>Cible : <b style={{ color: 'var(--text)' }}>{fmtMetric(obj.metric, obj.target)}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {([
          { label: 'Vendues ce mois', value: String(metrics.sold_month), unit: 'voitures' },
          { label: 'Marge moyenne',   value: eur(Math.round(metrics.avg_margin)), unit: '/ voiture' },
          { label: 'CA ce mois',      value: eur(Math.round(metrics.revenue_month)) },
          { label: 'Marge totale',    value: eur(Math.round(metrics.total_margin)) },
          { label: 'En stock',        value: String(metrics.in_stock), unit: 'voitures' },
          { label: 'CA cette année',  value: eur(Math.round(metrics.revenue_year)) },
        ] as { label: string; value: string; unit?: string }[]).map((kpi, i) => (
          <div key={i} style={PANEL}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{kpi.value}</div>
            {kpi.unit && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>{kpi.unit}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
