'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  VAT_RATES, VAT_MODES, FEE_STD, FeeRow, CalcInput, CalcResult,
  normRows, rowVat, rowsVat, roundLbc, calcCompute, tierFor, tripCalc, TripInput,
} from '@/lib/deal-calc';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, ChevronDown, ChevronUp, ArrowUpDown,
  Save, ExternalLink, Car, MessageCircle, FileText, X,
  CheckSquare, Square, ArrowRight,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────
const eur = (n: number, dec = 0) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: dec }).format(n);
const pct1 = (n: number) => (n * 100).toFixed(1) + ' %';
const perDay = (margin: number, days: number) => days > 0 ? margin / days : 0;
const eurDay = (n: number) => eur(n, 2) + '/j';
const has = (v: any) => v !== null && v !== undefined && v !== '';

const COUNTRIES = Object.keys(VAT_RATES);
const DEAL_STATUSES = { draft: 'Brouillon', prevision: 'Prévisionnel', sold: 'Vendue', abandoned: 'Abandonnée' };
const TRIP_MODES = {
  train: { label: 'Train / bus aller', sub: 'Retour en conduisant la voiture' },
  car:   { label: 'Ma voiture + remorque', sub: 'Aller-retour, voiture sur remorque' },
  truck: { label: 'Transporteur / plateau', sub: 'Je fais livrer la voiture' },
};

const DEFAULT_INPUT = (): CalcInput => ({
  buy: '', regime: 'marge', country: 'Pays-Bas', priceType: 'ttc',
  rows: normRows([]), mMode: 'eur', margin: '1200', fix: 'margin',
  sell: '', nego: '', round: '90', market: '', days: '30', profitView: 'ht', tva: 20,
});

// ── Deal type ─────────────────────────────────────────────
interface Deal {
  id: string; name: string; status: string;
  inputs: Partial<CalcInput>; fc: any;
  car_id?: string; updated_at: string;
}

// ── Main component ────────────────────────────────────────
interface Props {
  initialDeals: Deal[];
  cars: { id: string; name: string; plate: string; stage: string; deal_id?: string }[];
  settings: any;
}

export default function CalculerClient({ initialDeals, cars, settings }: Props) {
  const sb = createClient();

  const tva = settings?.tva ?? 20;
  const mini = settings?.mini ?? 700;
  const cible = settings?.cible ?? 1200;

  // ── State ─────────────────────────────────────────────
  const [inp, setInp] = useState<CalcInput>(() => {
    const saved = settings?.calc_deal ?? {};
    return {
      ...DEFAULT_INPUT(),
      rows: normRows(saved.rows ?? []),
      mMode: saved.mMode ?? 'eur',
      margin: has(saved.margin) ? String(saved.margin) : String(cible),
      nego: has(saved.nego) ? String(saved.nego) : '',
      round: saved.round ?? '90',
      days: has(saved.days) ? String(saved.days) : '30',
      tva,
    };
  });

  const [currentDealId, setCurrentDealId]   = useState<string | null>(null);
  const [deals, setDeals]                   = useState<Deal[]>(initialDeals);
  const [profitView, setProfitView]         = useState<'ht' | 'ttc' | 'prudent'>('ht');
  const [compareIds, setCompareIds]         = useState<string[]>([]);
  const [showCompare, setShowCompare]       = useState(false);
  const [showTrip, setShowTrip]             = useState(false);
  const [showDeals, setShowDeals]           = useState(true);
  const [sortBy, setSortBy]                 = useState<string>('recent');
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('desc');
  const [waNum, setWaNum]                   = useState(settings?.wa_num ?? '');
  const [dealName, setDealName]             = useState('');
  const [trip, setTrip]                     = useState<TripInput>({
    home: settings?.trip?.home ?? '', dest: '', km: '',
    mode: settings?.trip?.mode ?? 'train', ticket: '', conso: String(settings?.trip?.conso ?? 7),
    myConso: String(settings?.trip?.myConso ?? 9), fuel: String(settings?.trip?.fuel ?? 1.75),
    tolls: '', truck: '', other: '',
  });

  // ── Computed ──────────────────────────────────────────
  const result = useMemo(() => calcCompute({ ...inp, profitView, tva }), [inp, profitView, tva]);

  const setF = useCallback(<K extends keyof CalcInput>(k: K, v: CalcInput[K]) => {
    setInp(prev => ({ ...prev, [k]: v }));
  }, []);

  const setRow = (i: number, field: keyof FeeRow, val: string) => {
    setInp(prev => {
      const rows = prev.rows.map((r, idx) =>
        idx === i ? { ...r, [field]: val } : r
      );
      return { ...prev, rows };
    });
  };

  const addRow = () => setInp(prev => ({
    ...prev,
    rows: [...prev.rows, { k: '', label: '', amount: '', vat: 'ttc' }],
  }));

  const removeRow = (i: number) => setInp(prev => ({
    ...prev, rows: prev.rows.filter((_, idx) => idx !== i),
  }));

  // ── Reload deals ───────────────────────────────────────
  const reloadDeals = async () => {
    const { data } = await sb.from('deals').select('*').order('updated_at', { ascending: false });
    if (data) setDeals(data);
  };

  // ── Save deal ──────────────────────────────────────────
  const saveDeal = async (asNew = false) => {
    if (!result || (result as any).needSell) {
      toast.error('Entre un prix d\'achat et un prix de vente');
      return null;
    }
    const r = result as CalcResult;
    const now = new Date().toISOString();
    const fc = {
      buy: inp.buy, sell: String(r.pShow), margin: String(r.real),
      rate: String(r.rateShow), cost: String(r.cost), feeHt: String(r.feeHt),
      days: inp.days, perday: String(perDay(r.real, parseFloat(inp.days) || 30)),
    };
    const payload = {
      name: dealName || `Affaire du ${new Date().toLocaleDateString('fr-FR')}`,
      inputs: { ...inp, tva },
      fc, status: 'draft', updated_at: now,
    };

    if (!asNew && currentDealId) {
      await sb.from('deals').update(payload).eq('id', currentDealId);
      toast.success('Affaire mise à jour');
    } else {
      const { data } = await sb.from('deals').insert(payload).select().single();
      if (data) { setCurrentDealId(data.id); toast.success('Affaire enregistrée'); }
    }
    await reloadDeals();
    return payload;
  };

  const deleteDeal = async (id: string) => {
    if (!confirm('Supprimer cette affaire ?')) return;
    await sb.from('deals').delete().eq('id', id);
    if (id === currentDealId) { setCurrentDealId(null); setInp(DEFAULT_INPUT()); }
    await reloadDeals();
    toast.success('Affaire supprimée');
  };

  const loadDeal = (d: Deal) => {
    setInp({ ...DEFAULT_INPUT(), ...d.inputs, rows: normRows((d.inputs?.rows ?? []) as any), tva });
    setCurrentDealId(d.id);
    setDealName(d.name);
    toast.success(`Affaire chargée : ${d.name}`);
  };

  const saveAsDefault = async () => {
    await sb.from('settings').upsert({
      id: 'main',
      calc_deal: {
        rows: inp.rows.map(r => ({ k: r.k, label: r.label, amount: r.amount, vat: r.vat })),
        mMode: inp.mMode, margin: inp.margin, nego: inp.nego, round: inp.round, days: inp.days,
      },
    });
    toast.success('Frais et marge gardés par défaut');
  };

  // ── Create car from deal ──────────────────────────────
  const createCar = async () => {
    if (!result || (result as any).needSell) return;
    const r = result as CalcResult;
    const { data } = await sb.from('cars').insert({
      name: dealName || 'Voiture repérée',
      stage: 'repere', regime: r.normal ? 'normal' : 'marge',
      buy_price_cts: Math.round(r.A * 100),
      link: '', country: r.normal ? inp.country : '',
      forecast: { pShow: r.pShow, real: r.real, feeHt: r.feeHt, cost: r.cost },
      papers: {}, photos: [],
    }).select().single();
    if (data) {
      toast.success('Voiture créée en "Repéré"');
      if (currentDealId) await sb.from('deals').update({ car_id: data.id }).eq('id', currentDealId);
    }
  };

  // ── Apply trip ────────────────────────────────────────
  const applyTrip = () => {
    const tr = tripCalc(trip);
    if (tr.total <= 0) { toast.error('Entre la distance ou un prix'); return; }
    setInp(prev => {
      const rows = normRows(prev.rows);
      const rc = rows.find(r => r.k === 'carburant');
      const rt = rows.find(r => r.k === 'trajet');
      if (rc) rc.amount = String(Math.round(tr.fuel));
      if (rt) rt.amount = String(Math.round(tr.tolls + tr.ticket + tr.truck + tr.other));
      return { ...prev, rows };
    });
    sb.from('settings').upsert({ id: 'main', trip: { home: trip.home, mode: trip.mode, conso: trip.conso, myConso: trip.myConso, fuel: trip.fuel } });
    setShowTrip(false);
    toast.success(`Carburant ${eur(tr.fuel)} + Trajet ${eur(tr.tolls + tr.ticket + tr.truck + tr.other)} mis à jour`);
  };

  // ── WhatsApp ──────────────────────────────────────────
  const sendWhatsApp = () => {
    if (!result || (result as any).needSell) return;
    const r = result as CalcResult;
    const msg = `🚗 ${dealName || 'Affaire'}\n\nAchat : ${eur(r.A)}${r.normal ? ' HT' : ''}\nFrais : ${eur(r.feeHt)} HT\nCoût : ${eur(r.cost)}\n\nPrix affiché : ${eur(r.pShow)}\nMarge nette : ${eur(r.real)} (${pct1(r.rateShow)})\nTVA à reverser : ${eur(r.tvaShow)}\n\nGain/jour (${inp.days}j) : ${eurDay(perDay(r.real, parseFloat(inp.days) || 30))}`;
    const num = waNum.replace(/\D/g, '');
    if (num) window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    else { const edited = prompt('Numéro WhatsApp :', '33'); if (edited) { setWaNum(edited); window.open(`https://wa.me/${edited.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank'); } }
  };

  // ── Compare ────────────────────────────────────────────
  const toggleCompare = (id: string) => {
    setCompareIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareDeals = useMemo(() => {
    return compareIds.map(id => {
      const d = deals.find(x => x.id === id);
      if (!d) return null;
      const ci: CalcInput = { ...DEFAULT_INPUT(), ...d.inputs, rows: normRows((d.inputs?.rows ?? []) as any), tva };
      return { deal: d, result: calcCompute({ ...ci, profitView: 'ht', tva }), input: ci };
    }).filter(Boolean);
  }, [compareIds, deals, tva]);

  // ── Sorted deals ──────────────────────────────────────
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => {
      let va: any, vb: any;
      if (sortBy === 'recent')  { va = a.updated_at; vb = b.updated_at; }
      else if (sortBy === 'margin') { va = parseFloat(a.fc?.margin ?? '0'); vb = parseFloat(b.fc?.margin ?? '0'); }
      else if (sortBy === 'rate')   { va = parseFloat(a.fc?.rate ?? '0');   vb = parseFloat(b.fc?.rate ?? '0'); }
      else if (sortBy === 'perday') { va = parseFloat(a.fc?.perday ?? '0'); vb = parseFloat(b.fc?.perday ?? '0'); }
      else if (sortBy === 'cost')   { va = parseFloat(a.fc?.cost ?? '0');   vb = parseFloat(b.fc?.cost ?? '0'); }
      else { va = a.updated_at; vb = b.updated_at; }
      return sortDir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
    });
  }, [deals, sortBy, sortDir]);

  const FV = rowsVat(inp.rows, tva / 100);

  // ── Render ─────────────────────────────────────────────
  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 80px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Topbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Calculer une affaire
          </h1>
          <p style={{ margin: '3px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {currentDealId ? `Affaire en cours : ${dealName}` : 'Du prix d\'achat au prix affiché sur Leboncoin'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {currentDealId && (
            <Button variant="ghost" size="sm" onClick={() => { setInp(DEFAULT_INPUT()); setCurrentDealId(null); setDealName(''); }}>
              <Plus size={14} /> Nouvelle
            </Button>
          )}
          <Button size="sm" onClick={() => saveDeal()}>
            <Save size={14} /> Enregistrer
          </Button>
        </div>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

        {/* ════ LEFT — Inputs ════ */}
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Infos voiture */}
          <Section title="La voiture">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Nom / modèle">
                <Input placeholder="ex: Peugeot 308 HDi 2018" value={dealName}
                  onChange={e => setDealName(e.target.value)} />
              </Field>
              <Field label="Lien annonce">
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input placeholder="https://…" value={inp.link ?? ''}
                    onChange={e => setF('link' as any, e.target.value)} />
                  {inp.link && <a href={inp.link as string} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon"><ExternalLink size={13} /></Button>
                  </a>}
                </div>
              </Field>
              <Field label="Régime TVA" className="col-span-2">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['marge', 'normal'] as const).map(r => (
                    <Button key={r} size="sm"
                      variant={inp.regime === r ? 'default' : 'secondary'}
                      onClick={() => setF('regime', r)}>
                      {r === 'marge' ? 'TVA sur marge' : 'TVA récupérable (pro)'}
                    </Button>
                  ))}
                </div>
              </Field>
              {inp.regime === 'normal' && <>
                <Field label="Pays du vendeur">
                  <select style={{ ...inpStyle }} value={inp.country}
                    onChange={e => setF('country', e.target.value)}>
                    {COUNTRIES.map(c => (
                      <option key={c} value={c}>{c} — TVA {VAT_RATES[c]} %</option>
                    ))}
                  </select>
                </Field>
                <Field label="Le prix vu est">
                  <select style={{ ...inpStyle }} value={inp.priceType}
                    onChange={e => setF('priceType', e.target.value as any)}>
                    <option value="ttc">TTC — TVA {VAT_RATES[inp.country] ?? 20} % comprise</option>
                    <option value="ht">HT — hors taxes</option>
                  </select>
                </Field>
              </>}
            </div>
          </Section>

          {/* Prix d'achat */}
          <Section title="Prix d'achat">
            <Field label={inp.regime === 'normal' && inp.priceType === 'ht' ? 'Prix d\'achat HT (€)' : 'Prix d\'achat (€)'}>
              <Input type="number" inputMode="decimal" placeholder="0"
                value={inp.buy} onChange={e => setF('buy', e.target.value)}
                style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, height: 44 }} />
            </Field>
            {inp.regime === 'normal' && inp.buy && parseFloat(inp.buy) > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                {inp.priceType === 'ttc'
                  ? `Prix HT : ${eur((parseFloat(inp.buy) || 0) / (1 + (VAT_RATES[inp.country] ?? 20) / 100))} · TVA ${VAT_RATES[inp.country] ?? 20} % : ${eur((parseFloat(inp.buy) || 0) - (parseFloat(inp.buy) || 0) / (1 + (VAT_RATES[inp.country] ?? 20) / 100))}`
                  : `Prix TTC : ${eur((parseFloat(inp.buy) || 0) * (1 + (VAT_RATES[inp.country] ?? 20) / 100))}`
                }
              </div>
            )}
            <Field label="Prix du marché Leboncoin (€)" style={{ marginTop: 10 }}>
              <Input type="number" inputMode="decimal" placeholder="Voitures similaires autour de…"
                value={inp.market} onChange={e => setF('market', e.target.value)} />
            </Field>
          </Section>

          {/* Frais */}
          <Section title="Frais" action={
            <Button variant="ghost" size="sm" onClick={() => setShowTrip(t => !t)}>
              🚗 Calculer le trajet
            </Button>
          }>
            {showTrip && <TripPanel trip={trip} setTrip={setTrip} onApply={applyTrip} />}

            <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
              {inp.rows.map((row, i) => (
                <FeeRowItem key={i} row={row} index={i}
                  onChange={(field, val) => setRow(i, field, val)}
                  onRemove={row.k ? undefined : () => removeRow(i)}
                  tva={tva} />
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Total frais :
                <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, color: 'var(--text)', marginLeft: 6 }}>
                  {eur(FV.ht)} HT
                </span>
                <span style={{ marginLeft: 6, color: 'var(--text-subtle)', fontSize: 12 }}>
                  ({eur(FV.ttc)} TTC)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" onClick={addRow}><Plus size={13} /> Frais libre</Button>
                <Button variant="ghost" size="sm" onClick={saveAsDefault}>Garder par défaut</Button>
              </div>
            </div>
          </Section>

          {/* Prix / Marge */}
          <Section title="Prix ou marge">
            {/* Fix mode */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {(['margin', 'price'] as const).map(f => (
                <Button key={f} size="sm"
                  variant={inp.fix === f ? 'default' : 'secondary'}
                  onClick={() => setF('fix', f)}>
                  {f === 'margin' ? 'Je fixe ma marge' : 'Je fixe mon prix de vente'}
                </Button>
              ))}
            </div>

            {inp.fix === 'margin' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Mode de marge">
                  <select style={inpStyle} value={inp.mMode} onChange={e => setF('mMode', e.target.value as any)}>
                    <option value="eur">Marge en €</option>
                    <option value="pct">% du coût de revient</option>
                    <option value="pv">% du prix de vente</option>
                  </select>
                </Field>
                <Field label={inp.mMode === 'eur' ? 'Marge visée (€)' : inp.mMode === 'pct' ? '% du coût' : '% du prix de vente'}>
                  <Input type="number" inputMode="decimal" value={inp.margin}
                    onChange={e => setF('margin', e.target.value)} />
                </Field>
                <Field label="Négociation à déduire (€)">
                  <Input type="number" inputMode="decimal" placeholder="0"
                    value={inp.nego} onChange={e => setF('nego', e.target.value)} />
                </Field>
                <Field label="Arrondi prix Leboncoin">
                  <select style={inpStyle} value={inp.round} onChange={e => setF('round', e.target.value as any)}>
                    <option value="90">…90 (3 790, 4 490…)</option>
                    <option value="100">Centaine (3 800, 4 500…)</option>
                    <option value="none">Aucun arrondi</option>
                  </select>
                </Field>
              </div>
            ) : (
              <Field label="Prix de vente à tester (€)">
                <Input type="number" inputMode="decimal" placeholder="0"
                  value={inp.sell} onChange={e => setF('sell', e.target.value)}
                  style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, height: 44 }} />
              </Field>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <Field label="Jours de détention prévus">
                <Input type="number" inputMode="decimal" value={inp.days}
                  onChange={e => setF('days', e.target.value)} />
              </Field>
              <div />
            </div>

            {/* Profit view selector */}
            <div style={{ display: 'flex', gap: 4, marginTop: 12, background: 'var(--surface-2)', borderRadius: 8, padding: 3 }}>
              {(['ht', 'ttc', 'prudent'] as const).map(v => (
                <button key={v} onClick={() => setProfitView(v)} style={{
                  flex: 1, padding: '5px 8px', borderRadius: 6, border: 'none',
                  background: profitView === v ? 'var(--surface)' : 'transparent',
                  color: profitView === v ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: profitView === v ? 600 : 400, fontSize: 12, cursor: 'pointer',
                  boxShadow: profitView === v ? 'var(--shadow-sm)' : 'none',
                }}>
                  {v === 'ht' ? 'HT' : v === 'ttc' ? 'TTC' : 'Prudent'}
                </button>
              ))}
            </div>
          </Section>
        </div>

        {/* ════ RIGHT — Results ════ */}
        <div style={{ display: 'grid', gap: 16, position: 'sticky', top: 20 }}>
          {!result ? (
            <EmptyResult />
          ) : (result as any).needSell ? (
            <NeedSellResult />
          ) : (
            <Results
              r={result as CalcResult} inp={inp} profitView={profitView}
              mini={mini} days={parseFloat(inp.days) || 30}
            />
          )}

          {/* Actions */}
          {result && !(result as any).needSell && (
            <Section title="Actions">
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" onClick={() => saveDeal()} style={{ flex: 1 }}><Save size={13} /> Enregistrer</Button>
                  <Button variant="secondary" size="sm" onClick={() => saveDeal(true)} style={{ flex: 1 }}>
                    + Nouvelle affaire
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm" onClick={createCar} style={{ flex: 1 }}>
                    <Car size={13} /> Passer en prévisionnel
                  </Button>
                  <Button variant="secondary" size="sm" onClick={sendWhatsApp} style={{ flex: 1 }}>
                    <MessageCircle size={13} /> Avis sur WhatsApp
                  </Button>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ════ Affaires enregistrées ════ */}
      <div style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button onClick={() => setShowDeals(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Affaires enregistrées</h2>
            <Badge variant="default">{deals.length}</Badge>
            {showDeals ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
          </button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {compareIds.length >= 2 && (
              <Button size="sm" variant="secondary" onClick={() => setShowCompare(true)}>
                Comparer {compareIds.length}
              </Button>
            )}
            <SortButton label="Récentes" active={sortBy === 'recent'}   dir={sortDir} onClick={() => toggleSort('recent', sortBy, sortDir, setSortBy, setSortDir)} />
            <SortButton label="Marge"    active={sortBy === 'margin'}   dir={sortDir} onClick={() => toggleSort('margin', sortBy, sortDir, setSortBy, setSortDir)} />
            <SortButton label="Taux"     active={sortBy === 'rate'}     dir={sortDir} onClick={() => toggleSort('rate', sortBy, sortDir, setSortBy, setSortDir)} />
            <SortButton label="€/jour"   active={sortBy === 'perday'}   dir={sortDir} onClick={() => toggleSort('perday', sortBy, sortDir, setSortBy, setSortDir)} />
          </div>
        </div>

        {showDeals && (
          <div style={{ display: 'grid', gap: 8 }}>
            {sortedDeals.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                Aucune affaire enregistrée. Remplis le calculateur et clique sur Enregistrer.
              </div>
            ) : sortedDeals.map((d, rank) => (
              <DealRow key={d.id} deal={d} rank={rank + 1} isCurrent={d.id === currentDealId}
                selected={compareIds.includes(d.id)} mini={mini} tva={tva}
                onLoad={() => loadDeal(d)} onDelete={() => deleteDeal(d.id)}
                onToggleCompare={() => toggleCompare(d.id)} />
            ))}
          </div>
        )}
      </div>

      {/* ════ Compare Modal ════ */}
      {showCompare && compareDeals.length >= 2 && (
        <CompareModal deals={compareDeals as any} onClose={() => setShowCompare(false)} />
      )}

      {/* ── Mobile sticky bottom ── */}
      {result && !(result as any).needSell && (
        <MobileSticky r={result as CalcResult} profitView={profitView} mini={mini} />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function Field({ label, children, style, className }: { label: string; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ display: 'grid', gap: 5, ...style }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 10px',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  borderRadius: 6, color: 'var(--text)', fontSize: 13,
};

function FeeRowItem({ row, index, onChange, onRemove, tva }: {
  row: FeeRow; index: number; onChange: (k: keyof FeeRow, v: string) => void; onRemove?: () => void; tva: number;
}) {
  const v = rowVat(row, tva / 100);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 90px auto', gap: 6, alignItems: 'center', padding: '5px 0' }}>
      {row.k ? (
        <span style={{ fontSize: 13, color: 'var(--text)' }}>{row.label}</span>
      ) : (
        <Input placeholder="Nom du frais" value={row.label}
          onChange={e => onChange('label', e.target.value)} style={{ height: 30, fontSize: 12 }} />
      )}
      <Input type="number" inputMode="decimal" placeholder="0 €"
        value={row.amount} onChange={e => onChange('amount', e.target.value)}
        style={{ height: 30, fontSize: 13, fontFamily: 'var(--font-barlow-cond)', textAlign: 'right' }} />
      <select style={{ ...inpStyle, height: 30, fontSize: 12 }}
        value={row.vat} onChange={e => onChange('vat', e.target.value)}>
        {Object.entries(VAT_MODES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {row.amount && parseFloat(row.amount) > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'var(--font-barlow-cond)', whiteSpace: 'nowrap' }}>
            {eur(v.ht)} HT
          </span>
        )}
        {onRemove ? (
          <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
            <X size={13} />
          </button>
        ) : <span style={{ width: 18 }} />}
      </div>
    </div>
  );
}

function TripPanel({ trip, setTrip, onApply }: { trip: TripInput; setTrip: React.Dispatch<React.SetStateAction<TripInput>>; onApply: () => void }) {
  const sf = (k: keyof TripInput, v: string) => setTrip(p => ({ ...p, [k]: v }));
  const tr = tripCalc(trip);
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Départ (chez toi)">
          <Input placeholder="ex: Lyon" value={trip.home} onChange={e => sf('home', e.target.value)} style={{ height: 30 }} />
        </Field>
        <Field label="Où est la voiture ?">
          <Input placeholder="ex: Rotterdam" value={trip.dest} onChange={e => sf('dest', e.target.value)} style={{ height: 30 }} />
        </Field>
        <Field label="Distance aller (km)">
          <Input type="number" value={trip.km} onChange={e => sf('km', e.target.value)} style={{ height: 30 }} />
        </Field>
        <Field label="Péages (1 sens, €)">
          <Input type="number" value={trip.tolls} onChange={e => sf('tolls', e.target.value)} style={{ height: 30 }} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {Object.entries(TRIP_MODES).map(([k, m]) => (
          <button key={k} onClick={() => sf('mode', k as any)} style={{
            flex: 1, padding: '8px 6px', borderRadius: 7, border: `1px solid ${trip.mode === k ? 'var(--accent)' : 'var(--border)'}`,
            background: trip.mode === k ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer',
            fontSize: 11, fontWeight: 500, color: trip.mode === k ? 'var(--accent)' : 'var(--text-muted)', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 600 }}>{m.label}</div>
            <div style={{ marginTop: 2, opacity: 0.8 }}>{m.sub}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
        {trip.mode === 'train' ? <>
          <Field label="Prix billet aller (€)"><Input type="number" value={trip.ticket} onChange={e => sf('ticket', e.target.value)} style={{ height: 30 }} /></Field>
          <Field label="Conso voiture achetée (L/100)"><Input type="number" value={trip.conso} onChange={e => sf('conso', e.target.value)} style={{ height: 30 }} /></Field>
        </> : trip.mode === 'car' ? <>
          <Field label="Conso ma voiture (L/100)"><Input type="number" value={trip.myConso} onChange={e => sf('myConso', e.target.value)} style={{ height: 30 }} /></Field>
        </> : <>
          <Field label="Prix transport (€)"><Input type="number" value={trip.truck} onChange={e => sf('truck', e.target.value)} style={{ height: 30 }} /></Field>
        </>}
        {trip.mode !== 'truck' && (
          <Field label="Prix carburant (€/L)"><Input type="number" value={trip.fuel} onChange={e => sf('fuel', e.target.value)} style={{ height: 30 }} /></Field>
        )}
        <Field label="Repas, hôtel, autres (€)"><Input type="number" value={trip.other} onChange={e => sf('other', e.target.value)} style={{ height: 30 }} /></Field>
      </div>
      {tr.total > 0 && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          Coût total : <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 16, color: 'var(--text)', fontWeight: 700 }}>{eur(tr.total)}</span>
          <span style={{ marginLeft: 8, fontSize: 12 }}>(carburant {eur(tr.fuel)} + trajet {eur(tr.tolls + tr.ticket + tr.truck + tr.other)})</span>
        </div>
      )}
      <Button size="sm" onClick={onApply} style={{ marginTop: 10 }}>Mettre dans le calcul</Button>
    </div>
  );
}

function EmptyResult() {
  return (
    <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
      Entre le prix d'achat de la voiture que tu as repérée, puis tes frais : le prix à afficher sur Leboncoin s'affiche ici.
    </div>
  );
}

function NeedSellResult() {
  return (
    <div style={{ padding: 32, textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
      Entre le prix de vente que tu veux tester : ta marge nette s'affiche ici.
    </div>
  );
}

function Results({ r, inp, profitView, mini, days }: { r: CalcResult; inp: CalcInput; profitView: string; mini: number; days: number }) {
  const profit = profitView === 'ttc' ? r.realTtcAt(r.pShow) : profitView === 'prudent' ? r.realPrudAt(r.pShow) : r.real;
  const isNeg = profit < 0, isLow = profit < mini;
  const profitColor = isNeg ? 'var(--red)' : isLow ? 'var(--amber)' : 'var(--green)';
  const tier = tierFor(r.Pref);
  const lvl = r.rateRef >= tier.ok / 100 ? 'ok' : r.rateRef >= tier.min / 100 ? 'mid' : 'ko';
  const lvlColor = lvl === 'ok' ? 'var(--green)' : lvl === 'mid' ? 'var(--amber)' : 'var(--red)';

  return (
    <>
      {/* Prix à afficher — hero */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 20px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          Prix à afficher
        </div>
        <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 52, fontWeight: 700, lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {eur(r.pShow)}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Marge nette {profitView === 'ht' ? 'HT' : profitView === 'ttc' ? 'TTC' : 'Prudent'}</div>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 26, fontWeight: 700, color: profitColor }}>{eur(profit)}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>Taux de marge</div>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 26, fontWeight: 700, color: lvlColor }}>
              {pct1(r.rateShow)}
            </div>
          </div>
        </div>

        {/* Gauge taux */}
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'visible', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'var(--red)', borderRadius: 3, width: `${(tier.min / 100) / (tier.ok * 1.5 / 100) * 100}%`, opacity: 0.6 }} />
            <div style={{ position: 'absolute', top: 0, left: `${(tier.min / 100) / (tier.ok * 1.5 / 100) * 100}%`, height: '100%', background: 'var(--amber)', borderRadius: 3, width: `${((tier.ok - tier.min) / 100) / (tier.ok * 1.5 / 100) * 100}%`, opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: 0, left: `${(tier.ok / 100) / (tier.ok * 1.5 / 100) * 100}%`, height: '100%', background: 'var(--green)', borderRadius: 3, width: `${(1 - (tier.ok / 100) / (tier.ok * 1.5 / 100)) * 100}%`, opacity: 0.7 }} />
            <div style={{ position: 'absolute', top: -4, height: 14, width: 3, borderRadius: 2, background: 'var(--text)', left: `${Math.min(99, Math.max(0, r.rateRef / (tier.ok * 1.5 / 100) * 100))}%`, transform: 'translateX(-50%)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
            <span>0 %</span><span>{tier.min} %</span><span>{tier.ok} %</span>
          </div>
        </div>
      </div>

      {/* Verdict marché */}
      {r.Pm > 0 && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13,
          background: r.Pm >= r.pShow ? 'var(--green-soft)' : 'var(--amber-soft)',
          border: `1px solid ${r.Pm >= r.pShow ? 'var(--green)' : 'var(--amber)'}`,
          borderLeftWidth: 3, color: 'var(--text)',
        }}>
          {r.Pm >= r.pShow
            ? `✅ Sous le marché · ${eur(r.Pm - r.pShow)} de marge de négociation`
            : `⚠️ ${eur(r.pShow - r.Pm)} au-dessus du marché`}
        </div>
      )}

      {/* Décomposition */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Décomposition</div>
        <StatLine label="Prix de vente" value={eur(r.pShow)} big />
        <StatLine label={`− TVA collectée (${r.normal ? '20 % du prix HT' : 'sur la marge'})`} value={eur(r.tvaShow)} />
        {r.foreignTva > 0 && <StatLine label={`TVA ${inp.country} comprise dans le prix vu`} value={eur(r.foreignTva)} muted />}
        <StatLine label={`− Prix d'achat${r.normal ? ' HT' : ''}`} value={eur(r.A)} />
        <StatLine label={`− Frais ${r.prud ? 'TTC (prudent)' : 'HT'}`} value={eur(r.C)} />
        <Separator style={{ margin: '8px 0' }} />
        <StatLine label="= Marge nette HT" value={eur(r.real)} big color={profit < 0 ? 'var(--red)' : profit < mini ? 'var(--amber)' : 'var(--green)'} />
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Prix plancher (marge 0)</div>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{eur(Math.ceil(r.pZero))}</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gain par jour</div>
            <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 18, fontWeight: 700 }}>{eurDay(perDay(r.real, days))}</div>
          </div>
          {r.maxBuy !== null && r.maxBuy > 0 && (
            <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Achat max conseillé (taux {tier.ok} %)</div>
              <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{r.maxSeen ? eur(r.maxSeen) : eur(r.maxBuy)}</div>
            </div>
          )}
        </div>
      </div>

      {/* TVA box */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>TVA de l'affaire — au prix de {eur(r.pShow)}</div>
        <TvaLine label="TVA collectée sur la vente" value={r.tvaShow} />
        {r.normal && !r.fr && <TvaLine label="TVA autoliquidée (collectée + déduite = 0 €)" value={r.buyTva} />}
        {r.normal && r.fr && <TvaLine label="− TVA déductible sur l'achat" value={r.buyTva} />}
        <TvaLine label="− TVA déductible sur les frais" value={r.feeTva} />
        <Separator style={{ margin: '8px 0' }} />
        <TvaLine label="= TVA nette à reverser" value={r.tvaShow - r.feeTva - (r.normal && r.fr ? r.buyTva : 0)} bold />
      </div>
    </>
  );
}

function StatLine({ label, value, big, muted, color }: { label: string; value: string; big?: boolean; muted?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: big ? 13 : 12, color: muted ? 'var(--text-muted)' : 'var(--text)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: big ? 18 : 15, fontWeight: big ? 700 : 600, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  );
}

function TvaLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700 }}>{eur(value)}</span>
    </div>
  );
}

function DealRow({ deal, rank, isCurrent, selected, mini, tva, onLoad, onDelete, onToggleCompare }: {
  deal: Deal; rank: number; isCurrent: boolean; selected: boolean;
  mini: number; tva: number; onLoad: () => void; onDelete: () => void; onToggleCompare: () => void;
}) {
  const fc = deal.fc ?? {};
  const margin = parseFloat(fc.margin ?? '0');
  const rate = parseFloat(fc.rate ?? '0');
  const pd = parseFloat(fc.perday ?? '0');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      background: isCurrent ? 'var(--accent-soft)' : 'var(--surface)',
      border: `1px solid ${isCurrent ? 'var(--accent)' : selected ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 10, cursor: 'pointer',
    }}>
      {/* Rank + compare */}
      <button onClick={onToggleCompare} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 2 }}>
        {selected ? <CheckSquare size={16} style={{ color: 'var(--green)' }} /> : <Square size={16} style={{ color: 'var(--text-muted)' }} />}
      </button>
      <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 13, color: 'var(--text-subtle)', width: 20, textAlign: 'center' }}>#{rank}</span>

      {/* Info */}
      <button onClick={onLoad} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{deal.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {fc.buy && <span>Achat {eur(parseFloat(fc.buy))}</span>}
          {fc.sell && <span>Vente {eur(parseFloat(fc.sell))}</span>}
          {fc.cost && <span>Coût {eur(parseFloat(fc.cost))}</span>}
        </div>
      </button>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 18, fontWeight: 700, color: margin < mini ? 'var(--amber)' : 'var(--green)' }}>{eur(margin)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct1(rate)} · {eurDay(pd)}</div>
        </div>
        <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function CompareModal({ deals, onClose }: { deals: any[]; onClose: () => void }) {
  const rows = [
    { label: 'Prix d\'achat', fn: (d: any) => d.result?.A },
    { label: 'Frais HT', fn: (d: any) => d.result?.feeHt },
    { label: 'Coût de revient', fn: (d: any) => d.result?.cost },
    { label: 'Prix de vente', fn: (d: any) => d.result?.pShow },
    { label: 'Marge HT', fn: (d: any) => d.result?.real },
    { label: 'Taux de marge', fn: (d: any) => d.result?.rateShow, fmt: pct1 },
    { label: 'TVA à reverser', fn: (d: any) => d.result?.tvaShow },
    { label: 'Gain par jour', fn: (d: any) => perDay(d.result?.real ?? 0, parseFloat(d.input?.days ?? '30')), fmt: eurDay },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(800px, calc(100% - 32px))', maxHeight: '80vh', overflowY: 'auto',
        background: 'var(--surface)', borderRadius: 16, zIndex: 51, padding: 24,
        border: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Comparaison des affaires</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Critère</th>
              {deals.map((d: any) => (
                <th key={d.deal.id} style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{d.deal.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const vals = deals.map((d: any) => row.fn(d) ?? null);
              const nums = vals.filter(v => v !== null) as number[];
              const best = nums.length > 0 ? Math.max(...nums) : null;
              return (
                <tr key={row.label} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{row.label}</td>
                  {vals.map((v, i) => (
                    <td key={i} style={{
                      padding: '8px 10px', textAlign: 'right',
                      fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, fontSize: 15,
                      background: v === best && best !== null ? 'var(--green-soft)' : 'transparent',
                      color: v === best && best !== null ? 'var(--green)' : 'var(--text)',
                      borderRadius: 4,
                    }}>
                      {v === null ? '—' : (row.fmt ?? eur)(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileSticky({ r, profitView, mini }: { r: CalcResult; profitView: string; mini: number }) {
  const profit = profitView === 'ttc' ? r.realTtcAt(r.pShow) : profitView === 'prudent' ? r.realPrudAt(r.pShow) : r.real;
  const color = profit < 0 ? 'var(--red)' : profit < mini ? 'var(--amber)' : 'var(--green)';
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 30,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }} className="show-on-mobile">
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Prix affiché</div>
        <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 22, fontWeight: 700 }}>{eur(r.pShow)}</div>
      </div>
      <ArrowRight size={16} style={{ color: 'var(--text-muted)' }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Marge nette</div>
        <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 22, fontWeight: 700, color }}>{eur(profit)}</div>
      </div>
    </div>
  );
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
      borderRadius: 7, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'var(--accent-soft)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text-muted)',
      fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
    }}>
      {label}
      {active && <ArrowUpDown size={11} style={{ transform: dir === 'asc' ? 'scaleY(-1)' : 'none' }} />}
    </button>
  );
}

function toggleSort(by: string, cur: string, dir: 'asc' | 'desc', setBy: (v: string) => void, setDir: (v: 'asc' | 'desc') => void) {
  if (cur === by) setDir(dir === 'desc' ? 'asc' : 'desc');
  else { setBy(by); setDir('desc'); }
}
