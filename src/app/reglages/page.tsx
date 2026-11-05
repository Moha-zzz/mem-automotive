import { createClient } from '@/lib/supabase/server';
import ReglagesClient from './ReglagesClient';

export default async function ReglagesPage() {
  const sb = await createClient();
  const { data: settings } = await sb.from('settings').select('*').eq('id', 'main').single();
  return <ReglagesClient settings={settings ?? {}} />;
}
