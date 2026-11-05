'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toCents } from '@/lib/calculations';

const KINDS = [
  { key: 'retrait', label: 'Retrait',  desc: 'Banque → Caisse',  icon: '↓' },
  { key: 'depot',   label: 'Dépôt',   desc: 'Caisse → Banque',  icon: '↑' },
  { key: 'entree',  label: 'Entrée',   desc: 'Entrée espèces',   icon: '+' },
  { key: 'sortie',  label: 'Sortie',   desc: 'Sortie espèces',   icon: '−' },
];

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

export default function MouvementModal({ onClose, onSaved }: Props) {
  const supabase = createClient();
  const [kind,      setKind]      = useState('retrait');
  const [amountStr, setAmountStr] = useState('');
  const [label,     setLabel]     = useState('');
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    const amount = parseFloat(amountStr);
    if (!amount) return;
    setSaving(true);
    await supabase.from('moves').insert({
      id: `mov_${Date.now()}`,
      kind,
      amount_cts: toCents(amount),
      date,
      label: label || null,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Mouvement d'espèces</h2>
          <button onClick={onClose} className="text-slate-400 p-1">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map(k => (
              <button key={k.key} onClick={() => setKind(k.key)}
                className={['rounded-xl p-3 text-left border-2 transition-colors',
                  kind === k.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200'].join(' ')}>
                <span className={`text-lg font-bold ${kind === k.key ? 'text-blue-600' : 'text-slate-400'}`}>{k.icon}</span>
                <p className="text-sm font-medium text-slate-800 mt-1">{k.label}</p>
                <p className="text-xs text-slate-400">{k.desc}</p>
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Montant (€)</label>
            <input type="number" min="0" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Libellé</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Optionnel"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !amountStr}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
