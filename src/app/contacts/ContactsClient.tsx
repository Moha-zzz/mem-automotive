'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function uid() {
  return `contact_${Date.now()}`;
}

interface Props {
  contacts: any[];
}

export default function ContactsClient({ contacts: initContacts }: Props) {
  const supabase = createClient();
  const [contacts, setContacts] = useState(initContacts);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    siren: '',
    type: 'buyer' as 'buyer' | 'seller',
  });

  async function handleSave() {
    if (!formData.name.trim()) return;
    if (editId) {
      await supabase.from('contacts').update(formData).eq('id', editId);
      setContacts(prev => prev.map(c => c.id === editId ? { ...c, ...formData } : c));
      setEditId(null);
    } else {
      const id = uid();
      const newContact = { id, ...formData, created_at: new Date().toISOString() };
      await supabase.from('contacts').insert([newContact]);
      setContacts(prev => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setFormData({ name: '', email: '', phone: '', address: '', siren: '', type: 'buyer' });
    setShowForm(false);
  }

  function startEdit(contact: any) {
    setEditId(contact.id);
    setFormData(contact);
    setShowForm(true);
  }

  async function deleteContact(id: string) {
    if (!confirm('Supprimer ce contact ?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">👥 Contacts</h1>
            <p className="text-xs text-slate-400">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setEditId(null); setFormData({ name: '', email: '', phone: '', address: '', siren: '', type: 'buyer' }); setShowForm(true); }}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
            + Nouveau
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">{editId ? 'Modifier' : 'Nouveau contact'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 p-1">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Nom *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Email</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Téléphone</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Adresse</label>
                  <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                    rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">SIRET</label>
                    <input type="text" value={formData.siren} onChange={e => setFormData({ ...formData, siren: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                      <option value="buyer">Acheteur</option>
                      <option value="seller">Vendeur</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleSave} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700">
                  {editId ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste */}
        {contacts.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">👥</p>
            <p>Aucun contact pour l'instant</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map(contact => (
              <div key={contact.id} className="bg-white rounded-lg p-4 border border-slate-100 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-800">{contact.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        contact.type === 'buyer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {contact.type === 'buyer' ? '👤 Acheteur' : '🚗 Vendeur'}
                      </span>
                    </div>
                    {contact.email && (
                      <p className="text-sm text-slate-600 truncate">{contact.email}</p>
                    )}
                    {contact.phone && (
                      <p className="text-sm text-slate-600">{contact.phone}</p>
                    )}
                    {contact.address && (
                      <p className="text-xs text-slate-400 mt-1">{contact.address}</p>
                    )}
                    {contact.siren && (
                      <p className="text-xs text-slate-400">SIRET: {contact.siren}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(contact)} className="text-blue-600 hover:text-blue-700 p-2">
                      ✏️
                    </button>
                    <button onClick={() => deleteContact(contact.id)} className="text-red-400 hover:text-red-600 p-2">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
