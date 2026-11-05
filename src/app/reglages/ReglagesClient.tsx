'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface Props { settings: Record<string, any>; }

type Platform = 'desktop' | 'ios' | 'android';

const SEC: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: 'var(--radius)', padding: '18px 20px', boxShadow: 'var(--shadow)',
};

const INP: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1px solid var(--line)',
  borderRadius: 9, background: 'var(--surface)', color: 'var(--text)', fontSize: 14,
};

function F({ label, name, value, type = 'text', onChange }: {
  label: string; name: string; value: string | number | undefined;
  type?: string; onChange: (k: string, v: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 5 }}>
      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>{label}</label>
      <input style={INP} type={type} name={name} value={value ?? ''} onChange={e => onChange(name, e.target.value)} />
    </div>
  );
}

export default function ReglagesClient({ settings: init }: Props) {
  const sb = createClient();
  const router = useRouter();
  const [s, setS]      = useState<Record<string, any>>(init);
  const [co, setCo_]   = useState<Record<string, string>>(init.company ?? {});
  const [toast, setT]  = useState('');
  const [saving, setV] = useState(false);
  const [platform, setP]      = useState<Platform>('desktop');
  const [canInstall, setCI]   = useState(false);
  const [installed, setInst]  = useState(false);
  const [prompt, setPrompt]   = useState<any>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/.test(ua)) setP('ios');
    else if (/Android/.test(ua)) setP('android');
    if (window.matchMedia('(display-mode: standalone)').matches) setInst(true);
    const h = (e: any) => { e.preventDefault(); setPrompt(e); setCI(true); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const show = (m: string) => { setT(m); setTimeout(() => setT(''), 3000); };
  const sf = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));
  const sc = (k: string, v: string) => setCo_(p => ({ ...p, [k]: v }));

  const saveCalc = async () => {
    setV(true);
    await sb.from('settings').upsert({ id: 'main', ...s });
    setV(false); show('Enregistré ✓');
  };

  const saveCo = async () => {
    setV(true);
    await sb.from('settings').upsert({ id: 'main', company: co });
    setV(false); show('Société enregistrée ✓');
  };

  const installPWA = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setInst(true); setCI(false); }
  };

  const logout = async () => { await signOut(); router.push('/auth/login'); };

  const Btn = ({ onClick, label, full = false, variant = 'primary' }: { onClick: () => void; label: string; full?: boolean; variant?: 'primary' | 'danger' }) => (
    <button onClick={onClick} disabled={saving} style={{
      padding: '9px 14px', borderRadius: 10, border: 'none',
      background: variant === 'danger' ? 'var(--red-soft)' : 'var(--blue)',
      color: variant === 'danger' ? 'var(--red)' : '#fff',
      fontWeight: 700, fontSize: 14, cursor: 'pointer',
      width: full ? '100%' : 'auto', marginTop: 14,
    }}>{saving ? 'Enregistrement…' : label}</button>
  );

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px) 60px' }}>
      {toast && (
        <div style={{ position: 'fixed', left: '50%', bottom: 80, transform: 'translateX(-50%)', background: 'var(--text)', color: 'var(--surface)', padding: '10px 18px', borderRadius: 10, fontWeight: 600, zIndex: 80 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 36 }}>Réglages</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>Paramètres de calcul, société et installation</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>

        {/* Calculs */}
        <div style={SEC}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Calculs & marges</h2>
          <div style={{ display: 'grid', gap: 11 }}>
            <F label="Taux TVA (%)" name="tva" value={s.tva ?? 20} type="number" onChange={sf} />
            <F label="Alerte stock (jours)" name="seuil" value={s.seuil ?? 45} type="number" onChange={sf} />
            <F label="Bénéfice visé par voiture (€)" name="cible" value={s.cible ?? 1200} type="number" onChange={sf} />
            <F label="Bénéfice minimum acceptable (€)" name="mini" value={s.mini ?? 700} type="number" onChange={sf} />
          </div>
          <Btn onClick={saveCalc} label="Enregistrer" full />
        </div>

        {/* Numérotation */}
        <div style={SEC}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>Numérotation des factures</h2>
          <div style={{ display: 'grid', gap: 11 }}>
            <F label="Prochain n° de facture" name="invoice_next" value={s.invoice_next ?? 1} type="number" onChange={sf} />
            <F label="Prochain n° de bon de commande" name="order_next" value={s.order_next ?? 1} type="number" onChange={sf} />
          </div>
          <Btn onClick={saveCalc} label="Enregistrer" full />
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Numérotation continue et sans trou — obligation légale.
          </p>
        </div>

        {/* Société — full width */}
        <div style={{ ...SEC, gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Ma société (pour les factures)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <F label="Raison sociale" name="name" value={co.name} onChange={sc} />
            <F label="Forme juridique" name="legal" value={co.legal} onChange={sc} />
            <F label="Capital (€)" name="capital" value={co.capital} onChange={sc} />
            <F label="SIRET" name="siret" value={co.siret} onChange={sc} />
            <F label="Ville du greffe (RCS)" name="rcs" value={co.rcs} onChange={sc} />
            <F label="N° TVA intracommunautaire" name="tvaNum" value={co.tvaNum} onChange={sc} />
            <F label="Téléphone" name="phone" value={co.phone} onChange={sc} />
            <F label="Email" name="email" value={co.email} type="email" onChange={sc} />
            <F label="IBAN" name="iban" value={co.iban} onChange={sc} />
            <F label="BIC" name="bic" value={co.bic} onChange={sc} />
            <F label="Ville (pour « Fait à »)" name="city" value={co.city} onChange={sc} />
            <F label="Signataire (nom, qualité)" name="signatory" value={co.signatory} onChange={sc} />
            <div style={{ gridColumn: '1/-1', display: 'grid', gap: 5 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Adresse du siège</label>
              <textarea style={{ ...INP, minHeight: 60, resize: 'vertical' } as React.CSSProperties}
                value={co.address ?? ''} onChange={e => sc('address', e.target.value)} />
            </div>
          </div>
          <Btn onClick={saveCo} label="Enregistrer la société" />
        </div>

        {/* PWA install */}
        <div style={SEC}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>📲 Installer l'application</h2>
          {installed ? (
            <div style={{ background: 'var(--green-soft)', borderRadius: 10, padding: '12px 14px', color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
              ✓ Application déjà installée
            </div>
          ) : platform === 'ios' ? (
            <div style={{ background: 'var(--blue-soft)', borderRadius: 10, padding: '12px 14px', fontSize: 14, lineHeight: 1.7 }}>
              <b>Sur iPhone / iPad :</b>
              <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                <li>Appuyer sur <b>Partage</b> (carré + flèche)</li>
                <li>Sélectionner <b>"Sur l'écran d'accueil"</b></li>
                <li>Confirmer avec <b>"Ajouter"</b></li>
              </ol>
            </div>
          ) : canInstall ? (
            <button onClick={installPWA} style={{ width: '100%', padding: '10px', borderRadius: 10, background: 'var(--blue)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              📥 Installer l'application
            </button>
          ) : (
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              {platform === 'desktop'
                ? 'Cliquer sur l\'icône d\'installation dans la barre d\'adresse (Chrome/Edge), ou Menu ⋮ → "Installer l\'application"'
                : 'Menu Chrome ⋮ → "Ajouter à l\'écran d\'accueil"'}
            </p>
          )}
        </div>

        {/* Launchers */}
        <div style={SEC}>
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>🖥️ Launchers Desktop</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Lanceurs présents sur votre Bureau — double-cliquer pour ouvrir l'app sans barre d'adresse.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ icon: '🪟', os: 'Windows', file: 'MEM Automotive.bat' }, { icon: '🍎', os: 'Mac', file: 'MEM Automotive.command' }].map(l => (
              <div key={l.file} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{l.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{l.os}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{l.file}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
        MEM AUTOMOTIVE v1.0.0 · Sécurisé par Supabase
      </p>
    </div>
  );
}
