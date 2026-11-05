import { jsPDF } from 'jspdf';
import { fromCents } from '../calculations';

function eur(cts: number | null | undefined) {
  if (!cts) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(fromCents(cts));
}

const TYPE_LABELS: Record<string, string> = {
  marge: 'TVA Marge',
  vtva:  'TVA Normale',
  tva:   'Prestation',
  bon:   'Bon de commande',
};

export async function toPDF(invoice: any, car: any, contact: any, settings: any) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Polices
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);

  // Titre
  doc.text(settings.company || 'MEM AUTOMOTIVE', 20, y);
  y += 10;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  if (settings.siret) doc.text(`SIRET: ${settings.siret}`, 20, y), y += 4;
  if (settings.address) doc.text(settings.address, 20, y), y += 4;

  y += 4;

  // Numéro facture (centré à droite)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(invoice.num, pageWidth - 20, y - 6, { align: 'right' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(TYPE_LABELS[invoice.type] || invoice.type, pageWidth - 20, y + 4, { align: 'right' });

  y += 15;

  // Infos dates
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DATE', 20, y);
  doc.setFont('Helvetica', 'normal');
  doc.text(new Date(invoice.date).toLocaleDateString('fr-FR'), 50, y);

  if (invoice.due_date) {
    doc.setFont('Helvetica', 'bold');
    doc.text('ÉCHÉANCE', 120, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(new Date(invoice.due_date).toLocaleDateString('fr-FR'), 150, y);
  }

  y += 12;

  // Facturé à / Véhicule
  doc.setFont('Helvetica', 'bold');
  doc.text('FACTURÉ À', 20, y);
  doc.setFont('Helvetica', 'normal');
  y += 5;
  doc.text(invoice.client_name || 'Client', 20, y);
  y += 4;
  if (invoice.client_address) {
    doc.setFontSize(9);
    doc.text(invoice.client_address, 20, y);
    y += 3;
    doc.setFontSize(10);
  }
  if (invoice.client_siren) {
    doc.setFontSize(9);
    doc.text(`SIRET: ${invoice.client_siren}`, 20, y);
    y += 3;
    doc.setFontSize(10);
  }

  if (car) {
    y = Math.max(y, 60); // align right side
    doc.setFont('Helvetica', 'bold');
    doc.text('VÉHICULE', pageWidth - 80, y - 12);
    doc.setFont('Helvetica', 'normal');
    doc.text(car.name, pageWidth - 80, y - 7);
    if (car.plate) {
      doc.setFontSize(9);
      doc.text(car.plate, pageWidth - 80, y - 3);
    }
  }

  y += 10;

  // Tableau des lignes
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);

  // En-tête tableau
  const colX = [20, pageWidth - 60, pageWidth - 40, pageWidth - 20];
  doc.text('Description', colX[0], y);
  doc.text('Qty', colX[1], y, { align: 'center' });
  doc.text('Prix unit.', colX[2], y, { align: 'right' });
  doc.text('Total', colX[3], y, { align: 'right' });

  y += 2;
  doc.setDrawColor(180);
  doc.line(20, y, pageWidth - 20, y);
  y += 3;

  // Lignes
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  const lines = invoice.lines || [];
  for (const line of lines) {
    const label = line.label || '';
    const qty = line.qty || 1;
    const price = line.price || 0;
    const total = qty * price;

    // Texte wrappé pour description longue
    const splitLabel = doc.splitTextToSize(label, colX[1] - colX[0] - 2);
    doc.text(splitLabel, colX[0], y);
    const lineHeight = splitLabel.length * 3;

    doc.text(String(qty), colX[1], y, { align: 'center' });
    doc.text(eur(Math.round(price * 100)), colX[2], y, { align: 'right' });
    doc.text(eur(Math.round(total * 100)), colX[3], y, { align: 'right' });

    y += Math.max(lineHeight, 4);
  }

  // Ligne totaux
  y += 2;
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 4;

  const totalHt = invoice.type === 'marge'
    ? fromCents(invoice.total_cts ?? 0)
    : Math.round(fromCents(invoice.total_cts ?? 0) / 1.2 * 100) / 100;
  const totalTva = invoice.type === 'marge'
    ? 0
    : Math.round((fromCents(invoice.total_cts ?? 0) - totalHt) * 100) / 100;
  const totalTtc = fromCents(invoice.total_cts ?? 0);

  // Bloc totaux
  if (invoice.type !== 'marge') {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Sous-total HT', pageWidth - 60, y, { align: 'right' });
    doc.text(eur(Math.round(totalHt * 100)), pageWidth - 20, y, { align: 'right' });
    y += 4;

    doc.text('TVA 20 %', pageWidth - 60, y, { align: 'right' });
    doc.text(eur(Math.round(totalTva * 100)), pageWidth - 20, y, { align: 'right' });
    y += 4;
  }

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL TTC', pageWidth - 60, y, { align: 'right' });
  doc.setTextColor(33, 102, 194);
  doc.text(eur(Math.round(totalTtc * 100)), pageWidth - 20, y, { align: 'right' });
  doc.setTextColor(0);

  y += 6;

  if (invoice.deposit_cts && invoice.deposit_cts > 0) {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Acompte versé: ${eur(invoice.deposit_cts)}`, pageWidth - 60, y, { align: 'right' });
    y += 4;
  }

  // Mode de paiement
  y += 4;
  doc.setFillColor(245, 245, 245);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MODE DE PAIEMENT', 22, y + 3);
  doc.setFont('Helvetica', 'normal');
  const payMethods: Record<string, string> = {
    virement: 'Virement bancaire',
    cheque_de_banque: 'Chèque de banque',
    especes: 'Espèces',
    carte_bancaire: 'Carte bancaire',
  };
  doc.text(payMethods[invoice.pay_method] || invoice.pay_method, pageWidth - 22, y + 3, { align: 'right' });

  y += 12;

  // Notes
  if (invoice.notes) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTES', 20, y);
    y += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    const notes = doc.splitTextToSize(invoice.notes, pageWidth - 40);
    doc.text(notes, 20, y);
    y += notes.length * 3 + 4;
  }

  // Pied de page
  y = pageHeight - 20;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text(`Facture émise le ${new Date(invoice.locked_at).toLocaleDateString('fr-FR')}`, 20, y);
  if (invoice.type === 'marge') {
    doc.text('TVA non apparente — Régime biens d\'occasion', 20, y + 3);
  }
  if (invoice.paid) {
    doc.setTextColor(34, 197, 94);
    doc.text(`✓ Réglée le ${new Date(invoice.paid_date).toLocaleDateString('fr-FR')}`, pageWidth - 60, y);
  }

  // Télécharger
  doc.save(`${invoice.num}.pdf`);
}
