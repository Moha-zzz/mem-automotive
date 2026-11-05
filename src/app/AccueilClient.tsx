'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fromCents, calculate } from '@/lib/calculations';
import { computeBankBalance, computeCashBalance, computeTvaPeriod, currentMonthRange } from '@/lib/argent';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

const STAGES = [
  { key: 'repere', label: 'Repéré', color: 'bg-slate-100 text-slate-700' },
  { key: 'achete', label: 'Acheté', color: 'bg-orange-100 text-orange-700' },
  { key: 'preparation', label: 'Préparation', color: 'bg-blue-100 text-blue-700' },
  { key: 'vente', label: 'En vente', color: 'bg-amber-100 text-amber-700' },
  { key: 'reserve', label: 'Réservé', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'vendu', label: 'Vendu', color: 'bg-green-100 text-green-700' },
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

export default function AccueilClient({ cars, expenses, deals, invoices, settings, moves, cashFlows }: Props) {
  const router = useRouter();

  // ── Statistiques voitures ──────────────────────────────────────────────────
  const carStats = useMemo(() => {
    const inStock = cars.filter(c => ['achete', 'preparation', 'vente', 'reserve'].includes(c.stage)).length;
    const soldMonth = cars.filter(c => c.sell_date && c.sell_date >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)).length;
    const avgStockDays = cars
      .filter(c => c.bought_at)
      .map(c => {
        const d = new Date(c.bought_at);
        return Math.floor((Date.now() - d.getTime()) / 86_400_000);
      })
      .reduce((a, b) => a + b, 0) / Math.max(cars.filter(c => c.bought_at).length, 1);

    return { total: cars.length, inStock, soldMonth, avgStockDays: Math.round(avgStockDays) };
  }, [cars]);

  // ── Distribution par étape ─────────────────────────────────────────────────
  const stageDistribution = useMemo(() => {
    return STAGES.map(s => ({
      ...s,
      count: cars.filter(c => c.stage === s.key).length,
    }));
  }, [cars]);

  // ── Soldes ────────────────────────────────────────────────────────────────
  const balances = useMemo(() => {
    const bank = computeBankBalance(settings, expenses, cars, moves, cashFlows);
    const cash = computeCashBalance(settings, expenses, cars, moves);
    return { bank, cash, total: bank + cash };
  }, [settings, expenses, cars, moves, cashFlows]);

  // ── TVA du mois ──────────────────────────────────────────────────────────
  const [mStart, mEnd] = currentMonthRange();
  const tvaMois = useMemo(() => computeTvaPeriod(cars, expenses, mStart, mEnd), [cars, expenses, mStart, mEnd]);

  // ── Dépenses du mois ────────────────────────────────────────────────────
  const monthExpenses = useMemo(() => {
    return expenses
      .filter(e => e.date >= mStart && e.date <= mEnd)
      .reduce((s, e) => s + (e.ttc_cts ?? 0), 0);
  }, [expenses, mStart, mEnd]);

  // ── Marge des voitures vendues ce mois ──────────────────────────────────
  const marginMonth = useMemo(() => {
    const sold = cars.filter(c => c.sell_date && c.sell_date >= mStart && c.sell_date <= mEnd);
    if (sold.length === 0) return 0;
    return sold.reduce((sum, c) => {
      if (!c.buy_price_cts || !c.sell_price_cts) return sum;
      const result = calculate({
        regime: c.regime,
        buyPrice: fromCents(c.buy_price_cts),
        sellPrice: fromCents(c.sell_price_cts),
        fees: [],
      });
      return sum + result.profitHt;
    }, 0);
  }, [cars, mStart, mEnd]);

  // ── Affaires en cours (deals) ────────────────────────────────────────────
  const dealsOpen = useMemo(() => {
    return deals.filter(d => !d.sold_at).slice(0, 5);
  }, [deals]);

  // ── Factures à recevoir ───────────────────────────────────────────────────
  const invoicesUnpaid = useMemo(() => {
    return invoices.filter(i => i.locked_at && !i.paid && i.type !== 'bon').length;
  }, [invoices]);

  const totalUnpaid = useMemo(() => {
    return invoices
      .filter(i => i.locked_at && !i.paid && i.type !== 'bon')
      .reduce((s, i) => s + (i.total_cts ?? 0), 0);
  }, [invoices]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">📊 Accueil</h1>
          <p className="text-sm text-blue-100">Bienvenue MEM AUTOMOTIVE</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ── KPIs principaux ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total voitures */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md"
            onClick={() => router.push('/voitures')}>
            <p className="text-xs text-slate-400 mb-1">Total voitures</p>
            <p className="text-3xl font-bold text-slate-800">{carStats.total}</p>
            <p className="text-xs text-slate-400 mt-1">{carStats.inStock} en stock</p>
          </div>

          {/* Solde bancaire */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md"
            onClick={() => router.push('/argent')}>
            <p className="text-xs text-slate-400 mb-1">Banque</p>
            <p className={`text-3xl font-bold ${balances.bank >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
              {eur(Math.round(balances.bank * 100))}
            </p>
            <p className="text-xs text-slate-400 mt-1">+ {eur(Math.round(balances.cash * 100))} espèces</p>
          </div>

          {/* Ventes ce mois */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md"
            onClick={() => router.push('/voitures')}>
            <p className="text-xs text-slate-400 mb-1">Vendues (mois)</p>
            <p className="text-3xl font-bold text-green-600">{carStats.soldMonth}</p>
            <p className="text-xs text-slate-400 mt-1">marge : {eur(Math.round(marginMonth * 100))}</p>
          </div>

          {/* Factures */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md"
            onClick={() => router.push('/factures')}>
            <p className="text-xs text-slate-400 mb-1">Factures</p>
            <p className="text-3xl font-bold text-slate-800">{invoices.length}</p>
            {invoicesUnpaid > 0 && (
              <p className="text-xs text-orange-500 font-medium mt-1">{invoicesUnpaid} non payées</p>
            )}
          </div>
        </div>

        {/* ── Ligne distribution par étape ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Distribution stock</h2>
          <div className="flex gap-2 overflow-x-auto">
            {stageDistribution.map(s => (
              <div key={s.key} className="flex-shrink-0 flex flex-col items-center">
                <div className={`rounded-full w-12 h-12 flex items-center justify-center font-bold ${s.color}`}>
                  {s.count}
                </div>
                <p className="text-xs text-slate-500 mt-1 text-center max-w-[60px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Deux colonnes : Finances + Affaires ──────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Finances du mois */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Finances (ce mois)</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Dépenses</span>
                <span className="font-semibold text-slate-800">{eur(Math.round(monthExpenses))}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">TVA collectée</span>
                <span className="font-semibold text-orange-600">{eur(Math.round(tvaMois.collectee * 100))}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">TVA déductible</span>
                <span className="font-semibold text-green-600">{eur(Math.round(tvaMois.deductible * 100))}</span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold">
                <span className="text-slate-700">TVA nette</span>
                <span className={tvaMois.nette >= 0 ? 'text-orange-600' : 'text-green-600'}>
                  {eur(Math.round(tvaMois.nette * 100))}
                </span>
              </div>
            </div>
          </div>

          {/* Affaires en cours */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Affaires en cours</h2>
            {dealsOpen.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Aucune affaire en cours</p>
            ) : (
              <div className="space-y-2">
                {dealsOpen.map(d => (
                  <div key={d.id} className="py-2 px-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <p className="font-medium text-slate-700">{d.name || 'Affaire'}</p>
                    <p className="text-slate-500">
                      {d.fc?.buy ? eur(Math.round(d.fc.buy * 100)) : '—'} →
                      {d.fc?.sell ? eur(Math.round(d.fc.sell * 100)) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push('/calculer')}
              className="w-full mt-3 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              + Nouvelle affaire
            </button>
          </div>
        </div>

        {/* ── Raccourcis navigation ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Accès rapide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: '🚗', label: 'Voitures', route: '/voitures' },
              { icon: '🧮', label: 'Calculer', route: '/calculer' },
              { icon: '💰', label: 'Argent', route: '/argent' },
              { icon: '🧾', label: 'Factures', route: '/factures' },
              { icon: '📋', label: 'Police', route: '/police' },
              { icon: '✅', label: 'Tâches', route: '/taches' },
              { icon: '📅', label: 'Calendrier', route: '/calendrier' },
              { icon: '⚙️', label: 'Réglages', route: '/reglages' },
            ].map(link => (
              <button
                key={link.route}
                onClick={() => router.push(link.route)}
                className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-center transition-colors">
                <p className="text-lg mb-1">{link.icon}</p>
                <p className="text-xs font-medium text-slate-700">{link.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Notes ──────────────────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 Infos</p>
          <p>Jours en stock moyens : <span className="font-bold">{carStats.avgStockDays}</span></p>
        </div>
      </div>
    </div>
  );
}
