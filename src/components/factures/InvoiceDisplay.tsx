'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { fromCents } from '@/lib/calculations';
import { toPDF } from '@/lib/factures/pdf';

type InvoiceType = 'marge' | 'vtva' | 'tva' | 'bon';

const TYPE_LABELS: Record<InvoiceType, string> = {
  marge: 'TVA Marge',
  vtva:  'TVA Normale',
  tva:   'Prestation',
  bon:   'Bon de commande',
};

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(fromCents(cts));
}

interface Props {
  invoice: any;
  car?: any;
  contact?: any;
  settings: any;
}

export default function InvoiceDisplay({ invoice, car, contact, settings }: Props) {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  async function handlePrint() {
    if (!printRef.current) return;
    await toPDF(invoice, car, contact, settings);
  }

  const totalHt = invoice.type === 'marge'
    ? fromCents(invoice.total_cts ?? 0)
    : Math.round(fromCents(invoice.total_cts ?? 0) / 1.2 * 100) / 100;
  const totalTva = invoice.type === 'marge'
    ? 0
    : Math.round((fromCents(invoice.total_cts ?? 0) - totalHt) * 100) / 100;
  const totalTtc = fromCents(invoice.total_cts ?? 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">{invoice.num}</h1>
            <p className="text-xs text-slate-400">
              {new Date(invoice.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.back()}
              className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2">← Retour</button>
            <button onClick={handlePrint}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              📄 Télécharger PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Aperçu facture */}
        <div ref={printRef} className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">

          {/* En-tête */}
          <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-400 mb-1">VENDEUR</p>
              <p className="font-semibold text-slate-800">{settings.company || 'MEM AUTOMOTIVE'}</p>
              {settings.siret && <p className="text-xs text-slate-500">SIRET: {settings.siret}</p>}
              {settings.address && <p className="text-xs text-slate-500">{settings.address}</p>}
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 font-mono">{invoice.num}</p>
              <p className="text-xs text-slate-400 mt-1">{TYPE_LABELS[invoice.type as InvoiceType]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 mb-1">DATES</p>
              <p className="font-semibold text-slate-800">
                {new Date(invoice.date).toLocaleDateString('fr-FR')}
              </p>
              {invoice.due_date && (
                <p className="text-xs text-slate-500 mt-1">
                  Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs text-slate-400 mb-2">FACTURÉ À</p>
              <p className="font-semibold text-slate-800">{invoice.client_name || 'Client'}</p>
              {invoice.client_address && <p className="text-sm text-slate-600">{invoice.client_address}</p>}
              {invoice.client_siren && <p className="text-xs text-slate-500">SIRET: {invoice.client_siren}</p>}
            </div>
            {car && (
              <div>
                <p className="text-xs text-slate-400 mb-2">VÉHICULE</p>
                <p className="font-semibold text-slate-800">{car.name}</p>
                {car.plate && <p className="text-sm text-slate-600">{car.plate}</p>}
              </div>
            )}
          </div>

          {/* Lignes */}
          <div className="mb-8">
            <table className="w-full text-sm mb-4">
              <thead className="border-b border-slate-300">
                <tr>
                  <th className="text-left py-2 text-slate-700 font-semibold">Description</th>
                  <th className="text-center py-2 text-slate-700 font-semibold w-16">Qty</th>
                  <th className="text-right py-2 text-slate-700 font-semibold w-24">Prix unit.</th>
                  <th className="text-right py-2 text-slate-700 font-semibold w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.lines || []).map((line: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 text-slate-700">{line.label}</td>
                    <td className="text-center py-3 text-slate-700">{line.qty}</td>
                    <td className="text-right py-3 text-slate-700">{eur(Math.round(line.price * 100))}</td>
                    <td className="text-right py-3 font-semibold text-slate-800">
                      {eur(Math.round(line.qty * line.price * 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-1">
              {invoice.type !== 'marge' && (
                <>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">Sous-total HT</span>
                    <span className="text-slate-800">{eur(Math.round(totalHt * 100))}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-600">TVA 20 %</span>
                    <span className="text-slate-800">{eur(Math.round(totalTva * 100))}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg font-bold">
                <span>Total TTC</span>
                <span className="text-lg text-blue-600">{eur(Math.round(totalTtc * 100))}</span>
              </div>
              {invoice.deposit_cts > 0 && (
                <div className="flex justify-between py-1 text-slate-600 text-sm">
                  <span>Acompte versé</span>
                  <span>−{eur(invoice.deposit_cts)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Mode de paiement */}
          <div className="mb-8 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">MODE DE PAIEMENT</p>
            <p className="text-sm text-slate-700 capitalize">
              {(() => {
                const methods: Record<string, string> = {
                  virement: 'Virement bancaire',
                  cheque_de_banque: 'Chèque de banque',
                  especes: 'Espèces',
                  carte_bancaire: 'Carte bancaire',
                };
                return methods[invoice.pay_method as string] || invoice.pay_method;
              })()}
            </p>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold mb-1">NOTES</p>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Mentions légales */}
          <div className="text-xs text-slate-400 border-t border-slate-100 pt-4 space-y-1">
            {invoice.type === 'marge' && (
              <p>TVA non apparente — Régime particulier des biens d'occasion (TVA calculée sur la marge)</p>
            )}
            {invoice.type === 'vtva' && (
              <p>TVA normale — Autoliquidation de la TVA pour achats intra-communautaires</p>
            )}
            <p>Facture émise le {new Date(invoice.locked_at).toLocaleDateString('fr-FR')}</p>
            {invoice.paid && (
              <p className="text-green-600">✓ Facture réglée le {new Date(invoice.paid_date).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
