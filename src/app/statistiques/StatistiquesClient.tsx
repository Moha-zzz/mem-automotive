'use client';

import { useMemo, useState } from 'react';
import { fromCents, calculate } from '@/lib/calculations';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

interface Props {
  cars: any[];
  expenses: any[];
  invoices: any[];
}

export default function StatistiquesClient({ cars, expenses, invoices }: Props) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month');

  const now = new Date();
  const startDate = useMemo(() => {
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString().slice(0, 10);
    if (period === 'year') return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return '1970-01-01';
  }, [period]);

  const stats = useMemo(() => {
    const sold = cars.filter(c => c.sell_date && c.sell_date >= startDate);
    const bought = cars.filter(c => c.buy_date && c.buy_date >= startDate);
    const carExpenses = expenses.filter(e => e.car_id && e.date >= startDate);

    const totalRevenue = sold.reduce((s, c) => s + (c.sell_price_cts ?? 0), 0);
    const totalCost = bought.reduce((s, c) => s + (c.buy_price_cts ?? 0), 0);
    const totalExpenses = carExpenses.reduce((s, e) => s + (e.ttc_cts ?? 0), 0);

    let totalMargin = 0;
    let marginCount = 0;
    for (const car of sold) {
      if (car.buy_price_cts && car.sell_price_cts) {
        const result = calculate({
          regime: car.regime,
          buyPrice: fromCents(car.buy_price_cts),
          sellPrice: fromCents(car.sell_price_cts),
          fees: [],
        });
        totalMargin += result.profitHt;
        marginCount++;
      }
    }

    const avgDaysStock = bought.length > 0
      ? bought
        .map(c => {
          const d = new Date(c.bought_at ?? c.buy_date);
          return Math.floor((new Date(c.sell_date ?? now.toISOString().slice(0, 10)).getTime() - d.getTime()) / 86_400_000);
        })
        .reduce((a, b) => a + b, 0) / bought.length
      : 0;

    return {
      sold: sold.length,
      bought: bought.length,
      revenue: fromCents(totalRevenue),
      cost: fromCents(totalCost),
      expenses: fromCents(totalExpenses),
      margin: totalMargin,
      avgMargin: marginCount > 0 ? totalMargin / marginCount : 0,
      avgDaysStock: Math.round(avgDaysStock),
    };
  }, [cars, expenses, startDate]);

  const marginRate = stats.revenue > 0 ? (stats.margin / stats.revenue) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-bold text-slate-800">📊 Statistiques</h1>
          <p className="text-xs text-slate-400">Analyse de performance</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Période */}
        <div className="flex gap-2 bg-white p-2 rounded-lg border border-slate-100">
          {(['month', 'quarter', 'year', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={['px-3 py-1.5 rounded text-xs font-medium transition-colors',
                period === p ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'].join(' ')}>
              {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : p === 'year' ? 'Année' : 'Total'}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Vendues</p>
            <p className="text-3xl font-bold text-green-600">{stats.sold}</p>
            <p className="text-xs text-slate-400 mt-1">Chiffre: {eur(Math.round(stats.revenue * 100))}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Achetées</p>
            <p className="text-3xl font-bold text-orange-600">{stats.bought}</p>
            <p className="text-xs text-slate-400 mt-1">Investissement: {eur(Math.round(stats.cost * 100))}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Marge totale</p>
            <p className="text-3xl font-bold text-blue-600">{eur(Math.round(stats.margin * 100))}</p>
            <p className="text-xs text-slate-400 mt-1">{marginRate.toFixed(1)} % du CA</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Stock moyen</p>
            <p className="text-3xl font-bold text-slate-800">{stats.avgDaysStock}</p>
            <p className="text-xs text-slate-400 mt-1">jours en stock</p>
          </div>
        </div>

        {/* Détails */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Ventes détail */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-3">Analyse ventes</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Nombre</span>
                <span className="font-medium text-slate-800">{stats.sold} voiture{stats.sold !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-600">Chiffre d'affaires</span>
                <span className="font-medium text-slate-800">{eur(Math.round(stats.revenue * 100))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Prix moyen</span>
                <span className="font-medium text-slate-800">
                  {stats.sold > 0 ? eur(Math.round((stats.revenue / stats.sold) * 100)) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Marge moyenne</span>
                <span className="font-medium text-slate-800">
                  {eur(Math.round(stats.avgMargin * 100))}
                </span>
              </div>
            </div>
          </div>

          {/* Achats détail */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-3">Analyse achats</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Nombre</span>
                <span className="font-medium text-slate-800">{stats.bought} voiture{stats.bought !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                <span className="text-slate-600">Investissement total</span>
                <span className="font-medium text-slate-800">{eur(Math.round(stats.cost * 100))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Prix moyen</span>
                <span className="font-medium text-slate-800">
                  {stats.bought > 0 ? eur(Math.round((stats.cost / stats.bought) * 100)) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Dépenses</span>
                <span className="font-medium text-red-600">{eur(Math.round(stats.expenses * 100))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicateurs clés */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <h3 className="font-semibold mb-2">💡 Indicateurs clés</h3>
          <ul className="space-y-1 text-sm">
            <li><span className="font-medium">ROI</span> : {stats.revenue > 0 ? ((stats.margin / stats.cost) * 100).toFixed(1) : '—'} %</li>
            <li><span className="font-medium">Taux marge</span> : {marginRate.toFixed(1)} %</li>
            <li><span className="font-medium">Vélocité</span> : {stats.bought > 0 ? ((stats.sold / stats.bought) * 100).toFixed(0) : '—'} % vendues</li>
            <li><span className="font-medium">Rotation stock</span> : {stats.avgDaysStock} jours en moyenne</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
