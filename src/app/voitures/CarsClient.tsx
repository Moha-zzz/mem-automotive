'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Car, Stage } from '@/types';
import CarCard from '@/components/cars/CarCard';

const STOCK_STAGES: Stage[] = ['achete', 'preparation', 'vente', 'reserve'];

const FILTERS = [
  { key: 'stock' as const,       label: 'En stock' },
  { key: 'all' as const,         label: 'Toutes'   },
  { key: 'repere' as Stage,      label: 'Repérées' },
  { key: 'achete' as Stage,      label: 'Achetées' },
  { key: 'preparation' as Stage, label: 'En prépa' },
  { key: 'vente' as Stage,       label: 'En vente' },
  { key: 'vendu' as Stage,       label: 'Vendues'  },
];

const FUELS    = ['Diesel', 'Essence', 'Hybride', 'Électrique', 'GPL'];
const REGIMES  = [{ v: 'marge', l: 'TVA sur marge (particulier)' }, { v: 'normal', l: 'TVA récupérable (pro avec facture)' }];
const PAYS_ACHAT = ['France', 'Belgique', 'Pays-Bas', 'Allemagne', 'Autre'];

interface Props { initialCars: Car[]; }

export default function CarsClient({ initialCars }: Props) {
  const router = useRouter();
  const sb = createClient();

  const [cars, setCars]     = useState<Car[]>(initialCars);
  const [filter, setFilter] = useState<Stage | 'all' | 'stock'>('stock');
  const [search, setSearch] = useState('');
  const [modal, setModal]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    name: '', brand: '', model: '', year: '', km: '', fuel: 'Diesel',
    plate: '', vin: '', regime: 'marge', country: 'France',
    buy_date: '', buy_price_cts: '', stage: 'achete' as Stage,
  });

  const filtered = useMemo(() => {
    let list = cars;
    if (filter === 'stock') list = list.filter(c => STOCK_STAGES.includes(c.stage));
    else if (filter !== 'all') list = list.filter(c => c.stage === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.plate?.toLowerCase().includes(q) ||
        c.brand?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cars, filter, search]);

  const inStock = cars.filter(c => STOCK_STAGES.includes(c.stage)).length;

  const sf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: any = {
      name:    form.name.trim(),
      brand:   form.brand || null,
      model:   form.model || null,
      year:    form.year  ? parseInt(form.year)  : null,
      km:      form.km    ? parseInt(form.km)    : null,
      fuel:    form.fuel  || null,
      plate:   form.plate || null,
      vin:     form.vin   || null,
      regime:  form.regime,
      country: form.country,
      stage:   form.stage,
      buy_date: form.buy_date || null,
      buy_price_cts: form.buy_price_cts ? Math.round(parseFloat(form.buy_price_cts) * 100) : null,
      papers: { decl: false, transit: false, coc: false, ct: false, cg: false, quitus: false },
      bought_at: form.stage === 'achete' ? new Date().toISOString() : null,
    };
    const { data, error } = await sb.from('cars').insert(payload).select().single();
    setSaving(false);
    if (!error && data) {
      setCars(prev => [data as Car, ...prev]);
      setModal(false);
      setForm({ name: '', brand: '', model: '', year: '', km: '', fuel: 'Diesel', plate: '', vin: '', regime: 'marge', country: 'France', buy_date: '', buy_price_cts: '', stage: 'achete' });
      router.push(`/voitures/${data.id}`);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', border: '1px solid var(--line)',
    borderRadius: 9, background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
  };

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px) 60px' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 36 }}>Voitures</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>{inStock} en stock · {cars.length} au total</p>
        </div>
        <button onClick={() => setModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, background: 'var(--blue)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Voiture
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ marginBottom: 18 }}>
        <input type="search" placeholder="Rechercher (nom, plaque, marque…)" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...inp, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: active ? 'var(--navy)' : 'var(--surface)', border: `1px solid ${active ? 'var(--navy)' : 'var(--line)'}`,
                color: active ? '#fff' : 'var(--muted)', transition: 'all 0.12s',
              }}>
                {f.label}{f.key === 'stock' ? ` (${inStock})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: '48px 32px', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--muted)' }}>
          <svg style={{ width: 48, height: 48, margin: '0 auto 12px', opacity: 0.4 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m14-6h.01M5 16H3" />
          </svg>
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{cars.length === 0 ? 'Aucune voiture' : 'Aucun résultat'}</p>
          {cars.length === 0 && <p style={{ fontSize: 13, margin: 0 }}>Clique sur <b>+ Voiture</b> pour commencer.</p>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map(car => (
            <CarCard key={car.id} car={car} onClick={() => router.push(`/voitures/${car.id}`)} />
          ))}
        </div>
      )}

      {/* Modal nouvelle voiture */}
      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,20,0.45)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
            width: 'min(600px, calc(100% - 24px))', maxHeight: 'calc(100% - 40px)', overflowY: 'auto',
            background: 'var(--surface)', borderRadius: 16, zIndex: 50, padding: 24,
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.45)',
          }}>
            <h2 style={{ fontSize: 20, marginBottom: 20 }}>Nouvelle voiture</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Nom */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Nom *</label>
                <input style={inp} value={form.name} onChange={e => sf('name', e.target.value)} placeholder="ex: Peugeot 308 1.6 HDi 2018" autoFocus />
              </div>
              {/* Marque / Modèle */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Marque</label>
                <input style={inp} value={form.brand} onChange={e => sf('brand', e.target.value)} placeholder="Peugeot" />
              </div>
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Modèle</label>
                <input style={inp} value={form.model} onChange={e => sf('model', e.target.value)} placeholder="308" />
              </div>
              {/* Année / KM */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Année</label>
                <input style={inp} type="number" value={form.year} onChange={e => sf('year', e.target.value)} placeholder="2018" />
              </div>
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Kilométrage</label>
                <input style={inp} type="number" value={form.km} onChange={e => sf('km', e.target.value)} placeholder="85000" />
              </div>
              {/* Carburant */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Carburant</label>
                <select style={inp} value={form.fuel} onChange={e => sf('fuel', e.target.value)}>
                  {FUELS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              {/* Plaque */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Immatriculation</label>
                <input style={inp} value={form.plate} onChange={e => sf('plate', e.target.value.toUpperCase())} placeholder="AB-123-CD" />
              </div>
              {/* Régime TVA */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Régime TVA</label>
                <select style={inp} value={form.regime} onChange={e => sf('regime', e.target.value)}>
                  {REGIMES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </div>
              {/* Pays d'achat */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Pays d'achat</label>
                <select style={inp} value={form.country} onChange={e => sf('country', e.target.value)}>
                  {PAYS_ACHAT.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              {/* Prix d'achat */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Prix d'achat (€)</label>
                <input style={inp} type="number" value={form.buy_price_cts} onChange={e => sf('buy_price_cts', e.target.value)} placeholder="3500" />
              </div>
              {/* Date d'achat */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Date d'achat</label>
                <input style={inp} type="date" value={form.buy_date} onChange={e => sf('buy_date', e.target.value)} />
              </div>
              {/* Étape initiale */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Étape initiale</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['repere', 'achete', 'preparation', 'vente'] as Stage[]).map(s => {
                    const labels: Record<string, string> = { repere: 'Repérée', achete: 'Achetée', preparation: 'En prépa', vente: 'En vente' };
                    const active = form.stage === s;
                    return (
                      <button key={s} type="button" onClick={() => sf('stage', s)} style={{
                        padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        background: active ? 'var(--blue)' : 'var(--surface-2)', border: `1px solid ${active ? 'var(--blue)' : 'var(--line)'}`,
                        color: active ? '#fff' : 'var(--text)',
                      }}>{labels[s]}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement…' : 'Créer la voiture'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
