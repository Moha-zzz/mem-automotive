// ══════════════════════════════════════════════
// MEM AUTOMOTIVE — Moteur de calcul deal
// Fidèle à mem-automotive.html §5.6/5.7/6
// ══════════════════════════════════════════════

export const VAT_RATES: Record<string, number> = {
  'France': 20, 'Belgique': 21, 'Pays-Bas': 21,
  'Allemagne': 19, 'Luxembourg': 17, 'Espagne': 21,
  'Italie': 22, 'Autre pays UE': 20,
};

export const VAT_MODES: Record<string, string> = {
  ttc: 'TTC', ht: 'HT', '0': 'Sans TVA',
};

export interface FeeRow {
  k: string;      // '' = ligne libre
  label: string;
  amount: string;
  vat: 'ttc' | 'ht' | '0';
}

export const FEE_STD = [
  { k: 'carburant', label: 'Carburant',               vat: 'ttc' as const },
  { k: 'trajet',    label: 'Trajet (péages, billets)', vat: 'ttc' as const },
  { k: 'plaques',   label: 'Plaques transit',          vat: 'ttc' as const },
  { k: 'decl',      label: "Déclaration d'achat",      vat: 'ttc' as const },
  { k: 'ct',        label: 'Contrôle technique',       vat: 'ttc' as const },
  { k: 'pieces',    label: 'Pièces',                   vat: 'ttc' as const },
  { k: 'meca',      label: 'Mécanique',                vat: 'ttc' as const },
  { k: 'carro',     label: 'Carrosserie',              vat: 'ttc' as const },
  { k: 'coc',       label: 'COC',                      vat: 'ttc' as const },
  { k: 'cg',        label: 'Carte grise',              vat: '0'   as const },
  { k: 'ench',      label: "Frais d'enchères",         vat: 'ttc' as const },
  { k: 'lbc',       label: 'Leboncoin',                vat: 'ttc' as const },
  { k: 'annexes',   label: 'Frais annexes',            vat: 'ttc' as const },
];

// Thresholds par tranche de prix (§9.4)
const TIERS = [
  { max: 5000,  min: 10, ok: 20 },
  { max: 10000, min: 8,  ok: 15 },
  { max: 20000, min: 6,  ok: 12 },
  { max: Infinity, min: 5, ok: 10 },
];

export function tierFor(price: number) {
  return TIERS.find(t => price <= t.max)!;
}

export function normRows(saved: Partial<FeeRow>[] = []): FeeRow[] {
  const out: FeeRow[] = FEE_STD.map(f => ({
    k: f.k, label: f.label, amount: '', vat: f.vat,
  }));
  const extra: FeeRow[] = [];
  saved.forEach(r => {
    const o = r.k ? out.find(x => x.k === r.k) : null;
    if (o) {
      if (r.vat && VAT_MODES[r.vat]) o.vat = r.vat as FeeRow['vat'];
      if (r.amount && r.amount !== '') o.amount = r.amount;
    } else if (r.label || (r.amount && r.amount !== '')) {
      extra.push({ k: '', label: r.label ?? '', amount: r.amount ?? '', vat: r.vat as FeeRow['vat'] ?? 'ttc' });
    }
  });
  return [...out, ...extra];
}

export function rowVat(r: FeeRow, t: number): { ht: number; tva: number; ttc: number } {
  const a = parseFloat(r.amount) || 0;
  if (r.vat === 'ht')  return { ht: a, tva: a * t, ttc: a * (1 + t) };
  if (r.vat === '0')   return { ht: a, tva: 0, ttc: a };
  return { ht: a / (1 + t), tva: a - a / (1 + t), ttc: a };
}

export function rowsVat(rows: FeeRow[], t: number) {
  return rows.reduce((s, r) => {
    const x = rowVat(r, t);
    return { ht: s.ht + x.ht, tva: s.tva + x.tva, ttc: s.ttc + x.ttc };
  }, { ht: 0, tva: 0, ttc: 0 });
}

export function roundLbc(p: number, mode: '90' | '100' | 'none'): number {
  if (p <= 0) return p;
  if (mode === '100') return Math.ceil(p / 100) * 100;
  if (mode === '90')  return Math.ceil((p + 10) / 100) * 100 - 10;
  return Math.ceil(p);
}

export type ProfitView = 'ht' | 'ttc' | 'prudent';
export type MarginMode = 'eur' | 'pct' | 'pv';
export type FixMode    = 'margin' | 'price';
export type RoundMode  = '90' | '100' | 'none';

export interface CalcInput {
  buy:        string;
  regime:     'marge' | 'normal';
  country:    string;
  priceType:  'ttc' | 'ht';
  rows:       FeeRow[];
  mMode:      MarginMode;
  margin:     string;
  fix:        FixMode;
  sell:       string;
  nego:       string;
  round:      RoundMode;
  market:     string;
  days:       string;
  profitView: ProfitView;
  tva:        number;   // taux TVA en % (ex: 20)
  link?:      string;   // lien annonce
  name?:      string;   // nom / modèle
}

export interface CalcResult {
  needSell?:     boolean;
  prud:          boolean;
  feeHt:         number;
  feeTva:        number;
  feeTtc:        number;
  byPrice:       boolean;
  pTarget:       number;
  target:        number;
  normal:        boolean;
  fr:            boolean;
  rate:          number;
  seen:          number;
  A:             number;
  C:             number;
  cost:          number;
  M:             number;
  pMin:          number;
  pZero:         number;
  pShow:         number;
  tvaShow:       number;
  buyTva:        number;
  foreignTva:    number;
  real:          number;
  rateShow:      number;
  rateMin:       number;
  Pm:            number;
  maxBuy:        number | null;
  maxSeen:       number | null;
  profitAt:      (p: number) => number;
  realHtAt:      (p: number) => number;
  realPrudAt:    (p: number) => number;
  realTtcAt:     (p: number) => number;
  Pref:          number;
  tier:          { min: number; ok: number };
  rateRef:       number;
  okBuy:         number | null;
  minBuy:        number | null;
}

export function calcCompute(v: CalcInput): CalcResult | null {
  if (!v.buy || parseFloat(v.buy) <= 0) return null;

  const t = v.tva / 100;
  const normal = v.regime === 'normal';
  const fr     = v.country === 'France';
  const rate   = (VAT_RATES[v.country] ?? 20) / 100;

  const seen = parseFloat(v.buy) || 0;
  const A    = normal && v.priceType === 'ttc' ? seen / (1 + rate) : seen;

  const FV   = rowsVat(v.rows, t);
  const prud = v.profitView === 'prudent';
  const C    = prud ? FV.ttc : FV.ht;
  const cost = A + C;
  const p    = (parseFloat(v.margin) || 0) / 100;

  const tvaAt    = (P: number) => normal ? P * t / (1 + t) : Math.max(0, P - A) * t / (1 + t);
  const profitAt = (P: number) => P - A - C - tvaAt(P);
  const priceFor = (M: number) => normal ? (cost + M) * (1 + t) : A + (M + C) * (1 + t);
  const buyFor   = (P: number, M: number) => normal ? P / (1 + t) - C - M : P - (C + M) * (1 + t);

  let pMin: number, M: number;
  if (v.mMode === 'pv') {
    const den = 1 / (1 + t) - p;
    pMin = den > 0 ? (normal ? cost : A / (1 + t) + C) / den : Infinity;
    M = p * pMin;
  } else {
    M = v.mMode === 'pct' ? cost * p : (parseFloat(v.margin) || 0);
    pMin = priceFor(M);
  }

  const pZero   = priceFor(0);
  const byPrice = v.fix === 'price';
  const pTarget = pMin;

  if (byPrice) {
    if (!v.sell || parseFloat(v.sell) <= 0) return { needSell: true } as any;
    pMin = parseFloat(v.sell) || 0;
  }

  const nego  = parseFloat(v.nego) || 0;
  const pShow = byPrice ? pMin : isFinite(pMin) ? roundLbc(pMin + nego, v.round) : 0;

  const toSeen = (x: number | null) =>
    x === null ? null : Math.floor(normal && v.priceType === 'ttc' ? x * (1 + rate) : x);

  const Pm  = parseFloat(v.market) || 0;
  const Pt  = Pm - nego;

  let maxBuy: number | null = null;
  if (Pm > 0 && !byPrice) {
    if (v.mMode === 'pct') {
      maxBuy = normal
        ? (Pt / (1 + t) - C - p * C) / (1 + p)
        : (Pt - (1 + t) * C * (1 + p)) / (1 + (1 + t) * p);
    } else {
      maxBuy = buyFor(Pt, v.mMode === 'pv' ? p * Pt : M);
    }
  }

  const real      = profitAt(pShow);
  const rateShow  = pShow > 0 ? real / pShow : 0;
  const rateMin   = isFinite(pMin) && pMin > 0 ? M / pMin : 0;
  const finalM    = byPrice ? real : M;

  const Pref    = Pm > 0 ? Pm : pShow;
  const tier    = tierFor(Pref);
  const rateRef = Pm > 0 ? profitAt(Pm) / Pm : rateShow;

  const okBuy  = toSeen(buyFor(Pref, (tier.ok  / 100) * Pref));
  const minBuy = toSeen(buyFor(Pref, (tier.min / 100) * Pref));

  return {
    prud, feeHt: FV.ht, feeTva: FV.tva, feeTtc: FV.ttc,
    byPrice, pTarget, target: finalM, normal, fr, rate, seen, A, C, cost,
    M: finalM, pMin, pZero, pShow,
    tvaShow: tvaAt(pShow), buyTva: normal ? A * t : 0,
    foreignTva: normal && v.priceType === 'ttc' ? seen - A : 0,
    real, rateShow, rateMin, Pm, maxBuy, maxSeen: toSeen(maxBuy),
    profitAt, realHtAt: P => P - tvaAt(P) - A - FV.ht,
    realPrudAt: P => P - tvaAt(P) - A - FV.ttc,
    realTtcAt:  P => P - (normal && fr ? A * (1 + t) : A) - FV.ttc,
    Pref, tier, rateRef, okBuy, minBuy,
  };
}

// Trip cost calculation
export interface TripInput {
  home: string; dest: string; km: string; mode: 'train' | 'car' | 'truck';
  ticket: string; conso: string; myConso: string; fuel: string;
  tolls: string; truck: string; other: string;
}

export function tripCalc(t: TripInput) {
  const km = parseFloat(t.km) || 0;
  const fuel = parseFloat(t.fuel) || 1.75;
  let r = { fuel: 0, tolls: 0, ticket: 0, truck: 0, other: parseFloat(t.other) || 0, total: 0 };
  if (t.mode === 'train') {
    r.ticket = parseFloat(t.ticket) || 0;
    r.fuel   = km * (parseFloat(t.conso) || 7) / 100 * fuel;
    r.tolls  = parseFloat(t.tolls) || 0;
  } else if (t.mode === 'car') {
    r.fuel  = 2 * km * (parseFloat(t.myConso) || 9) / 100 * fuel;
    r.tolls = 2 * (parseFloat(t.tolls) || 0);
  } else {
    r.truck = parseFloat(t.truck) || 0;
  }
  r.total = r.fuel + r.tolls + r.ticket + r.truck + r.other;
  return r;
}
