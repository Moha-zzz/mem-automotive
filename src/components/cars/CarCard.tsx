'use client';

import { Car, PAPERS } from '@/types';
import { fromCents } from '@/lib/calculations';
import { STAGES } from './StageBar';

interface Props {
  car: Car;
  onClick?: () => void;
}

function daysInStock(car: Car): number | null {
  const inStock = ['achete', 'preparation', 'vente', 'reserve'];
  if (!inStock.includes(car.stage)) return null;
  const start = car.boughtAt ?? car.buyDate;
  if (!start) return null;
  return Math.floor((Date.now() - new Date(start).getTime()) / 86_400_000);
}

function fmt(cts: number | null | undefined): string {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

export default function CarCard({ car, onClick }: Props) {
  const stageInfo = STAGES.find(s => s.key === car.stage);
  const papsDone  = PAPERS.filter(p => car.papers[p.key]).length;
  const days      = daysInStock(car);
  const photo     = car.photos?.[0];
  const buy       = car.buyPriceCts ? fromCents(car.buyPriceCts) : null;
  const ask       = car.askPriceCts ? fromCents(car.askPriceCts) : null;
  const sold      = car.sellPriceCts ? fromCents(car.sellPriceCts) : null;

  // Alerte stock > 45 jours
  const alertStock = days !== null && days > 45;

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all text-left w-full overflow-hidden group"
    >
      {/* Photo */}
      <div className="h-32 bg-slate-100 relative overflow-hidden">
        {photo ? (
          <img
            src={`/_blob/${photo.id}`}
            alt={car.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M19 20H5a2 2 0 01-2-2V9l4-5h10l4 5v9a2 2 0 01-2 2zM9 20v-5h6v5" />
            </svg>
          </div>
        )}
        {/* Badge étape */}
        <span className={`absolute top-2 left-2 text-white text-xs font-semibold px-2 py-0.5 rounded-full ${stageInfo?.color ?? 'bg-slate-400'}`}>
          {stageInfo?.label ?? car.stage}
        </span>
        {/* Alerte */}
        {alertStock && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
            {days}j
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="p-3 space-y-2">
        {/* Nom + plaque */}
        <div>
          <div className="font-semibold text-slate-800 truncate">{car.name}</div>
          {car.plate && (
            <div className="text-xs text-slate-400 font-mono tracking-wide">{car.plate}</div>
          )}
        </div>

        {/* Prix */}
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Achat</span>
          <span className="font-medium">{buy ? fmt(car.buyPriceCts) : '—'}</span>
        </div>
        {(ask || sold) && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{sold ? 'Vendu' : 'Affiché'}</span>
            <span className="font-medium text-emerald-600">
              {sold ? fmt(car.sellPriceCts) : fmt(car.askPriceCts)}
            </span>
          </div>
        )}

        {/* Bas de carte : papiers + jours */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-50">
          <span className={`text-xs font-medium ${papsDone === 6 ? 'text-green-600' : 'text-slate-400'}`}>
            Papiers {papsDone}/6
          </span>
          {days !== null && (
            <span className={`text-xs ${alertStock ? 'text-orange-500 font-semibold' : 'text-slate-400'}`}>
              {days} j en stock
            </span>
          )}
          {car.stage === 'vendu' && (
            <span className="text-xs text-green-600 font-semibold">✓ Vendu</span>
          )}
        </div>
      </div>
    </button>
  );
}
