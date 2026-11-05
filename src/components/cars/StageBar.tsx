'use client';

import { Stage } from '@/types';

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'repere',      label: 'Repéré',      color: 'bg-slate-400' },
  { key: 'contacte',   label: 'Contacté',    color: 'bg-blue-400' },
  { key: 'negociation',label: 'Négo',        color: 'bg-yellow-400' },
  { key: 'chercher',   label: 'À chercher',  color: 'bg-orange-400' },
  { key: 'achete',     label: 'Acheté',      color: 'bg-purple-500' },
  { key: 'preparation',label: 'Prépa',       color: 'bg-indigo-500' },
  { key: 'vente',      label: 'En vente',    color: 'bg-emerald-500' },
  { key: 'reserve',    label: 'Réservé',     color: 'bg-teal-500' },
  { key: 'vendu',      label: 'Vendu',       color: 'bg-green-600' },
  { key: 'abandonne',  label: 'Abandonné',   color: 'bg-red-400' },
];

interface Props {
  current: Stage;
  onChange?: (stage: Stage) => void;
  readonly?: boolean;
}

export default function StageBar({ current, onChange, readonly = false }: Props) {
  const idx = STAGES.findIndex(s => s.key === current);

  return (
    <div className="flex gap-1 flex-wrap">
      {STAGES.map((s, i) => {
        const isActive  = s.key === current;
        const isPast    = i < idx;
        return (
          <button
            key={s.key}
            onClick={() => !readonly && onChange?.(s.key)}
            disabled={readonly}
            className={[
              'px-2 py-0.5 rounded text-xs font-medium transition-all',
              isActive  ? `${s.color} text-white shadow-sm scale-105` :
              isPast    ? 'bg-slate-200 text-slate-500' :
                          'bg-slate-100 text-slate-400',
              !readonly ? 'hover:opacity-80 cursor-pointer' : 'cursor-default',
            ].join(' ')}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

export { STAGES };
