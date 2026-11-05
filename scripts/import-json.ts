/**
 * scripts/import-json.ts — Import de l'export JSON vers Supabase
 *
 * Usage :  npx ts-node scripts/import-json.ts ./mem-automotive-sauvegarde-2026-11-03.json
 *
 * Règles :
 * - Les IDs existants sont conservés (ON CONFLICT DO NOTHING)
 * - Montants en euros → centimes (× 100)
 * - Dates ISO → DATE PostgreSQL
 * - Idempotent : relancer ne crée pas de doublons
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { toCents } from '../src/lib/calculations';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cts = (v: unknown): number | null =>
  v != null && !Number.isNaN(Number(v)) ? toCents(Number(v)) : null;

const dateStr = (v: unknown): string | null => {
  if (!v) return null;
  const s = String(v);
  // Format AAAA-MM-JJ ou ISO
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

// ─── Import par collection ────────────────────────────────────────────────────

async function importCars(cars: any[]): Promise<void> {
  console.log(`Cars : ${cars.length} entrée(s)`);
  for (const c of cars) {
    const { error } = await supabase.from('cars').upsert({
      id:                   c.id,
      name:                 c.name,
      plate:                c.plate ?? null,
      vin:                  c.vin ?? null,
      brand:                c.brand ?? null,
      model:                c.model ?? null,
      year:                 c.year ?? null,
      first_reg:            dateStr(c.firstReg),
      km:                   c.km ?? null,
      fuel:                 c.fuel ?? null,
      gearbox:              c.gearbox ?? null,
      color:                c.color ?? null,
      genre:                c.genre ?? 'VP',
      formule:              c.formule ?? null,
      country:              c.country ?? null,
      source:               c.source ?? null,
      link:                 c.link ?? null,
      stage:                c.stage ?? 'repere',
      regime:               c.regime ?? 'marge',
      buy_date:             dateStr(c.buyDate),
      buy_price_cts:        cts(c.buyPrice),
      buy_pay:              c.buyPay ?? null,
      seller_id:            c.sellerId ?? null,
      ask_price_cts:        cts(c.askPrice),
      list_date:            dateStr(c.listDate),
      sell_date:            dateStr(c.sellDate),
      sell_price_cts:       cts(c.sellPrice),
      sell_pay:             c.sellPay ?? null,
      buyer_id:             c.buyerId ?? null,
      // papers : ajouter quitus=false si absent
      papers: {
        decl: false, transit: false, coc: false, ct: false, cg: false, quitus: false,
        ...(c.papers ?? {}),
      },
      photos:               c.photos ?? [],
      docs:                 c.docs ?? [],
      notes:                c.notes ?? null,
      ad_text:              c.adText ?? null,
      planned_fees_cts:     cts(c.plannedFees),
      planned_fees_ttc_cts: cts(c.plannedFeesTtc),
      forecast:             c.forecast ?? null,
      deal_id:              c.dealId ?? null,
      price_drops:          c.priceDrops ?? [],
      created_at:           c.createdAt ?? null,
      bought_at:            c.boughtAt ?? null,
      sold_at:              c.soldAt ?? null,
    }, { onConflict: 'id', ignoreDuplicates: false });
    if (error) console.error(`  ❌ Car ${c.id}: ${error.message}`);
    else console.log(`  ✅ Car: ${c.name} (${c.id})`);
  }
}

async function importExpenses(expenses: any[]): Promise<void> {
  console.log(`Expenses : ${expenses.length} entrée(s)`);
  for (const e of expenses) {
    const { error } = await supabase.from('expenses').upsert({
      id:         e.id,
      date:       dateStr(e.date) ?? dateStr(e.createdAt),
      car_id:     e.carId ?? null,
      cat:        e.cat ?? 'Frais annexes',
      label:      e.label ?? null,
      ttc_cts:    cts(e.ttc) ?? 0,
      tva_cts:    cts(e.tva) ?? 0,
      pay:        e.pay ?? 'banque',
      receipt_id: e.receipt?.id ?? null,
      created_at: e.createdAt ?? null,
    }, { onConflict: 'id', ignoreDuplicates: false });
    if (error) console.error(`  ❌ Expense ${e.id}: ${error.message}`);
  }
  console.log(`  ✅ ${expenses.length} dépenses importées`);
}

async function importDeals(deals: any[]): Promise<void> {
  console.log(`Deals : ${deals.length} entrée(s)`);
  for (const d of deals) {
    const { error } = await supabase.from('deals').upsert({
      id:         d.id,
      name:       d.name ?? null,
      car_id:     d.carId ?? null,
      inputs:     d.inputs ?? {},
      fc:         d.fc ?? null,
      created_at: d.createdAt ?? null,
      updated_at: d.updatedAt ?? d.createdAt ?? null,
    }, { onConflict: 'id', ignoreDuplicates: false });
    if (error) console.error(`  ❌ Deal ${d.id}: ${error.message}`);
  }
  console.log(`  ✅ ${deals.length} affaires importées`);
}

async function importInvoices(invoices: any[]): Promise<void> {
  console.log(`Invoices : ${invoices.length} entrée(s)`);
  for (const inv of invoices) {
    // Calculer le total depuis les lignes
    const total = (inv.lines ?? []).reduce(
      (sum: number, l: any) => sum + (l.qty ?? 1) * (l.price ?? 0), 0
    );
    const { error } = await supabase.from('invoices').upsert({
      id:              inv.id,
      num:             inv.num,
      type:            inv.type,
      date:            dateStr(inv.date),
      car_id:          inv.carId ?? null,
      client_id:       inv.clientId ?? null,
      client_name:     inv.clientName ?? null,
      client_address:  inv.clientAddress ?? null,
      client_siren:    inv.clientSiren ?? null,
      lines:           inv.lines ?? [],
      deposit_cts:     cts(inv.deposit) ?? 0,
      notes:           inv.notes ?? null,
      paid:            inv.paid ?? false,
      paid_date:       dateStr(inv.paidDate),
      paid_at:         inv.paidAt ?? null,
      total_cts:       toCents(total),
      // Les factures existantes sont considérées verrouillées
      locked_at:       inv.paid ? (inv.paidAt ?? new Date().toISOString()) : null,
      created_at:      inv.createdAt ?? null,
    }, { onConflict: 'id', ignoreDuplicates: false });
    if (error) console.error(`  ❌ Invoice ${inv.num}: ${error.message}`);
    else console.log(`  ✅ Facture: ${inv.num} (payée: ${inv.paid})`);
  }
}

async function importSettings(settings: any): Promise<void> {
  console.log('Settings...');
  const { error } = await supabase.from('settings').upsert({
    id:              'main',
    solde_cts:       cts(settings.solde) ?? 0,
    solde_date:      dateStr(settings.soldeDate),
    solde_at:        settings.soldeAt ?? null,
    cash_solde_cts:  cts(settings.cashSolde) ?? 0,
    tva:             settings.tva ?? 20,
    seuil:           settings.seuil ?? 15,
    cible_cts:       cts(settings.cible) ?? 120000,
    mini_cts:        cts(settings.mini) ?? 70000,
    categories:      settings.categories ?? [],
    margin_tiers:    settings.marginTiers ?? [],
    auto_tasks:      settings.autoTasks ?? true,
    company:         settings.company ?? {},
    invoice_next:    settings.invoiceNext ?? 1,
    order_next:      settings.orderNext ?? 1,
    calc_deal:       settings.calc ?? settings.calcDeal ?? {},
    trip:            settings.trip ?? {},
    deal_sort:       settings.dealSort ?? { by: 'recent', dir: 'desc' },
    profit_view:     settings.profitView ?? 'ht',
    vision:          settings.vision ?? null,
    phases:          settings.phases ?? [],
    phase:           settings.phase ?? 0,
  }, { onConflict: 'id' });
  if (error) console.error(`  ❌ Settings: ${error.message}`);
  else console.log('  ✅ Settings importés');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importCollection(
  table: string,
  items: any[],
  transform: (item: any) => Record<string, unknown>
): Promise<void> {
  console.log(`${table} : ${items.length} entrée(s)`);
  if (!items.length) return;
  const rows = items.map(transform);
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
  if (error) console.error(`  ❌ ${table}: ${error.message}`);
  else console.log(`  ✅ ${items.length} entrées importées`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const jsonPath = process.argv[2] ?? path.resolve(__dirname, '../mem-automotive-sauvegarde-2026-11-03.json');

  if (!fs.existsSync(jsonPath)) {
    console.error(`Fichier introuvable : ${jsonPath}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`\n📥 Import MEM AUTOMOTIVE depuis ${path.basename(jsonPath)}`);
  console.log(`Exporté le : ${raw.exportedAt}\n`);

  // Ordre important : contacts avant cars (FK), cars avant expenses/deals
  if (raw.contacts?.length)  await importCollection('contacts', raw.contacts, c => ({ id: c.id, name: c.name, role: c.role, kind: c.kind, phone: c.phone, email: c.email, address: c.address, notes: c.notes }));
  if (raw.cars?.length)       await importCars(raw.cars);
  if (raw.expenses?.length)   await importExpenses(raw.expenses);
  if (raw.deals?.length)      await importDeals(raw.deals);
  if (raw.invoices?.length)   await importInvoices(raw.invoices);
  if (raw.tasks?.length)      await importCollection('tasks', raw.tasks, t => ({ id: t.id, title: t.title, prio: t.prio, due: dateStr(t.due), car_id: t.carId ?? null, paper: t.paper ?? null, done: t.done ?? false, done_at: t.doneAt ?? null, created_at: t.createdAt ?? null }));
  if (raw.events?.length)     await importCollection('events', raw.events, e => ({ id: e.id, title: e.title, kind: e.kind, site: e.site, date: dateStr(e.date), time: e.time ?? null, repeat: e.repeat ?? 'none', until: dateStr(e.until), link: e.link ?? null, notes: e.notes ?? null }));
  if (raw.auctions?.length)   await importCollection('auctions', raw.auctions, a => ({ id: a.id, title: a.title, site: a.site, link: a.link, result: a.result ?? 'encours', car_id: a.carId ?? null }));
  if (raw.sites?.length)      await importCollection('sites', raw.sites, s => ({ id: s.id, name: s.name, country: s.country, type: s.type, freq: s.freq, url: s.url ?? null, note: s.note ?? null, seen_at: dateStr(s.seen) }));
  if (raw.cash?.length)       await importCollection('cash', raw.cash, c => ({ id: c.id, label: c.label, amount_cts: cts(c.amount) ?? 0, date: dateStr(c.date), done: c.done ?? false }));
  if (raw.moves?.length)      await importCollection('moves', raw.moves, m => ({ id: m.id, kind: m.kind, amount_cts: cts(m.amount) ?? 0, date: dateStr(m.date), label: m.label ?? null, created_at: m.createdAt ?? null }));
  if (raw.goals?.length)      await importCollection('goals', raw.goals, g => ({ id: g.id, title: g.title, horizon: g.horizon, deadline: dateStr(g.deadline), metric: g.metric, target: g.target, why: g.why, done: g.done ?? false }));
  if (raw.launch?.length)     await importCollection('launch', raw.launch, l => ({ id: l.id, title: l.title, short: l.short, detail: l.detail, dmin: l.dmin, dmax: l.dmax, start_date: dateStr(l.startDate), done_date: dateStr(l.doneDate), done: l.done ?? false, order: l.order, prereq: l.prereq ?? [] }));
  if (raw.settings)           await importSettings(raw.settings);

  console.log('\n✅ Import terminé. Vérifie le nombre de lignes dans Supabase.\n');
}

main().catch(err => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
