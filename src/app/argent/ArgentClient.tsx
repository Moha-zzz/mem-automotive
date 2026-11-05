'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { eur, fmtDateLong, today, monthKey } from '@/lib/fmt';
import { fromCts } from '@/lib/car-calc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowUpDown, Download, X, Wallet, Banknote } from 'lucide-react';

const MOVE_KINDS: Record<string, [string, string]> = {
  retrait: ['Retrait au distributeur', 'banque → espèces'],
  depot:   ['Dépôt à la banque', 'espèces → banque'],
  entree:  ["Autre entrée d'espèces", '+ espèces'],
  sortie:  ["Autre sortie d'espèces", '− espèces'],
};

const CATS_VOITURE = ['Carburant','Trajet (péages, billets)','Plaques transit',"Déclaration d'achat",'Contrôle technique','Pièces','Mécanique','Carrosserie','COC','Carte grise',"Frais d'enchères",'Leboncoin','Frais annexes'];
const CATS_SOCIETE = ['URSSAF','Abonnement Leboncoin','Assurance','Assurance flotte','Comptable','Téléphone','Banque','Logiciel','Local / parking','Fournitures','Impôts et taxes','Acompte perdu'];
const ALL_CATS = [...CATS_VOITURE, ...CATS_SOCIETE];
const TVA_RATES = [20, 10, 5.5, 0];

interface Props { expenses: any[]; cars: any[]; moves: any[]; settings: any; }

export default function ArgentClient({ expenses: initExp, cars, moves: initMoves, settings }: Props) {
  const sb = createClient();
  const [expenses, setExpenses] = useState(initExp);
  const [moves, setMoves]       = useState(initMoves);
  const [tab, setTab]           = useState<'soldes' | 'depenses' | 'tva' | 'previsions'>('soldes');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [catFilter, setCatFilter]     = useState('');
  const [payFilter, setPayFilter]     = useState('');
  const [showExpModal, setShowExpModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showRecalModal, setShowRecalModal] = useState<'banque' | 'especes' | null>(null);
  const [expForm, setExpForm]   = useState({ cat: CATS_VOITURE[0], label: '', ttc: '', tva_rate: '20', pay: 'banque', date: today(), car_id: '' });
  const [moveForm, setMoveForm] = useState({ kind: 'retrait', amount: '', date: today(), label: '' });
  const [recalForm, setRecalForm] = useState({ solde: '', date: today() });
  const [tvaMode, setTvaMode]   = useState<'mois' | 'trimestre'>('mois');

  const tvaRate = (settings?.tva ?? 20) / 100;
  const openBalance = (settings?.solde_cts ?? 0) / 100;
  const cashBalance = (settings?.cash_solde_cts ?? 0) / 100;

  // ── Balance computation (simplified — based on base + movements) ──
  const bankBalance  = useMemo(() => {
    const base = openBalance;
    const sales = cars.filter(c => c.sell_date && c.sell_price_cts && c.sell_pay !== 'Espèces').reduce((s, c) => s + fromCts(c.sell_price_cts), 0);
    const buys  = cars.filter(c => c.buy_date && c.buy_price_cts && c.buy_pay !== 'Espèces').reduce((s, c) => s - fromCts(c.buy_price_cts), 0);
    const exps  = expenses.filter(e => e.pay !== 'especes' && e.pay !== 'Espèces').reduce((s, e) => s - fromCts(e.ttc_cts), 0);
    const mv    = moves.filter(m => ['retrait','depot'].includes(m.kind)).reduce((s, m) => s + (m.kind === 'depot' ? fromCts(m.amount_cts ?? 0) : -fromCts(m.amount_cts ?? 0)), 0);
    return base + sales + buys + exps + mv;
  }, [openBalance, cars, expenses, moves]);

  const totalBalance = bankBalance + cashBalance;

  // ── Filtered expenses ──
  const filteredExp = useMemo(() => {
    return expenses.filter(e => {
      if (monthFilter && !(e.date ?? '').startsWith(monthFilter)) return false;
      if (catFilter && (e.cat ?? '') !== catFilter) return false;
      if (payFilter && (e.pay ?? '') !== payFilter) return false;
      return true;
    });
  }, [expenses, monthFilter, catFilter, payFilter]);

  const totalHt  = filteredExp.reduce((s, e) => s + (fromCts(e.ttc_cts) - fromCts(e.tva_cts)), 0);
  const totalTtc = filteredExp.reduce((s, e) => s + fromCts(e.ttc_cts), 0);

  // ── TVA ──
  const tvaData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let k = -5; k <= 0; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
      months.push({ key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
    }
    return months.map(({ key, label }) => {
      const sold = cars.filter(c => c.sell_date?.startsWith(key) && c.sell_price_cts);
      const exps = expenses.filter(e => (e.date ?? '').startsWith(key));
      const collectee = sold.reduce((s, c) => {
        const P = fromCts(c.sell_price_cts);
        const A = fromCts(c.buy_price_cts ?? 0);
        return s + (c.regime === 'normal' ? P * tvaRate / (1 + tvaRate) : Math.max(0, P - A) * tvaRate / (1 + tvaRate));
      }, 0);
      const deductible = exps.reduce((s, e) => s + fromCts(e.tva_cts), 0);
      const nette = collectee - deductible;
      return { key, label, collectee, deductible, nette, soldCount: sold.length };
    });
  }, [cars, expenses]);

  // ── Save expense ──
  const saveExpense = async () => {
    const ttc = parseFloat(expForm.ttc) || 0;
    const tvaAmt = expForm.tva_rate === '0' ? 0 : ttc - ttc / (1 + parseFloat(expForm.tva_rate) / 100);
    const payload: any = {
      cat: expForm.cat, label: expForm.label || expForm.cat, date: expForm.date,
      ttc_cts: Math.round(ttc * 100), tva_cts: Math.round(tvaAmt * 100),
      pay: expForm.pay,
    };
    if (expForm.car_id) payload.car_id = expForm.car_id;
    const { data } = await sb.from('expenses').insert(payload).select().single();
    if (data) { setExpenses(prev => [data, ...prev]); setShowExpModal(false); toast.success('Dépense ajoutée'); }
  };

  // ── Save move ──
  const saveMove = async () => {
    const amount = parseFloat(moveForm.amount) || 0;
    const payload = { kind: moveForm.kind, amount_cts: Math.round(amount * 100), date: moveForm.date, label: moveForm.label };
    const { data } = await sb.from('moves').insert(payload).select().single();
    if (data) { setMoves(prev => [data, ...prev]); setShowMoveModal(false); toast.success('Mouvement enregistré'); }
  };

  // ── Recalage solde ──
  const saveRecal = async () => {
    if (!showRecalModal) return;
    const field  = showRecalModal === 'banque' ? 'solde_cts' : 'cash_solde_cts';
    const dField = showRecalModal === 'banque' ? 'solde_date' : 'cash_date';
    const cts    = Math.round((parseFloat(recalForm.solde) || 0) * 100);
    await sb.from('settings').upsert({ id: 'main', [field]: cts, [dField]: recalForm.date });
    setShowRecalModal(null);
    toast.success('Solde recalé');
  };

  // ── Export CSV ──
  const exportCSV = () => {
    const rows = [['Date', 'Catégorie', 'Libellé', 'TTC', 'TVA', 'HT', 'Paiement', 'Voiture']];
    filteredExp.forEach(e => {
      const car = cars.find(c => c.id === e.car_id);
      rows.push([e.date ?? '', e.cat ?? '', e.label ?? '', String((fromCts(e.ttc_cts)).toFixed(2)), String((fromCts(e.tva_cts)).toFixed(2)), String((fromCts(e.ttc_cts) - fromCts(e.tva_cts)).toFixed(2)), e.pay ?? '', car?.name ?? '']);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `depenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => (
    <div style={{ display: 'grid', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );

  const monthOptions = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const now = new Date();
    for (let k = 0; k < 12; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      months.push({ key: monthKey(d), label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
    }
    return months;
  }, []);

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Argent</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>Banque, espèces, dépenses et TVA</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setShowMoveModal(true)}><ArrowUpDown size={13} /> Retrait / dépôt</Button>
          <Button size="sm" onClick={() => setShowExpModal(true)}><Plus size={13} /> Dépense</Button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[{ k: 'soldes', l: 'Soldes' }, { k: 'depenses', l: 'Dépenses' }, { k: 'tva', l: 'TVA' }, { k: 'previsions', l: 'Prévisions' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} style={{ padding: '7px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === t.k ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${tab === t.k ? 'var(--accent)' : 'transparent'}`, marginBottom: -1 }}>{t.l}</button>
        ))}
      </div>

      {/* ── SOLDES ── */}
      {tab === 'soldes' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {/* Balance cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Compte bancaire', value: bankBalance, icon: Banknote, action: () => { setRecalForm({ solde: '', date: today() }); setShowRecalModal('banque'); } },
              { label: 'Espèces (caisse)', value: cashBalance, icon: Wallet, action: () => { setRecalForm({ solde: '', date: today() }); setShowRecalModal('especes'); } },
              { label: 'Total disponible', value: totalBalance, icon: Wallet, action: undefined },
            ].map(({ label, value, icon: Icon, action }) => (
              <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</div>
                  <Icon size={15} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 30, fontWeight: 700, color: value < 0 ? 'var(--red)' : 'var(--text)' }}>{eur(value)}</div>
                {action && (
                  <button onClick={action} style={{ marginTop: 8, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Recaler le solde</button>
                )}
              </div>
            ))}
          </div>

          {/* Recent moves */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Mouvements d'espèces récents</div>
            {moves.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucun mouvement. Utilisez "Retrait / dépôt" pour enregistrer un virement espèces.</div>
            ) : (
              <div>
                {moves.slice(0, 10).map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{MOVE_KINDS[m.kind]?.[0] ?? m.kind}{m.label ? ' · ' + m.label : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDateLong(m.date)} · {MOVE_KINDS[m.kind]?.[1] ?? ''}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700 }}>{eur(fromCts(m.amount_cts ?? 0))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DÉPENSES ── */}
      {tab === 'depenses' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select style={inpStyle as any} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
              <option value="">Tous les mois</option>
              {monthOptions.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select style={inpStyle as any} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">Toutes catégories</option>
              {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 5 }}>
              {['', 'banque', 'especes'].map(p => (
                <button key={p} onClick={() => setPayFilter(p)} style={{ padding: '5px 10px', borderRadius: 20, border: `1px solid ${payFilter === p ? 'var(--accent)' : 'var(--border)'}`, background: payFilter === p ? 'var(--accent-soft)' : 'transparent', color: payFilter === p ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {p === '' ? 'Tous' : p === 'banque' ? 'Banque' : 'Espèces'}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
              <Download size={12} /> CSV
            </button>
          </div>

          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Total HT', value: eur(totalHt) },
              { label: 'Total TTC', value: eur(totalTtc) },
              { label: 'Sur voitures', value: eur(filteredExp.filter(e => e.car_id).reduce((s, e) => s + fromCts(e.ttc_cts) - fromCts(e.tva_cts), 0)) },
              { label: 'Frais société', value: eur(filteredExp.filter(e => !e.car_id).reduce((s, e) => s + fromCts(e.ttc_cts) - fromCts(e.tva_cts), 0)) },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 3 }}>{k.label}</div>
                <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, fontWeight: 700 }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* List */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {filteredExp.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune dépense</div>
            ) : filteredExp.slice(0, 50).map((e: any) => {
              const car = cars.find(c => c.id === e.car_id);
              const ht = fromCts(e.ttc_cts) - fromCts(e.tva_cts);
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label || e.cat}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {e.cat} · {fmtDateLong(e.date)}{car ? ` · ${car.name}` : ''}
                      {e.pay === 'especes' && <span style={{ marginLeft: 6, background: 'var(--amber-soft)', color: 'var(--amber)', padding: '0 5px', borderRadius: 3, fontSize: 10 }}>espèces</span>}
                      {!e.receipt && <span style={{ marginLeft: 6, color: 'var(--red)', fontSize: 10 }}>sans justificatif</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700 }}>{eur(fromCts(e.ttc_cts))} TTC</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{eur(ht)} HT</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TVA ── */}
      {tab === 'tva' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['mois', 'trimestre'] as const).map(m => (
              <button key={m} onClick={() => setTvaMode(m)} style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${tvaMode === m ? 'var(--accent)' : 'var(--border)'}`, background: tvaMode === m ? 'var(--accent-soft)' : 'transparent', color: tvaMode === m ? 'var(--accent)' : 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {m === 'mois' ? 'Par mois' : 'Par trimestre'}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {['Période', 'Ventes', 'TVA collectée', 'TVA déductible', 'TVA nette à payer'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Période' || h === 'Ventes' ? 'left' : 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tvaData.map(row => (
                  <tr key={row.key} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{row.label}</td>
                    <td style={{ padding: '10px 14px' }}>{row.soldCount} voiture{row.soldCount > 1 ? 's' : ''}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 600 }}>{eur(row.collectee)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 600 }}>{eur(row.deductible)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: row.nette > 0 ? 'var(--red)' : 'var(--green)' }}>{eur(row.nette)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            TVA collectée = TVA sur ventes (marge ou 20% prix total). TVA déductible = TVA des factures de frais récupérée. TVA nette = à reverser à l'administration fiscale.
          </p>
        </div>
      )}

      {/* ── PRÉVISIONS ── */}
      {tab === 'previsions' && (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          Entrées et sorties prévues (URSSAF, TVA, assurance…) — Prochainement.
        </div>
      )}

      {/* ── Modals ── */}
      {showExpModal && (
        <>
          <div onClick={() => setShowExpModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px, calc(100% - 24px))', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nouvelle dépense</h2>
              <button onClick={() => setShowExpModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <F label="Catégorie">
                  <select style={inpStyle as any} value={expForm.cat} onChange={e => setExpForm(p => ({ ...p, cat: e.target.value }))}>
                    <optgroup label="Voitures">{CATS_VOITURE.map(c => <option key={c}>{c}</option>)}</optgroup>
                    <optgroup label="Société">{CATS_SOCIETE.map(c => <option key={c}>{c}</option>)}</optgroup>
                  </select>
                </F>
              </div>
              <F label="Libellé"><input style={inpStyle as any} value={expForm.label} onChange={e => setExpForm(p => ({ ...p, label: e.target.value }))} placeholder="Optionnel" /></F>
              <F label="Montant TTC (€)"><input style={inpStyle as any} type="number" value={expForm.ttc} onChange={e => setExpForm(p => ({ ...p, ttc: e.target.value }))} placeholder="0.00" /></F>
              <F label="TVA (%)">
                <select style={inpStyle as any} value={expForm.tva_rate} onChange={e => setExpForm(p => ({ ...p, tva_rate: e.target.value }))}>
                  {TVA_RATES.map(r => <option key={r} value={String(r)}>{r === 0 ? 'Sans TVA (particulier, taxe)' : `${r} %`}</option>)}
                </select>
              </F>
              <F label="Paiement">
                <select style={inpStyle as any} value={expForm.pay} onChange={e => setExpForm(p => ({ ...p, pay: e.target.value }))}>
                  <option value="banque">Virement / CB</option>
                  <option value="especes">Espèces</option>
                </select>
              </F>
              <F label="Date"><input style={inpStyle as any} type="date" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} /></F>
              <div style={{ gridColumn: '1/-1' }}>
                <F label="Voiture concernée (optionnel)">
                  <select style={inpStyle as any} value={expForm.car_id} onChange={e => setExpForm(p => ({ ...p, car_id: e.target.value }))}>
                    <option value="">— Dépense société générale —</option>
                    {cars.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </F>
              </div>
            </div>
            {expForm.ttc && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                HT : {eur(parseFloat(expForm.ttc) / (1 + parseFloat(expForm.tva_rate) / 100))} · TVA : {eur(parseFloat(expForm.ttc) - parseFloat(expForm.ttc) / (1 + parseFloat(expForm.tva_rate) / 100))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setShowExpModal(false)}>Annuler</Button>
              <Button onClick={saveExpense} disabled={!expForm.ttc}>Enregistrer</Button>
            </div>
          </div>
        </>
      )}

      {showMoveModal && (
        <>
          <div onClick={() => setShowMoveModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px, calc(100% - 24px))', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Mouvement d'espèces</h2>
              <button onClick={() => setShowMoveModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              <F label="Type">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.entries(MOVE_KINDS).map(([k, [l, s]]) => (
                    <button key={k} onClick={() => setMoveForm(p => ({ ...p, kind: k }))} style={{ padding: '8px', borderRadius: 8, border: `1px solid ${moveForm.kind === k ? 'var(--accent)' : 'var(--border)'}`, background: moveForm.kind === k ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: moveForm.kind === k ? 'var(--accent)' : 'var(--text)' }}>{l}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s}</div>
                    </button>
                  ))}
                </div>
              </F>
              <F label="Montant (€)"><input style={inpStyle as any} type="number" value={moveForm.amount} onChange={e => setMoveForm(p => ({ ...p, amount: e.target.value }))} /></F>
              <F label="Date"><input style={inpStyle as any} type="date" value={moveForm.date} onChange={e => setMoveForm(p => ({ ...p, date: e.target.value }))} /></F>
              <F label="Libellé (optionnel)"><input style={inpStyle as any} value={moveForm.label} onChange={e => setMoveForm(p => ({ ...p, label: e.target.value }))} /></F>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setShowMoveModal(false)}>Annuler</Button>
              <Button onClick={saveMove} disabled={!moveForm.amount}>Enregistrer</Button>
            </div>
          </div>
        </>
      )}

      {showRecalModal && (
        <>
          <div onClick={() => setShowRecalModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(380px, calc(100% - 24px))', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recaler le solde {showRecalModal === 'banque' ? 'bancaire' : 'espèces'}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <F label="Solde actuel (€)"><input style={inpStyle as any} type="number" value={recalForm.solde} onChange={e => setRecalForm(p => ({ ...p, solde: e.target.value }))} placeholder="Lire sur ton appli bancaire" /></F>
              <F label="Date du relevé"><input style={inpStyle as any} type="date" value={recalForm.date} onChange={e => setRecalForm(p => ({ ...p, date: e.target.value }))} /></F>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setShowRecalModal(null)}>Annuler</Button>
              <Button onClick={saveRecal}>Enregistrer</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
