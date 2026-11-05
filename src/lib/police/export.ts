import { jsPDF } from 'jspdf';
import { fromCents } from '../calculations';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(fromCents(cts));
}

function date(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function exportToPDF(logs: any[], cars: any[], settings: any) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LIVRE DE POLICE - JOURNAL LÉGAL', 15, y);
  y += 8;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${settings.company || 'MEM AUTOMOTIVE'} - SIRET: ${settings.siret || '—'}`, 15, y);
  y += 4;
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 15, y);
  y += 8;

  // Summary
  const buys = logs.filter(l => l.kind === 'achat').reduce((s, l) => s + (l.amount_cts ?? 0), 0);
  const sells = logs.filter(l => l.kind === 'vente').reduce((s, l) => s + (l.amount_cts ?? 0), 0);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Achats: ${eur(buys)} | Ventes: ${eur(sells)} | Net: ${eur(sells - buys)}`, 15, y);
  y += 6;

  // Table header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setFillColor(240, 240, 240);

  const colW = [25, 18, 40, 18, 25, 25, 20];
  const colX = [15, 40, 58, 98, 116, 141, 166];
  const headers = ['Date', 'Type', 'Véhicule', 'Régime', 'Montant', 'Justif.', 'Immuable'];

  headers.forEach((h, i) => {
    doc.text(h, colX[i], y);
  });

  y += 4;
  doc.setDrawColor(200);
  doc.line(15, y, pageWidth - 15, y);
  y += 2;

  // Rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7);

  const pageHeightThreshold = pageHeight - 15;

  logs.forEach((log, idx) => {
    if (y > pageHeightThreshold) {
      doc.addPage();
      y = 15;
    }

    const car = cars.find(c => c.id === log.car_id);
    const amount = fromCents(log.amount_cts ?? 0);
    const isAchat = log.kind === 'achat';

    // Date
    doc.text(date(log.created_at), colX[0], y);
    // Type
    doc.text(isAchat ? 'ACHAT' : 'VENTE', colX[1], y);
    // Véhicule
    doc.text(car?.name?.substring(0, 20) || '—', colX[2], y);
    // Régime
    doc.text(log.regime === 'marge' ? 'Marge' : 'Normal', colX[3], y);
    // Montant
    doc.text(`${isAchat ? '−' : '+'}${eur(Math.round(amount * 100))}`, colX[4], y, { align: 'right' });
    // Justif
    doc.text(log.justif_id ? '✓' : '—', colX[5], y, { align: 'center' });
    // Immuable
    doc.text('🔒', colX[6], y);

    y += 3;
  });

  // Footer
  y = pageHeight - 10;
  doc.setFont('Helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text('Ce document est un enregistrement légal immuable (CNIL, Douanes). Aucune modification après production.', 15, y);

  doc.save(`Livre_Police_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportToCSV(logs: any[], cars: any[]) {
  const headers = ['Date', 'Heure', 'Type', 'Véhicule', 'Plaque', 'Régime', 'Montant €', 'Justificatif'];
  const rows = logs.map(log => {
    const car = cars.find(c => c.id === log.car_id);
    const d = new Date(log.created_at);
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = d.toLocaleTimeString('fr-FR');
    const amount = fromCents(log.amount_cts ?? 0);
    const isAchat = log.kind === 'achat';

    return [
      dateStr,
      timeStr,
      isAchat ? 'ACHAT' : 'VENTE',
      car?.name || '—',
      car?.plate || '—',
      log.regime === 'marge' ? 'Marge' : 'Normal',
      `${isAchat ? '-' : '+'}${amount.toFixed(2)}`,
      log.justif_id ? 'Oui' : 'Non',
    ];
  });

  const csvContent = [
    headers.join('\t'),
    ...rows.map(r => r.join('\t')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Livre_Police_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
}
