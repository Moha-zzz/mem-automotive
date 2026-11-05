'use client';

import { useMemo } from 'react';
import { eur, fmtDate, monthKey, perDay, eurDay } from '@/lib/fmt';
import { fromCts, carDays, profitHt, profitTtc, IN_STOCK } from '@/lib/car-calc';

interface Props { cars: any[]; expenses: any[]; settings: any; }

export default function StatistiquesClient({ cars, expenses, settings }: Props) {
  const tva  = settings?.tva ?? 20;
  const cible = settings?.cible ?? 1200;

  const carExps = (id: string) => expenses.filter(e => e.car_id === id);
  const isSold  = (c: any) => c.stage === 'vendu' && c.sell_date && c.sell_price_cts;

  const sold = cars.filter(isSold);
  const bought = cars.filter(c => c.buy_date && c.stage !== 'abandon');

  const margins = sold.map(c => profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0);
  const totalMargin = margins.reduce((s, m) => s + m, 0);
  const avgMargin = sold.length > 0 ? totalMargin / sold.length : 0;
  const avgDays = sold.length > 0 ? sold.reduce((s, c) => s + (carDays(c) ?? 0), 0) / sold.length : 0;
  const totalDays = sold.reduce((s, c) => s + Math.max(1, carDays(c) ?? 0), 0);
  const avgGainDay = totalDays > 0 ? totalMargin / totalDays : 0;

  // By source
  const group = (keyFn: (c: any) => string) => {
    const g: Record<string, any[]> = {};
    bought.forEach(c => { const k = keyFn(c) || 'Non renseigné'; (g[k] = g[k] ?? []).push(c); });
    return Object.entries(g).map(([k, cs]) => {
      const s = cs.filter(isSold);
      const m = s.map(c => profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0);
      return { k, n: cs.length, sold: s.length, total: m.reduce((a, b) => a + b, 0), avg: s.length ? m.reduce((a, b) => a + b, 0) / s.length : null, days: s.length ? s.reduce((a, c) => a + (carDays(c) ?? 0), 0) / s.length : null };
    }).sort((a, b) => b.total - a.total);
  };

  const bySource  = group(c => c.source);
  const byCountry = group(c => c.country);
  const maxSrc = Math.max(1, ...bySource.map(r => Math.abs(r.total)));

  // Forecast vs Real
  const withForecast = sold.filter(c => c.forecast);

  const KPI = ({ label, value, sub }: any) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 24, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const TableSection = ({ title, rows, label }: { title: string; rows: any[]; label: string }) => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                {[label, 'Achetées', 'Vendues', 'Bénéfice total', '', 'Bénéfice moyen', 'Jours pour vendre'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: h === label ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.k}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{r.n}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{r.sold}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: r.total < 0 ? 'var(--red)' : 'var(--green)' }}>{eur(r.total)}</td>
                  <td style={{ padding: '10px 12px', width: '15%' }}>
                    <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: r.total < 0 ? 'var(--red)' : 'var(--accent)', borderRadius: 3, width: `${(Math.abs(r.total) / maxSrc * 100).toFixed(0)}%` }} />
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{r.avg !== null ? eur(r.avg) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{r.days !== null ? Math.round(r.days) + 'j' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Statistiques</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
          {bought.length} voiture{bought.length > 1 ? 's' : ''} achetée{bought.length > 1 ? 's' : ''} · {sold.length} vendue{sold.length > 1 ? 's' : ''} · {eur(totalMargin)} de bénéfice
        </p>
      </div>

      {sold.length > 0 && (
        <>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <KPI label="Bénéfice total HT" value={eur(totalMargin)} sub={`${sold.length} voiture${sold.length > 1 ? 's' : ''} vendues`} />
            <KPI label="Bénéfice moyen / voiture" value={eur(avgMargin)} sub={`Objectif : ${eur(cible)}`} />
            <KPI label="Jours moyens pour vendre" value={Math.round(avgDays) + 'j'} />
            <KPI label="Gain moyen par jour" value={eurDay(avgGainDay)} sub="bénéfice ÷ jours en stock" />
          </div>

          {/* Forecast vs Real */}
          {withForecast.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Prévisionnel vs Réel</h2>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        {['Voiture', 'Marge prévue', 'Marge réelle', 'Écart', 'Jours prévus', 'Jours réels', '€/j prévu', '€/j réel'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: h === 'Voiture' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {withForecast.map((c: any) => {
                        const real = profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0;
                        const plan = parseFloat(c.forecast?.margin ?? '0');
                        const dd   = Math.max(1, carDays(c) ?? 1);
                        const dp   = parseFloat(c.forecast?.days ?? '30');
                        const diff = real - plan;
                        return (
                          <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.name}<br /><span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>vendue le {fmtDate(c.sell_date)}</span></td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{eur(plan)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700 }}>{eur(real)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>{(diff >= 0 ? '+' : '') + eur(diff)}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{dp}j</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', color: dd > dp ? 'var(--red)' : 'var(--text)' }}>{dd}j</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)' }}>{eurDay(perDay(plan, dp))}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: perDay(real, dd) >= perDay(plan, dp) ? 'var(--green)' : 'var(--red)' }}>{eurDay(perDay(real, dd))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 24 }}>
            <TableSection title="Par site d'achat" rows={bySource} label="Site" />
            <TableSection title="Par pays" rows={byCountry} label="Pays" />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.5 }}>
            Renseigne le site d'achat et le pays dans chaque fiche voiture pour des statistiques fiables.
          </p>
        </>
      )}

      {sold.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          Les statistiques apparaissent dès que tes voitures ont une date d'achat et de vente.
        </div>
      )}
    </div>
  );
}
