'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

function uid() {
  return `task_${Date.now()}`;
}

const PRIORITIES = [
  { value: 1, label: '🔴 Urgent', color: 'bg-red-100 text-red-700' },
  { value: 2, label: '🟠 Haut', color: 'bg-orange-100 text-orange-700' },
  { value: 3, label: '🟡 Normal', color: 'bg-yellow-100 text-yellow-700' },
  { value: 4, label: '🟢 Bas', color: 'bg-green-100 text-green-700' },
];

interface Props {
  tasks: any[];
  cars: any[];
}

export default function TachesClient({ tasks: initTasks, cars }: Props) {
  const supabase = createClient();
  const [tasks, setTasks] = useState(initTasks);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');
  const [filterPriority, setFilterPriority] = useState(0); // 0 = all
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState(3);
  const [newTaskDue, setNewTaskDue] = useState('');

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus === 'pending' && t.done) return false;
      if (filterStatus === 'done' && !t.done) return false;
      if (filterPriority > 0 && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority]);

  const stats = useMemo(() => ({
    total: tasks.length,
    done: tasks.filter(t => t.done).length,
    pending: tasks.filter(t => !t.done).length,
  }), [tasks]);

  async function toggleTask(id: string, done: boolean) {
    await supabase.from('tasks').update({ done }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done } : t));
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  async function addTask() {
    if (!newTaskText.trim()) return;
    const id = uid();
    const now = new Date().toISOString();
    const task = {
      id,
      text: newTaskText,
      priority: newTaskPriority,
      due_date: newTaskDue || null,
      done: false,
      created_at: now,
    };
    await supabase.from('tasks').insert([task]);
    setTasks(prev => [...prev, task]);
    setNewTaskText('');
    setNewTaskDue('');
    setNewTaskPriority(3);
  }

  const overdueTasks = filtered.filter(t =>
    !t.done && t.due_date && new Date(t.due_date) < new Date()
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">✅ Tâches</h1>
            <p className="text-xs text-slate-400">
              {stats.done}/{stats.total} complétées
              {overdueTasks > 0 && <span className="text-red-500 ml-2">⚠️ {overdueTasks} retard</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Nouvelle tâche */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Nouvelle tâche</h2>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                value={newTaskText}
                onChange={e => setNewTaskText(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && addTask()}
                placeholder="Saisir une tâche…"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Priorité</label>
                <select value={newTaskPriority} onChange={e => setNewTaskPriority(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Échéance</label>
                <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            </div>
            <button onClick={addTask}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + Ajouter
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'done'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={['px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filterStatus === s ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600'].join(' ')}>
              {s === 'all' ? 'Toutes' : s === 'pending' ? 'En attente' : 'Faites'}
            </button>
          ))}
          <div className="w-px bg-slate-200" />
          {PRIORITIES.map(p => (
            <button key={p.value} onClick={() => setFilterPriority(filterPriority === p.value ? 0 : p.value)}
              className={['px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filterPriority === p.value ? `${p.color}` : 'bg-white border border-slate-200 text-slate-600'].join(' ')}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Liste tâches */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">🎉</p>
            <p>{filterStatus === 'done' ? 'Aucune tâche complétée' : 'Aucune tâche en attente'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(task => {
              const isOverdue = !task.done && task.due_date && new Date(task.due_date) < new Date();
              const prioLabel = PRIORITIES.find(p => p.value === task.priority);

              return (
                <div key={task.id}
                  className={`rounded-lg p-3 border transition-opacity ${
                    task.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100'
                  }`}>
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={e => toggleTask(task.id, e.target.checked)}
                      className="mt-1 w-5 h-5 rounded cursor-pointer accent-blue-600"
                    />

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {task.text}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {prioLabel && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prioLabel.color}`}>
                            {prioLabel.label}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            isOverdue ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {new Date(task.due_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {isOverdue && ' ⚠️'}
                          </span>
                        )}
                        {task.car_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">
                            {cars.find(c => c.id === task.car_id)?.name || 'Voiture'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Supprimer */}
                    <button onClick={() => deleteTask(task.id)}
                      className="text-slate-300 hover:text-red-400 p-1 flex-shrink-0">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Résumé */}
        {filtered.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
            <p>
              <span className="font-semibold">{filtered.filter(t => t.done).length}</span>/{filtered.length} tâche{filtered.length > 1 ? 's' : ''} complétée{filtered.filter(t => t.done).length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
