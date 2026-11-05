/**
 * Types TypeScript — MEM AUTOMOTIVE Ordinateur de Bord
 * Miroir du schéma SQL. Montants en CENTIMES dans la DB, en euros dans l'UI.
 */

export type Regime  = 'marge' | 'normal';
export type Stage   =
  | 'repere' | 'contacte' | 'negociation' | 'chercher'
  | 'achete' | 'preparation' | 'vente' | 'reserve' | 'vendu' | 'abandonne';
export type FeeMode       = 'TTC' | 'HT' | 'SANS_TVA';
export type ProfitView    = 'HT' | 'TTC' | 'Prudent';
export type Genre         = 'VP' | 'CTTE' | 'autre';
export type AuctionResult = 'encours' | 'gagnee' | 'perdue';
export type InvoiceType   = 'marge' | 'vtva' | 'tva' | 'bon';
export type ContactRole   = 'acheteur' | 'vendeur' | 'garage' | 'carrossier' | 'depanneur' | 'pieces' | 'transporteur' | 'autre';
export type PayMethod     = 'virement' | 'cheque_de_banque' | 'especes' | 'carte_bancaire';

// ─── 6 Papiers ───────────────────────────────────────────────────────────────

export const PAPERS = [
  { key: 'decl',    label: "Déclaration d'achat" },
  { key: 'transit', label: 'Plaques transit' },
  { key: 'coc',     label: 'COC' },
  { key: 'ct',      label: 'Contrôle technique' },
  { key: 'cg',      label: 'Carte grise' },
  { key: 'quitus',  label: 'Quitus fiscal' },  // ← 6e papier
] as const;

export type PaperKey = typeof PAPERS[number]['key'];
export type Papers   = Record<PaperKey, boolean>;

// ─── Cars ─────────────────────────────────────────────────────────────────────

export interface Car {
  id:                   string;
  name:                 string;
  plate?:               string;
  vin?:                 string;
  brand?:               string;
  model?:               string;
  year?:                number;
  firstReg?:            string;   // DATE AAAA-MM-JJ
  km?:                  number;
  fuel?:                string;
  gearbox?:             string;
  color?:               string;
  genre:                Genre;
  country?:             string;
  source?:              string;
  link?:                string;
  sourceAdId?:          string;   // ID bot Discord
  stage:                Stage;
  regime:               Regime;
  buyDate?:             string;
  buyPriceCts?:         number;   // centimes
  buyPay?:              PayMethod;
  sellerId?:            string;
  askPriceCts?:         number;
  listDate?:            string;
  sellDate?:            string;
  sellPriceCts?:        number;
  sellPay?:             PayMethod;
  buyerId?:             string;
  papers:               Papers;
  photos:               FileRef[];
  docs:                 FileRef[];
  notes?:               string;
  adText?:              string;
  plannedFeesCts?:      number;
  plannedFeesTtcCts?:   number;
  forecast?:            ForecastData;
  dealId?:              string;
  priceDrops:           PriceDrop[];
  createdAt:            string;
  boughtAt?:            string;
  soldAt?:              string;
}

export interface FileRef {
  id:   string;
  name: string;
}

export interface PriceDrop {
  date: string;
  from: number;  // euros
  to:   number;
}

export interface ForecastData {
  buy:     number;
  date:    string;
  days:    number;
  fees:    number;
  feesTtc: number;
  sell:    number;
  tva:     number;
  margin:  number;
  rate:    number;
  regime:  Regime;
  rows:    ForecastRow[];
}

export interface ForecastRow {
  k:      string;
  label:  string;
  amount: number;
  vat:    string;
  ht:     number;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id:        string;
  date:      string;
  carId?:    string;    // null = frais société
  cat:       string;
  label?:    string;
  ttcCts:    number;    // centimes
  tvaCts:    number;
  pay:       'banque' | 'especes';
  receiptId?: string;
  createdAt: string;
}

// ─── Deals ───────────────────────────────────────────────────────────────────

export type DealStatus = 'brouillon' | 'previsionnel' | 'vendue' | 'abandonnee';

export interface Deal {
  id:        string;
  name?:     string;
  carId?:    string;
  inputs:    DealInputs;
  fc?:       ForecastData;
  status:    DealStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealInputs {
  buy?:     number;
  country?: string;
  days?:    number;
  fix?:     number;
  link?:    string;
  mMode?:   string;
  margin?:  number;
  market?:  number;
  name?:    string;
  nego?:    number;
  regime?:  Regime;
  rows?:    FeeRow[];
  sell?:    number;
}

export interface FeeRow {
  k:      string;
  label:  string;
  amount: number;
  vat:    FeeMode;
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export interface Invoice {
  id:              string;
  num:             string;
  type:            InvoiceType;
  date:            string;
  carId?:          string;
  clientId?:       string;
  clientName?:     string;
  clientAddress?:  string;
  clientSiren?:    string;
  lines:           InvoiceLine[];
  depositCts:      number;
  notes?:          string;
  paid:            boolean;
  paidDate?:       string;
  totalCts:        number;
  lockedAt?:       string;   // null = brouillon, non-null = verrouillée
  createdAt:       string;
}

export interface InvoiceLine {
  label: string;
  qty:   number;
  price: number;   // euros
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export interface Contact {
  id:         string;
  name:       string;
  role?:      ContactRole;
  kind:       'particulier' | 'pro';
  siren?:     string;
  sexe?:      string;
  birthDate?: string;
  birthPlace?:string;
  phone?:     string;
  email?:     string;
  address?:   string;
  idDoc?:     string;   // pièce d'identité (livre de police)
  wants?:     string;
  budgetCts?: number;
  notes?:     string;
  createdAt:  string;
}

// ─── Police Log ──────────────────────────────────────────────────────────────

export interface PoliceEntry {
  id:         number;      // SERIAL PostgreSQL
  carId:      string;
  entryDate:  string;
  action:     'achat' | 'vente';
  data:       PoliceData;
  createdBy:  string;
}

export interface PoliceData {
  vehicle: {
    plate?: string; vin?: string; brand?: string; model?: string;
    year?: number; km?: number; fuel?: string; color?: string;
  };
  seller?: { name: string; address: string; idDoc: string };
  buyer?:  { name: string; address: string; idDoc: string };
  date:    string;
  priceCts: number;
  pay:     string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface Settings {
  id:              'main';
  soldeCts:        number;
  soldeDate?:      string;
  cashSoldeCts:    number;
  tva:             number;
  seuil:           number;
  cibleCts:        number;
  miniCts:         number;
  categories:      string[];
  marginTiers:     MarginTier[];
  autoTasks:       boolean;
  company:         CompanyInfo;
  invoiceNext:     number;
  calcDeal:        CalcDefaults;
  profitView:      ProfitView;
  vision?:         string;
  phases:          Phase[];
  phase:           number;
}

export interface MarginTier {
  maxPrice: number;
  green:    number;   // taux vert
  red:      number;   // taux rouge
}

export interface CompanyInfo {
  name?: string; legal?: string; capital?: number;
  address?: string; siret?: string; rcs?: string;
  tvaNum?: string; iban?: string; bic?: string;
  phone?: string; email?: string; city?: string;
  signatory?: string;
}

export interface CalcDefaults {
  fee?: number; fixed?: number; transport?: number;
  papers?: number; repairs?: number;
}

export interface Phase {
  desc: string; start?: string; end?: string; active?: boolean;
}
