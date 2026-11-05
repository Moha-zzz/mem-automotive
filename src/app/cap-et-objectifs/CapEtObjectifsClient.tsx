'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, X, Check } from 'lucide-react';
import { eur, today, fmtDateLong, monthKey } from '@/lib/fmt';
import { fromCts, IN_STOCK, carDays, profitHt } from '@/lib/car-calc';

const PHASES = [
  { k: 'lancement',    label: 'Lancement',     period: '0 – 6 mois',    color: '#3B82F6', desc: 'Premières ventes, méthode d\'achat et administration en place.' },
  { k: 'rodage',       label: 'Rodage',         period: '6 – 12 mois',   color: '#F59E0B', desc: 'Un rythme régulier et une marge maîtrisée.' },
  { k: 'croissance',   label: 'Croissance',     period: '12 – 24 mois',  color: '#10B981', desc: 'Plus de volume, des sources fiables, une tréso solide.' },
  { k: 'structuration',label: 'Structuration',  period: '2 ans et plus', color: '#8B5CF6', desc: 'Local ou parc, aide ou salarié, marque reconnue.' },
];

const METRICS: Record<string, [string, string]> = {
  ventes_mois:    ['Voitures vendues ce mois', ''],
  benefice_mois:  ['Bénéfice net ce mois', '€'],
  benefice_moyen: ['Bénéfice moyen par voiture', '€'],
  rotation:       ['Jours moyens pour vendre', 'j'],
  tresorerie:     ['Solde du compte', '€'],
  ventes_total:   ['Voitures vendues au total', ''],
  benefice_total: ['Bénéfice net cumulé', '€'],
  stock:          ['Voitures en stock', ''],
  manuel:         ['Suivi manuel (fait / pas fait)', ''],
};

const HORIZONS = [
  { k: 'court', label: 'Court terme', sub: "d'ici 6 mois" },
  { k: 'moyen', label: 'Moyen terme', sub: '6 à 18 mois' },
  { k: 'long',  label: 'Long terme',  sub: '2 à 5 ans' },
];

interface Props { cars: any[]; expenses: any[]; goals: any[]; settings: any; }

export default function CapClient({ cars, expenses, goals: initGoals, settings }: Props) {
  const sb = createClient();
  const tva   = settings?.tva ?? 20;
  const cible = settings?.cible ?? 1200;

  const [goals, setGoals]     = useState(initGoals);
  const [vision, setVision]   = useState(settings?.vision ?? '');
  const [phase, setPhase]     = useState(settings?.phase ?? 0);
  const [editVision, setEditVision] = useState(false);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ title: '', metric: 'ventes_mois', target: '', horizon: 'court', deadline: '', why: '', done: false } as any);

  const carExps = (id: string) => expenses.filter(e => e.car_id === id);
  const isSold  = (c: any) => c.stage === 'vendu' && c.sell_date;

  const metricNow = (m: string): number => {
    const sold = cars.filter(isSold);
    const mk   = monthKey(new Date());
    switch (m) {
      case 'ventes_mois':   return cars.filter(c => isSold(c) && c.sell_date.startsWith(mk)).length;
      case 'benefice_mois': return cars.filter(c => isSold(c) && c.sell_date.startsWith(mk)).reduce((s, c) => s + (profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0), 0);
      case 'benefice_moyen': { const ms = sold.map(c => profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0); return sold.length ? ms.reduce((a, b) => a + b, 0) / sold.length : 0; }
      case 'rotation': { const r = sold.filter(c => c.buy_date); return r.length ? r.reduce((a, c) => a + (carDays(c) ?? 0), 0) / r.length : 0; }
      case 'tresorerie': return (settings?.solde_cts ?? 0) / 100;
      case 'ventes_total': return sold.length;
      case 'benefice_total': return sold.reduce((s, c) => s + (profitHt(c, carExps(c.id), fromCts(c.sell_price_cts), tva) ?? 0), 0);
      case 'stock': return cars.filter(c => IN_STOCK.includes(c.stage)).length;
      default: return 0;
    }
  };

  const goalProgress = (g: any): number => {
    if (g.metric === 'manuel') return g.done ? 1 : 0;
    const cur = metricNow(g.metric), t = parseFloat(g.target ?? '0');
    if (!t) return 0;
    if (g.metric === 'rotation') return cur ? Math.min(1, t / cur) : 0;
    return Math.max(0, Math.min(1, cur / t));
  };

  const fmtMetric = (m: string, v: number) => {
    const u = METRICS[m]?.[1] ?? '';
    if (u === '€') return eur(Math.round(v));
    if (u === 'j') return Math.round(v) + ' j';
    return String(Math.round(v * 10) / 10);
  };

  const saveVision = async () => {
    await sb.from('settings').upsert({ id: 'main', vision });
    setEditVision(false);
    toast.success('Vision enregistrée');
  };

  const savePhase = async (p: number) => {
    setPhase(p);
    await sb.from('settings').upsert({ id: 'main', phase: p });
  };

  const saveGoal = async () => {
    if (!form.title.trim()) return;
    const payload = { title: form.title, metric: form.metric, target: form.target, horizon: form.horizon, deadline: form.deadline || null, why: form.why || null, done: false };
    if (form.id) {
      await sb.from('goals').update(payload).eq('id', form.id);
      setGoals(prev => prev.map(g => g.id === form.id ? { ...g, ...payload } : g));
    } else {
      const { data } = await sb.from('goals').insert(payload).select().single();
      if (data) setGoals(prev => [...prev, data]);
    }
    setModal(false);
    toast.success('Objectif enregistré');
  };

  const toggleGoal = async (id: string, done: boolean) => {
    await sb.from('goals').update({ done: !done }).eq('id', id);
    setGoals(prev => prev.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const delGoal = async (id: string) => {
    await sb.from('goals').delete().eq('id', id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const reached = goals.filter(g => goalProgress(g) >= 1).length;

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => <div style={{ display: 'grid', gap: 5 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>{children}</div>;

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Cap et Objectifs</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>{reached} objectif{reached > 1 ? 's' : ''} atteint{reached > 1 ? 's' : ''} sur {goals.length}</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ title: '', metric: 'ventes_mois', target: '', horizon: 'court', deadline: '', why: '', done: false }); setModal(true); }}><Plus size={13} /> Objectif</Button>
      </div>

      {/* Vision */}
      <div style={{ background: 'var(--navy)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#AEB9D6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ma vision</div>
            {editVision ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={vision} onChange={e => setVision(e.target.value)} rows={2} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveVision} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#F59E0B', color: '#1a1a1a', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>Enregistrer</button>
                  <button onClick={() => setEditVision(false)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Annuler</button>
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.4 }}>
                {vision || 'Écris en une ou deux phrases ce que tu veux que MEM AUTOMOTIVE devienne.'}
              </p>
            )}
          </div>
          {!editVision && <button onClick={() => setEditVision(true)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 12 }}><Pencil size={12} /> Modifier</button>}
        </div>
      </div>

      {/* Phases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {PHASES.map((p, i) => (
          <button key={p.k} onClick={() => savePhase(i)} style={{ padding: '14px 16px', borderRadius: 11, border: `1px solid ${i === phase ? p.color : 'var(--border)'}`, borderTop: `4px solid ${p.color}`, background: i === phase ? `${p.color}10` : 'var(--surface)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: i < phase ? 'var(--green)' : i === phase ? p.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              Étape {i + 1}{i < phase ? ' · franchie' : i === phase ? ' · en cours' : ''}
            </div>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 18, fontWeight: 700 }}>{p.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{p.period}</div>
          </button>
        ))}
      </div>

      {/* Goals by horizon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {HORIZONS.map(h => {
          const hGoals = goals.filter(g => g.horizon === h.k).sort((a, b) => (a.deadline ?? '9').localeCompare(b.deadline ?? '9'));
          return (
            <div key={h.k} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{h.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{h.sub}</div>
                </div>
                <button onClick={() => { setForm({ title: '', metric: 'ventes_mois', target: '', horizon: h.k, deadline: '', why: '', done: false }); setModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}>
                  <Plus size={15} />
                </button>
              </div>
              <div style={{ padding: '8px' }}>
                {hGoals.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>À définir</div>
                ) : hGoals.map(g => {
                  const p = goalProgress(g);
                  const ok = p >= 1, late = !ok && g.deadline && g.deadline < today();
                  return (
                    <div key={g.id} style={{ padding: '10px', borderRadius: 8, background: ok ? 'var(--green-soft)' : 'var(--surface-2)', marginBottom: 8, border: `1px solid ${ok ? 'var(--green)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{g.title}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => { setForm({ ...g, target: String(g.target ?? '') }); setModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><Pencil size={12} /></button>
                          <button onClick={() => delGoal(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={12} /></button>
                        </div>
                      </div>
                      {g.metric === 'manuel' ? (
                        <button onClick={() => toggleGoal(g.id, g.done)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 7, border: `1px solid ${g.done ? 'var(--green)' : 'var(--border)'}`, background: g.done ? 'var(--green-soft)' : 'transparent', cursor: 'pointer', fontSize: 12, color: g.done ? 'var(--green)' : 'var(--text-muted)' }}>
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${g.done ? 'var(--green)' : 'var(--border)'}`, background: g.done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center' }}>{g.done && <Check size={10} style={{ color: '#fff' }} />}</div>
                          {g.done ? 'Atteint' : 'Marquer comme atteint'}
                        </button>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                            <span>{METRICS[g.metric]?.[0]}</span>
                            <span style={{ fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: 'var(--text)' }}>{fmtMetric(g.metric, metricNow(g.metric))} / {fmtMetric(g.metric, parseFloat(g.target ?? '0'))}</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: ok ? 'var(--green)' : 'var(--accent)', borderRadius: 3, width: `${(p * 100).toFixed(0)}%`, transition: 'width 0.5s' }} />
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        {ok && <span style={{ fontSize: 10, background: 'var(--green-soft)', color: 'var(--green)', padding: '1px 6px', borderRadius: 3, fontWeight: 600 }}>Atteint</span>}
                        {g.deadline && <span style={{ fontSize: 10, background: late ? 'var(--red-soft)' : 'var(--surface-2)', color: late ? 'var(--red)' : 'var(--text-muted)', padding: '1px 6px', borderRadius: 3 }}>{late ? 'En retard · ' : 'Pour le '}{fmtDateLong(g.deadline)}</span>}
                      </div>
                      {g.why && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>{g.why}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px, calc(100% - 24px))', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{form.id ? 'Modifier' : 'Nouvel objectif'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <F label="Objectif *"><input style={inpStyle as any} autoFocus value={form.title} onChange={e => setForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="ex. Vendre 4 voitures par mois" /></F>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <F label="Horizon"><select style={inpStyle as any} value={form.horizon} onChange={e => setForm((p: any) => ({ ...p, horizon: e.target.value }))}>{HORIZONS.map(h => <option key={h.k} value={h.k}>{h.label} ({h.sub})</option>)}</select></F>
                <F label="Échéance"><input style={inpStyle as any} type="date" value={form.deadline ?? ''} onChange={e => setForm((p: any) => ({ ...p, deadline: e.target.value }))} /></F>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <F label="Métrique"><select style={inpStyle as any} value={form.metric} onChange={e => setForm((p: any) => ({ ...p, metric: e.target.value }))}>{Object.entries(METRICS).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></F>
                <F label="Cible"><input style={inpStyle as any} type="number" value={form.target ?? ''} onChange={e => setForm((p: any) => ({ ...p, target: e.target.value }))} placeholder="ex: 4" /></F>
              </div>
              <F label="Pourquoi (optionnel)"><input style={inpStyle as any} value={form.why ?? ''} onChange={e => setForm((p: any) => ({ ...p, why: e.target.value }))} /></F>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
              <Button onClick={saveGoal} disabled={!form.title.trim()}>Enregistrer</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
