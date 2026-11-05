import { createClient } from '@/lib/supabase/server';
import TachesClient from './TachesClient';
export const dynamic = 'force-dynamic';
export default async function TachesPage() {
  const sb = await createClient();
  const [{ data: tasks }, { data: launch }, { data: cars }] = await Promise.all([
    sb.from('tasks').select('*').order('prio').order('due'),
    sb.from('launch').select('*').order('order'),
    sb.from('cars').select('id,name').order('name'),
  ]);
  return <TachesClient initialTasks={tasks ?? []} launch={launch ?? []} cars={cars ?? []} />;
}
