import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import InvoiceDisplay from '@/components/factures/InvoiceDisplay';

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const sb = await createClient();
  const [{ data: invoice }, { data: car }, { data: contact }, { data: settings }] = await Promise.all([
    sb.from('invoices').select('*').eq('id', params.id).single(),
    sb.from('cars').select('*').limit(1).then(r => r.data?.[0] ? { data: r.data[0] } : { data: null }),
    sb.from('contacts').select('*').limit(1).then(r => r.data?.[0] ? { data: r.data[0] } : { data: null }),
    sb.from('settings').select('company,siret,address').eq('id', 'main').single(),
  ]);

  if (!invoice) notFound();

  return <InvoiceDisplay invoice={invoice} car={car} contact={contact} settings={settings ?? {}} />;
}
