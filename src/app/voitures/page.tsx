import { createClient } from '@/lib/supabase/server';
import VoituresClient from './VoituresClient';

export const dynamic = 'force-dynamic';

export default async function VoituresPage() {
  const sb = await createClient();
  const [{ data: cars }, { data: expenses }, { data: tasks }, { data: settings }] = await Promise.all([
    sb.from('cars').select('*').order('created_at', { ascending: false }),
    sb.from('expenses').select('*'),
    sb.from('tasks').select('*').eq('done', false),
    sb.from('settings').select('*').eq('id', 'main').single(),
  ]);
  return (
    <VoituresClient
      initialCars={cars ?? []}
      expenses={expenses ?? []}
      openTasks={tasks ?? []}
      settings={settings ?? {}}
    />
  );
}
