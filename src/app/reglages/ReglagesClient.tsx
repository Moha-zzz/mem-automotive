'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  settings: any;
}

export default function ReglagesClient({ settings: initSettings }: Props) {
  const supabase = createClient();
  const [settings, setSettings] = useState(initSettings);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    await supabase.from('settings').update(settings).eq('id', 'main');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-lg font-bold text-slate-800">⚙️ Réglages</h1>
          <p className="text-xs text-slate-400">Configuration et préférences</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Informations entreprise */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Informations entreprise</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Nom</label>
              <input type="text" value={settings.company || ''} onChange={e => setSettings({ ...settings, company: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">SIRET</label>
              <input type="text" value={settings.siret || ''} onChange={e => setSettings({ ...settings, siret: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Adresse</label>
              <textarea value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })}
                rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
            </div>
          </div>
        </section>

        {/* Paramètres factures */}
        <section className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Factures</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prochain n° facture</label>
                <input type="number" min="1" value={settings.invoice_next || 1} onChange={e => setSettings({ ...settings, invoice_next: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Prochain n° bon</label>
                <input type="number" min="1" value={settings.order_next || 1} onChange={e => setSettings({ ...settings, order_next: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>
          </div>
        </section>

        {/* À propos */}
        <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ À propos</h2>
          <div className="text-xs text-blue-800 space-y-1">
            <p><span className="font-medium">Version</span> : 1.0.0</p>
            <p><span className="font-medium">Stack</span> : Next.js 16 + Supabase PostgreSQL</p>
            <p><span className="font-medium">Hébergement</span> : Supabase Europe (Frankfurt) + Vercel</p>
            <p><span className="font-medium">Données</span> : Chiffrées en transit et au repos</p>
          </div>
        </section>

        {/* Bouton sauvegarde */}
        <button onClick={handleSave}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
            saved ? 'bg-green-500 text-white' :
            'bg-blue-600 text-white hover:bg-blue-700'
          }`}>
          {saved ? '✅ Sauvegardé !' : '💾 Enregistrer'}
        </button>
      </div>
    </div>
  );
}
