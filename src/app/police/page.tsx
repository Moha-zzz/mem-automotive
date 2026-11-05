import { createClient } from '@/lib/supabase/server';
import PoliceClient from './PoliceClient';
export const dynamic = 'force-dynamic';
export default async function PolicePage() {
  const sb = await createClient();
  const [{ data: cars }, { data: contacts }] = await Promise.all([
    sb.from('cars').select('*').order('buy_date'),
    sb.from('contacts').select('*'),
  ]);
  return <PoliceClient cars={cars ?? []} contacts={contacts ?? []} />;
}
