'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  STAGES, IN_STOCK, PAPERS, STAGE_TASKS, PAYS_ACHAT, PAYS_MODES,
  FUELS, GEARBOXES, GENRES, carDays, carFeesHt, carFeesTtc, fromCts, toCts,
  tvaDue, profitHt, profitTtc, profitPrudent, papersDone, priceAdvice, addDays, today,
} from '@/lib/car-calc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Search, ChevronLeft, ChevronRight, Car, FileText,
  Trash2, ExternalLink, Check, X, AlertTriangle, Clock,
  TrendingDown, ArrowRight, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PV = 'ht' | 'ttc' | 'prudent';

const eur = (n: number, d = 0) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: d }).format(n);
const pct1 = (n: number) => (n * 100).toFixed(1) + ' %';
const perDay = (m: number, d: number) => d > 0 ? m / d : 0;

interface Props {
  initialCars: any[];
  expenses: any[];
  openTasks: any[];
  settings: any;
}

export default function VoituresClient({ initialCars, expenses, openTasks, settings }: Props) {
  const sb = createClient();
  const tva   = settings?.tva   ?? 20;
  const mini  = settings?.mini  ?? 700;
  const seuil = settings?.seuil ?? 45;

  const [cars, setCars]         = useState<any[]>(initialCars);
  const [filter, setFilter]     = useState<string>('stock');
  const [search, setSearch]     = useState('');
  const [pv, setPv]             = useState<PV>('ht');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew]   = useState(false);

  // ── Filtered list ─────────────────────────────────────
  const filtered = useMemo(() => {
    let list = cars;
    if (filter === 'stock')       list = list.filter(c => IN_STOCK.includes(c.stage));
    else if (filter !== 'all')    list = list.filter(c => c.stage === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.plate ?? '').toLowerCase().includes(q) ||
        (c.brand ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const si = (s: string) => STAGES.findIndex(x => x.k === s);
      return si(a.stage) - si(b.stage) || (b.buy_date ?? '').localeCompare(a.buy_date ?? '');
    });
  }, [cars, filter, search]);

  const inStock     = cars.filter(c => IN_STOCK.includes(c.stage)).length;
  const totalValue  = cars.filter(c => IN_STOCK.includes(c.stage)).reduce((s, c) => s + fromCts(c.buy_price_cts), 0);
  const selectedCar = selectedId ? cars.find(c => c.id === selectedId) : null;
  const carExpenses = useCallback((id: string) => expenses.filter(e => e.car_id === id), [expenses]);

  const reload = async () => {
    const { data } = await sb.from('cars').select('*').order('created_at', { ascending: false });
    if (data) setCars(data);
  };

  const updateCar = async (id: string, patch: any) => {
    await sb.from('cars').update(patch).eq('id', id);
    setCars(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const deleteCar = async (id: string) => {
    if (!confirm('Supprimer cette voiture ?')) return;
    await sb.from('cars').delete().eq('id', id);
    setCars(prev => prev.filter(c => c.id !== id));
    setSelectedId(null);
    toast.success('Voiture supprimée');
  };

  const setStage = async (car: any, stage: string) => {
    const patch: any = { stage };
    if (stage === 'vente'  && !car.list_date)  patch.list_date  = today();
    if (stage === 'vendu'  && !car.sell_date)  patch.sell_date  = today();
    if (stage === 'achete' && !car.buy_date)   patch.buy_date   = today();
    if (['achete','preparation','vente','reserve','vendu'].includes(stage) && !car.bought_at)
      patch.bought_at = new Date().toISOString();
    await updateCar(car.id, patch);
    // Auto-tasks
    const isImport = car.country && car.country !== 'France';
    const list = STAGE_TASKS[stage] ?? [];
    const toAdd = list
      .filter(([key, , , , paper, cond]) => {
        if (cond === 'import' && !isImport) return false;
        if (paper && car.papers?.[paper]) return false;
        const auto = `${car.id}:${key}`;
        return !openTasks.some((t: any) => t.auto === auto);
      })
      .map(([key, label, prio, days, paper]) => ({
        title: `${label} — ${car.name}`,
        prio, done: false, car_id: car.id,
        due: addDays(today(), days),
        auto: `${car.id}:${key}`,
        paper: paper ?? '',
      }));
    if (toAdd.length) {
      await sb.from('tasks').insert(toAdd);
      toast.success(`${toAdd.length} tâche${toAdd.length > 1 ? 's' : ''} ajoutée${toAdd.length > 1 ? 's' : ''} automatiquement`);
    }
  };

  const setPaper = async (car: any, key: string, val: boolean) => {
    const papers = { ...car.papers, [key]: val };
    await updateCar(car.id, { papers });
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>
      {/* ══ List panel ══ */}
      <div style={{
        width: selectedCar ? 380 : '100%', flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.2s',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Voitures</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {inStock} en stock · <span style={{ fontFamily: 'var(--font-barlow-cond)' }}>{eur(totalValue)}</span> investis
              </p>
            </div>
            <Button size="sm" onClick={() => setShowNew(true)}><Plus size={13} /> Ajouter</Button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input placeholder="Modèle, plaque…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 32, height: 32, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          </div>

          {/* Stage filter chips */}
          <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
            {[{ k: 'stock', label: 'En stock' }, { k: 'all', label: 'Toutes' }, ...STAGES.filter(s => s.k !== 'abandon')].map(s => {
              const count = s.k === 'stock' ? inStock : s.k === 'all' ? cars.filter(c => c.stage !== 'abandon').length : cars.filter(c => c.stage === s.k).length;
              return (
                <button key={s.k} onClick={() => setFilter(s.k)} style={{
                  flexShrink: 0, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: `1px solid ${filter === s.k ? 'var(--accent)' : 'var(--border)'}`,
                  background: filter === s.k ? 'var(--accent-soft)' : 'transparent',
                  color: filter === s.k ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer',
                }}>
                  {s.label} <span style={{ opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Car list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <Car size={40} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
              <p>{cars.length === 0 ? 'Aucune voiture' : 'Aucun résultat'}</p>
            </div>
          ) : filtered.map(car => {
            const exps  = carExpenses(car.id);
            const days  = carDays(car);
            const pSell = car.sell_price_cts ? fromCts(car.sell_price_cts) : car.ask_price_cts ? fromCts(car.ask_price_cts) : null;
            const profit = pSell ? (pv === 'ttc' ? profitTtc(car, exps, pSell, tva) : pv === 'prudent' ? profitPrudent(car, exps, pSell, tva) : profitHt(car, exps, pSell, tva)) : null;
            const pd = papersDone(car);
            const stage = STAGES.find(s => s.k === car.stage);
            const alerts = [];
            if (days !== null && days > seuil) alerts.push({ type: 'red', msg: `${days}j en stock` });
            if (profit !== null && profit < mini) alerts.push({ type: 'amber', msg: 'Marge faible' });
            const adv = priceAdvice(car, exps, tva);
            if (adv && (adv as any).drop) alerts.push({ type: 'amber', msg: 'Baisse conseillée' });

            return (
              <button key={car.id} onClick={() => setSelectedId(car.id === selectedId ? null : car.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  border: `1px solid ${selectedId === car.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: selectedId === car.id ? 'var(--accent-soft)' : 'var(--surface)',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left', marginBottom: 6,
                  transition: 'border-color 0.1s',
                }}>
                {/* Stage dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage?.color ?? '#64748B', flexShrink: 0, marginTop: 2 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.name}</span>
                    {car.plate && <PlateTag plate={car.plate} />}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 3 }}>
                    {car.buy_price_cts && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Achat <span style={{ fontFamily: 'var(--font-barlow-cond)', fontWeight: 600, color: 'var(--text)' }}>{eur(fromCts(car.buy_price_cts))}</span>
                      </span>
                    )}
                    {pSell && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {car.sell_price_cts ? 'Vendu' : 'Affiché'} <span style={{ fontFamily: 'var(--font-barlow-cond)', fontWeight: 600, color: 'var(--text)' }}>{eur(pSell)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {profit !== null && (
                    <span style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700, color: profit < mini ? 'var(--amber)' : 'var(--green)' }}>
                      {eur(profit)}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {days !== null && <span style={{ fontSize: 10, background: days > seuil ? 'var(--red-soft)' : 'var(--surface-2)', color: days > seuil ? 'var(--red)' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px', fontFamily: 'var(--font-barlow-cond)' }}>{days}j</span>}
                    <span style={{ fontSize: 10, background: pd >= 6 ? 'var(--green-soft)' : 'var(--surface-2)', color: pd >= 6 ? 'var(--green)' : 'var(--text-muted)', borderRadius: 4, padding: '1px 5px' }}>📄 {pd}/6</span>
                    {alerts.map((a, i) => <span key={i} style={{ fontSize: 10, background: a.type === 'red' ? 'var(--red-soft)' : 'var(--amber-soft)', color: a.type === 'red' ? 'var(--red)' : 'var(--amber)', borderRadius: 4, padding: '1px 5px' }}>{a.msg}</span>)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ Detail sheet ══ */}
      {selectedCar && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <CarSheet
            car={selectedCar}
            expenses={carExpenses(selectedCar.id)}
            openTasks={openTasks}
            settings={settings}
            pv={pv}
            onPvChange={setPv}
            onUpdate={(patch: any) => updateCar(selectedCar.id, patch)}
            onStageChange={(stage: string) => setStage(selectedCar, stage)}
            onPaperChange={(key: string, val: boolean) => setPaper(selectedCar, key, val)}
            onDelete={() => deleteCar(selectedCar.id)}
            onClose={() => setSelectedId(null)}
          />
        </div>
      )}

      {/* ══ New car modal ══ */}
      {showNew && (
        <NewCarModal
          onClose={() => setShowNew(false)}
          onCreate={async (data) => {
            const { data: car } = await sb.from('cars').insert(data).select().single();
            if (car) { setCars(prev => [car, ...prev]); setSelectedId(car.id); }
            setShowNew(false);
            toast.success('Voiture ajoutée');
          }}
        />
      )}
    </div>
  );
}

// ── Plate component ────────────────────────────────────────
function PlateTag({ plate }: { plate: string }) {
  if (!plate) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'stretch', height: 20,
      border: '1.5px solid #111', borderRadius: 4, background: '#fff',
      overflow: 'hidden', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
      fontFamily: 'var(--font-barlow-cond)', color: '#111', flexShrink: 0,
    }}>
      <div style={{ background: '#003399', width: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#FC0', fontSize: 7 }}>★</span>
      </div>
      <span style={{ padding: '0 5px', display: 'flex', alignItems: 'center' }}>{plate}</span>
    </div>
  );
}

// ── Car Sheet ─────────────────────────────────────────────
function CarSheet({ car, expenses, openTasks, settings, pv, onPvChange, onUpdate, onStageChange, onPaperChange, onDelete, onClose }: any) {
  const tva  = settings?.tva ?? 20;
  const mini = settings?.mini ?? 700;
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm]       = useState<Record<string, any>>({ ...car });
  const [tab, setTab]         = useState<'resume' | 'infos' | 'achat' | 'vente' | 'frais' | 'docs' | 'notes'>('resume');
  const sb = createClient();

  const days    = carDays(car);
  const pSell   = car.sell_price_cts ? fromCts(car.sell_price_cts) : car.ask_price_cts ? fromCts(car.ask_price_cts) : null;
  const profit  = pSell ? (pv === 'ttc' ? profitTtc(car, expenses, pSell, tva) : pv === 'prudent' ? profitPrudent(car, expenses, pSell, tva) : profitHt(car, expenses, pSell, tva)) : null;
  const feeHt   = carFeesHt(expenses);
  const feeTtc  = carFeesTtc(expenses);
  const tvaRev  = pSell ? tvaDue(car, pSell, tva) : null;
  const pd      = papersDone(car);
  const stage   = STAGES.find(s => s.k === car.stage);
  const curStageIdx = STAGES.findIndex(s => s.k === car.stage);
  const adv     = priceAdvice(car, expenses, tva);

  const saveField = async (field: string, val: any) => {
    await onUpdate({ [field]: val });
    setEditing(null);
  };

  const saveForm = async () => {
    const patch: any = {};
    if (form.buy_price_cts !== undefined)  patch.buy_price_cts  = form.buy_price_cts;
    if (form.sell_price_cts !== undefined) patch.sell_price_cts = form.sell_price_cts;
    if (form.ask_price_cts !== undefined)  patch.ask_price_cts  = form.ask_price_cts;
    // copy all string fields
    ['name','plate','vin','brand','model','fuel','gearbox','color','genre','country','regime','buy_date','sell_date','list_date','sell_time','buy_pay','sell_pay','source','link','notes','year','km','type_variant','formule'].forEach(k => {
      if (form[k] !== undefined) patch[k] = form[k] === '' ? null : form[k];
    });
    await onUpdate(patch);
    setEditing(null);
    toast.success('Enregistré');
  };

  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const inpStyle: React.CSSProperties = {
    width: '100%', height: 32, padding: '0 10px',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text)', fontSize: 13,
  };

  const Field2 = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: 'grid', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', marginTop: 2 }}>
            <X size={16} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{car.name}</h2>
              {car.plate && <PlateTag plate={car.plate} />}
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${stage?.color}20`, color: stage?.color }}>
                {stage?.label}
              </span>
            </div>
            {/* KPI row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
              {[
                { label: 'Achat', val: car.buy_price_cts ? eur(fromCts(car.buy_price_cts)) : '—' },
                { label: 'Frais HT', val: feeHt > 0 ? eur(feeHt) : '—' },
                { label: 'Coût total', val: car.buy_price_cts ? eur(fromCts(car.buy_price_cts) + feeHt) : '—' },
                ...(pSell ? [{ label: 'Vente', val: eur(pSell) }, { label: `Marge ${pv.toUpperCase()}`, val: profit !== null ? eur(profit) : '—', color: profit !== null ? (profit < mini ? 'var(--amber)' : 'var(--green)') : undefined }] : []),
                ...(tvaRev ? [{ label: 'TVA à reverser', val: eur(tvaRev) }] : []),
                ...(days !== null ? [{ label: 'En stock', val: `${days}j` }] : []),
              ].map((k, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
                  <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 16, fontWeight: 700, color: (k as any).color ?? 'var(--text)' }}>{k.val}</div>
                </div>
              ))}
              {/* PV selector */}
              <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 6, padding: 2, marginLeft: 'auto' }}>
                {(['ht','ttc','prudent'] as const).map(v => (
                  <button key={v} onClick={() => onPvChange(v)} style={{
                    padding: '3px 8px', borderRadius: 5, border: 'none',
                    background: pv === v ? 'var(--surface)' : 'transparent',
                    color: pv === v ? 'var(--text)' : 'var(--text-muted)',
                    fontSize: 11, fontWeight: pv === v ? 600 : 400, cursor: 'pointer',
                  }}>{v.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <Trash2 size={14} />
          </button>
        </div>

        {/* Stage stepper */}
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', paddingBottom: 2 }}>
          {STAGES.filter(s => s.k !== 'abandon').map((s, i) => (
            <button key={s.k} onClick={() => onStageChange(s.k)} style={{
              flexShrink: 0, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: car.stage === s.k ? s.color : i < curStageIdx ? `${s.color}25` : 'var(--surface-2)',
              color: car.stage === s.k ? '#fff' : i < curStageIdx ? s.color : 'var(--text-muted)',
              transition: 'all 0.1s',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginTop: 10, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {([
            { k: 'resume', label: 'Résumé' },
            { k: 'infos',  label: 'Voiture' },
            { k: 'achat',  label: 'Achat' },
            { k: 'vente',  label: 'Vente' },
            { k: 'frais',  label: `Frais (${expenses.length})` },
            { k: 'docs',   label: 'Documents' },
            { k: 'notes',  label: 'Notes' },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} style={{
              padding: '6px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: tab === t.k ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === t.k ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* ── RÉSUMÉ ── */}
        {tab === 'resume' && (
          <div style={{ display: 'grid', gap: 14 }}>
            {/* Papers */}
            <Section title={`Papiers ${pd}/6`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {PAPERS.map(p => {
                  const done = !!car.papers?.[p.k];
                  return (
                    <button key={p.k} onClick={() => onPaperChange(p.k, !done)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      borderRadius: 8, border: `1px solid ${done ? 'var(--green)' : 'var(--border)'}`,
                      background: done ? 'var(--green-soft)' : 'var(--surface-2)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${done ? 'var(--green)' : 'var(--border)'}`, background: done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                        {done && <Check size={11} style={{ color: '#fff' }} />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 500, color: done ? 'var(--green)' : 'var(--text)' }}>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Price advice */}
            {adv && !(adv as any).wait && <PriceAdviceBlock adv={adv as any} car={car} onUpdate={onUpdate} />}

            {/* Forecast vs Real */}
            {car.forecast && (
              <Section title="Prévisionnel vs Réel">
                <ForecastTable car={car} expenses={expenses} settings={settings} />
              </Section>
            )}
          </div>
        )}

        {/* ── VOITURE ── */}
        {tab === 'infos' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Nom', key: 'name' },
              { label: 'Immatriculation', key: 'plate' },
              { label: 'VIN', key: 'vin' },
              { label: 'Marque', key: 'brand' },
              { label: 'Modèle', key: 'model' },
              { label: 'Année', key: 'year', type: 'number' },
              { label: '1re immatriculation', key: 'first_reg', type: 'date' },
              { label: 'Kilométrage', key: 'km', type: 'number' },
            ].map(f => (
              <Field2 key={f.key} label={f.label}>
                <input style={inpStyle} type={f.type ?? 'text'} value={form[f.key] ?? ''} onChange={e => sf(f.key, e.target.value)} />
              </Field2>
            ))}
            <Field2 label="Carburant">
              <select style={inpStyle} value={form.fuel ?? ''} onChange={e => sf('fuel', e.target.value)}>
                <option value="">—</option>
                {FUELS.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field2>
            <Field2 label="Boîte">
              <select style={inpStyle} value={form.gearbox ?? ''} onChange={e => sf('gearbox', e.target.value)}>
                <option value="">—</option>
                {GEARBOXES.map(f => <option key={f}>{f}</option>)}
              </select>
            </Field2>
            <Field2 label="Genre (J.1)">
              <select style={inpStyle} value={form.genre ?? 'VP'} onChange={e => sf('genre', e.target.value)}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </Field2>
            <Field2 label="Couleur">
              <input style={inpStyle} value={form.color ?? ''} onChange={e => sf('color', e.target.value)} />
            </Field2>
            <Field2 label="Type, variante, version (D.2)">
              <input style={inpStyle} value={form.type_variant ?? ''} onChange={e => sf('type_variant', e.target.value)} />
            </Field2>
            <Field2 label="N° formule carte grise">
              <input style={inpStyle} value={form.formule ?? ''} onChange={e => sf('formule', e.target.value)} />
            </Field2>
            <Field2 label="Pays d'achat">
              <select style={inpStyle} value={form.country ?? 'France'} onChange={e => sf('country', e.target.value)}>
                {PAYS_ACHAT.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field2>
            <Field2 label="Lien annonce" >
              <input style={inpStyle} type="url" value={form.link ?? ''} onChange={e => sf('link', e.target.value)} />
            </Field2>
            <div style={{ gridColumn: '1/-1' }}>
              <Button size="sm" onClick={saveForm}>Enregistrer</Button>
            </div>
          </div>
        )}

        {/* ── ACHAT ── */}
        {tab === 'achat' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field2 label="Régime TVA" >
              <div style={{ display: 'flex', gap: 6 }}>
                {(['marge', 'normal'] as const).map(r => (
                  <button key={r} onClick={() => sf('regime', r)} style={{
                    flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${form.regime === r ? 'var(--accent)' : 'var(--border)'}`,
                    background: form.regime === r ? 'var(--accent-soft)' : 'transparent',
                    color: form.regime === r ? 'var(--accent)' : 'var(--text-muted)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>
                    {r === 'marge' ? 'TVA sur marge (particulier)' : 'TVA récupérable (pro)'}
                  </button>
                ))}
              </div>
            </Field2>
            <Field2 label="Date d'achat">
              <input style={inpStyle} type="date" value={form.buy_date ?? ''} onChange={e => sf('buy_date', e.target.value)} />
            </Field2>
            <Field2 label={form.regime === 'normal' ? "Prix d'achat HT (€)" : "Prix d'achat (€)"}>
              <input style={{ ...inpStyle, fontFamily: 'var(--font-barlow-cond)', fontSize: 18 }} type="number" value={form.buy_price_cts !== undefined ? fromCts(form.buy_price_cts) : ''} onChange={e => sf('buy_price_cts', toCts(parseFloat(e.target.value) || 0))} />
            </Field2>
            <Field2 label="Mode de paiement">
              <select style={inpStyle} value={form.buy_pay ?? ''} onChange={e => sf('buy_pay', e.target.value)}>
                <option value="">—</option>
                {PAYS_MODES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field2>
            {form.buy_pay === 'Espèces' && form.buy_price_cts && fromCts(form.buy_price_cts) > 1000 && (
              <div style={{ gridColumn: '1/-1', padding: '8px 12px', background: 'var(--red-soft)', borderRadius: 8, fontSize: 12, color: 'var(--red)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={14} /> Paiement espèces limité à 1 000 € avec un particulier résident en France.
              </div>
            )}
            <div style={{ gridColumn: '1/-1' }}>
              <Button size="sm" onClick={saveForm}>Enregistrer</Button>
            </div>
          </div>
        )}

        {/* ── VENTE ── */}
        {tab === 'vente' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field2 label="Prix affiché (€)">
              <input style={{ ...inpStyle, fontFamily: 'var(--font-barlow-cond)', fontSize: 18 }} type="number" value={form.ask_price_cts !== undefined ? fromCts(form.ask_price_cts) : ''} onChange={e => sf('ask_price_cts', toCts(parseFloat(e.target.value) || 0))} />
            </Field2>
            <Field2 label="Date de mise en vente">
              <input style={inpStyle} type="date" value={form.list_date ?? ''} onChange={e => sf('list_date', e.target.value)} />
            </Field2>
            <Field2 label="Date de vente">
              <input style={inpStyle} type="date" value={form.sell_date ?? ''} onChange={e => sf('sell_date', e.target.value)} />
            </Field2>
            <Field2 label="Heure de la cession">
              <input style={inpStyle} type="time" value={form.sell_time ?? ''} onChange={e => sf('sell_time', e.target.value)} />
            </Field2>
            <Field2 label="Prix de vente (€)">
              <input style={{ ...inpStyle, fontFamily: 'var(--font-barlow-cond)', fontSize: 18 }} type="number" value={form.sell_price_cts !== undefined ? fromCts(form.sell_price_cts) : ''} onChange={e => sf('sell_price_cts', toCts(parseFloat(e.target.value) || 0))} />
            </Field2>
            <Field2 label="Mode de paiement">
              <select style={inpStyle} value={form.sell_pay ?? ''} onChange={e => sf('sell_pay', e.target.value)}>
                <option value="">—</option>
                {PAYS_MODES.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field2>
            <div style={{ gridColumn: '1/-1' }}>
              <Button size="sm" onClick={saveForm}>Enregistrer</Button>
            </div>
          </div>
        )}

        {/* ── FRAIS ── */}
        {tab === 'frais' && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13 }}>
                Total <span style={{ fontFamily: 'var(--font-barlow-cond)', fontWeight: 700 }}>{eur(feeHt)} HT</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({eur(feeTtc)} TTC)</span>
              </div>
            </div>
            {expenses.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10, color: 'var(--text-muted)', fontSize: 13 }}>Aucune dépense enregistrée</div>
            ) : (
              expenses.map((e: any) => (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{e.label || e.cat}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{e.cat} · {e.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700 }}>{eur(fromCts(e.ttc_cts))} TTC</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{eur(fromCts(e.ttc_cts) - fromCts(e.tva_cts))} HT</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === 'docs' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Génération de documents PDF — Prochainement disponible.</p>
            {[
              { label: 'Certificat de cession (Cerfa 15776*02)', icon: FileText },
              { label: 'Facture de vente', icon: FileText },
              { label: 'Bon de commande', icon: FileText },
            ].map(d => (
              <button key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', opacity: 0.6 }}>
                <d.icon size={16} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── NOTES ── */}
        {tab === 'notes' && (
          <div>
            <textarea
              value={form.notes ?? ''}
              onChange={e => sf('notes', e.target.value)}
              onBlur={() => onUpdate({ notes: form.notes })}
              placeholder="Notes sur la voiture, les négociations, l'historique…"
              style={{ width: '100%', minHeight: 200, padding: '12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
      <div style={{ padding: '12px 14px' }}>{children}</div>
    </div>
  );
}

// ── Price advice block ────────────────────────────────────
function PriceAdviceBlock({ adv, car, onUpdate }: { adv: any; car: any; onUpdate: (p: any) => void }) {
  const eur = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const eurDay = (n: number) => eur(n) + '/j';

  if (adv.floorHit) {
    return (
      <Section title="Conseil prix">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Ton prix ({eur(adv.P0)}) est proche du plancher ({eur(adv.floor)}). Mise sur l'annonce plutôt qu'une baisse.
        </p>
      </Section>
    );
  }

  const applyDrop = async () => {
    const drops = [...(car.price_drops ?? []), { date: new Date().toISOString().slice(0, 10), from: adv.P0, to: adv.P1 }];
    await onUpdate({ ask_price_cts: toCts(adv.P1), price_drops: drops });
    toast.success(`Prix abaissé à ${eur(adv.P1)}`);
  };

  return (
    <Section title={`Conseil prix · ${adv.dl}j ${(car.price_drops ?? []).length ? 'depuis la dernière baisse' : 'en vente'}`}>
      <div style={{ marginBottom: 10 }}>
        {adv.drop ? (
          <p style={{ margin: '0 0 10px', fontSize: 13 }}>
            <strong>Baisse conseillée : {eur(adv.P0)} → {eur(adv.P1)}</strong> (−{Math.round(adv.pct * 100)} %)
          </p>
        ) : (
          <p style={{ margin: '0 0 10px', fontSize: 13 }}>
            <strong>Tu peux encore attendre à {eur(adv.P0)}.</strong> Une baisse à {eur(adv.P1)} ne rapporterait pas plus par jour.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: `J'attends à ${eur(adv.P0)}`, margin: adv.pr0, days: 'dans ~21j', gd: adv.g0, good: !adv.drop },
            { label: `Je baisse à ${eur(adv.P1)}`, margin: adv.pr1, days: 'dans ~7j', gd: adv.g1, good: adv.drop },
          ].map((s, i) => (
            <div key={i} style={{ padding: '10px 12px', background: s.good ? 'var(--green-soft)' : 'var(--surface-2)', borderRadius: 8, border: `1px solid ${s.good ? 'var(--green)' : 'var(--border)'}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: s.good ? 'var(--green)' : 'var(--text)' }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, fontWeight: 700 }}>{eur(s.margin)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0' }}>{s.days}</div>
              <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700, color: s.good ? 'var(--green)' : 'var(--text-muted)' }}>{eurDay(s.gd)}</div>
            </div>
          ))}
        </div>
      </div>
      {adv.drop && (
        <Button size="sm" onClick={applyDrop}>
          <TrendingDown size={13} /> Passer l'annonce à {eur(adv.P1)}
        </Button>
      )}
      {(car.price_drops ?? []).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Historique des baisses</div>
          {(car.price_drops ?? []).map((d: any, i: number) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
              <span>{d.date}</span> <ArrowRight size={12} style={{ marginTop: 2 }} /> <span>{eur(d.from)} → {eur(d.to)}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Forecast vs Real ──────────────────────────────────────
function ForecastTable({ car, expenses, settings }: { car: any; expenses: any[]; settings: any }) {
  const tva   = settings?.tva ?? 20;
  const fc    = car.forecast ?? {};
  const pSell = car.sell_price_cts ? fromCts(car.sell_price_cts) : null;

  const rows = [
    { label: 'Prix d\'achat', plan: fc.buy ? parseFloat(fc.buy) : null, real: fromCts(car.buy_price_cts) },
    { label: 'Frais HT', plan: fc.feeHt ? parseFloat(fc.feeHt) : null, real: carFeesHt(expenses) },
    { label: 'Coût de revient', plan: fc.cost ? parseFloat(fc.cost) : null, real: fromCts(car.buy_price_cts) + carFeesHt(expenses) },
    { label: 'Prix de vente', plan: fc.sell ? parseFloat(fc.sell) : null, real: pSell },
    { label: 'Marge HT', plan: fc.margin ? parseFloat(fc.margin) : null, real: pSell ? profitHt(car, expenses, pSell, tva) : null },
  ];

  const eur = (n: number | null) => n !== null ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n) : '—';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>Critère</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>Prévu</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>Réel</th>
          <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>Écart</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => {
          const diff = row.plan !== null && row.real !== null ? row.real - row.plan : null;
          return (
            <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '7px 8px', color: 'var(--text)' }}>{row.label}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 600 }}>{eur(row.plan)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 600 }}>{eur(row.real)}</td>
              <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-barlow-cond)', fontWeight: 700, color: diff === null ? 'var(--text-muted)' : diff >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {diff !== null ? (diff >= 0 ? '+' : '') + eur(diff) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── New Car Modal ─────────────────────────────────────────
function NewCarModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', brand: '', model: '', year: '', km: '', fuel: 'Diesel', plate: '', regime: 'marge', country: 'France', buy_price_cts: '', buy_date: today(), stage: 'achete' });
  const sf = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => <div style={{ display: 'grid', gap: 5 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>{children}</div>;

  const submit = () => {
    if (!form.name.trim()) return;
    onCreate({
      name: form.name, brand: form.brand || null, model: form.model || null,
      year: form.year ? parseInt(form.year) : null, km: form.km ? parseInt(form.km) : null,
      fuel: form.fuel, plate: form.plate || null, regime: form.regime, country: form.country,
      stage: form.stage, buy_date: form.buy_date || null,
      buy_price_cts: form.buy_price_cts ? Math.round(parseFloat(form.buy_price_cts) * 100) : null,
      papers: { decl: false, transit: false, coc: false, ct: false, cg: false, quitus: false },
      bought_at: ['achete','preparation','vente'].includes(form.stage) ? new Date().toISOString() : null,
    });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
      <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(560px, calc(100% - 24px))', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nouvelle voiture</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: '1/-1' }}><F label="Nom *"><input style={inpStyle} autoFocus value={form.name} onChange={e => sf('name', e.target.value)} placeholder="ex: Peugeot 308 1.6 HDi 2018" /></F></div>
          <F label="Marque"><input style={inpStyle} value={form.brand} onChange={e => sf('brand', e.target.value)} placeholder="Peugeot" /></F>
          <F label="Modèle"><input style={inpStyle} value={form.model} onChange={e => sf('model', e.target.value)} placeholder="308" /></F>
          <F label="Année"><input style={inpStyle} type="number" value={form.year} onChange={e => sf('year', e.target.value)} placeholder="2018" /></F>
          <F label="Kilométrage"><input style={inpStyle} type="number" value={form.km} onChange={e => sf('km', e.target.value)} placeholder="85000" /></F>
          <F label="Carburant">
            <select style={inpStyle} value={form.fuel} onChange={e => sf('fuel', e.target.value)}>
              {FUELS.map(f => <option key={f}>{f}</option>)}
            </select>
          </F>
          <F label="Plaque"><input style={inpStyle} value={form.plate} onChange={e => sf('plate', e.target.value.toUpperCase())} placeholder="AB-123-CD" /></F>
          <div style={{ gridColumn: '1/-1' }}>
            <F label="Régime TVA">
              <div style={{ display: 'flex', gap: 6 }}>
                {(['marge', 'normal'] as const).map(r => (
                  <button key={r} onClick={() => sf('regime', r)} style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${form.regime === r ? 'var(--accent)' : 'var(--border)'}`, background: form.regime === r ? 'var(--accent-soft)' : 'transparent', color: form.regime === r ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    {r === 'marge' ? 'TVA sur marge (particulier)' : 'TVA récupérable (pro)'}
                  </button>
                ))}
              </div>
            </F>
          </div>
          <F label="Pays d'achat">
            <select style={inpStyle} value={form.country} onChange={e => sf('country', e.target.value)}>
              {PAYS_ACHAT.map(p => <option key={p}>{p}</option>)}
            </select>
          </F>
          <F label="Prix d'achat (€)"><input style={{ ...inpStyle, fontFamily: 'var(--font-barlow-cond)', fontSize: 16 }} type="number" value={form.buy_price_cts} onChange={e => sf('buy_price_cts', e.target.value)} placeholder="3500" /></F>
          <F label="Date d'achat"><input style={inpStyle} type="date" value={form.buy_date} onChange={e => sf('buy_date', e.target.value)} /></F>
          <div style={{ gridColumn: '1/-1' }}>
            <F label="Étape initiale">
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {(['repere','achete','preparation','vente'] as const).map(s => {
                  const st = STAGES.find(x => x.k === s)!;
                  return (
                    <button key={s} onClick={() => sf('stage', s)} style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${form.stage === s ? st.color : 'var(--border)'}`, background: form.stage === s ? `${st.color}20` : 'transparent', color: form.stage === s ? st.color : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </F>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit} disabled={!form.name.trim()}>Créer la voiture</Button>
        </div>
      </div>
    </>
  );
}
