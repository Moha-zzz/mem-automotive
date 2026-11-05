'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fromCents, calculate } from '@/lib/calculations';
import { computeBankBalance, computeCashBalance, computeTvaPeriod, currentMonthRange } from '@/lib/argent';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

const STAGES = [
  { key: 'repere', label: 'Repéré', color: 'from-slate-500 to-slate-600', icon: '👁️' },
  { key: 'achete', label: 'Acheté', color: 'from-orange-500 to-red-500', icon: '💳' },
  { key: 'preparation', label: 'Préparation', color: 'from-blue-500 to-cyan-500', icon: '🔧' },
  { key: 'vente', label: 'En vente', color: 'from-amber-500 to-yellow-500', icon: '📢' },
  { key: 'reserve', label: 'Réservé', color: 'from-green-500 to-emerald-500', icon: '🎯' },
  { key: 'vendu', label: 'Vendu', color: 'from-purple-500 to-pink-500', icon: '✨' },
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

  const stageDistribution = useMemo(() => {
    return STAGES.map(s => ({
      ...s,
      count: cars.filter(c => c.stage === s.key).length,
    }));
  }, [cars]);

  const balances = useMemo(() => {
    const bank = computeBankBalance(settings, expenses, cars, moves, cashFlows);
    const cash = computeCashBalance(settings, expenses, cars, moves);
    return { bank, cash, total: bank + cash };
  }, [settings, expenses, cars, moves, cashFlows]);

  const [mStart, mEnd] = currentMonthRange();
  const tvaMois = useMemo(() => computeTvaPeriod(cars, expenses, mStart, mEnd), [cars, expenses, mStart, mEnd]);

  const monthExpenses = useMemo(() => {
    return expenses
      .filter(e => e.date >= mStart && e.date <= mEnd)
      .reduce((s, e) => s + (e.ttc_cts ?? 0), 0);
  }, [expenses, mStart, mEnd]);

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

  const dealsOpen = useMemo(() => {
    return deals.filter(d => !d.sold_at).slice(0, 5);
  }, [deals]);

  const invoicesUnpaid = useMemo(() => {
    return invoices.filter(i => i.locked_at && !i.paid && i.type !== 'bon').length;
  }, [invoices]);

  const totalUnpaid = useMemo(() => {
    return invoices
      .filter(i => i.locked_at && !i.paid && i.type !== 'bon')
      .reduce((s, i) => s + (i.total_cts ?? 0), 0);
  }, [invoices]);

  const menuLinks = [
    { href: '/voitures', icon: '🚗', label: 'Voitures' },
    { href: '/calculer', icon: '🧮', label: 'Calculer' },
    { href: '/argent', icon: '💰', label: 'Argent' },
    { href: '/factures', icon: '🧾', label: 'Factures' },
    { href: '/police', icon: '📋', label: 'Police' },
    { href: '/taches', icon: '✅', label: 'Tâches' },
    { href: '/calendrier', icon: '📅', label: 'Calendrier' },
    { href: '/statistiques', icon: '📊', label: 'Stats' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden px-4 py-12 md:py-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]"></div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto relative z-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            📊 MEM AUTOMOTIVE
          </h1>
          <p className="text-lg text-blue-50 max-w-2xl">
            Gestion d'inventaire, calcul TVA et facturation — tout en un.
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* KPIs Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { title: 'Total voitures', value: carStats.total, icon: '🚗', color: 'from-orange-500 to-red-500', href: '/voitures' },
            { title: 'Solde banque', value: eur(Math.round(balances.bank * 100)), icon: '💳', color: 'from-green-500 to-emerald-500', href: '/argent' },
            { title: 'Vendues (mois)', value: carStats.soldMonth, icon: '📤', color: 'from-purple-500 to-pink-500', href: '/voitures', sub: `Marge: ${eur(Math.round(marginMonth * 100))}` },
            { title: 'Factures', value: invoices.length, icon: '📋', color: 'from-amber-500 to-yellow-500', href: '/factures', sub: invoicesUnpaid > 0 ? `${invoicesUnpaid} non payées` : '✅ À jour' },
          ].map((kpi, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05, translateY: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push(kpi.href)}
              className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer border border-white/10`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{kpi.icon}</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">En direct</span>
              </div>
              <p className="text-sm text-white/80 mb-1">{kpi.title}</p>
              <p className="text-3xl font-bold">{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-white/60 mt-2">{kpi.sub}</p>}
            </motion.button>
          ))}
        </motion.div>

        {/* Distribution Stock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl"
        >
          <h2 className="text-lg font-bold text-white mb-6">Distribution stock</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {stageDistribution.map((stage, i) => (
              <motion.div
                key={stage.key}
                whileHover={{ scale: 1.05 }}
                className={`bg-gradient-to-br ${stage.color} rounded-xl p-4 text-white text-center shadow-lg border border-white/10`}
              >
                <div className="text-2xl mb-2">{stage.icon}</div>
                <div className="text-2xl font-bold">{stage.count}</div>
                <p className="text-xs text-white/80 mt-2">{stage.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Finances + Affaires */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Finances */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl"
          >
            <h2 className="text-lg font-bold text-white mb-6">Finances (ce mois)</h2>
            <div className="space-y-4">
              {[
                { label: 'Dépenses', value: eur(Math.round(monthExpenses)), color: 'text-red-400' },
                { label: 'TVA collectée', value: eur(Math.round(tvaMois.collectee * 100)), color: 'text-amber-400' },
                { label: 'TVA déductible', value: eur(Math.round(tvaMois.deductible * 100)), color: 'text-green-400' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-700/50">
                  <span className="text-slate-300">{item.label}</span>
                  <span className={`font-semibold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Affaires */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl"
          >
            <h2 className="text-lg font-bold text-white mb-6">Affaires en cours</h2>
            {dealsOpen.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Aucune affaire en cours</p>
            ) : (
              <div className="space-y-3">
                {dealsOpen.map((deal, i) => (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600/50 hover:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-medium text-white">{deal.name || 'Affaire'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {deal.fc?.buy ? eur(Math.round(deal.fc.buy * 100)) : '—'} → {deal.fc?.sell ? eur(Math.round(deal.fc.sell * 100)) : '—'}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => router.push('/calculer')}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              + Nouvelle affaire
            </motion.button>
          </motion.div>
        </div>

        {/* Navigation rapide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl"
        >
          <h2 className="text-lg font-bold text-white mb-6">Accès rapide</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {menuLinks.map((link, i) => (
              <motion.button
                key={link.href}
                whileHover={{ scale: 1.05, translateY: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(link.href)}
                className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-600 border border-slate-600/50 hover:border-blue-500/50 transition-all text-center group"
              >
                <p className="text-2xl mb-2 group-hover:scale-125 transition-transform">{link.icon}</p>
                <p className="text-xs font-medium text-white">{link.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 text-center"
        >
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-blue-400">💡 Conseil :</span> Commence par créer une affaire dans Calculer, puis émettre une facture.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
