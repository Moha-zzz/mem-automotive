import { createClient } from '@/lib/supabase/server';
import StatistiquesClient from './StatistiquesClient';

export default async function StatistiquesPage() {
  const sb = await createClient();
  const [{ data: cars }, { data: expenses }, { data: invoices }] = await Promise.all([
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,buy_date,sell_date,bought_at,sold_at,regime'),
    sb.from('expenses').select('*'),
    sb.from('invoices').select('*'),
  ]);
  return <StatistiquesClient cars={cars ?? []} expenses={expenses ?? []} invoices={invoices ?? []} />;
}
