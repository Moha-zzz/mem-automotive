import { createClient } from '@/lib/supabase/server';
import AccueilClient from './AccueilClient';

export default async function AccueilPage() {
  const sb = await createClient();

  const [
    { data: cars },
    { data: expenses },
    { data: deals },
    { data: invoices },
    { data: settings },
    { data: moves },
    { data: cashFlows },
  ] = await Promise.all([
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,buy_date,sell_date,bought_at,sold_at,regime').order('created_at', { ascending: false }),
    sb.from('expenses').select('*').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    sb.from('deals').select('*').order('created_at', { ascending: false }).limit(10),
    sb.from('invoices').select('*').gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)),
    sb.from('settings').select('*').eq('id', 'main').single(),
    sb.from('moves').select('*').order('date', { ascending: false }).limit(10),
    sb.from('cash').select('*').order('date', { ascending: true }),
  ]);

  return (
    <AccueilClient
      cars={cars ?? []}
      expenses={expenses ?? []}
      deals={deals ?? []}
      invoices={invoices ?? []}
      settings={settings ?? {}}
      moves={moves ?? []}
      cashFlows={cashFlows ?? []}
    />
  );
}
