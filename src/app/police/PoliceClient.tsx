'use client';

import { useState, useMemo } from 'react';
import { fromCents } from '@/lib/calculations';
import { exportToPDF, exportToCSV } from '@/lib/police/export';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

function date(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

interface Props {
  logs: any[];
  cars: any[];
  settings: any;
}

export default function PoliceClient({ logs: initLogs, cars, settings }: Props) {
  const [logs] = useState(initLogs);
  const [filterType,     setFilterType]     = useState<'all' | 'achat' | 'vente'>('all');
  const [filterRegime,   setFilterRegime]   = useState<'all' | 'marge' | 'normal'>('all');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filterType !== 'all' && log.kind !== filterType) return false;
      if (filterRegime !== 'all' && log.regime !== filterRegime) return false;
      if (startDate && (log.created_at ?? '') < startDate) return false;
      if (endDate && (log.created_at ?? '') > endDate + 'T23:59:59Z') return false;
      return true;
    });
  }, [logs, filterType, filterRegime, startDate, endDate]);

  const totals = useMemo(() => {
    const buys = filtered.filter(l => l.kind === 'achat').reduce((s, l) => s + (l.amount_cts ?? 0), 0);
    const sells = filtered.filter(l => l.kind === 'vente').reduce((s, l) => s + (l.amount_cts ?? 0), 0);
    return { buys: fromCents(buys), sells: fromCents(sells), net: fromCents(sells - buys) };
  }, [filtered]);

  async function handleExportPDF() {
    await exportToPDF(filtered, cars, settings);
  }

  async function handleExportCSV() {
    await exportToCSV(filtered, cars);
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">📋 Livre de police</h1>
            <p className="text-xs text-slate-400">Journal légal append-only (immuable)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExportPDF}
              className="text-xs bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
              📄 PDF
            </button>
            <button onClick={handleExportCSV}
              className="text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
              📊 Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* Résumé */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Achats</p>
            <p className="text-2xl font-bold text-slate-800">{eur(Math.round(totals.buys * 100))}</p>
            <p className="text-xs text-slate-400 mt-1">{filtered.filter(l => l.kind === 'achat').length} transactions</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <p className="text-xs text-slate-400 mb-1">Ventes</p>
            <p className="text-2xl font-bold text-slate-800">{eur(Math.round(totals.sells * 100))}</p>
            <p className="text-xs text-slate-400 mt-1">{filtered.filter(l => l.kind === 'vente').length} transactions</p>
          </div>
          <div className={`bg-white rounded-xl p-4 shadow-sm border ${totals.net >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <p className="text-xs text-slate-400 mb-1">Net</p>
            <p className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {eur(Math.round(totals.net * 100))}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'achat', 'vente'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={['px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterType === t ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'].join(' ')}>
                {t === 'all' ? 'Tout' : t === 'achat' ? 'Achats' : 'Ventes'}
              </button>
            ))}
            <div className="w-px bg-slate-200" />
            {(['all', 'marge', 'normal'] as const).map(r => (
              <button key={r} onClick={() => setFilterRegime(r)}
                className={['px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterRegime === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'].join(' ')}>
                {r === 'all' ? 'Tous régimes' : r === 'marge' ? 'TVA Marge' : 'TVA Normal'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Depuis</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Jusqu'au</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">📋</p>
            <p>Aucune transaction dans cette période</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Type</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Véhicule</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Régime</th>
                    <th className="px-4 py-3 text-right text-slate-600 font-semibold">Montant</th>
                    <th className="px-4 py-3 text-left text-slate-600 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const car = cars.find(c => c.id === log.car_id);
                    const amount = fromCents(log.amount_cts ?? 0);
                    return (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 last:border-0">
                        <td className="px-4 py-3 text-slate-700 font-mono text-xs">
                          {new Date(log.created_at).toLocaleDateString('fr-FR')} <br />
                          <span className="text-slate-400">{new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            log.kind === 'achat'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {log.kind === 'achat' ? '📥 Achat' : '📤 Vente'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">{car?.name || 'Voiture supprimée'}</div>
                          {car?.plate && <div className="text-xs text-slate-400">{car.plate}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.regime === 'marge'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {log.regime === 'marge' ? 'Marge' : 'Normal'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {log.kind === 'achat' ? '−' : '+'}{eur(Math.round(amount * 100))}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          🔒 Immuable
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pied de page tableau */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex justify-end gap-8 font-semibold">
              <div>
                Achats: <span className="text-slate-800">{eur(Math.round(totals.buys * 100))}</span>
              </div>
              <div>
                Ventes: <span className="text-slate-800">{eur(Math.round(totals.sells * 100))}</span>
              </div>
              <div className={totals.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                Bilan: {totals.net >= 0 ? '+' : ''}{eur(Math.round(totals.net * 100))}
              </div>
            </div>
          </div>
        )}

        {/* Note légale */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
          <p className="font-semibold mb-1">📋 Informations légales</p>
          <p>Ce journal est un registre légal immuable (CNIL, Douanes). Aucune modification ou suppression n'est possible après enregistrement. Les données sont horodatées au serveur et cryptées.</p>
        </div>

      </div>
    </div>
  );
}
