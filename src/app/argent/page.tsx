import { createClient } from '@/lib/supabase/server';
import ArgentClient from './ArgentClient';
export const dynamic = 'force-dynamic';
export default async function ArgentPage() {
  const sb = await createClient();
  const [{ data: expenses }, { data: cars }, { data: moves }, { data: settings }] = await Promise.all([
    sb.from('expenses').select('*').order('date', { ascending: false }),
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,buy_date,sell_date,regime,buy_pay,sell_pay'),
    sb.from('moves').select('*').order('date', { ascending: false }),
    sb.from('settings').select('*').eq('id', 'main').single(),
  ]);
  return <ArgentClient expenses={expenses ?? []} cars={cars ?? []} moves={moves ?? []} settings={settings ?? {}} />;
}
