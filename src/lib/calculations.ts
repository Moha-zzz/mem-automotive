/**
 * lib/calculations.ts — Module de calcul unique MEM AUTOMOTIVE
 *
 * Toutes les formules TVA/marge/prix passent ici.
 * Fiche voiture, calculateur, bilan et stats utilisent ces fonctions — zéro duplication.
 * Montants en entrée/sortie en EUROS (number). Stockage Supabase en centimes (INTEGER).
 *
 * Référence : spécification §6, exemples vérifiés §6.4 et §6.5.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Regime = 'marge' | 'normal';
export type FeeMode = 'TTC' | 'HT' | 'SANS_TVA';
export type ProfitView = 'HT' | 'TTC' | 'Prudent';
export type Genre = 'VP' | 'CTTE' | 'autre';
export type AuctionFeeCase = 'bordereau' | 'facture_separee';

export interface Fee {
  label: string;
  amount: number;      // montant saisi (euros)
  mode: FeeMode;
  auctionCase?: AuctionFeeCase; // uniquement pour les frais d'enchères
}

export interface CarCalc {
  regime: Regime;
  buyPrice: number;    // prix d'achat (HT si normal, TTC si marge)
  sellPrice: number;   // prix de vente TTC
  fees: Fee[];
  genre?: Genre;
  buyCountry?: string; // 'NL', 'BE', 'FR', etc.
  seenPriceTtc?: number; // prix affiché TTC (pour calcul A_ht en régime normal)
}

export interface FeeBreakdown {
  htCounted: number;   // HT compté dans le calcul
  tvaRecovered: number;
  ttcPaid: number;
}

export interface CalcResult {
  regime: Regime;
  buyPrice: number;
  sellPrice: number;
  tvaSell: number;        // TVA collectée à la vente
  feesHt: number;         // somme des HT des frais (hors frais enchères bordereau)
  feesTtc: number;        // somme des TTC des frais
  auctionBordereauHt: number; // frais enchères cas 1 (ajoutés à A)
  effectiveBuyHt: number; // A effectif = buyPrice + auctionBordereauHt
  profitHt: number;
  profitTtc: number;
  profitPrudent: number;
  tvaNet: number;         // collectée − déductible (à reverser)
  tvaDeductible: number;
  tvaAutoliquidee: number;
  marginRate: number;     // taux = profitHT / sellPrice
  breakEvenPrice: number; // prix à marge nulle
}

// ─── Constantes ───────────────────────────────────────────────────────────────

export const TVA_RATE = 0.20;

export const TVA_BY_COUNTRY: Record<string, number> = {
  FR: 0.20, BE: 0.21, NL: 0.21, DE: 0.19,
  LU: 0.17, ES: 0.21, IT: 0.22,
};

// ─── Helpers de base ─────────────────────────────────────────────────────────

/** Arrondit à 2 décimales */
export const r2 = (n: number): number => Math.round(n * 100) / 100;

/** Euros → centimes (pour Supabase) */
export const toCents = (euros: number): number => Math.round(euros * 100);

/** Centimes → euros (affichage) */
export const fromCents = (cents: number): number => cents / 100;

// ─── Décomposition d'un frais ────────────────────────────────────────────────

export function breakdownFee(fee: Fee): FeeBreakdown {
  const a = fee.amount;
  switch (fee.mode) {
    case 'TTC':
      return { htCounted: r2(a / 1.2), tvaRecovered: r2(a - a / 1.2), ttcPaid: a };
    case 'HT':
      return { htCounted: a, tvaRecovered: r2(a * 0.2), ttcPaid: r2(a * 1.2) };
    case 'SANS_TVA':
      return { htCounted: a, tvaRecovered: 0, ttcPaid: a };
  }
}

// ─── TVA carburant (VP = 80 %, CTTE = 100 %) ─────────────────────────────────

export function tvaCarburant(montantTtc: number, genre: Genre = 'VP'): number {
  const tvaPleine = r2(montantTtc - montantTtc / 1.2);
  const tauxRecup = genre === 'CTTE' ? 1.0 : 0.8;
  return r2(tvaPleine * tauxRecup);
}

// ─── TVA collectée à la vente ────────────────────────────────────────────────

export function tvaSell(sellPrice: number, buyPriceHt: number, regime: Regime): number {
  if (regime === 'marge') {
    return r2(Math.max(0, sellPrice - buyPriceHt) * TVA_RATE / (1 + TVA_RATE));
  }
  return r2(sellPrice * TVA_RATE / (1 + TVA_RATE));
}

// ─── Prix d'achat HT (régime normal, depuis le prix TTC du pays) ──────────────

export function buyPriceHt(seenPriceTtc: number, country: string): number {
  const rate = TVA_BY_COUNTRY[country] ?? TVA_RATE;
  return r2(seenPriceTtc / (1 + rate));
}

// ─── Excl. BTW : détection et conversion ─────────────────────────────────────

export function isExclBtw(text: string): boolean {
  return /excl\.?\s*btw|ex\s+btw|exclusief\s+btw|btw\s+excl/i.test(text);
}

/** Convertit un prix NL affiché Excl. BTW en équivalent TTC */
export const exclBtwToTtc = (htPrice: number): number => r2(htPrice * 1.21);

// ─── Calcul complet d'une affaire ────────────────────────────────────────────

export function calculate(car: CarCalc): CalcResult {
  const { regime, buyPrice, sellPrice, fees = [], genre = 'VP', buyCountry = 'NL' } = car;

  // Séparer frais enchères bordereau (cas 1 → ajoutés à A) des autres frais
  const auctionBordereauFees = fees.filter(
    f => f.label.toLowerCase().includes('enchères') && f.auctionCase === 'bordereau'
  );
  const normalFees = fees.filter(
    f => !(f.label.toLowerCase().includes('enchères') && f.auctionCase === 'bordereau')
  );

  // Frais enchères bordereau → ajoutés à A (sans TVA séparée)
  const auctionBordereauHt = auctionBordereauFees.reduce((sum, f) => {
    const { htCounted } = breakdownFee({ ...f, mode: 'SANS_TVA' });
    return sum + htCounted;
  }, 0);

  // Prix d'achat effectif
  const effectiveBuyHt = r2(buyPrice + auctionBordereauHt);

  // Frais normaux
  let feesHt = 0, feesTtc = 0, tvaDeductible = 0;
  for (const fee of normalFees) {
    const bd = breakdownFee(fee);
    feesHt   += bd.htCounted;
    feesTtc  += bd.ttcPaid;
    tvaDeductible += bd.tvaRecovered;
  }
  feesHt = r2(feesHt); feesTtc = r2(feesTtc); tvaDeductible = r2(tvaDeductible);

  // TVA à la vente
  const tvaSellAmt = tvaSell(sellPrice, effectiveBuyHt, regime);

  // TVA autoliquidée (achat UE régime normal)
  const tvaAutoliquidee = (regime === 'normal' && buyCountry !== 'FR')
    ? r2(effectiveBuyHt * TVA_RATE)
    : 0;

  // A_payé (montant réellement sorti)
  const aPaye = (regime === 'normal' && buyCountry === 'FR')
    ? r2(effectiveBuyHt * 1.2)
    : effectiveBuyHt;

  // Trois vues du bénéfice
  const profitHt      = r2(sellPrice - tvaSellAmt - effectiveBuyHt - feesHt);
  const profitTtc     = r2(sellPrice - aPaye - feesTtc);
  const profitPrudent = r2(sellPrice - tvaSellAmt - effectiveBuyHt - feesTtc);

  // TVA nette à reverser
  const tvaNet = r2(tvaSellAmt - tvaDeductible);

  // Taux de marge
  const marginRate = sellPrice > 0 ? r2(profitHt / sellPrice) : 0;

  // Prix plancher (marge nulle)
  const breakEvenPrice = regime === 'marge'
    ? r2(effectiveBuyHt + feesHt * 1.2)
    : r2((effectiveBuyHt + feesHt) * 1.2);

  return {
    regime,
    buyPrice,
    sellPrice,
    tvaSell: tvaSellAmt,
    feesHt,
    feesTtc,
    auctionBordereauHt,
    effectiveBuyHt,
    profitHt,
    profitTtc,
    profitPrudent,
    tvaNet,
    tvaDeductible,
    tvaAutoliquidee,
    marginRate,
    breakEvenPrice,
  };
}

// ─── Prix de vente conseillé ──────────────────────────────────────────────────

export interface PriceTarget {
  targetMarginEuros?: number;
  targetMarginPctCost?: number;    // ex: 0.30 = 30 % du coût
  targetMarginPctSell?: number;    // ex: 0.20 = 20 % du prix de vente
}

export function advisedSellPrice(
  car: Omit<CarCalc, 'sellPrice'>,
  target: PriceTarget
): number {
  const { regime, buyPrice, fees = [] } = car;
  const feesHt = fees.reduce((s, f) => s + breakdownFee(f).htCounted, 0);

  let M: number;
  if (target.targetMarginEuros !== undefined) {
    M = target.targetMarginEuros;
  } else if (target.targetMarginPctCost !== undefined) {
    M = (buyPrice + feesHt) * target.targetMarginPctCost;
  } else if (target.targetMarginPctSell !== undefined) {
    const p = target.targetMarginPctSell;
    return regime === 'normal'
      ? r2((buyPrice + feesHt) / (1 / 1.2 - p))
      : r2((buyPrice / 1.2 + feesHt) / (1 / 1.2 - p));
  } else {
    M = 0;
  }

  return regime === 'normal'
    ? r2((buyPrice + feesHt + M) * 1.2)
    : r2(buyPrice + (M + feesHt) * 1.2);
}

// ─── Arrondi "90" (style Leboncoin) ──────────────────────────────────────────

export function roundTo90(price: number): number {
  return Math.ceil((price + 10) / 100) * 100 - 10;
}

// ─── Conseil de baisse de prix ───────────────────────────────────────────────

export interface PriceDropAdvice {
  shouldDrop: boolean;
  gainIfWait: number;
  gainIfDrop: number;
  droppedPrice: number;
  maxDropWithoutLoss: number;
}

export function priceDropAdvice(
  currentPrice: number,
  daysInStock: number,
  feesHt: number,
  buyPrice: number,
  regime: Regime,
  dropPct = 0.05
): PriceDropAdvice {
  const droppedPrice = r2(currentPrice * (1 - dropPct));

  const marginFn = (p: number) => regime === 'marge'
    ? r2(p - (p - buyPrice) * TVA_RATE / (1 + TVA_RATE) - buyPrice - feesHt)
    : r2(p - p * TVA_RATE / (1 + TVA_RATE) - buyPrice - feesHt);

  const gainIfWait = r2(marginFn(currentPrice) / (daysInStock + 21));
  const gainIfDrop = r2(marginFn(droppedPrice) / (daysInStock + 7));
  const shouldDrop = gainIfDrop >= gainIfWait;

  const maxDrop = r2(
    (marginFn(currentPrice) - marginFn(currentPrice) * (daysInStock + 7) / (daysInStock + 21))
    / (1 / 1.2)
  );

  return { shouldDrop, gainIfWait, gainIfDrop, droppedPrice, maxDropWithoutLoss: maxDrop };
}

// ─── Solde compte ────────────────────────────────────────────────────────────

export interface AccountMove {
  amount: number;   // positif = entrée, négatif = sortie
  date: string;     // AAAA-MM-JJ
  recalibratedAt?: string; // date du recalage (si recalage)
}

export function computeBalance(
  recalibratedBalance: number,
  recalibratedAt: string,
  moves: AccountMove[]
): number {
  const afterMoves = moves
    .filter(m => !m.recalibratedAt && m.date >= recalibratedAt)
    .reduce((sum, m) => sum + m.amount, 0);
  return r2(recalibratedBalance + afterMoves);
}
