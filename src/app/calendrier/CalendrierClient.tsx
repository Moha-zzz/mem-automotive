'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

function uid() {
  return `event_${Date.now()}`;
}

interface Props {
  events: any[];
}

export default function CalendrierClient({ events: initEvents }: Props) {
  const supabase = createClient();
  const [events, setEvents] = useState(initEvents);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');

  const currentMonth = new Date();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [firstDay, daysInMonth]);

  async function addEvent() {
    if (!newTitle.trim() || !newDate) return;
    const id = uid();
    const event = {
      id,
      title: newTitle,
      date: newDate,
      time: newTime,
      created_at: new Date().toISOString(),
    };
    await supabase.from('events').insert([event]);
    setEvents(prev => [...prev, event].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setNewTitle('');
    setNewDate('');
    setNewTime('09:00');
    setShowForm(false);
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">📅 Calendrier</h1>
            <p className="text-xs text-slate-400 capitalize">{monthName}</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700">
            + Événement
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-2xl w-full max-w-sm p-4" onClick={e => e.stopPropagation()}>
              <h2 className="font-semibold text-slate-800 mb-3">Nouvel événement</h2>
              <div className="space-y-3">
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Titre" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <button onClick={addEvent} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                  Créer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grille calendrier */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
              <div key={d} className="text-center text-xs font-bold text-slate-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const dateStr = day ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
              const dayEvents = dateStr ? events.filter(e => e.date === dateStr) : [];
              const isToday = dateStr === todayStr;

              return (
                <div key={i} className={`rounded p-2 text-center text-sm min-h-20 ${
                  !day ? 'bg-slate-50' :
                  isToday ? 'bg-blue-100 border-2 border-blue-500' :
                  'bg-white border border-slate-200'
                }`}>
                  {day && (
                    <>
                      <p className="font-bold text-slate-700">{day}</p>
                      {dayEvents.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {dayEvents.slice(0, 2).map(e => (
                            <p key={e.id} className="text-xs bg-blue-600 text-white rounded px-1 truncate" title={e.title}>
                              {e.title}
                            </p>
                          ))}
                          {dayEvents.length > 2 && <p className="text-xs text-slate-400">+{dayEvents.length - 2}</p>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Liste événements */}
        {events.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-3">Événements à venir</h2>
            <div className="space-y-2">
              {events.filter(e => e.date >= todayStr).slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{e.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(e.date).toLocaleDateString('fr-FR')} {e.time || ''}
                    </p>
                  </div>
                  <button onClick={() => deleteEvent(e.id)} className="text-slate-300 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
