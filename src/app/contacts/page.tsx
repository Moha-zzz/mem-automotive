import { createClient } from '@/lib/supabase/server';
import ContactsClient from './ContactsClient';
export const dynamic = 'force-dynamic';
export default async function ContactsPage() {
  const sb = await createClient();
  const { data: contacts } = await sb.from('contacts').select('*').order('name');
  return <ContactsClient initialContacts={contacts ?? []} />;
}
