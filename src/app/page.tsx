import { createClient } from '@/lib/supabase/server';
import AccueilClient from './AccueilClient';

export const dynamic = 'force-dynamic';

export default async function AccueilPage() {
  const sb = await createClient();
  const [
    { data: cars }, { data: expenses }, { data: invoices },
    { data: settings }, { data: tasks },
  ] = await Promise.all([
    sb.from('cars').select('id,name,stage,buy_price_cts,sell_price_cts,buy_date,sell_date,bought_at,regime'),
    sb.from('expenses').select('*'),
    sb.from('invoices').select('id,locked_at,paid,type'),
    sb.from('settings').select('*').eq('id', 'main').single(),
    sb.from('tasks').select('*').eq('done', false).order('due'),
  ]);

  const s = settings ?? {};
  const openBalance  = (s.solde_cts ?? 0) / 100;
  const cashBalance  = (s.cash_solde_cts ?? 0) / 100;

  return (
    <AccueilClient
      cars={cars ?? []} expenses={expenses ?? []} deals={[]}
      invoices={invoices ?? []} settings={s} moves={[]} cashFlows={[]}
      tasks={tasks ?? []} openBalance={openBalance} cashBalance={cashBalance}
    />
  );
}
