import { createClient } from '@/lib/supabase/server';
import TachesClient from './TachesClient';

export default async function TachesPage() {
  const sb = await createClient();
  const [{ data: tasks }, { data: cars }] = await Promise.all([
    sb.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false }),
    sb.from('cars').select('id,name,plate'),
  ]);
  return <TachesClient tasks={tasks ?? []} cars={cars ?? []} />;
}
