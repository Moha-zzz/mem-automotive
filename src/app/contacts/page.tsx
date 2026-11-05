import { createClient } from '@/lib/supabase/server';
import ContactsClient from './ContactsClient';

export default async function ContactsPage() {
  const sb = await createClient();
  const { data: contacts } = await sb.from('contacts').select('*').order('name', { ascending: true });
  return <ContactsClient contacts={contacts ?? []} />;
}
