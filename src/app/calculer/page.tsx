import { createClient } from '@/lib/supabase/server';
import CalculerClient from './CalculerClient';

export const dynamic = 'force-dynamic';

export default async function CalculerPage() {
  const sb = await createClient();
  const [{ data: deals }, { data: cars }, { data: settings }] = await Promise.all([
    sb.from('deals').select('*').order('updated_at', { ascending: false }),
    sb.from('cars').select('id,name,plate,stage,deal_id').order('name'),
    sb.from('settings').select('*').eq('id', 'main').single(),
  ]);
  return (
    <CalculerClient
      initialDeals={deals ?? []}
      cars={cars ?? []}
      settings={settings ?? {}}
    />
  );
}
