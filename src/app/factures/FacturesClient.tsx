'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { fromCents } from '@/lib/calculations';
import InvoiceForm from '@/components/factures/InvoiceForm';

type InvoiceType = 'marge' | 'vtva' | 'tva' | 'bon';

const TYPE_LABELS: Record<InvoiceType, string> = {
  marge: 'TVA Marge',
  vtva:  'TVA Normale',
  tva:   'Prestation',
  bon:   'Bon de commande',
};

const TYPE_COLORS: Record<InvoiceType, string> = {
  marge: 'bg-orange-100 text-orange-700',
  vtva:  'bg-blue-100 text-blue-700',
  tva:   'bg-purple-100 text-purple-700',
  bon:   'bg-slate-100 text-slate-700',
};

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

interface Props {
  invoices: any[];
  cars: any[];
  contacts: any[];
  settings: any;
}

export default function FacturesClient({ invoices: initInvoices, cars, contacts, settings }: Props) {
  const router    = useRouter();
  const supabase  = createClient();
  const [invoices,   setInvoices]   = useState(initInvoices);
  const [showForm,   setShowForm]   = useState(false);
  const [filter,     setFilter]     = useState<'all' | 'unpaid' | 'paid' | 'draft'>('all');
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'all'>('all');

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      if (filter === 'unpaid' && (inv.paid || inv.type === 'bon' || !inv.locked_at)) return false;
      if (filter === 'paid'   && !inv.paid) return false;
      if (filter === 'draft'  && inv.locked_at) return false;
      if (typeFilter !== 'all' && inv.type !== typeFilter) return false;
      return true;
    });
  }, [invoices, filter, typeFilter]);

  const totalUnpaid = invoices
    .filter(i => i.type !== 'bon' && i.locked_at && !i.paid)
    .reduce((s, i) => s + (i.total_cts ?? 0), 0);

  async function markPaid(id: string) {
    const now = new Date();
    await supabase.from('invoices').update({
      paid: true,
      paid_date: now.toISOString().slice(0, 10),
      paid_at:   now.toISOString(),
    }).eq('id', id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, paid: true, paid_date: now.toISOString().slice(0, 10) } : i));
  }

  async function lockInvoice(id: string) {
    const now = new Date().toISOString();
    await supabase.from('invoices').update({ locked_at: now }).eq('id', id);
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, locked_at: now } : i));
  }

  function handleSaved(newInv: any) {
    setInvoices(prev => [newInv, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Factures</h1>
            {totalUnpaid > 0 && (
              <p className="text-xs text-orange-500 font-medium">
                {eur(totalUnpaid)} non encaissé
              </p>
            )}
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
            + Nouvelle
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'draft', 'unpaid', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={['flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filter === f ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 border border-slate-200'].join(' ')}>
              {{ all: 'Toutes', draft: 'Brouillons', unpaid: 'Non payées', paid: 'Payées' }[f]}
            </button>
          ))}
          <div className="w-px bg-slate-200 flex-shrink-0" />
          {(['all', 'marge', 'vtva', 'tva', 'bon'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={['flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                typeFilter === t ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'].join(' ')}>
              {t === 'all' ? 'Tous types' : TYPE_LABELS[t as InvoiceType]}
            </button>
          ))}
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">🧾</p>
            <p>Aucune facture{filter !== 'all' ? ' dans ce filtre' : ''}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(inv => {
              const isDraft   = !inv.locked_at;
              const isPaid    = inv.paid;
              const isBon     = inv.type === 'bon';
              const car       = cars.find(c => c.id === inv.car_id);
              const client    = contacts.find(c => c.id === inv.client_id);
              const clientName = inv.client_name || client?.name || 'Client inconnu';

              return (
                <div key={inv.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Numéro + type */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-semibold text-slate-800">{inv.num}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[inv.type as InvoiceType]}`}>
                          {TYPE_LABELS[inv.type as InvoiceType]}
                        </span>
                        {isDraft && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Brouillon</span>
                        )}
                        {!isBon && !isDraft && isPaid && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Payée</span>
                        )}
                        {!isBon && !isDraft && !isPaid && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">En attente</span>
                        )}
                      </div>

                      {/* Client + voiture */}
                      <p className="text-sm text-slate-700 truncate">{clientName}</p>
                      {car && <p className="text-xs text-slate-400">{car.name}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(inv.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Montant + actions */}
                    <div className="text-right flex-shrink-0">
                      {inv.total_cts != null && (
                        <p className="text-lg font-bold text-slate-800">{eur(inv.total_cts)}</p>
                      )}
                      <div className="flex flex-col gap-1 mt-2">
                        {/* Voir / Imprimer */}
                        <button
                          onClick={() => router.push(`/factures/${inv.id}`)}
                          className="text-xs text-blue-600 hover:underline">
                          Voir / Imprimer
                        </button>

                        {/* Émettre (verrouiller) */}
                        {isDraft && (
                          <button onClick={() => lockInvoice(inv.id)}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700">
                            Émettre
                          </button>
                        )}

                        {/* Marquer payée */}
                        {!isBon && !isDraft && !isPaid && (
                          <button onClick={() => markPaid(inv.id)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded-md hover:bg-green-700">
                            ✓ Payée
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal création */}
      {showForm && (
        <InvoiceForm
          cars={cars}
          contacts={contacts}
          settings={settings}
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
