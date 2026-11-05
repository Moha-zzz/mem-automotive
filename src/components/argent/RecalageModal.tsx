'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toCents } from '@/lib/calculations';

interface Props {
  account: 'banque' | 'especes';
  currentBalance: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function RecalageModal({ account, currentBalance, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [soldeStr, setSoldeStr] = useState(currentBalance.toFixed(2));
  const [date,     setDate]     = useState(new Date().toISOString().slice(0, 10));
  const [saving,   setSaving]   = useState(false);

  const isBanque = account === 'banque';

  async function handleSave() {
    const solde = parseFloat(soldeStr);
    if (isNaN(solde)) return;
    setSaving(true);
    const now = new Date().toISOString();
    const patch = isBanque
      ? { solde_cts: toCents(solde), solde_date: date, solde_at: now }
      : { cash_solde_cts: toCents(solde), cash_date: date, cash_solde_at: now };
    await supabase.from('settings').update(patch).eq('id', 'main');
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            Recaler le solde {isBanque ? 'bancaire' : 'espèces'}
          </h2>
          <button onClick={onClose} className="text-slate-400 p-1">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-slate-500">
            Saisis le solde réel constaté (relevé bancaire ou comptage espèces).
            Les mouvements suivants seront calculés depuis ce montant.
          </p>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Solde réel (€)</label>
            <input type="number" step="0.01" value={soldeStr} onChange={e => setSoldeStr(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date du recalage</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Enregistrement…' : 'Recaler le solde'}
          </button>
        </div>
      </div>
    </div>
  );
}
