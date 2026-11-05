/**
 * Tests unitaires — lib/calculations.ts
 * Basés sur les exemples chiffrés de la spécification (§6.4 et §6.5)
 * et les données réelles du Berlingo.
 */

import { describe, it, expect } from 'vitest';
import {
  calculate,
  breakdownFee,
  advisedSellPrice,
  roundTo90,
  tvaSell,
  tvaCarburant,
  priceDropAdvice,
  isExclBtw,
  exclBtwToTtc,
  r2,
  toCents,
  fromCents,
} from '../calculations';

// ─── §6.4 Exemple vérifié : P=4490, A=2500, frais 600 HT / 720 TTC ──────────

describe('Exemple spéc §6.4 — TVA sur marge', () => {
  const car = {
    regime: 'marge' as const,
    buyPrice: 2500,
    sellPrice: 4490,
    fees: [{ label: 'Frais', amount: 720, mode: 'TTC' as const }],
  };

  it('TVA marge = 332 €', () => {
    expect(r2(tvaSell(4490, 2500, 'marge'))).toBe(331.67); // (4490-2500)*20/120
    // La spec annonce 332 € (arrondi), on accepte ±1 €
    expect(Math.round(tvaSell(4490, 2500, 'marge'))).toBe(332);
  });

  it('Frais HT = 600 €', () => {
    const bd = breakdownFee({ label: 'F', amount: 720, mode: 'TTC' });
    expect(bd.htCounted).toBe(600);
    expect(bd.tvaRecovered).toBe(120);
    expect(bd.ttcPaid).toBe(720);
  });

  it('Bénéfice HT = 1058 €', () => {
    const result = calculate(car);
    expect(Math.round(result.profitHt)).toBe(1058);
  });

  it('Bénéfice TTC = 1270 €', () => {
    const result = calculate(car);
    expect(Math.round(result.profitTtc)).toBe(1270);
  });

  it('Bénéfice Prudent = 938 €', () => {
    const result = calculate(car);
    expect(Math.round(result.profitPrudent)).toBe(938);
  });
});

// ─── §6.5 Exemple vérifié : P conseillé avec A=2000, frais 508 HT, M=1000 ───

describe('Exemple spéc §6.5 — Prix conseillé marge', () => {
  it('P conseillé ≈ 3810 € pour M=1000 € (spec arrondit à l\'euro)', () => {
    const p = advisedSellPrice(
      { regime: 'marge', buyPrice: 2000, fees: [{ label: 'F', amount: 508, mode: 'HT' }] },
      { targetMarginEuros: 1000 }
    );
    // La formule exacte = 3809.60. La spec affiche 3810 (arrondi).
    // Les deux sont corrects ; on vérifie l'intervalle.
    expect(Math.round(p)).toBe(3810);
    expect(p).toBeGreaterThan(3809);
    expect(p).toBeLessThanOrEqual(3810);
  });

  it('À 3810 €, la marge est bien 1000 €', () => {
    const result = calculate({
      regime: 'marge',
      buyPrice: 2000,
      sellPrice: 3810,
      fees: [{ label: 'F', amount: 508, mode: 'HT' }],
    });
    expect(Math.round(result.profitHt)).toBe(1000);
  });
});

// ─── Berlingo réel (données JSON export) ─────────────────────────────────────

describe('Berlingo réel — A=900 €, P=3990 €, frais ~1133 € HT', () => {
  const car = {
    regime: 'marge' as const,
    buyPrice: 900,
    sellPrice: 3990,
    fees: [{ label: 'Tous frais', amount: 1133, mode: 'HT' as const }],
  };

  it('TVA marge ≈ 515 €', () => {
    expect(Math.round(tvaSell(3990, 900, 'marge'))).toBe(515);
  });

  it('Bénéfice HT ≈ 1442 €', () => {
    const result = calculate(car);
    expect(Math.round(result.profitHt)).toBe(1442);
  });
});

// ─── Frais : les 3 modes ─────────────────────────────────────────────────────

describe('breakdownFee — 3 modes', () => {
  it('TTC : a=1200 → HT=1000, TVA=200, TTC=1200', () => {
    const bd = breakdownFee({ label: 'F', amount: 1200, mode: 'TTC' });
    expect(bd.htCounted).toBe(1000);
    expect(bd.tvaRecovered).toBe(200);
    expect(bd.ttcPaid).toBe(1200);
  });

  it('HT : a=1000 → HT=1000, TVA=200, TTC=1200', () => {
    const bd = breakdownFee({ label: 'F', amount: 1000, mode: 'HT' });
    expect(bd.htCounted).toBe(1000);
    expect(bd.tvaRecovered).toBe(200);
    expect(bd.ttcPaid).toBe(1200);
  });

  it('SANS_TVA : a=500 → HT=500, TVA=0, TTC=500 (carte grise, billet)', () => {
    const bd = breakdownFee({ label: 'Carte grise', amount: 500, mode: 'SANS_TVA' });
    expect(bd.htCounted).toBe(500);
    expect(bd.tvaRecovered).toBe(0);
    expect(bd.ttcPaid).toBe(500);
  });
});

// ─── TVA carburant ───────────────────────────────────────────────────────────

describe('tvaCarburant', () => {
  it('VP : 120 € TTC → TVA récupérée = 80 % × 20 = 16 €', () => {
    expect(tvaCarburant(120, 'VP')).toBe(16);
  });

  it('CTTE : 120 € TTC → TVA récupérée = 100 % × 20 = 20 €', () => {
    expect(tvaCarburant(120, 'CTTE')).toBe(20);
  });
});

// ─── Arrondi "90" ────────────────────────────────────────────────────────────

describe('roundTo90', () => {
  it('3764 → 3790', () => { expect(roundTo90(3764)).toBe(3790); });
  it('3790 → 3790', () => { expect(roundTo90(3790)).toBe(3790); });
  it('3791 → 3890', () => { expect(roundTo90(3791)).toBe(3890); });
  it('4000 → 4090', () => { expect(roundTo90(4000)).toBe(4090); });
  it('4090 → 4090', () => { expect(roundTo90(4090)).toBe(4090); });
});

// ─── Excl. BTW ───────────────────────────────────────────────────────────────

describe('isExclBtw / exclBtwToTtc', () => {
  it('Détecte "excl. btw"', () => { expect(isExclBtw('Golf TDI excl. btw')).toBe(true); });
  it('Détecte "ex btw"', () => { expect(isExclBtw('Transporter ex btw')).toBe(true); });
  it('Ne détecte pas un titre normal', () => { expect(isExclBtw('Berlingo HDI Diesel')).toBe(false); });
  it('3000 € HT → 3630 € TTC', () => { expect(exclBtwToTtc(3000)).toBe(3630); });
});

// ─── Utilitaires centimes ─────────────────────────────────────────────────────

describe('toCents / fromCents', () => {
  it('1234.56 € → 123456 cts', () => { expect(toCents(1234.56)).toBe(123456); });
  it('123456 cts → 1234.56 €', () => { expect(fromCents(123456)).toBe(1234.56); });
  it('Pas d\'arrondi flottant : 0.1+0.2', () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30 € = 30 cts
  });
});

// ─── Conseil de baisse de prix ───────────────────────────────────────────────

describe('priceDropAdvice', () => {
  it('Baisse conseillée si gain/j augmente', () => {
    const advice = priceDropAdvice(3990, 35, 1133, 900, 'marge', 0.05);
    // Après 35 j en stock, une baisse de 5 % devrait accélérer la vente
    expect(advice).toHaveProperty('shouldDrop');
    expect(advice.droppedPrice).toBe(r2(3990 * 0.95));
  });

  it('Prix baissé < prix actuel', () => {
    const advice = priceDropAdvice(3990, 10, 1133, 900, 'marge');
    expect(advice.droppedPrice).toBeLessThan(3990);
  });
});
