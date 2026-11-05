import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CarSheetClient from './CarSheetClient';
import type { Car } from '@/types';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CarPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: car, error }, { data: expenses }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', id).single(),
    supabase.from('expenses').select('*').eq('car_id', id).order('date', { ascending: false }),
  ]);

  if (error || !car) return notFound();

  return <CarSheetClient car={car as unknown as Car} expenses={expenses ?? []} />;
}
