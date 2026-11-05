'use client';

import { useState, useMemo, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  calculate, advisedSellPrice, breakdownFee,
  type Regime, type ProfitView,
} from '@/lib/calculations';
import { COUNTRIES_TVA } from './constants';
import FeeRow, { type FeeRowState } from '@/components/calculer/FeeRow';
import ResultsPanel from '@/components/calculer/ResultsPanel';

// ─── 13 frais permanents (spec §9.3) ─────────────────────────────────────────

const DEFAULT_FEES: Omit<FeeRowState, 'amount'>[] = [
  { k: 'fuel',      label: 'Carburant',            mode: 'TTC' },
  { k: 'transport', label: 'Trajet (péages, billets)', mode: 'TTC' },
  { k: 'transit',   label: 'Plaques transit',       mode: 'TTC' },
  { k: 'decl',      label: "Déclaration d'achat",   mode: 'TTC' },
  { k: 'ct',        label: 'Contrôle technique',    mode: 'TTC' },
  { k: 'parts',     label: 'Pièces',                mode: 'TTC' },
  { k: 'meca',      label: 'Mécanique',             mode: 'TTC' },
  { k: 'carro',     label: 'Carrosserie',            mode: 'TTC' },
  { k: 'coc',       label: 'COC',                   mode: 'TTC' },
  { k: 'cg',        label: 'Carte grise',            mode: 'SANS_TVA' },
  { k: 'auction',   label: "Frais d'enchères",       mode: 'TTC', auctionCase: 'facture_separee' },
  { k: 'lbc',       label: 'Leboncoin',              mode: 'TTC' },
  { k: 'misc',      label: 'Frais annexes',          mode: 'TTC' },
];

function initFees(): FeeRowState[] {
  return DEFAULT_FEES.map(f => ({ ...f, amount: '' }));
}

function uid() {
  return `free_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function CalculateurClient() {
  const router   = useRouter();
  const supabase = createClient();

  // ── Formulaire ──────────────────────────────────────────────────────────────
  const [name,      setName]      = useState('');
  const [link,      setLink]      = useState('');
  const [regime,    setRegime]    = useState<Regime>('marge');
  const [country,   setCountry]   = useState('NL');
  const [seenStr,   setSeenStr]   = useState('');      // prix vu TTC/HT
  const [buyStr,    setBuyStr]    = useState('');      // prix d'achat
  const [marketStr, setMarketStr] = useState('');     // marché LBC
  const [daysStr,   setDaysStr]   = useState('30');   // délai prévu

  // ── Frais ────────────────────────────────────────────────────────────────────
  const [fees, setFees] = useState<FeeRowState[]>(initFees);

  const updateFee = useCallback((k: string, updated: FeeRowState) => {
    setFees(prev => prev.map(f => f.k === k ? updated : f));
  }, []);

  const removeFee = useCallback((k: string) => {
    setFees(prev => prev.filter(f => f.k !== k));
  }, []);

  const addFreeFee = () => {
    setFees(prev => [...prev, { k: uid(), label: 'Frais libre', amount: '', mode: 'TTC', removable: true }]);
  };

  // ── Mode de calcul ────────────────────────────────────────────────────────────
  const [calcMode,     setCalcMode]     = useState<'fixMargin' | 'fixSell'>('fixMargin');
  const [marginStr,    setMarginStr]    = useState('1200');   // marge visée €
  const [marginMode,   setMarginMode]   = useState<'euros' | 'pctCost' | 'pctSell'>('euros');
  const [negoStr,      setNegoStr]      = useState('200');    // marge de négo
  const [rounding,     setRounding]     = useState<'none' | '90' | 'centaine'>('90');
  const [sellFixStr,   setSellFixStr]   = useState('');       // prix fixé par l'utilisateur
  const [profitView,   setProfitView]   = useState<ProfitView>('HT');

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  // ── Calcul live ───────────────────────────────────────────────────────────────

  const calcInput = useMemo(() => {
    const buy    = parseFloat(buyStr) || 0;
    const market = parseFloat(marketStr) || null;
    const days   = parseInt(daysStr) || 30;

    // Frais convertis
    const feeObjects = fees
      .filter(f => f.amount && parseFloat(f.amount) > 0)
      .map(f => ({
        label:       f.label,
        amount:      parseFloat(f.amount),
        mode:        f.mode,
        auctionCase: f.auctionCase,
      }));

    // Prix de vente selon le mode
    let sellPrice = 0;
    if (calcMode === 'fixSell') {
      sellPrice = parseFloat(sellFixStr) || 0;
    } else {
      const margin = parseFloat(marginStr) || 0;
      const target = marginMode === 'euros'
        ? { targetMarginEuros: margin }
        : marginMode === 'pctCost'
          ? { targetMarginPctCost: margin / 100 }
          : { targetMarginPctSell: margin / 100 };
      if (buy > 0) {
        sellPrice = advisedSellPrice({ regime, buyPrice: buy, fees: feeObjects }, target);
      }
    }

    return { regime, buyPrice: buy, sellPrice, fees: feeObjects, market, days };
  }, [buyStr, marketStr, daysStr, fees, calcMode, sellFixStr, marginStr, marginMode, regime]);

  const result = useMemo(() => {
    if (!calcInput.buyPrice || !calcInput.sellPrice) return null;
    return calculate(calcInput);
  }, [calcInput]);

  const advisedPrice = useMemo(() => {
    if (!calcInput.buyPrice) return 0;
    if (calcMode === 'fixSell') return parseFloat(sellFixStr) || 0;
    const margin = parseFloat(marginStr) || 0;
    const target = marginMode === 'euros'
      ? { targetMarginEuros: margin }
      : marginMode === 'pctCost'
        ? { targetMarginPctCost: margin / 100 }
        : { targetMarginPctSell: margin / 100 };
    return advisedSellPrice({ regime, buyPrice: calcInput.buyPrice, fees: calcInput.fees }, target);
  }, [calcInput, calcMode, sellFixStr, marginStr, marginMode, regime]);

  const feesBreakdown = useMemo(() =>
    calcInput.fees
      .filter(f => f.auctionCase !== 'bordereau')
      .map(f => ({ label: f.label, ...breakdownFee(f) })),
    [calcInput.fees]);

  // ── Sauvegarde en base ────────────────────────────────────────────────────────

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    const nego = parseFloat(negoStr) || 0;
    const fc = {
      buy:     calcInput.buyPrice,
      date:    new Date().toISOString().slice(0, 10),
      days:    calcInput.days,
      fees:    result.feesHt,
      feesTtc: result.feesTtc,
      sell:    advisedPrice + nego,
      tva:     result.tvaSell,
      margin:  result.profitHt,
      rate:    result.marginRate,
      regime,
      rows: calcInput.fees.map(f => ({
        k: f.label, label: f.label, amount: f.amount, vat: f.mode,
        ht: breakdownFee(f).htCounted,
      })),
    };
    const id = `deal_${Date.now()}`;
    await supabase.from('deals').upsert({
      id,
      name: name || `Affaire ${new Date().toLocaleDateString('fr-FR')}`,
      inputs: {
        buy: calcInput.buyPrice, country, regime, name, link,
        market: calcInput.market,
        days: calcInput.days,
        rows: calcInput.fees.map(f => ({ k: f.label, label: f.label, amount: f.amount, vat: f.mode })),
      },
      fc,
    });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const buy = parseFloat(buyStr) || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Calculer une affaire</h1>
            <p className="text-xs text-slate-400">Résultat mis à jour en temps réel</p>
          </div>
          <button
            onClick={() => router.push('/voitures')}
            className="text-xs text-slate-400 hover:text-slate-600 p-2"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Infos véhicule ───────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Véhicule</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Nom / modèle</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Berlingo 1.6 HDI"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Lien annonce</label>
                <input
                  type="url" value={link} onChange={e => setLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Régime + Pays */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Régime TVA</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {(['marge', 'normal'] as Regime[]).map(r => (
                    <button key={r} onClick={() => setRegime(r)}
                      className={['flex-1 py-2 text-sm font-medium transition-colors',
                        regime === r ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'].join(' ')}>
                      {r === 'marge' ? 'TVA Marge' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Pays vendeur</label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {Object.entries(COUNTRIES_TVA).map(([code, { label, rate }]) => (
                    <option key={code} value={code}>{label} (TVA {(rate * 100).toFixed(0)} %)</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Prix d'achat */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Prix vu {regime === 'normal' ? '(TTC pays)' : ''} €
                </label>
                <input type="number" min="0" value={seenStr} onChange={e => setSeenStr(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Prix d'achat {regime === 'normal' ? 'HT' : 'TTC'} €
                </label>
                <input type="number" min="0" value={buyStr} onChange={e => setBuyStr(e.target.value)}
                  placeholder="900"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>

            {/* Marché + Délai */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prix marché LBC € (optionnel)</label>
                <input type="number" min="0" value={marketStr} onChange={e => setMarketStr(e.target.value)}
                  placeholder="4200"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Délai de vente prévu (jours)</label>
                <input type="number" min="1" value={daysStr} onChange={e => setDaysStr(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Frais ────────────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Frais</h2>
            <span className="text-xs text-slate-400">
              Total HT : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
                fees.filter(f => f.amount && parseFloat(f.amount) > 0)
                  .reduce((s, f) => s + breakdownFee({ ...f, amount: parseFloat(f.amount) }).htCounted, 0)
              )}
            </span>
          </div>
          <div>
            {fees.map(f => (
              <FeeRow
                key={f.k} fee={f}
                onChange={updated => updateFee(f.k, updated)}
                onRemove={f.removable ? () => removeFee(f.k) : undefined}
              />
            ))}
          </div>
          <button onClick={addFreeFee}
            className="mt-3 w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
            + Frais libre
          </button>
        </section>

        {/* ── Mode de calcul ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-4">
            <button onClick={() => setCalcMode('fixMargin')}
              className={['flex-1 py-2 text-sm font-medium transition-colors',
                calcMode === 'fixMargin' ? 'bg-blue-600 text-white' : 'text-slate-600'].join(' ')}>
              Je fixe ma marge
            </button>
            <button onClick={() => setCalcMode('fixSell')}
              className={['flex-1 py-2 text-sm font-medium transition-colors',
                calcMode === 'fixSell' ? 'bg-blue-600 text-white' : 'text-slate-600'].join(' ')}>
              Je fixe mon prix
            </button>
          </div>

          {calcMode === 'fixMargin' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(['euros', 'pctCost', 'pctSell'] as const).map(m => (
                  <button key={m} onClick={() => setMarginMode(m)}
                    className={['py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      marginMode === m ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-slate-200 text-slate-500'].join(' ')}>
                    {m === 'euros' ? 'En €' : m === 'pctCost' ? '% du coût' : '% du prix'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">
                    Marge {marginMode === 'euros' ? '€' : '%'}
                  </label>
                  <input type="number" min="0" value={marginStr} onChange={e => setMarginStr(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Marge de négo €</label>
                  <input type="number" min="0" value={negoStr} onChange={e => setNegoStr(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Arrondi</label>
                <div className="flex gap-2">
                  {(['none', '90', 'centaine'] as const).map(r => (
                    <button key={r} onClick={() => setRounding(r)}
                      className={['px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                        rounding === r ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-500'].join(' ')}>
                      {r === 'none' ? 'Exact' : r === '90' ? '…90' : 'Centaine'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Prix de vente TTC €</label>
              <input type="number" min="0" value={sellFixStr} onChange={e => setSellFixStr(e.target.value)}
                placeholder="3990"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          )}
        </section>

        {/* ── Résultats ────────────────────────────────────────────────────── */}
        {result && buy > 0 ? (
          <>
            <ResultsPanel
              result={result}
              view={profitView}
              onViewChange={setProfitView}
              advisedPrice={advisedPrice}
              nego={parseFloat(negoStr) || 0}
              rounding={rounding}
              market={parseFloat(marketStr) || null}
              daysPlanned={parseInt(daysStr) || 30}
              feesBreakdown={feesBreakdown}
            />

            {/* Bouton sauvegarde */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={[
                'w-full py-3 rounded-xl font-semibold text-sm transition-colors',
                saved ? 'bg-green-500 text-white' :
                saving ? 'bg-blue-400 text-white cursor-wait' :
                'bg-blue-600 text-white hover:bg-blue-700',
              ].join(' ')}
            >
              {saved ? '✅ Affaire sauvegardée !' : saving ? 'Sauvegarde…' : '💾 Enregistrer l\'affaire'}
            </button>
          </>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
            <div className="text-4xl mb-3">🧮</div>
            <p className="text-sm text-slate-400">
              {buy === 0 ? 'Saisis le prix d\'achat pour voir les résultats' : 'Paramètre le mode de calcul ci-dessus'}
            </p>
          </div>
        )}
      </div>

      {/* ── Bandeau fixe bas (mobile) ─────────────────────────────────────── */}
      {result && buy > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 md:hidden">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-400">Prix à afficher</p>
              <p className="text-xl font-bold text-blue-600">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(advisedPrice + (parseFloat(negoStr) || 0))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Marge HT</p>
              <p className={`text-xl font-bold ${result.profitHt >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(result.profitHt)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
