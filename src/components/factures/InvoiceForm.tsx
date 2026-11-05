'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toCents, fromCents } from '@/lib/calculations';

type InvoiceType = 'marge' | 'vtva' | 'tva' | 'bon';

const TYPE_OPTIONS = [
  { value: 'marge', label: 'Facture TVA sur marge',         desc: 'Véhicule acheté sans TVA récupérable' },
  { value: 'vtva',  label: 'Facture TVA normale',           desc: 'Véhicule acheté avec TVA (régime normal)' },
  { value: 'tva',   label: 'Facture de prestation',         desc: 'Service, transport, etc.' },
  { value: 'bon',   label: 'Bon de commande',               desc: 'Engagement d\'achat' },
];

interface Props {
  cars: any[];
  contacts: any[];
  settings: any;
  onClose: () => void;
  onSaved: (inv: any) => void;
}

interface Line { label: string; qty: string; price: string; }

function uid() { return `inv_${Date.now()}`; }

export default function InvoiceForm({ cars, contacts, settings, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [type,       setType]       = useState<InvoiceType>('marge');
  const [carId,      setCarId]      = useState('');
  const [clientId,   setClientId]   = useState('');
  const [clientName, setClientName] = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [dueDate,    setDueDate]    = useState('');
  const [payMethod,  setPayMethod]  = useState('virement');
  const [lines,      setLines]      = useState<Line[]>([{ label: '', qty: '1', price: '' }]);
  const [deposit,    setDeposit]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  // Remplissage auto depuis la voiture
  function handleCarChange(id: string) {
    setCarId(id);
    const car = cars.find(c => c.id === id);
    if (!car) return;
    if (car.buyer_id) setClientId(car.buyer_id);
    // Pré-remplir la ligne de vente
    if (car.sell_price_cts) {
      setLines([{ label: car.name, qty: '1', price: fromCents(car.sell_price_cts).toFixed(2) }]);
    } else {
      setLines([{ label: car.name, qty: '1', price: '' }]);
    }
    // Aligner le type sur le régime
    if (car.regime === 'normal') setType('vtva');
    else setType('marge');
  }

  function handleClientChange(id: string) {
    setClientId(id);
    const c = contacts.find(x => x.id === id);
    if (c) setClientName(c.name);
  }

  // Calcul totaux
  const linesCalc = lines.map(l => {
    const qty   = parseFloat(l.qty)   || 0;
    const price = parseFloat(l.price) || 0;
    return { ...l, total: qty * price };
  });
  const subtotal  = linesCalc.reduce((s, l) => s + l.total, 0);
  const tvaAmount = type === 'marge' ? 0 : Math.round(subtotal * 20 / 120 * 100) / 100;
  const totalHt   = type === 'marge' ? subtotal : Math.round(subtotal / 1.2 * 100) / 100;
  const totalTtc  = subtotal;

  function addLine() { setLines(prev => [...prev, { label: '', qty: '1', price: '' }]); }
  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof Line, value: string) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSave(emit = false) {
    if (!lines.some(l => l.label && l.price)) return;
    setSaving(true);

    const isBon  = type === 'bon';
    const prefix = isBon ? 'BC' : 'F';
    const year   = new Date().getFullYear();
    const nextKey = isBon ? 'order_next' : 'invoice_next';
    const next   = (settings[nextKey] ?? 1);
    const num    = `${prefix}-${year}-${String(next).padStart(3, '0')}`;
    const id     = uid();
    const now    = new Date().toISOString();

    const client = contacts.find(c => c.id === clientId);
    const row = {
      id,
      num,
      type,
      date,
      car_id:          carId || null,
      client_id:       clientId || null,
      client_name:     clientName || client?.name || null,
      client_address:  client?.address || null,
      client_siren:    client?.siren || null,
      due_date:        dueDate || null,
      pay_method:      payMethod,
      lines:           linesCalc.map(l => ({ label: l.label, qty: parseFloat(l.qty) || 1, price: parseFloat(l.price) || 0 })),
      deposit_cts:     deposit ? toCents(parseFloat(deposit)) : 0,
      notes:           notes || null,
      paid:            false,
      total_cts:       toCents(totalTtc),
      locked_at:       emit ? now : null,
      created_at:      now,
    };

    await supabase.from('invoices').upsert(row);
    // Incrémenter le compteur
    await supabase.from('settings').update({ [nextKey]: next + 1 }).eq('id', 'main');

    setSaving(false);
    onSaved(row);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-800">Nouvelle facture</h2>
          <button onClick={onClose} className="text-slate-400 p-1">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(t => (
                <button key={t.value} onClick={() => setType(t.value as InvoiceType)}
                  className={['rounded-xl p-3 text-left border-2 transition-colors',
                    type === t.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200'].join(' ')}>
                  <p className={`text-sm font-medium ${type === t.value ? 'text-blue-700' : 'text-slate-700'}`}>{t.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Voiture + Client */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Voiture</label>
              <select value={carId} onChange={e => handleCarChange(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Aucune</option>
                {cars.map(c => <option key={c.id} value={c.id}>{c.name} {c.plate ? `(${c.plate})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Client</label>
              {contacts.length > 0 ? (
                <select value={clientId} onChange={e => handleClientChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">Choisir…</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="Nom du client"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              )}
            </div>
          </div>

          {/* Date + Échéance */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Échéance</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          {/* Lignes */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Lignes</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="text" value={line.label} onChange={e => updateLine(i, 'label', e.target.value)}
                    placeholder="Description"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <input type="number" value={line.qty} onChange={e => updateLine(i, 'qty', e.target.value)}
                    className="w-14 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <input type="number" value={line.price} onChange={e => updateLine(i, 'price', e.target.value)}
                    placeholder="Prix"
                    className="w-24 border border-slate-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(i)} className="text-slate-300 hover:text-red-400 p-1">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addLine} className="mt-2 text-xs text-blue-500 hover:underline">+ Ligne</button>
          </div>

          {/* Totaux */}
          {subtotal > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
              {type !== 'marge' && (
                <>
                  <div className="flex justify-between text-slate-600"><span>Sous-total HT</span><span>{totalHt.toFixed(2)} €</span></div>
                  <div className="flex justify-between text-slate-600"><span>TVA 20 %</span><span>{tvaAmount.toFixed(2)} €</span></div>
                </>
              )}
              <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
                <span>Total TTC</span><span>{totalTtc.toFixed(2)} €</span>
              </div>
              {type === 'marge' && (
                <p className="text-xs text-slate-400 mt-1">TVA non apparente — Régime particulier biens d'occasion</p>
              )}
            </div>
          )}

          {/* Paiement + Acompte */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Mode de paiement</label>
              <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="virement">Virement</option>
                <option value="cheque_de_banque">Chèque de banque</option>
                <option value="especes">Espèces</option>
                <option value="carte_bancaire">Carte bancaire</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Acompte versé €</label>
              <input type="number" min="0" value={deposit} onChange={e => setDeposit(e.target.value)}
                placeholder="0"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex-1 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 disabled:opacity-50">
              Brouillon
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'En cours…' : 'Émettre'}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Émettre = numérotation définitive + verrouillage (non modifiable)
          </p>
        </div>
      </div>
    </div>
  );
}
