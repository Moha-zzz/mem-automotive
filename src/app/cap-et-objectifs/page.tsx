import { createClient } from '@/lib/supabase/server';
import CapEtObjectifsClient from './CapEtObjectifsClient';

export const dynamic = 'force-dynamic';

export default async function CapPage() {
  const sb = await createClient();
  const [{ data: cars }, { data: expenses }, { data: settings }] = await Promise.all([
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,sell_date,bought_at,regime'),
    sb.from('expenses').select('ttc_cts,date'),
    sb.from('settings').select('*').eq('id', 'main').single(),
  ]);
  return (
    <CapEtObjectifsClient
      cars={cars ?? []}
      expenses={expenses ?? []}
      settings={settings ?? {}}
    />
  );
}
