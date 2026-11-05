'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  computeBankBalance, computeCashBalance,
  computeBalanceIn30Days, computeTvaPeriod,
  currentMonthRange, currentQuarterRange,
} from '@/lib/argent';
import { fromCents, toCents } from '@/lib/calculations';
import DepenseModal from '@/components/argent/DepenseModal';
import RecalageModal from '@/components/argent/RecalageModal';
import MouvementModal from '@/components/argent/MouvementModal';

function eur(n: number, sign = false) {
  const v = new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(Math.abs(n));
  if (sign && n < 0) return `−${v}`;
  if (sign && n > 0) return `+${v}`;
  return v;
}

interface Props {
  settings: any;
  expenses: any[];
  cars: any[];
  moves: any[];
  cashFlows: any[];
}

export default function ArgentClient({ settings: initSettings, expenses: initExpenses, cars, moves: initMoves, cashFlows: initCash }: Props) {
  const router   = useRouter();
  const supabase = createClient();

  const [settings,  setSettings]  = useState(initSettings);
  const [expenses,  setExpenses]  = useState(initExpenses);
  const [moves,     setMoves]     = useState(initMoves);
  const [cashFlows, setCashFlows] = useState(initCash);

  const [showDepense,    setShowDepense]    = useState(false);
  const [showRecalage,   setShowRecalage]   = useState<'banque' | 'especes' | null>(null);
  const [showMouvement,  setShowMouvement]  = useState(false);
  const [tvaView,        setTvaView]        = useState<'mois' | 'trimestre'>('mois');
  const [expFilter,      setExpFilter]      = useState<'tout' | 'banque' | 'especes'>('tout');

  // ── Calculs soldes ────────────────────────────────────────────────────────
  const bankBalance = useMemo(() =>
    computeBankBalance(settings, expenses, cars, moves, cashFlows),
    [settings, expenses, cars, moves, cashFlows]);

  const cashBalance = useMemo(() =>
    computeCashBalance(settings, expenses, cars, moves),
    [settings, expenses, cars, moves]);

  const balanceIn30 = useMemo(() =>
    computeBalanceIn30Days(bankBalance, cashFlows),
    [bankBalance, cashFlows]);

  // ── TVA ───────────────────────────────────────────────────────────────────
  const [mStart, mEnd]  = currentMonthRange();
  const [qStart, qEnd]  = currentQuarterRange();
  const tva = useMemo(() => {
    const [start, end] = tvaView === 'mois' ? [mStart, mEnd] : [qStart, qEnd];
    return computeTvaPeriod(cars, expenses, start, end);
  }, [tvaView, cars, expenses, mStart, mEnd, qStart, qEnd]);

  // ── Dépenses filtrées ──────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() =>
    expenses.filter(e => expFilter === 'tout' || e.pay === expFilter),
    [expenses, expFilter]);

  // ── Totaux dépenses du mois ───────────────────────────────────────────────
  const monthExpenses = useMemo(() =>
    expenses.filter(e => e.date >= mStart && e.date <= mEnd),
    [expenses, mStart, mEnd]);

  const monthTotal = monthExpenses.reduce((s, e) => s + fromCents(e.ttc_cts ?? 0), 0);

  // ── Rafraîchissement après action ─────────────────────────────────────────
  async function refresh() {
    const [{ data: s }, { data: ex }, { data: mv }, { data: cf }] = await Promise.all([
      supabase.from('settings').select('*').eq('id', 'main').single(),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('moves').select('*').order('date', { ascending: false }),
      supabase.from('cash').select('*').order('date', { ascending: true }),
    ]);
    if (s)  setSettings(s);
    if (ex) setExpenses(ex);
    if (mv) setMoves(mv);
    if (cf) setCashFlows(cf);
  }

  async function toggleCashFlow(id: string, done: boolean) {
    await supabase.from('cash').update({ done, done_date: done ? new Date().toISOString().slice(0, 10) : null }).eq('id', id);
    setCashFlows(prev => prev.map(c => c.id === id ? { ...c, done } : c));
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Argent</h1>
            <p className="text-xs text-slate-400">Soldes, dépenses et TVA</p>
          </div>
          <button onClick={() => setShowDepense(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
            + Dépense
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Soldes ───────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-3">
          {/* Banque */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Banque</p>
                <p className={`text-2xl font-bold mt-0.5 ${bankBalance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                  {eur(bankBalance)}
                </p>
              </div>
              <button onClick={() => setShowRecalage('banque')}
                className="text-xs text-blue-500 hover:underline mt-1">Recaler</button>
            </div>
            {settings.solde_date && (
              <p className="text-xs text-slate-400">Recalé le {new Date(settings.solde_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>

          {/* Espèces */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400">Espèces</p>
                <p className={`text-2xl font-bold mt-0.5 ${cashBalance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                  {eur(cashBalance)}
                </p>
              </div>
              <button onClick={() => setShowRecalage('especes')}
                className="text-xs text-blue-500 hover:underline mt-1">Recaler</button>
            </div>
            <button onClick={() => setShowMouvement(true)}
              className="text-xs text-slate-400 hover:text-slate-600">+ Mouvement</button>
          </div>
        </section>

        {/* Total + prévu 30j */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs opacity-75">Total disponible</p>
              <p className="text-3xl font-bold">{eur(bankBalance + cashBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-75">Dans 30 jours (prévu)</p>
              <p className="text-xl font-semibold">{eur(balanceIn30 + cashBalance)}</p>
            </div>
          </div>
        </div>

        {/* ── TVA ──────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">TVA</h2>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              {(['mois', 'trimestre'] as const).map(v => (
                <button key={v} onClick={() => setTvaView(v)}
                  className={['px-3 py-1 font-medium transition-colors',
                    tvaView === v ? 'bg-blue-600 text-white' : 'text-slate-500'].join(' ')}>
                  {v === 'mois' ? 'Ce mois' : 'Ce trimestre'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Collectée (ventes)', value: tva.collectee, color: 'text-orange-500' },
              { label: 'Déductible (frais)', value: -tva.deductible, color: 'text-green-600' },
              ...(tva.autoliquidee ? [{ label: 'Autoliquidée (achat UE)', value: 0, color: 'text-slate-400' }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-slate-500">{row.label}</span>
                <span className={`font-medium ${row.color}`}>{eur(Math.abs(row.value))}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold">
              <span>Nette à reverser</span>
              <span className={tva.nette >= 0 ? 'text-orange-500' : 'text-green-600'}>
                {eur(tva.nette)}
              </span>
            </div>
          </div>
        </section>

        {/* ── Entrées / Sorties prévues ─────────────────────────────────────── */}
        {cashFlows.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Entrées / Sorties prévues</h2>
            <div className="space-y-2">
              {cashFlows.map(c => {
                const amount = fromCents(c.amount_cts);
                const isPast = c.date < new Date().toISOString().slice(0, 10);
                return (
                  <div key={c.id} className={['flex items-center gap-3 text-sm',
                    c.done ? 'opacity-50' : ''].join(' ')}>
                    <input type="checkbox" checked={c.done}
                      onChange={e => toggleCashFlow(c.id, e.target.checked)}
                      className="rounded border-slate-300" />
                    <div className="flex-1 min-w-0">
                      <span className={`truncate ${c.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {c.label}
                      </span>
                      <span className={`text-xs ml-2 ${isPast && !c.done ? 'text-red-400' : 'text-slate-400'}`}>
                        {new Date(c.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <span className={`font-semibold flex-shrink-0 ${amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {eur(amount, true)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Dépenses ─────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">Dépenses</h2>
              <p className="text-xs text-slate-400">Ce mois : {eur(monthTotal)}</p>
            </div>
            <div className="flex gap-1">
              {(['tout', 'banque', 'especes'] as const).map(f => (
                <button key={f} onClick={() => setExpFilter(f)}
                  className={['px-2 py-1 rounded text-xs font-medium transition-colors',
                    expFilter === f ? 'bg-slate-700 text-white' : 'text-slate-500 bg-slate-100'].join(' ')}>
                  {f === 'tout' ? 'Tout' : f === 'banque' ? '🏦' : '💵'}
                </button>
              ))}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Aucune dépense</p>
          ) : (
            <div className="space-y-1">
              {filteredExpenses.slice(0, 20).map(e => {
                const ttc = fromCents(e.ttc_cts ?? 0);
                const tva = fromCents(e.tva_cts ?? 0);
                return (
                  <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700 truncate">{e.label ?? e.cat}</span>
                        {!e.receipt_id && (
                          <span className="text-xs bg-orange-100 text-orange-500 px-1 rounded">Sans justif.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{e.cat}</span>
                        <span>·</span>
                        <span>{new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                        <span>·</span>
                        <span>{e.pay === 'especes' ? '💵' : '🏦'}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-slate-700">{eur(ttc)}</div>
                      {tva > 0 && <div className="text-xs text-slate-400">TVA {eur(tva)}</div>}
                    </div>
                  </div>
                );
              })}
              {filteredExpenses.length > 20 && (
                <p className="text-xs text-center text-slate-400 pt-2">
                  + {filteredExpenses.length - 20} dépenses
                </p>
              )}
            </div>
          )}
        </section>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showDepense && (
        <DepenseModal
          cars={cars}
          onClose={() => setShowDepense(false)}
          onSaved={() => { setShowDepense(false); refresh(); }}
        />
      )}
      {showRecalage && (
        <RecalageModal
          account={showRecalage}
          currentBalance={showRecalage === 'banque' ? bankBalance : cashBalance}
          onClose={() => setShowRecalage(null)}
          onSaved={() => { setShowRecalage(null); refresh(); }}
        />
      )}
      {showMouvement && (
        <MouvementModal
          onClose={() => setShowMouvement(false)}
          onSaved={() => { setShowMouvement(false); refresh(); }}
        />
      )}
    </div>
  );
}
