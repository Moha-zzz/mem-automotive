import { createClient } from '@/lib/supabase/server';
import SitesClient from './SitesClient';
export const dynamic = 'force-dynamic';
export default async function SitesPage() {
  const sb = await createClient();
  const { data: sites } = await sb.from('sites').select('*').order('name');
  return <SitesClient initialSites={sites ?? []} />;
}
