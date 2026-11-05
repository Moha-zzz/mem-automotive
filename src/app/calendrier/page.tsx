import { createClient } from '@/lib/supabase/server';
import CalendrierClient from './CalendrierClient';

export default async function CalendrierPage() {
  const sb = await createClient();
  const { data: events } = await sb.from('events').select('*').order('date', { ascending: true });
  return <CalendrierClient events={events ?? []} />;
}
