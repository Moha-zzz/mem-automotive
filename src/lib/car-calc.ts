// Car-level calculations — faithful to mem-automotive.html

export const STAGES = [
  { k: 'repere',      label: 'Repéré',           color: '#64748B' },
  { k: 'contacte',    label: 'Contacté',          color: '#3B82F6' },
  { k: 'nego',        label: 'Négociation',       color: '#6366F1' },
  { k: 'chercher',    label: 'À aller chercher',  color: '#F59E0B' },
  { k: 'achete',      label: 'Acheté',            color: '#F97316' },
  { k: 'preparation', label: 'Préparation',       color: '#EF4444' },
  { k: 'vente',       label: 'En vente',          color: '#10B981' },
  { k: 'reserve',     label: 'Réservé',           color: '#8B5CF6' },
  { k: 'vendu',       label: 'Vendu',             color: '#059669' },
  { k: 'abandon',     label: 'Abandonné',         color: '#94A3B8' },
];

export const IN_STOCK = ['achete', 'preparation', 'vente', 'reserve'];

export const PAPERS = [
  { k: 'decl',    label: "Déclaration d'achat" },
  { k: 'transit', label: 'Plaques transit'       },
  { k: 'coc',     label: 'COC'                   },
  { k: 'ct',      label: 'Contrôle technique'    },
  { k: 'cg',      label: 'Carte grise'           },
  { k: 'quitus',  label: 'Quitus fiscal'         },
];

export const STAGE_TASKS: Record<string, [string, string, number, number, string?, string?][]> = {
  chercher:    [['transport', 'Organiser le transport ou aller chercher la voiture', 1, 0], ['paiement', 'Préparer le paiement du vendeur', 1, 0]],
  achete:      [['decl', "Faire la déclaration d'achat", 1, 2, 'decl'], ['transit', 'Commander les plaques transit', 1, 1, 'transit', 'import'], ['coc', 'Demander le COC', 2, 3, 'coc', 'import'], ['idvendeur', "Vérifier la pièce d'identité du vendeur (livre de police)", 2, 1]],
  preparation: [['ct', 'Réserver le contrôle technique', 2, 3, 'ct'], ['photos', "Faire les photos pour l'annonce", 2, 5], ['cg', 'Lancer la carte grise', 2, 7, 'cg']],
  vente:       [['annonce', 'Publier l\'annonce Leboncoin', 1, 0]],
  reserve:     [['acompte', "Encaisser l'acompte et fixer la date de remise", 1, 1]],
  vendu:       [['cession', 'Remplir le certificat de cession', 1, 0], ['siv', 'Enregistrer la cession (SIV / ANTS)', 1, 2], ['encaisse', 'Vérifier que le paiement est bien reçu', 1, 0]],
};

export const FUELS     = ['Diesel', 'Essence', 'Hybride', 'Électrique', 'GPL'];
export const GEARBOXES = ['Manuelle', 'Automatique'];
export const GENRES    = ['VP', 'CTTE', 'VASP', 'MTL', 'MTT1', 'MTT2', 'CL', 'QM', 'Autre'];
export const PAYS_ACHAT = ['France', 'Belgique', 'Pays-Bas', 'Allemagne', 'Luxembourg', 'Espagne', 'Italie', 'Autre'];
export const PAYS_MODES = ['Virement', 'Chèque de banque', 'Espèces', 'CB'];

export type ProfitView = 'ht' | 'ttc' | 'prudent';

export function carDays(car: any): number | null {
  if (!car.buy_date) return null;
  const ref = car.sell_date ?? new Date().toISOString().slice(0, 10);
  return Math.round((new Date(ref).getTime() - new Date(car.buy_date).getTime()) / 86_400_000);
}

export function carFeesHt(expenses: any[]): number {
  return expenses.reduce((s, e) => s + (fromCts(e.ttc_cts) - fromCts(e.tva_cts)), 0);
}

export function carFeesTtc(expenses: any[]): number {
  return expenses.reduce((s, e) => s + fromCts(e.ttc_cts), 0);
}

export function toCts(eur: number): number { return Math.round(eur * 100); }
export function fromCts(cts: number | null | undefined): number { return (cts ?? 0) / 100; }

export function tvaDue(car: any, priceEur: number, tva = 20): number {
  const t = tva / 100;
  if (car.regime === 'normal') return priceEur * t / (1 + t);
  const A = fromCts(car.buy_price_cts);
  return Math.max(0, priceEur - A) * t / (1 + t);
}

export function profitHt(car: any, expenses: any[], priceEur: number, tva = 20): number | null {
  if (!car.buy_price_cts) return null;
  const A    = fromCts(car.buy_price_cts);
  const fees = carFeesHt(expenses);
  const cost = A + fees;
  return priceEur - tvaDue(car, priceEur, tva) - cost;
}

export function profitTtc(car: any, expenses: any[], priceEur: number, tva = 20): number | null {
  if (!car.buy_price_cts) return null;
  const A        = fromCts(car.buy_price_cts);
  const paidA    = car.regime === 'normal' && car.country === 'France' ? A * (1 + tva / 100) : A;
  const feesTtc  = carFeesTtc(expenses);
  const planned  = fromCts(car.planned_fees_ttc_cts ?? null) ?? 0;
  const feesPaid = Math.max(feesTtc, planned);
  return priceEur - paidA - feesPaid;
}

export function profitPrudent(car: any, expenses: any[], priceEur: number, tva = 20): number | null {
  if (!car.buy_price_cts) return null;
  const A       = fromCts(car.buy_price_cts);
  const feesTtc = carFeesTtc(expenses);
  return priceEur - tvaDue(car, priceEur, tva) - A - feesTtc;
}

export function profitView(car: any, expenses: any[], priceEur: number, view: ProfitView, tva = 20): number | null {
  if (view === 'ttc')     return profitTtc(car, expenses, priceEur, tva);
  if (view === 'prudent') return profitPrudent(car, expenses, priceEur, tva);
  return profitHt(car, expenses, priceEur, tva);
}

export function papersDone(car: any): number {
  if (!car.papers) return 0;
  return PAPERS.filter(p => car.papers[p.k]).length;
}

export function priceAdvice(car: any, expenses: any[], tva = 20) {
  if (car.stage !== 'vente' || !car.ask_price_cts || !car.buy_price_cts) return null;
  const drops = car.price_drops ?? [];
  const ref   = drops.length ? drops[drops.length - 1].date : (car.list_date ?? car.buy_date);
  if (!ref) return null;

  const dl = Math.round((Date.now() - new Date(ref).getTime()) / 86_400_000);
  if (dl < 30) return { wait: true, dl, left: 30 - dl };

  const P0  = fromCts(car.ask_price_cts);
  const A   = fromCts(car.buy_price_cts);
  const t   = tva / 100;
  const fees = carFeesHt(expenses);
  const cost = A + fees;
  const floor = Math.ceil(car.regime === 'normal' ? cost * (1 + t) : A + fees * (1 + t));

  const pct = dl >= 60 ? 0.08 : dl >= 45 ? 0.05 : 0.03;
  let P1 = Math.ceil(((P0 * (1 - pct)) + 10) / 100) * 100 - 10; // arrondi ...90
  if (P1 >= P0) P1 = P0 - 100;
  if (P1 < floor) P1 = Math.ceil(floor / 10) * 10;

  const pr0 = profitHt(car, expenses, P0, tva) ?? 0;
  const pr1 = profitHt(car, expenses, P1, tva) ?? 0;
  if (P1 >= P0 || pr0 === null) return { floorHit: true, dl, P0, floor, pr0 };

  const days = carDays(car) ?? dl;
  const ADV_WAIT = 21, ADV_FAST = 7;
  const g0 = pr0 / (days + ADV_WAIT);
  const g1 = pr1 / (days + ADV_FAST);
  const lossOk = Math.max(0, pr0 - pr0 * (days + ADV_FAST) / (days + ADV_WAIT));
  const factor = car.regime === 'normal' ? 1 / (1 + t) : (P0 > A ? 1 / (1 + t) : 1);
  const maxDrop = Math.floor(lossOk / factor / 10) * 10;

  return { dl, days, P0, P1, pct, pr0, pr1, loss: pr0 - pr1, g0, g1, drop: g1 >= g0, maxDrop, floor, cost };
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
