import { createClient } from '@/lib/supabase/server';
import ArgentClient from './ArgentClient';

export const dynamic = 'force-dynamic';

export default async function ArgentPage() {
  const sb = await createClient();

  const [
    { data: settings },
    { data: expenses },
    { data: cars },
    { data: moves },
    { data: cashFlows },
  ] = await Promise.all([
    sb.from('settings').select('*').eq('id', 'main').single(),
    sb.from('expenses').select('*').order('date', { ascending: false }),
    sb.from('cars').select('id,name,sell_date,sell_price_cts,sell_pay,buy_price_cts,buy_pay,buy_date,regime,sold_at,bought_at,stage').order('created_at', { ascending: false }),
    sb.from('moves').select('*').order('date', { ascending: false }),
    sb.from('cash').select('*').order('date', { ascending: true }),
  ]);

  return (
    <ArgentClient
      settings={settings ?? {}}
      expenses={expenses ?? []}
      cars={cars ?? []}
      moves={moves ?? []}
      cashFlows={cashFlows ?? []}
    />
  );
}
