import { createClient } from '@/lib/supabase/server';
import EncheresClient from './EncheresClient';

export const dynamic = 'force-dynamic';

export default async function EncheresPage() {
  const sb = await createClient();
  const [{ data: auctions }, { data: cars }] = await Promise.all([
    sb.from('auctions').select('*').order('end', { ascending: true }),
    sb.from('cars').select('id,name,stage').order('name'),
  ]);
  return <EncheresClient auctions={auctions ?? []} cars={cars ?? []} />;
}
