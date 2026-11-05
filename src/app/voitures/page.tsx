import { createClient } from '@/lib/supabase/server';
import CarsClient from './CarsClient';
import type { Car } from '@/types';

export const dynamic = 'force-dynamic';

export default async function VoituresPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    // Affichage de l'erreur si les tables n'existent pas encore
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 max-w-lg w-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⚠️</span>
            <h1 className="font-semibold text-slate-800">Base de données non initialisée</h1>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Les tables Supabase ne sont pas encore créées. Applique le script SQL dans le dashboard.
          </p>
          <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-500">
            Supabase Dashboard → SQL Editor → Coller le contenu de<br/>
            <span className="text-blue-600">supabase/migrations/0001_initial_schema.sql</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">Erreur : {error.message}</p>
        </div>
      </div>
    );
  }

  return <CarsClient initialCars={(data as unknown as Car[]) ?? []} />;
}
