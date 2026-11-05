'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink, X, Check, AlertTriangle } from 'lucide-react';
import { today, fmtDateLong, daysBetween } from '@/lib/fmt';

const PAYS = ['Pays-Bas','Belgique','Allemagne','France','Europe','Autre'];
const TYPES = ['Enchères pro','Enchères particuliers','Annonces','Importateur','Autre'];

const isTodo = (s: any) => {
  if (!s.seen) return true;
  const lim = s.freq === 'semaine' ? 7 : 1;
  return daysBetween(s.seen, today()) >= lim;
};

export default function SitesClient({ initialSites }: { initialSites: any[] }) {
  const sb = createClient();
  const [sites, setSites] = useState(initialSites);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', country: 'Pays-Bas', type: 'Enchères pro', freq: 'semaine', note: '' });

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => <div style={{ display: 'grid', gap: 5 }}><label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>{children}</div>;

  const markSeen = async (id: string, url: string) => {
    await sb.from('sites').update({ seen: today() }).eq('id', id);
    setSites(prev => prev.map(s => s.id === id ? { ...s, seen: today() } : s));
    if (url) window.open(url, '_blank');
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const { data } = await sb.from('sites').insert({ ...form }).select().single();
    if (data) { setSites(prev => [...prev, data]); setModal(false); toast.success('Site ajouté'); }
  };

  const del = async (id: string) => {
    await sb.from('sites').delete().eq('id', id);
    setSites(prev => prev.filter(s => s.id !== id));
  };

  const groups = PAYS.map(p => ({ country: p, items: sites.filter(s => s.country === p) })).filter(g => g.items.length > 0);
  const todo = sites.filter(isTodo);

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Sites d'achat</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>
            {todo.length > 0 ? <span style={{ color: 'var(--amber)' }}>{todo.length} à regarder aujourd'hui</span> : 'Tout est à jour'}
          </p>
        </div>
        <Button size="sm" onClick={() => setModal(true)}><Plus size={13} /> Ajouter</Button>
      </div>

      {groups.map(({ country, items }) => (
        <div key={country} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{country}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {items.sort((a, b) => a.name.localeCompare(b.name)).map((s: any) => {
              const needVisit = isTodo(s);
              return (
                <div key={s.id} style={{ background: 'var(--surface)', border: `1px solid ${needVisit ? 'var(--amber)' : 'var(--border)'}`, borderLeft: `4px solid ${needVisit ? 'var(--amber)' : 'var(--border)'}`, borderRadius: 10, padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.type}{s.note ? ' · ' + s.note : ''}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: needVisit ? 'var(--amber-soft)' : 'var(--green-soft)', color: needVisit ? 'var(--amber)' : 'var(--green)', fontWeight: 600 }}>
                      {needVisit ? 'À regarder' : 'À jour'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {s.seen ? `Vu le ${fmtDateLong(s.seen)}` : 'Jamais consulté'} · {s.freq === 'semaine' ? 'chaque semaine' : 'chaque jour'}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {s.url ? (
                      <button onClick={() => markSeen(s.id, s.url)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <ExternalLink size={12} /> Ouvrir
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--amber)', flex: 1 }}>Lien à compléter</span>
                    )}
                    {needVisit && s.url && (
                      <button onClick={() => markSeen(s.id, '')} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
                        <Check size={12} /> Vu
                      </button>
                    )}
                    <button onClick={() => del(s.id)} style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {sites.length === 0 && (
        <div style={{ padding: '48px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          Ajoutez les sites où vous cherchez vos voitures.
        </div>
      )}

      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(440px, calc(100% - 24px))', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nouveau site</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <F label="Nom *"><input style={inpStyle as any} autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ex: BAS Auction" /></F>
              <F label="URL"><input style={inpStyle as any} type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" /></F>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <F label="Pays"><select style={inpStyle as any} value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))}>{PAYS.map(p => <option key={p}>{p}</option>)}</select></F>
                <F label="Type"><select style={inpStyle as any} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></F>
              </div>
              <F label="Fréquence">
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['jour', 'semaine'] as const).map(f => (
                    <button key={f} onClick={() => setForm(p => ({ ...p, freq: f }))} style={{ flex: 1, padding: '7px', borderRadius: 7, border: `1px solid ${form.freq === f ? 'var(--accent)' : 'var(--border)'}`, background: form.freq === f ? 'var(--accent-soft)' : 'transparent', color: form.freq === f ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      Chaque {f}
                    </button>
                  ))}
                </div>
              </F>
              <F label="Note (optionnel)"><input style={inpStyle as any} value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></F>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
              <Button onClick={save} disabled={!form.name.trim()}>Ajouter</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
