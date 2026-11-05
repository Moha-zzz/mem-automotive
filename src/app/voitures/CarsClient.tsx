'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Car, Stage } from '@/types';
import CarCard from '@/components/cars/CarCard';
import { STAGES } from '@/components/cars/StageBar';

const FILTER_STAGES: { key: Stage | 'all' | 'stock'; label: string }[] = [
  { key: 'all',         label: 'Toutes' },
  { key: 'stock',       label: 'En stock' },
  { key: 'repere',      label: 'Repérées' },
  { key: 'achete',      label: 'Achetées' },
  { key: 'preparation', label: 'En prépa' },
  { key: 'vente',       label: 'En vente' },
  { key: 'vendu',       label: 'Vendues' },
];

const STOCK_STAGES: Stage[] = ['achete', 'preparation', 'vente', 'reserve'];

interface Props {
  initialCars: Car[];
}

export default function CarsClient({ initialCars }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<Stage | 'all' | 'stock'>('stock');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let cars = initialCars;
    if (filter === 'stock') {
      cars = cars.filter(c => STOCK_STAGES.includes(c.stage));
    } else if (filter !== 'all') {
      cars = cars.filter(c => c.stage === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      cars = cars.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.plate?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q) ||
        c.model?.toLowerCase().includes(q)
      );
    }
    return cars;
  }, [initialCars, filter, search]);

  const stockCount = initialCars.filter(c => STOCK_STAGES.includes(c.stage)).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-800">Voitures</h1>
              <p className="text-xs text-slate-400">{stockCount} en stock · {initialCars.length} total</p>
            </div>
            <button
              onClick={() => router.push('/voitures/new')}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Voiture
            </button>
          </div>

          {/* Recherche */}
          <input
            type="search"
            placeholder="Rechercher (nom, plaque, marque…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 mb-3"
          />

          {/* Filtres par étape */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {FILTER_STAGES.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={[
                  'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {f.label}
                {f.key === 'stock' && ` (${stockCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grille */}
      <div className="max-w-4xl mx-auto p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-3">🚗</div>
            <p className="font-medium">
              {initialCars.length === 0 ? 'Aucune voiture pour l\'instant' : 'Aucun résultat'}
            </p>
            {initialCars.length === 0 && (
              <p className="text-sm mt-1">Clique sur <strong>+ Voiture</strong> pour commencer.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(car => (
              <CarCard
                key={car.id}
                car={car}
                onClick={() => router.push(`/voitures/${car.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
