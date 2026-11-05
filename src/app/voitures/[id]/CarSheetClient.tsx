'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Car, PaperKey, Stage } from '@/types';
import { fromCents, calculate } from '@/lib/calculations';
import StageBar from '@/components/cars/StageBar';
import PaperChecklist from '@/components/cars/PaperChecklist';

interface Props {
  car: Car;
  expenses: any[];
}

function fmt(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(fromCents(cts));
}

export default function CarSheetClient({ car: initialCar, expenses }: Props) {
  const router = useRouter();
  const [car, setCar] = useState(initialCar);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  async function handleStageChange(stage: Stage) {
    setSaving(true);
    const updated = { ...car, stage };
    setCar(updated);
    await supabase.from('cars').update({ stage }).eq('id', car.id);
    setSaving(false);
  }

  async function handlePaperChange(key: PaperKey, value: boolean) {
    setSaving(true);
    const papers = { ...car.papers, [key]: value };
    setCar({ ...car, papers });
    await supabase.from('cars').update({ papers }).eq('id', car.id);
    setSaving(false);
  }

  // Calcul du bénéfice depuis les dépenses réelles
  const feesHt = expenses.reduce((sum, e) => {
    const tva = e.tva_cts ?? 0;
    const ttc = e.ttc_cts ?? 0;
    return sum + fromCents(ttc - tva);
  }, 0);

  const profitCalc = car.buyPriceCts && car.sellPriceCts
    ? calculate({
        regime: car.regime,
        buyPrice: fromCents(car.buyPriceCts),
        sellPrice: fromCents(car.sellPriceCts),
        fees: expenses.map(e => ({
          label: e.label ?? '',
          amount: fromCents(e.ttc_cts ?? 0),
          mode: 'TTC' as const,
        })),
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-800 truncate">{car.name}</h1>
            {car.plate && <p className="text-xs font-mono text-slate-400">{car.plate}</p>}
          </div>
          {saving && <span className="text-xs text-blue-500 animate-pulse">Sauvegarde…</span>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Barre d'étapes */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Étape</h2>
          <StageBar current={car.stage} onChange={handleStageChange} />
        </section>

        {/* Résumé financier */}
        {(car.buyPriceCts || car.askPriceCts) && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">Résumé financier</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-400">Prix d'achat</p>
                <p className="text-lg font-bold text-slate-800">{fmt(car.buyPriceCts)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{car.sellPriceCts ? 'Vendu' : 'Affiché'}</p>
                <p className="text-lg font-bold text-emerald-600">
                  {fmt(car.sellPriceCts ?? car.askPriceCts)}
                </p>
              </div>
              {profitCalc && (
                <>
                  <div>
                    <p className="text-xs text-slate-400">Bénéfice HT</p>
                    <p className={`text-base font-semibold ${profitCalc.profitHt >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(profitCalc.profitHt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Taux de marge</p>
                    <p className={`text-base font-semibold ${
                      profitCalc.marginRate >= 0.20 ? 'text-green-600' :
                      profitCalc.marginRate >= 0.15 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {(profitCalc.marginRate * 100).toFixed(1)} %
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">TVA à reverser</p>
                    <p className="text-sm text-slate-600">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(profitCalc.tvaNet)}
                    </p>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* 6 Papiers */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <PaperChecklist
            papers={car.papers}
            onChange={handlePaperChange}
          />
        </section>

        {/* Infos véhicule */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-600 mb-3">Véhicule</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ['Marque', car.brand], ['Modèle', car.model],
              ['Année', car.year?.toString()], ['Carburant', car.fuel],
              ['Boîte', car.gearbox], ['Couleur', car.color],
              ['Km', car.km ? car.km.toLocaleString('fr-FR') + ' km' : null],
              ['Pays', car.country], ['Source', car.source],
              ['Régime TVA', car.regime === 'marge' ? 'TVA sur marge' : 'Régime normal'],
            ].map(([label, value]) => value ? (
              <div key={label as string}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="font-medium text-slate-700">{value}</p>
              </div>
            ) : null)}
          </div>
          {car.link && (
            <a
              href={car.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Voir l'annonce →
            </a>
          )}
        </section>

        {/* Dépenses */}
        {expenses.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-600">Dépenses</h2>
              <span className="text-sm font-semibold text-slate-700">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
                  expenses.reduce((s, e) => s + fromCents(e.ttc_cts ?? 0), 0)
                )} TTC
              </span>
            </div>
            <div className="space-y-1.5">
              {expenses.map(e => (
                <div key={e.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="text-slate-700">{e.label ?? e.cat}</span>
                    <span className="text-xs text-slate-400 ml-1.5">{e.cat}</span>
                  </div>
                  <span className="font-medium text-slate-600">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(e.ttc_cts ?? 0))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {car.notes && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="text-sm font-semibold text-slate-600 mb-2">Notes</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{car.notes}</p>
          </section>
        )}

      </div>
    </div>
  );
}
