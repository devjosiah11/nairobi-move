// Minimal fare/route data for server-side USSD & SMS handlers.
// Mirrors apps/matatu-pulse/src/lib/data.ts — keep in sync.

export type Route = {
  id: string;
  number: string;
  from: string;
  to: string;
  fareOffPeak: [number, number];
  farePeak: [number, number];
  sacco?: string;
};

export const ROUTES: Route[] = [
  { id: '111',  number: '111',  from: 'CBD',        to: 'Rongai',      fareOffPeak: [60, 80],   farePeak: [80, 100],  sacco: 'Rongai Express' },
  { id: '111r', number: '111',  from: 'Rongai',     to: 'CBD',         fareOffPeak: [60, 80],   farePeak: [80, 100],  sacco: 'Rongai Express' },
  { id: '125',  number: '125',  from: 'CBD',        to: 'Karen',       fareOffPeak: [60, 100],  farePeak: [80, 120],  sacco: 'Karen Shuttle' },
  { id: '125r', number: '125',  from: 'Karen',      to: 'CBD',         fareOffPeak: [60, 100],  farePeak: [80, 120],  sacco: 'Karen Shuttle' },
  { id: '23',   number: '23',   from: 'CBD',        to: 'Westlands',   fareOffPeak: [30, 40],   farePeak: [40, 60],   sacco: 'Westlands Link' },
  { id: '23r',  number: '23',   from: 'Westlands',  to: 'CBD',         fareOffPeak: [30, 40],   farePeak: [40, 60],   sacco: 'Westlands Link' },
  { id: '15',   number: '15',   from: 'CBD',        to: 'Ngong Road',  fareOffPeak: [30, 50],   farePeak: [40, 60],   sacco: 'Ngong Rd SACCO' },
  { id: '15r',  number: '15',   from: 'Ngong Road', to: 'CBD',         fareOffPeak: [30, 50],   farePeak: [40, 60],   sacco: 'Ngong Rd SACCO' },
  { id: '17B',  number: '17B',  from: 'CBD',        to: 'Thika',       fareOffPeak: [100, 150], farePeak: [120, 200], sacco: 'Thika Road Express' },
  { id: '17Br', number: '17B',  from: 'Thika',      to: 'CBD',         fareOffPeak: [100, 150], farePeak: [120, 200], sacco: 'Thika Road Express' },
  { id: '58',   number: '58',   from: 'CBD',        to: 'Eastleigh',   fareOffPeak: [30, 40],   farePeak: [40, 60],   sacco: 'Eastleigh SACCO' },
  { id: '58r',  number: '58',   from: 'Eastleigh',  to: 'CBD',         fareOffPeak: [30, 40],   farePeak: [40, 60],   sacco: 'Eastleigh SACCO' },
  { id: '45',   number: '45',   from: 'CBD',        to: 'Kasarani',    fareOffPeak: [40, 60],   farePeak: [50, 80],   sacco: 'Kasarani Express' },
  { id: '45r',  number: '45',   from: 'Kasarani',   to: 'CBD',         fareOffPeak: [40, 60],   farePeak: [50, 80],   sacco: 'Kasarani Express' },
  { id: '33',   number: '33',   from: 'CBD',        to: 'Kawangware',  fareOffPeak: [40, 60],   farePeak: [50, 70],   sacco: 'Kawangware SACCO' },
  { id: '33r',  number: '33',   from: 'Kawangware', to: 'CBD',         fareOffPeak: [40, 60],   farePeak: [50, 70],   sacco: 'Kawangware SACCO' },
  { id: '46',   number: '46',   from: 'CBD',        to: 'Kikuyu',      fareOffPeak: [60, 80],   farePeak: [80, 100],  sacco: 'Kikuyu SACCO' },
  { id: '46r',  number: '46',   from: 'Kikuyu',     to: 'CBD',         fareOffPeak: [60, 80],   farePeak: [80, 100],  sacco: 'Kikuyu SACCO' },
  { id: '34',   number: '34',   from: 'CBD',        to: 'Githurai',    fareOffPeak: [50, 70],   farePeak: [60, 90],   sacco: 'Githurai SACCO' },
  { id: '34r',  number: '34',   from: 'Githurai',   to: 'CBD',         fareOffPeak: [50, 70],   farePeak: [60, 90],   sacco: 'Githurai SACCO' },
];

export function findRoutes(from: string, to: string): Route[] {
  const f = from.trim().toLowerCase();
  const t = to.trim().toLowerCase();
  if (!f || !t) return [];
  return ROUTES.filter(
    r => r.from.toLowerCase().includes(f) && r.to.toLowerCase().includes(t)
  );
}

/** Peak hours: weekdays 6–10am and 4–8pm EAT */
export function isPeakNow(now = new Date()): boolean {
  const eatOffset = 3 * 60 * 60 * 1000;
  const eat = new Date(now.getTime() + eatOffset);
  const h = eat.getUTCHours();
  const day = eat.getUTCDay();
  if (day === 0 || day === 6) return false;
  return (h >= 6 && h < 10) || (h >= 16 && h < 20);
}
