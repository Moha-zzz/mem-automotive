'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pencil, Trash2, X, User } from 'lucide-react';

const ROLES = ['Acheteur','Vendeur','Garage','Carrossier','Dépanneur','Pièces','Transporteur','Autre'];

const EMPTY = { name: '', phone: '', email: '', address: '', siret: '', role: 'Vendeur', id_doc: '', wants: '', budget: '' };

interface Props { initialContacts: any[]; }

export default function ContactsClient({ initialContacts }: Props) {
  const sb = createClient();
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>(EMPTY);
  const [saving, setSaving] = useState(false);

  const filtered = contacts.filter(c =>
    !search || (c.name + ' ' + (c.phone ?? '') + ' ' + (c.role ?? '')).toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const buyers = contacts.filter(c => c.role === 'Acheteur' && c.wants);

  const openNew  = () => { setForm(EMPTY); setModal(true); };
  const openEdit = (c: any) => { setForm({ ...EMPTY, ...c }); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, siret: form.siret || null, role: form.role, id_doc: form.id_doc || null, wants: form.wants || null, budget: form.budget || null };
    if (form.id) {
      await sb.from('contacts').update(payload).eq('id', form.id);
      setContacts(prev => prev.map(c => c.id === form.id ? { ...c, ...payload } : c));
    } else {
      const { data } = await sb.from('contacts').insert(payload).select().single();
      if (data) setContacts(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setSaving(false);
    setModal(false);
    toast.success(form.id ? 'Contact modifié' : 'Contact ajouté');
  };

  const del = async (id: string) => {
    if (!confirm('Supprimer ce contact ?')) return;
    await sb.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };
  const F = ({ label, children }: any) => (
    <div style={{ display: 'grid', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );

  const ROLE_COLORS: Record<string, string> = { 'Acheteur': 'var(--accent)', 'Vendeur': 'var(--amber)', 'Garage': 'var(--green)' };

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Contacts</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>{contacts.length} contact{contacts.length > 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={13} /> Ajouter</Button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input style={{ ...inpStyle, paddingLeft: 32 } as any} placeholder="Chercher…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Waiting buyers */}
      {buyers.length > 0 && (
        <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Acheteurs en attente d'une voiture</div>
          {buyers.map((b: any) => (
            <div key={b.id} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{b.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cherche : {b.wants}</span>
              {b.budget && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Budget : {b.budget} €</span>}
              {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: 12, color: 'var(--accent)' }}>Appeler</a>}
            </div>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {contacts.length === 0 ? 'Aucun contact. Ajoutez vos vendeurs, acheteurs et garages.' : 'Aucun résultat'}
          </div>
        ) : filtered.map((c: any) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <User size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                {c.role && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: `${(ROLE_COLORS[c.role] ?? 'var(--text-muted)')}20`, color: ROLE_COLORS[c.role] ?? 'var(--text-muted)', fontWeight: 600 }}>{c.role}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {[c.phone, c.email].filter(Boolean).join(' · ')}
                {c.id_doc && <span style={{ marginLeft: 8, fontSize: 11, background: 'var(--green-soft)', color: 'var(--green)', padding: '0 5px', borderRadius: 3 }}>Pièce d'identité ✓</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Pencil size={14} /></button>
              <button onClick={() => del(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <>
          <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50 }} />
          <div style={{ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(520px, calc(100% - 24px))', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 14, zIndex: 51, padding: 24, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{form.id ? 'Modifier' : 'Nouveau contact'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1/-1' }}><F label="Nom *"><input style={inpStyle as any} autoFocus value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></F></div>
              <F label="Rôle"><select style={inpStyle as any} value={form.role} onChange={e => setForm((p: any) => ({ ...p, role: e.target.value }))}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></F>
              <F label="Téléphone"><input style={inpStyle as any} type="tel" value={form.phone} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></F>
              <F label="Email"><input style={inpStyle as any} type="email" value={form.email} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></F>
              <F label="SIRET"><input style={inpStyle as any} value={form.siret} onChange={e => setForm((p: any) => ({ ...p, siret: e.target.value }))} /></F>
              <div style={{ gridColumn: '1/-1' }}><F label="Pièce d'identité (livre de police)"><input style={inpStyle as any} value={form.id_doc} onChange={e => setForm((p: any) => ({ ...p, id_doc: e.target.value }))} placeholder="Type, n°, date de naissance" /></F></div>
              <div style={{ gridColumn: '1/-1' }}><F label="Adresse"><textarea style={{ ...inpStyle, minHeight: 55, resize: 'vertical' } as any} value={form.address} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} /></F></div>
              {form.role === 'Acheteur' && <>
                <F label="Cherche (si acheteur en attente)"><input style={inpStyle as any} value={form.wants} onChange={e => setForm((p: any) => ({ ...p, wants: e.target.value }))} placeholder="ex: Diesel < 5000€" /></F>
                <F label="Budget max (€)"><input style={inpStyle as any} type="number" value={form.budget} onChange={e => setForm((p: any) => ({ ...p, budget: e.target.value }))} /></F>
              </>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <Button variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
