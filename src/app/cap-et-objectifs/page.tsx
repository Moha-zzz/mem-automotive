import { createClient } from '@/lib/supabase/server';
import CapClient from './CapEtObjectifsClient';
export const dynamic = 'force-dynamic';
export default async function CapPage() {
  const sb = await createClient();
  const [{ data: cars }, { data: expenses }, { data: goals }, { data: settings }] = await Promise.all([
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,sell_date,buy_date,bought_at,regime'),
    sb.from('expenses').select('*'),
    sb.from('goals').select('*').order('created_at'),
    sb.from('settings').select('*').eq('id', 'main').single(),
  ]);
  return <CapClient cars={cars ?? []} expenses={expenses ?? []} goals={goals ?? []} settings={settings ?? {}} />;
}
