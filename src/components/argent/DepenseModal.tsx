'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toCents } from '@/lib/calculations';

const TAUX = [
  { label: '20 %', value: 0.20 },
  { label: '10 %', value: 0.10 },
  { label: '5,5 %', value: 0.055 },
  { label: '0 %',  value: 0 },
];

// Catégories spec §9.7
const CATS_VOITURE = [
  'Carburant', 'Trajet (péages, billets)', 'Plaques', "Déclaration d'achat",
  'Contrôle technique', 'Pièces', 'Mécanique', 'Carrosserie', 'COC',
  'Carte grise', "Frais d'enchères", 'Leboncoin', 'Frais annexes',
];
const CATS_SOCIETE = [
  'URSSAF', 'Abonnement Leboncoin', 'Assurance', 'Assurance flotte',
  'Comptable', 'Téléphone', 'Banque', 'Logiciel', 'Local / parking',
  'Fournitures', 'Impôts et taxes', 'Acompte perdu',
];

interface Props {
  cars: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}

function uid() { return `exp_${Date.now()}`; }

export default function DepenseModal({ cars, onClose, onSaved }: Props) {
  const supabase = createClient();

  const [carId,     setCarId]     = useState('');
  const [cat,       setCat]       = useState('');
  const [label,     setLabel]     = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [inputMode, setInputMode] = useState<'ttc' | 'ht'>('ttc');
  const [tauxIdx,   setTauxIdx]   = useState(0); // index dans TAUX
  const [pay,       setPay]       = useState<'banque' | 'especes'>('banque');
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [saving,    setSaving]    = useState(false);

  const taux = TAUX[tauxIdx].value;
  const amount = parseFloat(amountStr) || 0;

  // Calcul HT / TVA / TTC
  let ttc = 0, ht = 0, tvaAmt = 0;
  if (inputMode === 'ttc') {
    ttc    = amount;
    tvaAmt = taux === 0 ? 0 : Math.round((amount - amount / (1 + taux)) * 100) / 100;
    ht     = Math.round((amount / (1 + taux)) * 100) / 100;
  } else {
    ht     = amount;
    tvaAmt = Math.round(amount * taux * 100) / 100;
    ttc    = Math.round((amount * (1 + taux)) * 100) / 100;
  }

  // TVA 0 % forcée pour certaines catégories
  const forceZeroTax = ['Carte grise', 'Acompte perdu', 'Impôts et taxes'].includes(cat);

  async function handleSave() {
    if (!cat || !amount) return;
    setSaving(true);
    const finalTaux  = forceZeroTax ? 0 : taux;
    const finalTva   = forceZeroTax ? 0 : tvaAmt;
    const finalTtc   = forceZeroTax ? amount : ttc;
    await supabase.from('expenses').upsert({
      id:         uid(),
      date,
      car_id:     carId || null,
      cat,
      label:      label || null,
      ttc_cts:    toCents(finalTtc),
      tva_cts:    toCents(finalTva),
      pay,
      created_at: new Date().toISOString(),
    });
    setSaving(false);
    onSaved();
  }

  const cats = carId ? CATS_VOITURE : [...CATS_VOITURE, ...CATS_SOCIETE];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Nouvelle dépense</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Voiture liée */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Voiture liée (optionnel)</label>
            <select value={carId} onChange={e => setCarId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
              <option value="">Frais de la société</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Catégorie + libellé */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Catégorie *</label>
              <select value={cat} onChange={e => setCat(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Choisir…</option>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Libellé</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)}
                placeholder="Optionnel"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          {/* Montant + TVA */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Montant</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(['ttc', 'ht'] as const).map(m => (
                  <button key={m} onClick={() => setInputMode(m)}
                    className={['px-3 py-2 text-sm font-medium transition-colors',
                      inputMode === m ? 'bg-blue-600 text-white' : 'text-slate-600'].join(' ')}>
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <input type="number" min="0" step="0.01" value={amountStr} onChange={e => setAmountStr(e.target.value)}
                placeholder="0,00"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <select value={tauxIdx} onChange={e => setTauxIdx(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none" disabled={forceZeroTax}>
                {TAUX.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
              </select>
            </div>
            {amount > 0 && !forceZeroTax && (
              <div className="mt-1 text-xs text-slate-400 flex gap-3">
                <span>HT : {ht.toFixed(2)} €</span>
                <span>TVA : {tvaAmt.toFixed(2)} €</span>
                <span>TTC : {ttc.toFixed(2)} €</span>
              </div>
            )}
            {forceZeroTax && <p className="text-xs text-slate-400 mt-1">TVA 0 % automatique</p>}
          </div>

          {/* Paiement + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Payé par</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {(['banque', 'especes'] as const).map(p => (
                  <button key={p} onClick={() => setPay(p)}
                    className={['flex-1 py-2 text-sm font-medium transition-colors',
                      pay === p ? 'bg-blue-600 text-white' : 'text-slate-600'].join(' ')}>
                    {p === 'banque' ? '🏦 Banque' : '💵 Espèces'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || !cat || !amount}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Enregistrement…' : 'Enregistrer la dépense'}
          </button>
        </div>
      </div>
    </div>
  );
}
