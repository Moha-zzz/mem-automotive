'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { fmtDateLong } from '@/lib/fmt';
import { fromCts } from '@/lib/car-calc';

const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Props { cars: any[]; contacts: any[]; }

export default function PoliceClient({ cars, contacts }: Props) {
  const ctById = (id: string) => contacts.find(c => c.id === id) ?? {};

  const rows = useMemo(() =>
    cars.filter(c => c.buy_date && c.stage !== 'abandon')
      .sort((a, b) => (a.buy_date ?? '').localeCompare(b.buy_date ?? ''))
      .map((c, i) => {
        const seller = ctById(c.seller_id);
        const buyer  = ctById(c.buyer_id);
        return {
          n: i + 1, id: c.id,
          buyDate: fmtDateLong(c.buy_date),
          name: c.name, plate: c.plate ?? '', vin: c.vin ?? '',
          seller: seller.name ?? '', sellerAddr: seller.address ?? '', sellerId: seller.id_doc ?? '',
          buyPrice: c.buy_price_cts ? eur(fromCts(c.buy_price_cts)) : '—',
          buyPay: c.buy_pay ?? '',
          sellDate: c.sell_date ? fmtDateLong(c.sell_date) : '',
          buyer: buyer.name ?? '', buyerAddr: buyer.address ?? '',
          sellPrice: c.sell_price_cts ? eur(fromCts(c.sell_price_cts)) : '',
          sellPay: c.sell_pay ?? '',
        };
      }), [cars, contacts]);

  const exportCSV = () => {
    const headers = ['N°','Date achat','Véhicule','Immat.','VIN','Vendeur','Adresse vendeur','Pièce identité','Prix achat','Paiement','Date vente','Acheteur','Adresse acheteur','Prix vente','Paiement vente'];
    const csvRows = rows.map(r => [r.n,r.buyDate,r.name,r.plate,r.vin,r.seller,r.sellerAddr,r.sellerId,r.buyPrice,r.buyPay,r.sellDate,r.buyer,r.buyerAddr,r.sellPrice,r.sellPay].join(';'));
    const csv = [headers.join(';'), ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `livre_police_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const cols = [
    { key: 'n', label: 'N°', w: 40 },
    { key: 'buyDate', label: 'Date achat', w: 90 },
    { key: 'name', label: 'Véhicule', w: 160 },
    { key: 'plate', label: 'Immat.', w: 90 },
    { key: 'seller', label: 'Acheté à', w: 120 },
    { key: 'sellerId', label: 'Pièce identité', w: 120 },
    { key: 'buyPrice', label: "Prix d'achat", w: 90 },
    { key: 'buyPay', label: 'Paiement', w: 80 },
    { key: 'sellDate', label: 'Date vente', w: 90 },
    { key: 'buyer', label: 'Revendu à', w: 120 },
    { key: 'sellPrice', label: 'Prix vente', w: 90 },
  ];

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Livre de police</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {rows.length} entrée{rows.length > 1 ? 's' : ''} · Registre immuable 🔒
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={exportCSV}><Download size={13} /> CSV</Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          Aucune voiture avec une date d'achat. Le livre de police se remplira automatiquement.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12.5, minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  {cols.map(c => (
                    <th key={c.key} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', minWidth: c.w }}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    {cols.map(c => (
                      <td key={c.key} style={{ padding: '9px 12px', whiteSpace: 'nowrap', maxWidth: c.w, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.key === 'n' ? <span style={{ fontFamily: 'var(--font-barlow-cond)', fontWeight: 700 }}>{(r as any)[c.key]}</span> : (r as any)[c.key] || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        🔒 Registre immuable — les entrées ne peuvent pas être supprimées. Obligation légale dès la 1re voiture.
        Renseigne le vendeur et l'acheteur dans chaque fiche voiture pour compléter les colonnes.
      </p>
    </div>
  );
}
