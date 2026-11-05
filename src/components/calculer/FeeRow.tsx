'use client';

import { FeeMode } from '@/types';

export interface FeeRowState {
  k: string;
  label: string;
  amount: string; // string pour l'input contrôlé
  mode: FeeMode;
  removable?: boolean;
  auctionCase?: 'bordereau' | 'facture_separee';
}

interface Props {
  fee: FeeRowState;
  onChange: (updated: FeeRowState) => void;
  onRemove?: () => void;
}

const MODE_LABELS: Record<FeeMode, string> = {
  TTC:       'TTC',
  HT:        'HT',
  SANS_TVA:  '0 %',
};

export default function FeeRow({ fee, onChange, onRemove }: Props) {
  const isAuction = fee.k === 'auction';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
      {/* Label */}
      <span className="flex-1 text-sm text-slate-600 truncate min-w-0">{fee.label}</span>

      {/* Cas frais enchères */}
      {isAuction && fee.amount && Number(fee.amount) > 0 && (
        <select
          value={fee.auctionCase ?? 'facture_separee'}
          onChange={e => onChange({ ...fee, auctionCase: e.target.value as FeeRowState['auctionCase'] })}
          className="text-xs border border-slate-200 rounded px-1 py-0.5 text-slate-500"
        >
          <option value="facture_separee">Facture séparée</option>
          <option value="bordereau">Bordereau marge</option>
        </select>
      )}

      {/* Mode TVA */}
      <div className="flex rounded border border-slate-200 overflow-hidden text-xs">
        {(['TTC', 'HT', 'SANS_TVA'] as FeeMode[]).map(m => (
          <button
            key={m}
            onClick={() => onChange({ ...fee, mode: m })}
            className={[
              'px-1.5 py-0.5 transition-colors',
              fee.mode === m ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
            ].join(' ')}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Montant */}
      <div className="relative">
        <input
          type="number"
          min="0"
          step="1"
          placeholder="0"
          value={fee.amount}
          onChange={e => onChange({ ...fee, amount: e.target.value })}
          className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs pointer-events-none">€</span>
      </div>

      {/* Supprimer (frais libres) */}
      {onRemove ? (
        <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors p-0.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : (
        <div className="w-5" />
      )}
    </div>
  );
}
