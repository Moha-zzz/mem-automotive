import { createClient } from '@/lib/supabase/server';
import PoliceClient from './PoliceClient';

export default async function PolicePage() {
  const sb = await createClient();
  const [{ data: logs }, { data: cars }, { data: settings }] = await Promise.all([
    sb.from('police_log').select('*').order('created_at', { ascending: false }),
    sb.from('cars').select('id,name,plate,buy_price_cts,sell_price_cts,regime,buy_date,sell_date,bought_at,sold_at'),
    sb.from('settings').select('company,siret,address').eq('id', 'main').single(),
  ]);
  return (
    <PoliceClient
      logs={logs ?? []}
      cars={cars ?? []}
      settings={settings ?? {}}
    />
  );
}
