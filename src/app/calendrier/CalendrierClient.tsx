'use client';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { today, addDays } from '@/lib/fmt';

const KINDS = [
  { k: 'vente', label: 'Vente aux enchères', color: '#3B82F6' },
  { k: 'lot',   label: 'Lot suivi',           color: '#8B5CF6' },
  { k: 'tache', label: 'Tâche',               color: '#F59E0B' },
  { k: 'rdv',   label: 'Rendez-vous',         color: '#10B981' },
  { k: 'autre', label: 'Autre',               color: '#64748B' },
];
const COLOR = Object.fromEntries(KINDS.map(k => [k.k, k.color]));

function getOccurrences(events: any[], from: string, to: string) {
  const occ: any[] = [];
  events.forEach(ev => {
    if (ev.repeat === 'semaine') {
      let d = ev.date;
      while (d <= to) {
        if (d >= from && !(ev.skip ?? []).includes(d)) occ.push({ ...ev, date: d });
        d = addDays(d, 7);
      }
    } else {
      if (ev.date >= from && ev.date <= to) occ.push(ev);
    }
  });
  return occ.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}

export default function CalendrierClient({ initialEvents }: { initialEvents: any[] }) {
  const sb = createClient();
  const [events, setEvents] = useState(initialEvents);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selDay, setSelDay] = useState(today());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', kind: 'vente', date: today(), time: '', repeat: '', site: '', link: '' });

  const pad = (n: number) => String(n).padStart(2, '0');
  const ds  = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const y = month.getFullYear(), m = month.getMonth();
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - offset);
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });

  const from = ds(days[0]), to = ds(days[41]);
  const occ = useMemo(() => getOccurrences(events, from, to), [events, from, to]);
  const byDay: Record<string, any[]> = {};
  occ.forEach(o => { (byDay[o.date] = byDay[o.date] ?? []).push(o); });

  const selOcc = byDay[selDay] ?? [];
  const t = today();

  const save = async () => {
    if (!form.title.trim()) return;
    const { data } = await sb.from('events').insert({ ...form }).select().single();
    if (data) { setEvents(prev => [...prev, data]); setModal(false); toast.success('Événement ajouté'); }
  };

  const del = async (id: string) => {
    await sb.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => <div style={{ display: 'grid', gap: 5 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>{children}</div>;

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Calendrier</h1>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {KINDS.map(k => <span key={k.k} style={{ fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: k.color, display: 'inline-block' }} />{k.label}</span>)}
          </div>
        </div>
        <Button size="sm" onClick={() => { setForm({ title: '', kind: 'vente', date: selDay, time: '', repeat: '', site: '', link: '' }); setModal(true); }}><Plus size={13} /> Ajouter</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>
        {/* Calendar grid */}
        <div>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <button onClick={() => setMonth(new Date(y, m - 1, 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', padding: '5px 8px', color: 'var(--text)' }}><ChevronLeft size={14} /></button>
            <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textTransform: 'capitalize' }}>{month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setMonth(new Date(y, m + 1, 1))} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', padding: '5px 8px', color: 'var(--text)' }}><ChevronRight size={14} /></button>
            <button onClick={() => setMonth(new Date())} style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', background: 'transparent', fontSize: 12, color: 'var(--text-muted)' }}>Aujourd'hui</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--border)', gap: 1 }}>
            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map(d => (
              <div key={d} style={{ background: 'var(--surface-2)', padding: '8px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>{d}</div>
            ))}
            {days.map(d => {
              const k = ds(d);
              const list = byDay[k] ?? [];
              const isToday = k === t, isSel = k === selDay, isOut = d.getMonth() !== m;
              return (
                <button key={k} onClick={() => setSelDay(k)} style={{ background: isSel ? 'var(--accent-soft)' : 'var(--surface)', minHeight: 90, padding: '6px', display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer', border: 'none', textAlign: 'left', opacity: isOut ? 0.4 : 1 }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#fff' : 'var(--text)' }}>{d.getDate()}</span>
                  {list.slice(0, 2).map((o: any, i: number) => (
                    <span key={i} style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${COLOR[o.kind]}20`, color: COLOR[o.kind], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'block' }}>
                      {o.time ? o.time + ' ' : ''}{o.title}
                    </span>
                  ))}
                  {list.length > 2 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{list.length - 2}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail */}
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{new Date(selDay + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button onClick={() => { setForm({ title: '', kind: 'vente', date: selDay, time: '', repeat: '', site: '', link: '' }); setModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}><Plus size={16} /></button>
            </div>
            {selOcc.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Rien ce jour-là</div>
            ) : selOcc.map((o: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <div style={{ width: 3, background: COLOR[o.kind] ?? '#64748B', alignSelf: 'stretch', borderRadius: 2, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {KINDS.find(k => k.k === o.kind)?.label}{o.time ? ' · ' + o.time : ''}{o.site ? ' · ' + o.site : ''}{o.repeat === 'semaine' ? ' · hebdo' : ''}
                  </div>
                  {o.link && <a href={o.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>Ouvrir le lien</a>}
                </div>
                <button onClick={() => del(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={13} /></button>
              </div>
            ))}
          </div>

          {/* Upcoming 14 days */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>14 prochains jours</div>
            {(() => {
              const upcoming = getOccurrences(events.filter(e => e.kind !== 'tache'), t, addDays(t, 14)).slice(0, 10);
              return upcoming.length === 0
                ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucune vente prévue</div>
                : upcoming.map((o: any, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                      <div style={{ width: 3, background: COLOR[o.kind] ?? '#64748B', alignSelf: 'stretch', borderRadius: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{o.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.date + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}{o.time ? ' ' + o.time : ''}</div>
                      </div>
                    </div>
                  ));
            })()}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(480px, calc(100% - 24px))', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Ajouter un événement</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}><F label="Titre *"><input style={inpStyle as any} autoFocus value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></F></div>
              <F label="Type"><select style={inpStyle as any} value={form.kind} onChange={e => setForm(p => ({ ...p, kind: e.target.value }))}>{KINDS.map(k => <option key={k.k} value={k.k}>{k.label}</option>)}</select></F>
              <F label="Date"><input style={inpStyle as any} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></F>
              <F label="Heure (optionnel)"><input style={inpStyle as any} type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></F>
              <F label="Répétition"><select style={inpStyle as any} value={form.repeat} onChange={e => setForm(p => ({ ...p, repeat: e.target.value }))}><option value="">Une seule fois</option><option value="semaine">Chaque semaine</option></select></F>
              <div style={{ gridColumn: '1/-1' }}><F label="Lien (optionnel)"><input style={inpStyle as any} type="url" value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} /></F></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
              <Button onClick={save} disabled={!form.title.trim()}>Enregistrer</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
