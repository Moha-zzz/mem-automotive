'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') ?? '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sb = createClient();
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); return; }
      router.push(next);
      router.refresh();
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    border: '1px solid var(--line)', borderRadius: 9,
    background: 'var(--surface)', color: 'var(--text)',
    fontSize: 15, outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#1D3F9E', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 20, fontFamily: 'var(--font-barlow-cond, sans-serif)', letterSpacing: '0.05em' }}>MEM</span>
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, margin: '0 0 4px' }}>MEM AUTOMOTIVE</h1>
          <p style={{ color: '#AEB9D6', fontSize: 14, margin: 0 }}>Ordinateur de Bord</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--surface)', borderRadius: 18, padding: 36, boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)' }}>
          <h2 style={{ fontSize: 22, marginBottom: 24, color: 'var(--text)' }}>Connexion</h2>

          {error && (
            <div style={{ background: 'var(--red-soft)', border: '1px solid rgba(200,50,43,0.3)', color: 'var(--red)', borderRadius: 10, padding: '10px 14px', fontSize: 14, marginBottom: 18 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                required disabled={loading} placeholder="vous@exemple.com" style={inp}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-soft)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Mot de passe</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                required disabled={loading} placeholder="••••••••" style={inp}
                onFocus={e => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-soft)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--line)'; e.target.style.boxShadow = 'none'; }} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              background: loading ? 'var(--muted)' : 'var(--blue)',
              border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#7F8BAA', fontSize: 12, marginTop: 20 }}>
          MEM AUTOMOTIVE v1.0.0 · Sécurisé par Supabase
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
