'use client';

import { PAPERS, Papers, PaperKey } from '@/types';

interface Props {
  papers: Papers;
  onChange?: (key: PaperKey, value: boolean) => void;
  readonly?: boolean;
  compact?: boolean;
}

export default function PaperChecklist({ papers, onChange, readonly = false, compact = false }: Props) {
  const done  = PAPERS.filter(p => papers[p.key]).length;
  const total = PAPERS.length; // 6

  return (
    <div>
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Papiers</span>
          <span className={[
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            done === total ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
          ].join(' ')}>
            {done} / {total}
          </span>
        </div>
      )}
      <div className={compact ? 'flex flex-wrap gap-1' : 'grid grid-cols-2 gap-2'}>
        {PAPERS.map(p => {
          const checked = !!papers[p.key];
          return (
            <button
              key={p.key}
              onClick={() => !readonly && onChange?.(p.key, !checked)}
              disabled={readonly}
              className={[
                'flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-all',
                compact ? '' : 'w-full',
                checked
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200',
                !readonly ? 'hover:opacity-80 cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              <span className={[
                'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                checked ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white',
              ].join(' ')}>
                {checked && (
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
