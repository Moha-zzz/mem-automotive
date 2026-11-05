'use client';

import type { ProfitView } from '@/types';
import type { CalcResult } from '@/lib/calculations';
import { roundTo90 } from '@/lib/calculations';

interface Props {
  result: CalcResult;
  view: ProfitView;
  onViewChange: (v: ProfitView) => void;
  advisedPrice: number;
  nego: number;
  rounding: 'none' | '90' | 'centaine';
  market: number | null;
  daysPlanned: number;
  feesBreakdown: { label: string; htCounted: number; ttcPaid: number }[];
}

function eur(n: number, decimals = 0) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: decimals,
  }).format(n);
}

function pct(n: number) {
  return `${(n * 100).toFixed(1)} %`;
}

// Seuils de taux de marge (spec §9.4)
function marginColor(rate: number, sellPrice: number): string {
  let green = 0.20, red = 0.15;
  if (sellPrice > 20000)      { green = 0.10; red = 0.06; }
  else if (sellPrice > 10000) { green = 0.12; red = 0.08; }
  else if (sellPrice > 5000)  { green = 0.15; red = 0.10; }
  if (rate >= green) return 'text-green-600';
  if (rate >= red)   return 'text-orange-500';
  return 'text-red-500';
}

function marginBg(rate: number, sellPrice: number): string {
  return marginColor(rate, sellPrice)
    .replace('text-', 'bg-')
    .replace('-600', '-500')
    .replace('-500', '-500');
}

export default function ResultsPanel({
  result, view, onViewChange, advisedPrice, nego, rounding, market, daysPlanned, feesBreakdown,
}: Props) {
  const profit = view === 'HT' ? result.profitHt
    : view === 'TTC' ? result.profitTtc
    : result.profitPrudent;

  // Prix affiché avec arrondi
  const displayPrice = rounding === '90'
    ? roundTo90(advisedPrice + nego)
    : rounding === 'centaine'
      ? Math.ceil((advisedPrice + nego) / 100) * 100
      : Math.round(advisedPrice + nego);

  const floorPrice = result.breakEvenPrice;
  const gainPerDay = daysPlanned > 0 ? result.profitHt / daysPlanned : 0;
  const rateColor  = marginColor(result.marginRate, result.sellPrice);

  // Verdict vs marché
  const marketGap = market ? market - advisedPrice : null;

  return (
    <div className="space-y-4">

      {/* Sélecteur de vue */}
      <div className="flex justify-center gap-1 bg-slate-100 rounded-lg p-1">
        {(['HT', 'TTC', 'Prudent'] as ProfitView[]).map(v => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={[
              'flex-1 py-1 rounded-md text-sm font-medium transition-colors',
              view === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500',
            ].join(' ')}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Prix conseillé — hero */}
      <div className="bg-blue-600 rounded-xl p-4 text-white text-center">
        <p className="text-xs opacity-75 mb-1">Prix à afficher</p>
        <p className="text-4xl font-bold tracking-tight">{eur(displayPrice)}</p>
        {nego > 0 && (
          <p className="text-xs opacity-75 mt-1">
            Plancher négociation : {eur(displayPrice - nego)}
          </p>
        )}
      </div>

      {/* Bénéfice + taux */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Bénéfice {view}</p>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {eur(profit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400 mb-1">Taux de marge</p>
          <p className={`text-2xl font-bold ${rateColor}`}>{pct(result.marginRate)}</p>
        </div>
      </div>

      {/* Jauge de marge */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>0 %</span><span>10 %</span><span>20 %</span><span>30 %</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${marginBg(result.marginRate, result.sellPrice)}`}
            style={{ width: `${Math.min(100, result.marginRate * 100 / 0.30 * 100)}%` }}
          />
        </div>
      </div>

      {/* TVA bloc */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">TVA de l'affaire</h3>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Collectée (vente)</span>
            <span className="font-medium">{eur(result.tvaSell)}</span>
          </div>
          {result.tvaAutoliquidee > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Autoliquidée (achat UE)</span>
              <span className="font-medium text-slate-400">{eur(result.tvaAutoliquidee)} ±</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Déductible (frais)</span>
            <span className="font-medium text-green-600">−{eur(result.tvaDeductible)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold">
            <span>Nette à reverser</span>
            <span className={result.tvaNet >= 0 ? 'text-orange-500' : 'text-green-600'}>
              {eur(result.tvaNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Décomposition ligne par ligne */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Décomposition</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Prix de vente TTC</span>
            <span className="font-medium">{eur(result.sellPrice)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>− TVA collectée</span>
            <span>−{eur(result.tvaSell)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>− Prix d'achat{result.auctionBordereauHt > 0 ? ' + frais bordereau' : ''}</span>
            <span>−{eur(result.effectiveBuyHt)}</span>
          </div>
          {feesBreakdown.filter(f => f.htCounted > 0).map(f => (
            <div key={f.label} className="flex justify-between text-slate-400">
              <span>− {f.label}</span>
              <span>−{eur(f.htCounted)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold">
            <span>= Bénéfice HT</span>
            <span className={result.profitHt >= 0 ? 'text-green-600' : 'text-red-500'}>
              {eur(result.profitHt)}
            </span>
          </div>
        </div>
      </div>

      {/* Indicateurs supplémentaires */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400">Prix plancher (zéro marge)</p>
          <p className="text-base font-semibold text-slate-700 mt-1">{eur(floorPrice)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <p className="text-xs text-slate-400">Gain par jour ({daysPlanned}j)</p>
          <p className={`text-base font-semibold mt-1 ${gainPerDay >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {eur(gainPerDay)}/j
          </p>
        </div>
      </div>

      {/* Verdict vs marché */}
      {marketGap !== null && (
        <div className={`rounded-xl p-4 border ${
          marketGap > 500 ? 'bg-green-50 border-green-200' :
          marketGap < -200 ? 'bg-red-50 border-red-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <p className="text-sm font-semibold mb-1">
            {marketGap > 500 ? '✅ Bonne affaire' :
             marketGap < -200 ? '⚠️ Au-dessus du marché' :
             '〰️ Dans le marché'}
          </p>
          <p className="text-xs text-slate-600">
            {marketGap > 0
              ? `${eur(marketGap)} sous la moyenne marché (${eur(market!)})`
              : `${eur(-marketGap)} au-dessus de la moyenne marché (${eur(market!)})`}
          </p>
        </div>
      )}

    </div>
  );
}
