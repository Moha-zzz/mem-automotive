/**
 * lib/argent.ts — Calculs soldes banque/espèces et TVA (spec §6.9 et §6.10)
 */

import { r2, fromCents, tvaSell } from './calculations';

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface SettingsRow {
  solde_cts: number;
  solde_date: string | null;
  solde_at: string | null;
  cash_solde_cts: number;
  cash_date: string | null;
  cash_solde_at: string | null;
}

interface ExpenseRow {
  id: string;
  date: string;
  car_id: string | null;
  cat: string;
  label: string | null;
  ttc_cts: number;
  tva_cts: number;
  pay: 'banque' | 'especes';
  created_at: string | null;
}

interface CarRow {
  id: string;
  sell_date: string | null;
  sell_price_cts: number | null;
  sell_pay: string | null;
  buy_price_cts: number | null;
  buy_pay: string | null;
  buy_date: string | null;
  regime: string;
  sold_at: string | null;
  bought_at: string | null;
}

interface MoveRow {
  id: string;
  kind: 'retrait' | 'depot' | 'entree' | 'sortie';
  amount_cts: number;
  date: string;
}

interface CashRow {
  id: string;
  label: string;
  amount_cts: number;
  date: string;
  done: boolean;
}

// ─── Solde banque (spec §6.9) ─────────────────────────────────────────────────

export function computeBankBalance(
  settings: SettingsRow,
  expenses: ExpenseRow[],
  cars: CarRow[],
  moves: MoveRow[],
  cashFlows: CashRow[],
): number {
  const ref    = settings.solde_date ?? '1970-01-01';
  const refAt  = settings.solde_at ?? '1970-01-01T00:00:00Z';
  let   balance = fromCents(settings.solde_cts ?? 0);

  // Dépenses bancaires après recalage
  for (const e of expenses) {
    if (e.pay !== 'banque') continue;
    if ((e.date ?? '') > ref || (e.created_at ?? '') > refAt) {
      balance -= fromCents(e.ttc_cts);
    }
  }

  // Ventes encaissées en banque après recalage
  for (const c of cars) {
    if (!c.sell_date || !c.sell_price_cts) continue;
    if (c.sell_pay === 'banque' || c.sell_pay === 'virement' || c.sell_pay === 'cheque_de_banque') {
      if (c.sell_date > ref) balance += fromCents(c.sell_price_cts);
    }
  }

  // Achats payés en banque après recalage
  for (const c of cars) {
    if (!c.buy_date || !c.buy_price_cts) continue;
    if (c.buy_pay === 'banque' || c.buy_pay === 'virement' || c.buy_pay === 'cheque_de_banque') {
      if (c.buy_date > ref) balance -= fromCents(c.buy_price_cts);
    }
  }

  // Retraits (banque −) et dépôts (banque +)
  for (const m of moves) {
    if (m.date < ref) continue;
    if (m.kind === 'retrait') balance -= fromCents(m.amount_cts);
    if (m.kind === 'depot')   balance += fromCents(m.amount_cts);
  }

  // Entrées/sorties prévues marquées "fait"
  for (const c of cashFlows) {
    if (!c.done || (c.date ?? '') <= ref) continue;
    balance += fromCents(c.amount_cts); // négatif = sortie
  }

  return r2(balance);
}

// ─── Solde espèces (spec §6.9) ────────────────────────────────────────────────

export function computeCashBalance(
  settings: SettingsRow,
  expenses: ExpenseRow[],
  cars: CarRow[],
  moves: MoveRow[],
): number {
  const ref    = settings.cash_date ?? '1970-01-01';
  let   balance = fromCents(settings.cash_solde_cts ?? 0);

  // Dépenses espèces après recalage
  for (const e of expenses) {
    if (e.pay !== 'especes') continue;
    if ((e.date ?? '') > ref) balance -= fromCents(e.ttc_cts);
  }

  // Ventes espèces
  for (const c of cars) {
    if (!c.sell_date || !c.sell_price_cts) continue;
    if (c.sell_pay === 'especes' && c.sell_date > ref) {
      balance += fromCents(c.sell_price_cts);
    }
  }

  // Achats espèces
  for (const c of cars) {
    if (!c.buy_date || !c.buy_price_cts) continue;
    if (c.buy_pay === 'especes' && c.buy_date > ref) {
      balance -= fromCents(c.buy_price_cts);
    }
  }

  // Mouvements (retrait = caisse +, dépôt = caisse −)
  for (const m of moves) {
    if (m.date < ref) continue;
    if (m.kind === 'retrait') balance += fromCents(m.amount_cts);
    if (m.kind === 'depot')   balance -= fromCents(m.amount_cts);
    if (m.kind === 'entree')  balance += fromCents(m.amount_cts);
    if (m.kind === 'sortie')  balance -= fromCents(m.amount_cts);
  }

  return r2(balance);
}

// ─── Solde dans 30 jours ─────────────────────────────────────────────────────

export function computeBalanceIn30Days(
  currentBank: number,
  cashFlows: CashRow[],
): number {
  const today   = new Date().toISOString().slice(0, 10);
  const in30    = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  let   balance = currentBank;

  for (const c of cashFlows) {
    if (!c.done && c.date > today && c.date <= in30) {
      balance += fromCents(c.amount_cts);
    }
  }

  return r2(balance);
}

// ─── TVA d'une période (spec §6.10) ──────────────────────────────────────────

export interface TvaPeriod {
  collectee: number;
  deductible: number;
  autoliquidee: number;
  nette: number;
  details: { label: string; amount: number; kind: 'collectee' | 'deductible' | 'auto' }[];
}

export function computeTvaPeriod(
  cars: CarRow[],
  expenses: ExpenseRow[],
  periodStart: string,
  periodEnd: string,
): TvaPeriod {
  let collectee = 0, deductible = 0, autoliquidee = 0;
  const details: TvaPeriod['details'] = [];

  // TVA collectée sur les ventes
  for (const c of cars) {
    if (!c.sell_date || c.sell_date < periodStart || c.sell_date > periodEnd) continue;
    if (!c.sell_price_cts) continue;
    const P = fromCents(c.sell_price_cts);
    const A = fromCents(c.buy_price_cts ?? 0);
    const tva = tvaSell(P, A, c.regime as 'marge' | 'normal');
    collectee += tva;
    details.push({ label: `TVA vente voiture (${c.id.slice(0, 8)})`, amount: tva, kind: 'collectee' });
  }

  // TVA déductible sur les dépenses
  for (const e of expenses) {
    if (!e.date || e.date < periodStart || e.date > periodEnd) continue;
    if (!e.tva_cts) continue;
    const tva = fromCents(e.tva_cts);
    deductible += tva;
    details.push({ label: e.label ?? e.cat, amount: tva, kind: 'deductible' });
  }

  // TVA autoliquidée (achats UE régime normal dans la période)
  for (const c of cars) {
    if (!c.buy_date || c.buy_date < periodStart || c.buy_date > periodEnd) continue;
    if (c.regime !== 'normal' || !c.buy_price_cts) continue;
    const tva = fromCents(c.buy_price_cts) * 0.20;
    autoliquidee += r2(tva);
    details.push({ label: `Autoliq. achat UE (${c.id.slice(0, 8)})`, amount: r2(tva), kind: 'auto' });
  }

  return {
    collectee: r2(collectee),
    deductible: r2(deductible),
    autoliquidee: r2(autoliquidee),
    nette: r2(collectee - deductible),
    details,
  };
}

// ─── Helpers période ─────────────────────────────────────────────────────────

export function currentMonthRange(): [string, string] {
  const now   = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return [start, end];
}

export function currentQuarterRange(): [string, string] {
  const now = new Date();
  const q   = Math.floor(now.getMonth() / 3);
  const start = `${now.getFullYear()}-${String(q * 3 + 1).padStart(2, '0')}-01`;
  const endMonth = new Date(now.getFullYear(), q * 3 + 3, 0);
  return [start, endMonth.toISOString().slice(0, 10)];
}
