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

// Common aliases and misspellings → canonical name
const ALIASES: Record<string, string> = {
  'nairobi cbd': 'cbd', 'town': 'cbd', 'nrb': 'cbd', 'city': 'cbd',
  'rongai': 'rongai', 'rngai': 'rongai', 'rongai town': 'rongai', 'rongai est': 'rongai',
  'karen': 'karen', 'karin': 'karen', 'karren': 'karen',
  'westlands': 'westlands', 'westland': 'westlands', 'westi': 'westlands', 'westie': 'westlands',
  'ngong': 'ngong road', 'ngong rd': 'ngong road', 'ngong road': 'ngong road',
  'thika': 'thika', 'thika rd': 'thika', 'thika road': 'thika',
  'eastleigh': 'eastleigh', 'eastley': 'eastleigh', 'eastlea': 'eastleigh',
  'kasarani': 'kasarani', 'kasrani': 'kasarani',
  'kawangware': 'kawangware', 'kawang': 'kawangware', 'kawangwre': 'kawangware',
  'kikuyu': 'kikuyu', 'kikyu': 'kikuyu',
  'githurai': 'githurai', 'githria': 'githurai', 'githu': 'githurai',
};

/** Levenshtein distance — tolerates 1-2 character typos */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function normalisePlace(input: string): string {
  const s = input.trim().toLowerCase();
  if (ALIASES[s]) return ALIASES[s];
  // fuzzy alias match — allow 1 typo on longer words
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    if (alias.length > 4 && levenshtein(s, alias) <= 1) return canonical;
  }
  return s;
}

export function findRoutes(from: string, to: string): Route[] {
  const f = normalisePlace(from);
  const t = normalisePlace(to);
  if (!f || !t) return [];
  // exact/partial match first
  const exact = ROUTES.filter(
    r => r.from.toLowerCase().includes(f) && r.to.toLowerCase().includes(t)
  );
  if (exact.length > 0) return exact;
  // fuzzy fallback — match each stage name with levenshtein ≤ 2
  return ROUTES.filter(r => {
    const rf = r.from.toLowerCase();
    const rt = r.to.toLowerCase();
    const fMatch = rf.includes(f) || levenshtein(rf, f) <= 2 || f.split(' ').some(w => w.length > 3 && rf.includes(w));
    const tMatch = rt.includes(t) || levenshtein(rt, t) <= 2 || t.split(' ').some(w => w.length > 3 && rt.includes(w));
    return fMatch && tMatch;
  });
}

/** Returns the closest known place name for display, or original if no match */
export function suggestPlace(input: string): string {
  const n = normalisePlace(input);
  const allPlaces = [...new Set(ROUTES.flatMap(r => [r.from.toLowerCase(), r.to.toLowerCase()]))];
  if (allPlaces.includes(n)) {
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  // find closest
  let best = input, bestDist = 99;
  for (const p of allPlaces) {
    const d = levenshtein(n, p);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  if (bestDist <= 3) return best.charAt(0).toUpperCase() + best.slice(1);
  return input;
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
