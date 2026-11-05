// Shared formatting helpers
export const eur = (n: number, decimals = 0) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimals }).format(n);

export const pct = (n: number, decimals = 1) => (n * 100).toFixed(decimals) + ' %';

export const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  return new Date(s + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export const fmtDateLong = (s?: string | null) => {
  if (!s) return '—';
  return new Date(s + 'T12:00').toLocaleDateString('fr-FR');
};

export const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export const today = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + 'T12:00').getTime() - new Date(a + 'T12:00').getTime()) / 86_400_000);

export const addDays = (dateStr: string, n: number): string => {
  const d = new Date(dateStr + 'T12:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const perDay = (margin: number, days: number) => days > 0 ? margin / days : 0;
export const eurDay = (n: number) => eur(n, 2) + '/j';
