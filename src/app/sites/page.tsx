import { createClient } from '@/lib/supabase/server';
import SitesClient from './SitesClient';

export default async function SitesPage() {
  const sb = await createClient();
  const { data: sites } = await sb.from('sites').select('*').order('name', { ascending: true });
  return <SitesClient sites={sites ?? []} />;
}
