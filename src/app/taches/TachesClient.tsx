'use client';

import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDateLong, today, addDays } from '@/lib/fmt';
import { Plus, Check, X, ChevronDown, ChevronUp, Lock } from 'lucide-react';

const PRIO = { 1: 'Urgent', 2: 'Normal', 3: 'Pas pressé' };
const PRIO_COLOR = { 1: 'var(--red)', 2: 'var(--amber)', 3: 'var(--green)' };

interface Props { initialTasks: any[]; launch: any[]; cars: any[]; }

export default function TachesClient({ initialTasks, launch: initLaunch, cars }: Props) {
  const sb = createClient();
  const [tasks, setTasks] = useState(initialTasks);
  const [launch, setLaunch] = useState(initLaunch);
  const [showDone, setShowDone] = useState(false);
  const [showLaunch, setShowLaunch] = useState(true);
  const [form, setForm] = useState({ title: '', prio: '2', due: today(), car_id: '' });

  const t = today();

  const open = tasks.filter(x => !x.done);
  const done = tasks.filter(x => x.done).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? ''));

  const late    = open.filter(x => x.due && x.due < t);
  const todayTs = open.filter(x => x.due === t);
  const upcoming = open.filter(x => x.due && x.due > t).sort((a, b) => a.due.localeCompare(b.due));
  const nodate  = open.filter(x => !x.due);

  const addTask = async () => {
    if (!form.title.trim()) return;
    const payload: any = { title: form.title, prio: parseInt(form.prio), due: form.due || null, done: false };
    if (form.car_id) payload.car_id = form.car_id;
    const { data } = await sb.from('tasks').insert(payload).select().single();
    if (data) { setTasks(prev => [data, ...prev]); setForm(p => ({ ...p, title: '' })); }
  };

  const toggle = async (id: string, done: boolean) => {
    await sb.from('tasks').update({ done: !done, done_at: !done ? new Date().toISOString() : null }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done, done_at: !done ? new Date().toISOString() : null } : t));
  };

  const del = async (id: string) => {
    await sb.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const Group = ({ title, items, color }: { title: string; items: any[]; color?: string }) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: color ?? 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          {title} <span style={{ opacity: 0.7 }}>({items.length})</span>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {items.map(task => {
            const car = task.car_id ? cars.find(c => c.id === task.car_id) : null;
            const isLate = task.due && task.due < t && !task.done;
            return (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', opacity: task.done ? 0.6 : 1 }}>
                <button onClick={() => toggle(task.id, task.done)} style={{
                  width: 20, height: 20, borderRadius: 5, border: `2px solid ${task.done ? 'var(--green)' : 'var(--border)'}`,
                  background: task.done ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer',
                }}>
                  {task.done && <Check size={11} style={{ color: '#fff' }} />}
                </button>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: PRIO_COLOR[task.prio as keyof typeof PRIO_COLOR] ?? 'var(--amber)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: task.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                  {car && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{car.name}</div>}
                </div>
                {task.due && (
                  <span style={{ fontSize: 11, flexShrink: 0, padding: '2px 7px', borderRadius: 4, background: isLate ? 'var(--red-soft)' : task.due === t ? 'var(--amber-soft)' : 'var(--surface-2)', color: isLate ? 'var(--red)' : task.due === t ? 'var(--amber)' : 'var(--text-muted)' }}>
                    {isLate ? 'En retard · ' : ''}{fmtDateLong(task.due)}
                  </span>
                )}
                <button onClick={() => del(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Launch plan computation
  const launchPlan = useMemo(() => {
    if (!launch.length) return null;
    const steps = [...launch].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const by: Record<string, any> = {};
    steps.forEach(x => by[x.id] = x);
    const memo: Record<string, any> = {};

    const calc = (x: any, guard = 0): any => {
      if (memo[x.id]) return memo[x.id];
      if (guard > 40) return memo[x.id] = { lo: t, hi: t };
      if (x.done) return memo[x.id] = { lo: x.done_date ?? t, hi: x.done_date ?? t, done: true };
      const pre = (x.prereq ?? []).map((id: string) => by[id]).filter(Boolean);
      const pr  = pre.map((p: any) => calc(p, guard + 1));
      let sLo = pr.reduce((m: string, r: any) => r.lo > m ? r.lo : m, '');
      let sHi = pr.reduce((m: string, r: any) => r.hi > m ? r.hi : m, '');
      if (!sLo) sLo = x.start_date ?? t;
      if (!sHi) sHi = x.start_date ?? t;
      const lo = addDays(sLo, x.dmin ?? 0);
      const hi = addDays(sHi, x.dmax ?? 0);
      return memo[x.id] = { lo: lo < t ? t : lo, hi: hi < lo ? lo : hi, done: false, open: pre.every((p: any) => p.done) };
    };

    steps.forEach(x => calc(x));
    const doneCnt = steps.filter(x => x.done).length;
    const ms = steps.find(x => x.milestone) ?? steps[steps.length - 1];
    const next = steps.find(x => !x.done && memo[x.id]?.open);
    return { steps, r: memo, doneCnt, total: steps.length, end: ms ? memo[ms.id] : null, next };
  }, [launch, t]);

  const validateLaunch = async (id: string) => {
    await sb.from('launch').update({ done: true, done_date: t }).eq('id', id);
    setLaunch(prev => prev.map(x => x.id === id ? { ...x, done: true, done_date: t } : x));
    toast.success('Étape validée');
  };

  const inpStyle: React.CSSProperties = { width: '100%', height: 32, padding: '0 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 };

  return (
    <div style={{ padding: '24px clamp(16px,3vw,40px) 60px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Tâches</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '3px 0 0' }}>{open.length} à faire</p>
        </div>
      </div>

      {/* Add form */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input style={{ ...inpStyle, flex: 2, minWidth: 200 }} placeholder="Nouvelle tâche…" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask()} />
        <select style={{ ...inpStyle, width: 140 } as any} value={form.prio} onChange={e => setForm(p => ({ ...p, prio: e.target.value }))}>
          <option value="1">🔴 Urgent</option>
          <option value="2">🟠 Normal</option>
          <option value="3">🟢 Pas pressé</option>
        </select>
        <input style={{ ...inpStyle, width: 140 } as any} type="date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} />
        <select style={{ ...inpStyle, width: 160 } as any} value={form.car_id} onChange={e => setForm(p => ({ ...p, car_id: e.target.value }))}>
          <option value="">Aucune voiture</option>
          {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Button size="sm" onClick={addTask} disabled={!form.title.trim()}><Plus size={13} /> Ajouter</Button>
      </div>

      {/* Launch checklist */}
      {launchPlan && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: 'var(--navy)', borderRadius: 12, padding: '16px 20px', marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#AEB9D6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Démarrage · {launchPlan.doneCnt}/{launchPlan.total} étapes</div>
              <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                {launchPlan.end ? (launchPlan.end.lo === launchPlan.end.hi ? `Lancement prévu le ${fmtDateLong(launchPlan.end.lo)}` : `Lancement entre le ${fmtDateLong(launchPlan.end.lo)} et le ${fmtDateLong(launchPlan.end.hi)}`) : 'Checklist de démarrage'}
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', background: '#F59E0B', borderRadius: 2, width: `${(launchPlan.doneCnt / launchPlan.total * 100).toFixed(0)}%` }} />
              </div>
            </div>
            {launchPlan.next && (
              <div style={{ textAlign: 'right', color: '#AEB9D6', fontSize: 12 }}>
                <div>Prochaine étape</div>
                <div style={{ fontFamily: 'var(--font-barlow-cond)', fontSize: 15, fontWeight: 700, color: '#fff' }}>{launchPlan.next.title}</div>
              </div>
            )}
          </div>

          <button onClick={() => setShowLaunch(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {showLaunch ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showLaunch ? 'Masquer' : 'Voir'} les étapes
          </button>

          {showLaunch && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {launchPlan.steps.map((step: any, i: number) => {
                const r = launchPlan.r[step.id];
                const st = step.done ? 'done' : r.open ? 'open' : 'locked';
                const pre = (step.prereq ?? []).map((id: string) => launchPlan.steps.find((y: any) => y.id === id)).filter((y: any) => y && !y.done);

                return (
                  <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)', opacity: st === 'locked' ? 0.5 : 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: st === 'done' ? 'var(--green)' : st === 'open' ? 'var(--amber)' : 'var(--surface-2)', color: st === 'done' ? '#fff' : st === 'open' ? '#1a1a1a' : 'var(--text-muted)', fontSize: 12, fontWeight: 700 }}>
                      {st === 'done' ? <Check size={13} /> : st === 'locked' ? <Lock size={11} /> : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {step.title}
                        {step.milestone && <span style={{ marginLeft: 8, padding: '1px 7px', borderRadius: 4, background: 'var(--amber-soft)', color: 'var(--amber)', fontSize: 11 }}>Objectif</span>}
                      </div>
                      {step.detail && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{step.detail}</div>}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        {step.done ? (
                          <span style={{ fontSize: 11, background: 'var(--green-soft)', color: 'var(--green)', padding: '1px 7px', borderRadius: 4 }}>Fait le {fmtDateLong(step.done_date)}</span>
                        ) : (
                          <>
                            {r && <span style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 4 }}>Prévu {r.lo === r.hi ? 'le' : 'entre'} {fmtDateLong(r.lo)}{r.lo !== r.hi ? ` et le ${fmtDateLong(r.hi)}` : ''}</span>}
                            {pre.length > 0 && <span style={{ fontSize: 11, background: 'var(--surface-2)', color: 'var(--text-muted)', padding: '1px 7px', borderRadius: 4 }}>Après : {pre.map((p: any) => p.title).join(', ')}</span>}
                          </>
                        )}
                      </div>
                    </div>
                    {st === 'open' && !step.done && (
                      <Button size="sm" onClick={() => validateLaunch(step.id)}>Valider</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Task groups */}
      {open.length === 0 && (
        <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 13 }}>
          Tout est fait ! Ajoute une tâche ci-dessus.
        </div>
      )}
      <Group title="En retard" items={late} color="var(--red)" />
      <Group title="Aujourd'hui" items={todayTs} color="var(--amber)" />
      <Group title="À venir" items={upcoming} />
      <Group title="Sans date" items={nodate} />

      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            {showDone ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Tâches faites ({done.length})
          </button>
          {showDone && <Group title="" items={done.slice(0, 50)} />}
        </div>
      )}
    </div>
  );
}
