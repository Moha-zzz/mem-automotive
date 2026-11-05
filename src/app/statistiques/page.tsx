import { createClient } from '@/lib/supabase/server';
import StatistiquesClient from './StatistiquesClient';
export const dynamic = 'force-dynamic';
export default async function StatistiquesPage() {
  const sb = await createClient();
  const [{ data: cars }, { data: expenses }, { data: settings }] = await Promise.all([
    sb.from('cars').select('*'),
    sb.from('expenses').select('*'),
    sb.from('settings').select('tva,cible,mini').eq('id', 'main').single(),
  ]);
  return <StatistiquesClient cars={cars ?? []} expenses={expenses ?? []} settings={settings ?? {}} />;
}
