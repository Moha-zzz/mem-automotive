'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Auction {
  id: string;
  title: string;
  site?: string;
  end?: string;         // ISO datetime
  max?: number;         // prix max en euros
  fee?: number;         // % frais acheteur
  result: 'encours' | 'gagnee' | 'perdue';
  link?: string;
  car_id?: string;
  notes?: string;
}

interface Props {
  auctions: Auction[];
  cars: { id: string; name: string; stage: string }[];
}

const SITES = ['BAS Auction', 'BCA', 'AHF', 'Alcopa', 'Troyes Enchères', 'Autobid', 'OPAC', 'Autre'];

function remaining(end?: string): { text: string; cls: string } {
  if (!end) return { text: '—', cls: '' };
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return { text: 'Terminée', cls: 'over' };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (diff < 2 * 3_600_000) return { text: `${h}h${String(m).padStart(2, '0')}`, cls: 'hot' };
  if (diff < 24 * 3_600_000) return { text: `${h}h`, cls: 'warm' };
  const d = Math.floor(diff / 86_400_000);
  return { text: `${d}j`, cls: '' };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function eur(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function calLink(a: Auction) {
  if (!a.end) return null;
  const end = new Date(a.end);
  const start = new Date(end.getTime() - 2 * 3_600_000);
  const f = (d: Date) =>
    d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') +
    'T' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '00';
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `⏰ Fin enchère dans 2h : ${a.title}`,
    dates: `${f(start)}/${f(end)}`,
    ctz: 'Europe/Paris',
    details: `Site : ${a.site ?? ''}\nPrix max : ${a.max ? eur(a.max) : '—'}\n${a.link ?? ''}`,
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

const EMPTY: Partial<Auction> = { title: '', site: 'BAS Auction', result: 'encours', fee: 15 };

export default function EncheresClient({ auctions: init, cars }: Props) {
  const sb = createClient();
  const [auctions, setAuctions] = useState<Auction[]>(init);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState<Partial<Auction>>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [tick, setTick]         = useState(0);

  // Rafraîchir les compteurs chaque minute
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const reload = useCallback(async () => {
    const { data } = await sb.from('auctions').select('*').order('end', { ascending: true });
    if (data) setAuctions(data);
  }, [sb]);

  const openNew  = () => { setForm(EMPTY); setModal(true); };
  const openEdit = (a: Auction) => { setForm({ ...a }); setModal(true); };
  const closeModal = () => { setModal(false); setForm(EMPTY); };

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    if (form.id) {
      await sb.from('auctions').update({ ...form }).eq('id', form.id);
    } else {
      await sb.from('auctions').insert({ ...form, result: 'encours' });
    }
    setSaving(false);
    closeModal();
    reload();
  };

  const setResult = async (id: string, result: 'gagnee' | 'perdue') => {
    await sb.from('auctions').update({ result }).eq('id', id);
    reload();
  };

  const del = async (id: string) => {
    if (!confirm('Supprimer cette enchère ?')) return;
    await sb.from('auctions').delete().eq('id', id);
    reload();
  };

  const live    = auctions.filter(a => a.result === 'encours' && a.end && new Date(a.end) > new Date());
  const done    = auctions.filter(a => !live.includes(a));
  const withMax = form.max != null && form.max > 0;
  const total   = withMax ? (form.max! * (1 + (form.fee ?? 15) / 100)) : null;

  const panelStyle: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--line)',
    borderRadius: 'var(--radius)', padding: '16px 18px 18px',
    boxShadow: 'var(--shadow)', display: 'grid',
    gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center',
  };

  const clockStyle = (cls: string): React.CSSProperties => ({
    width: 74, height: 74, borderRadius: '50%', display: 'grid',
    placeItems: 'center', textAlign: 'center',
    fontFamily: 'var(--font-barlow-cond, sans-serif)',
    fontWeight: 700, fontSize: 17, lineHeight: 1,
    background: cls === 'hot' ? 'var(--red-soft)' : cls === 'warm' ? 'var(--amber-soft)' : 'var(--surface-2)',
    border: `3px solid ${cls === 'hot' ? 'var(--red)' : cls === 'warm' ? 'var(--amber)' : 'var(--line)'}`,
    color: cls === 'hot' ? 'var(--red)' : 'inherit',
    opacity: cls === 'over' ? 0.55 : 1,
  });

  const AuctionCard = ({ a }: { a: Auction }) => {
    const { text, cls } = remaining(a.end);
    const totalWithFee = a.max != null ? a.max * (1 + (a.fee ?? 15) / 100) : null;
    const link = calLink(a);
    return (
      <div style={panelStyle}>
        {/* Clock */}
        <div style={clockStyle(cls)}>
          <div>
            <div>{text}</div>
            {cls !== 'over' && cls !== '' && <small style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)' }}>restant</small>}
          </div>
        </div>

        {/* Info */}
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 17, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.title}
          </h3>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>
            {a.site} · fin {fmtDate(a.end)}
          </div>
          <div style={{ fontSize: 13, marginTop: 5 }}>
            Prix max <b>{a.max ? eur(a.max) : '—'}</b>
            {totalWithFee != null && <> · avec frais ({a.fee ?? 15}%) <b>{eur(totalWithFee)}</b></>}
            {' '}
            {a.result === 'gagnee' && <span style={{ background: 'var(--green-soft)', color: 'var(--green)', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>Gagnée</span>}
            {a.result === 'perdue' && <span style={{ background: 'var(--surface-2)', color: 'var(--muted)', borderRadius: 20, padding: '2px 9px', fontSize: 12, fontWeight: 600 }}>Perdue</span>}
          </div>
          {a.notes && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{a.notes}</div>}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {a.link && (
            <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}>
              ↗ Lot
            </a>
          )}
          {a.result === 'encours' && link && (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontSize: 13, fontWeight: 600, textDecoration: 'none', color: 'var(--text)' }}>
              ▦ Rappel
            </a>
          )}
          {a.result === 'encours' && (
            <>
              <button onClick={() => setResult(a.id, 'gagnee')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--green)', background: 'var(--green-soft)', color: 'var(--green)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ✓ Gagnée
              </button>
              <button onClick={() => setResult(a.id, 'perdue')} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ✗ Perdue
              </button>
            </>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => openEdit(a)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: 13 }}>✎</button>
            <button onClick={() => del(a.id)} style={{ padding: '5px 8px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', color: 'var(--red)', fontSize: 13 }}>✕</button>
          </div>
        </div>
      </div>
    );
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 11px', border: '1px solid var(--line)',
    borderRadius: 9, background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
  };

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px) 60px' }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 36 }}>Enchères</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            {live.length} en cours · BAS, BCA, AHF, Alcopa…
          </p>
        </div>
        <button onClick={openNew} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10, background: 'var(--blue)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          + Suivre une enchère
        </button>
      </div>

      {/* Live */}
      <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
        {live.length === 0 ? (
          <div style={{ padding: '32px', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', color: 'var(--muted)', textAlign: 'center', fontSize: 14 }}>
            Aucune enchère en cours. Ajoute un lot pour voir le compte à rebours et créer un rappel Google Agenda.
          </div>
        ) : live.map(a => <AuctionCard key={a.id} a={a} />)}
      </div>

      {/* Terminées */}
      {done.length > 0 && (
        <>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Terminées</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {done.slice(0, 30).map(a => <AuctionCard key={a.id} a={a} />)}
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <>
          <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,20,0.45)', zIndex: 40 }} />
          <div style={{
            position: 'fixed', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 'min(560px, calc(100% - 24px))', maxHeight: 'calc(100% - 40px)',
            overflowY: 'auto', background: 'var(--surface)',
            borderRadius: 16, zIndex: 50, padding: 24,
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.45)',
          }}>
            <h2 style={{ fontSize: 20, marginBottom: 20 }}>
              {form.id ? 'Modifier l\'enchère' : 'Suivre une enchère'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Title */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Titre / modèle *</label>
                <input style={inp} value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ex: Peugeot 308 1.6 HDi 2018" />
              </div>

              {/* Site */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Site d'enchères</label>
                <select style={inp} value={form.site ?? ''} onChange={e => setForm(f => ({ ...f, site: e.target.value }))}>
                  {SITES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* End date */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Fin de l'enchère</label>
                <input style={inp} type="datetime-local" value={form.end ? form.end.slice(0, 16) : ''} onChange={e => setForm(f => ({ ...f, end: e.target.value ? new Date(e.target.value).toISOString() : undefined }))} />
              </div>

              {/* Max price */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Prix max (€ hors frais)</label>
                <input style={inp} type="number" min="0" value={form.max ?? ''} onChange={e => setForm(f => ({ ...f, max: e.target.value ? Number(e.target.value) : undefined }))} placeholder="ex: 4500" />
              </div>

              {/* Fee */}
              <div style={{ display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Frais acheteur (%)</label>
                <input style={inp} type="number" min="0" max="50" value={form.fee ?? 15} onChange={e => setForm(f => ({ ...f, fee: Number(e.target.value) }))} />
              </div>

              {/* Total with fee (read-only) */}
              {total != null && (
                <div style={{ display: 'grid', gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Total avec frais</label>
                  <div style={{ ...inp, background: 'var(--surface-2)', fontWeight: 700, fontFamily: 'var(--font-barlow-cond, sans-serif)', fontSize: 18 }}>
                    {eur(total)}
                  </div>
                </div>
              )}

              {/* Link */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Lien vers le lot</label>
                <input style={inp} type="url" value={form.link ?? ''} onChange={e => setForm(f => ({ ...f, link: e.target.value }))} placeholder="https://…" />
              </div>

              {/* Car link */}
              {cars.length > 0 && (
                <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Voiture liée (optionnel)</label>
                  <select style={inp} value={form.car_id ?? ''} onChange={e => setForm(f => ({ ...f, car_id: e.target.value || undefined }))}>
                    <option value="">— Aucune —</option>
                    {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Notes</label>
                <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' } as React.CSSProperties} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="État, kilométrage, points à vérifier…" />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={closeModal} style={{ padding: '9px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={save} disabled={saving || !form.title?.trim()} style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'var(--blue)', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enregistrement…' : (form.id ? 'Modifier' : 'Ajouter')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
