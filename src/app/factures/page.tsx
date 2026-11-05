import { createClient } from '@/lib/supabase/server';
import FacturesClient from './FacturesClient';

export const dynamic = 'force-dynamic';

export default async function FacturesPage() {
  const sb = await createClient();
  const [{ data: invoices }, { data: cars }, { data: contacts }, { data: settings }] = await Promise.all([
    sb.from('invoices').select('*').order('date', { ascending: false }),
    sb.from('cars').select('id,name,plate,regime,buy_price_cts,sell_price_cts,buyer_id,seller_id').order('created_at', { ascending: false }),
    sb.from('contacts').select('*'),
    sb.from('settings').select('invoice_next,order_next,company').eq('id', 'main').single(),
  ]);
  return (
    <FacturesClient
      invoices={invoices ?? []}
      cars={cars ?? []}
      contacts={contacts ?? []}
      settings={settings ?? {}}
    />
  );
}
