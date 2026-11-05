/**
 * Import JSON → Supabase via REST API
 * Node.js pur (pas de TypeScript), aucune dépendance externe.
 * Usage : node scripts/import-json.mjs <chemin-vers-sauvegarde.json>
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const URL_BASE  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const API_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !API_KEY) {
  console.error('Variables NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises.');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cts   = v => (v != null && v !== '' && !isNaN(Number(v))) ? Math.round(Number(v) * 100) : null;
const date  = v => { if (!v) return null; const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };
const time_ = v => (v && String(v).match(/^\d{2}:\d{2}/)) ? String(v) : null;
const num_  = v => (v != null && v !== '' && !isNaN(Number(v))) ? Number(v) : null;
const int_  = v => (v != null && v !== '' && !isNaN(Number(v))) ? Math.floor(Number(v)) : null;

async function upsert(table, rows) {
  if (!rows || rows.length === 0) return { ok: true, count: 0 };
  const r = await fetch(`${URL_BASE}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) {
    const err = await r.text();
    return { ok: false, error: err };
  }
  return { ok: true, count: rows.length };
}

async function run(result, label) {
  if (result.ok) console.log(`  ✅ ${label} : ${result.count} entrée(s)`);
  else console.error(`  ❌ ${label} : ${result.error}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const jsonPath = process.argv[2] ?? resolve(__dir, '../../mem-automotive-sauvegarde-2026-11-03.json');
const raw = JSON.parse(readFileSync(jsonPath, 'utf-8'));

console.log(`\n📥 Import MEM AUTOMOTIVE depuis ${jsonPath.split('/').pop()}`);
console.log(`Exporté le : ${raw.exportedAt}\n`);

// Settings
await run(await upsert('settings', [{
  id: 'main',
  solde_cts:      cts(raw.settings?.solde)    ?? 0,
  solde_date:     date(raw.settings?.soldeDate),
  solde_at:       raw.settings?.soldeAt ?? null,
  cash_solde_cts: cts(raw.settings?.cashSolde) ?? 0,
  tva:            raw.settings?.tva   ?? 20,
  seuil:          raw.settings?.seuil ?? 15,
  cible_cts:      cts(raw.settings?.cible) ?? 120000,
  mini_cts:       cts(raw.settings?.mini)  ?? 70000,
  categories:     raw.settings?.categories ?? [],
  margin_tiers:   raw.settings?.marginTiers ?? [],
  auto_tasks:     raw.settings?.autoTasks ?? true,
  company:        raw.settings?.company ?? {},
  invoice_next:   raw.settings?.invoiceNext ?? 1,
  order_next:     raw.settings?.orderNext ?? 1,
  calc_deal:      raw.settings?.calc ?? raw.settings?.calcDeal ?? {},
  trip:           raw.settings?.trip ?? {},
  deal_sort:      raw.settings?.dealSort ?? { by: 'recent', dir: 'desc' },
  profit_view:    raw.settings?.profitView ?? 'ht',
  vision:         raw.settings?.vision ?? null,
  phases:         raw.settings?.phases ?? [],
  phase:          raw.settings?.phase ?? 0,
}]), 'settings');

// Contacts
if (raw.contacts?.length) await run(await upsert('contacts',
  raw.contacts.map(c => ({ id: c.id, name: c.name, role: c.role, kind: c.kind ?? 'particulier', phone: c.phone ?? null, email: c.email ?? null, address: c.address ?? null, notes: c.notes ?? null }))
), 'contacts');

// Collecte les IDs voitures existantes pour éviter les FK violations
const carIds = new Set((raw.cars ?? []).map(c => c.id));

// Cars
if (raw.cars?.length) await run(await upsert('cars',
  raw.cars.map(c => ({
    id: c.id, name: c.name, plate: c.plate ?? null, vin: c.vin ?? null,
    brand: c.brand ?? null, model: c.model ?? null, year: c.year ?? null,
    first_reg: date(c.firstReg), km: c.km ?? null, fuel: c.fuel ?? null,
    gearbox: c.gearbox ?? null, color: c.color ?? null, genre: c.genre ?? 'VP',
    formule: c.formule ?? null, country: c.country ?? null, source: c.source ?? null,
    link: c.link ?? null, stage: c.stage ?? 'repere', regime: c.regime ?? 'marge',
    buy_date: date(c.buyDate), buy_price_cts: cts(c.buyPrice), buy_pay: c.buyPay ?? null,
    seller_id: null,
    ask_price_cts: cts(c.askPrice), list_date: date(c.listDate),
    sell_date: date(c.sellDate), sell_price_cts: cts(c.sellPrice), sell_pay: c.sellPay ?? null,
    buyer_id: null,
    papers: { decl:false, transit:false, coc:false, ct:false, cg:false, quitus:false, ...(c.papers ?? {}) },
    photos: c.photos ?? [], docs: c.docs ?? [], notes: c.notes ?? null, ad_text: c.adText ?? null,
    planned_fees_cts: cts(c.plannedFees), planned_fees_ttc_cts: cts(c.plannedFeesTtc),
    forecast: c.forecast ?? null, deal_id: c.dealId ?? null,
    price_drops: c.priceDrops ?? [],
    created_at: c.createdAt ?? null, bought_at: c.boughtAt ?? null, sold_at: c.soldAt ?? null,
  }))
), 'cars');

// Expenses
if (raw.expenses?.length) await run(await upsert('expenses',
  raw.expenses.map(e => ({
    id: e.id, date: date(e.date) ?? date(e.createdAt),
    car_id: (e.carId && carIds.has(e.carId)) ? e.carId : null, cat: e.cat ?? 'Frais annexes',
    label: e.label ?? null, ttc_cts: cts(e.ttc) ?? 0, tva_cts: cts(e.tva) ?? 0,
    pay: e.pay ?? 'banque', receipt_id: e.receipt?.id ?? null, created_at: e.createdAt ?? null,
  }))
), 'expenses');

// Deals
if (raw.deals?.length) await run(await upsert('deals',
  raw.deals.map(d => ({
    id: d.id, name: d.name ?? null, car_id: (d.carId && carIds.has(d.carId)) ? d.carId : null,
    inputs: d.inputs ?? {}, fc: d.fc ?? null,
    created_at: d.createdAt ?? null, updated_at: d.updatedAt ?? d.createdAt ?? null,
  }))
), 'deals');

// Invoices
if (raw.invoices?.length) await run(await upsert('invoices',
  raw.invoices.map(inv => ({
    id: inv.id, num: inv.num, type: inv.type, date: date(inv.date),
    car_id: (inv.carId && carIds.has(inv.carId)) ? inv.carId : null, client_id: null,
    client_name: inv.clientName ?? null, client_address: inv.clientAddress ?? null,
    lines: inv.lines ?? [],
    total_cts: Math.round((inv.lines ?? []).reduce((s, l) => s + (l.qty ?? 1) * (l.price ?? 0), 0) * 100) || 0,
    deposit_cts: cts(inv.deposit) ?? 0, notes: inv.notes ?? null,
    paid: inv.paid ?? false, paid_date: date(inv.paidDate), paid_at: inv.paidAt ?? null,
    locked_at: inv.paid ? (inv.paidAt ?? new Date().toISOString()) : null,
    created_at: inv.createdAt ?? null,
  }))
), 'invoices');

// Tasks
if (raw.tasks?.length) await run(await upsert('tasks',
  raw.tasks.map(t => ({
    id: t.id, title: t.title, prio: t.prio ?? 2, due: date(t.due),
    car_id: (t.carId && carIds.has(t.carId)) ? t.carId : null, paper: t.paper ?? null,
    done: t.done ?? false, done_at: t.doneAt ?? null, created_at: t.createdAt ?? null,
  }))
), 'tasks');

// Events
if (raw.events?.length) await run(await upsert('events',
  raw.events.map(e => ({
    id: e.id, title: e.title, kind: e.kind ?? null, site: e.site ?? null,
    date: date(e.date), time: time_(e.time), repeat: e.repeat ?? 'none',
    until: date(e.until), link: e.link ?? null, notes: e.notes ?? null,
  }))
), 'events');

// Auctions
if (raw.auctions?.length) await run(await upsert('auctions',
  raw.auctions.map(a => ({
    id: a.id, title: a.title, site: a.site ?? null, link: a.link ?? null,
    result: a.result ?? 'encours', car_id: a.carId ?? null,
  }))
), 'auctions');

// Sites
if (raw.sites?.length) await run(await upsert('sites',
  raw.sites.map(s => ({
    id: s.id, name: s.name, country: s.country ?? null, type: s.type ?? null,
    freq: s.freq ?? 'semaine', url: s.url ?? null, note: s.note ?? null,
    seen_at: date(s.seen),
  }))
), 'sites');

// Cash
if (raw.cash?.length) await run(await upsert('cash',
  raw.cash.map(c => ({
    id: c.id, label: c.label, amount_cts: cts(c.amount) ?? 0,
    date: date(c.date), done: c.done ?? false,
  }))
), 'cash');

// Moves
if (raw.moves?.length) await run(await upsert('moves',
  raw.moves.map(m => ({
    id: m.id, kind: m.kind, amount_cts: cts(m.amount) ?? 0,
    date: date(m.date), label: m.label ?? null, created_at: m.createdAt ?? null,
  }))
), 'moves');

// Goals
if (raw.goals?.length) await run(await upsert('goals',
  raw.goals.map(g => ({
    id: g.id, title: g.title, horizon: g.horizon ?? null, deadline: date(g.deadline),
    metric: g.metric ?? null, target: num_(g.target), why: g.why ?? null, done: g.done ?? false,
  }))
), 'goals');

// Launch
if (raw.launch?.length) await run(await upsert('launch',
  raw.launch.map(l => ({
    id: l.id, title: l.title, short: l.short ?? null, detail: l.detail ?? null,
    dmin: int_(l.dmin), dmax: int_(l.dmax),
    start_date: date(l.startDate), done_date: date(l.doneDate),
    done: l.done ?? false, "order": int_(l.order), prereq: l.prereq ?? [],
  }))
), 'launch');

console.log('\n✅ Import terminé.\n');
