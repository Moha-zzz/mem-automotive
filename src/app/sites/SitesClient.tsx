'use client';

import { useState, useMemo } from 'react';

interface Props {
  sites: any[];
}

const CATEGORIES = [
  'Annonces',
  'Enchères',
  'Import',
  'Plateforme',
];

export default function SitesClient({ sites }: Props) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return sites;
    return sites.filter(s => s.category === filter);
  }, [sites, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filtered.forEach(site => {
      const cat = site.category || 'Autre';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(site);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-bold text-slate-800">📍 Sites d'achat</h1>
          <p className="text-xs text-slate-400">{sites.length} sources référencées</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${
              filter === 'all' ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}>
            Tous ({sites.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = sites.filter(s => s.category === cat).length;
            return (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  filter === cat ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                }`}>
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Groupes */}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h2 className="font-semibold text-slate-700 mb-2 text-sm">{category}</h2>
            <div className="grid md:grid-cols-2 gap-2">
              {items.map(site => (
                <a key={site.id} href={site.url} target="_blank" rel="noopener noreferrer"
                  className="bg-white rounded-lg p-3 border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm">{site.name}</p>
                      {site.country && (
                        <p className="text-xs text-slate-400">
                          {site.country === 'NL' ? '🇳🇱 Pays-Bas' :
                           site.country === 'BE' ? '🇧🇪 Belgique' :
                           site.country === 'FR' ? '🇫🇷 France' : site.country}
                        </p>
                      )}
                    </div>
                    <span className="text-lg flex-shrink-0">🔗</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">📍</p>
            <p>Aucun site dans ce filtre</p>
          </div>
        )}
      </div>
    </div>
  );
}
