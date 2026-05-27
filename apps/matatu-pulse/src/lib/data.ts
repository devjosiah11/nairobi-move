export type Route = {
  id: string;
  number: string;
  badgeColor: string; // tailwind bg class
  from: string;
  to: string;
  sacco: string;
  boardingStage: string;
  fareOffPeak: [number, number];
  farePeak: [number, number];
  fareWeekend: [number, number];
  journeyMinutes: number;
  vehicle: "14-seater" | "33-seater";
  firstMatatu: string;
  lastMatatu: string;
  saccoPhone: string;
  stops: { name: string; km: number }[];
  frequency: number; // higher = more frequent
};

export const ROUTES: Route[] = [
  {
    id: "111",
    number: "111",
    badgeColor: "bg-red-600",
    from: "CBD Archives",
    to: "Rongai",
    sacco: "Rongai-Maasai SACCO",
    boardingStage: "Archives, Moi Avenue",
    fareOffPeak: [60, 80],
    farePeak: [80, 100],
    fareWeekend: [70, 90],
    journeyMinutes: 55,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:30 PM",
    saccoPhone: "+254 720 111 111",
    frequency: 9,
    stops: [
      { name: "Archives", km: 0 },
      { name: "Nyayo Stadium", km: 3 },
      { name: "T-Mall", km: 7 },
      { name: "Bomas", km: 12 },
      { name: "Galleria", km: 16 },
      { name: "Rongai Tuskys", km: 22 },
    ],
  },
  {
    id: "46",
    number: "46",
    badgeColor: "bg-blue-700",
    from: "CBD",
    to: "Westlands",
    sacco: "Westlands SACCO",
    boardingStage: "Kencom, Moi Avenue",
    fareOffPeak: [30, 40],
    farePeak: [40, 60],
    fareWeekend: [40, 50],
    journeyMinutes: 25,
    vehicle: "14-seater",
    firstMatatu: "4:30 AM",
    lastMatatu: "11:00 PM",
    saccoPhone: "+254 722 460 460",
    frequency: 10,
    stops: [
      { name: "Kencom", km: 0 },
      { name: "Museum Hill", km: 2 },
      { name: "Westlands Roundabout", km: 5 },
      { name: "Sarit Centre", km: 6 },
    ],
  },
  {
    id: "34",
    number: "34",
    badgeColor: "bg-green-700",
    from: "CBD",
    to: "Ngong Road",
    sacco: "Ngong Road SACCO",
    boardingStage: "Railways Bus Station",
    fareOffPeak: [40, 60],
    farePeak: [50, 80],
    fareWeekend: [50, 70],
    journeyMinutes: 35,
    vehicle: "33-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 343 434",
    frequency: 8,
    stops: [
      { name: "Railways", km: 0 },
      { name: "Kenyatta Hospital", km: 4 },
      { name: "Adams Arcade", km: 7 },
      { name: "Prestige", km: 9 },
      { name: "Ngong Town", km: 18 },
    ],
  },
  {
    id: "105",
    number: "105",
    badgeColor: "bg-orange-600",
    from: "CBD",
    to: "Githurai 45",
    sacco: "Githurai SACCO",
    boardingStage: "Tea Room, Tom Mboya",
    fareOffPeak: [40, 50],
    farePeak: [50, 70],
    fareWeekend: [40, 60],
    journeyMinutes: 50,
    vehicle: "33-seater",
    firstMatatu: "4:30 AM",
    lastMatatu: "11:30 PM",
    saccoPhone: "+254 721 105 105",
    frequency: 10,
    stops: [
      { name: "Tea Room", km: 0 },
      { name: "Pangani", km: 4 },
      { name: "Muthaiga", km: 7 },
      { name: "Roysambu", km: 12 },
      { name: "Kasarani", km: 15 },
      { name: "Githurai 45", km: 19 },
    ],
  },
  {
    id: "58",
    number: "58",
    badgeColor: "bg-yellow-500",
    from: "CBD",
    to: "Eastleigh",
    sacco: "Eastleigh SACCO",
    boardingStage: "OTC, Tom Mboya",
    fareOffPeak: [20, 30],
    farePeak: [30, 50],
    fareWeekend: [30, 40],
    journeyMinutes: 20,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:30 PM",
    saccoPhone: "+254 720 585 858",
    frequency: 9,
    stops: [
      { name: "OTC", km: 0 },
      { name: "Pangani", km: 3 },
      { name: "First Avenue Eastleigh", km: 5 },
      { name: "Section 3", km: 7 },
    ],
  },
  {
    id: "125",
    number: "125",
    badgeColor: "bg-purple-700",
    from: "CBD",
    to: "Karen",
    sacco: "Karen-Langata SACCO",
    boardingStage: "Railways Bus Station",
    fareOffPeak: [60, 90],
    farePeak: [80, 120],
    fareWeekend: [70, 100],
    journeyMinutes: 45,
    vehicle: "33-seater",
    firstMatatu: "5:30 AM",
    lastMatatu: "9:30 PM",
    saccoPhone: "+254 722 125 125",
    frequency: 7,
    stops: [
      { name: "Railways", km: 0 },
      { name: "Nyayo Stadium", km: 3 },
      { name: "Bomas", km: 11 },
      { name: "Galleria", km: 14 },
      { name: "Karen Shopping Centre", km: 18 },
    ],
  },
  {
    id: "33",
    number: "33",
    badgeColor: "bg-rose-600",
    from: "CBD",
    to: "Kawangware",
    sacco: "Kawangware SACCO",
    boardingStage: "Kencom",
    fareOffPeak: [30, 50],
    farePeak: [50, 70],
    fareWeekend: [40, 60],
    journeyMinutes: 30,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 333 003",
    frequency: 8,
    stops: [
      { name: "Kencom", km: 0 },
      { name: "Kenyatta Hospital", km: 4 },
      { name: "Adams", km: 7 },
      { name: "Kawangware 56", km: 11 },
    ],
  },
  {
    id: "237",
    number: "237",
    badgeColor: "bg-emerald-600",
    from: "CBD",
    to: "Kikuyu",
    sacco: "Kikuyu Travellers SACCO",
    boardingStage: "Koja Stage",
    fareOffPeak: [60, 80],
    farePeak: [80, 120],
    fareWeekend: [70, 100],
    journeyMinutes: 50,
    vehicle: "33-seater",
    firstMatatu: "4:30 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 722 237 237",
    frequency: 7,
    stops: [
      { name: "Koja", km: 0 },
      { name: "Westlands", km: 5 },
      { name: "Kangemi", km: 9 },
      { name: "Uthiru", km: 14 },
      { name: "Kikuyu Town", km: 22 },
    ],
  },
  {
    id: "17B",
    number: "17B",
    badgeColor: "bg-sky-700",
    from: "CBD",
    to: "Thika",
    sacco: "Super Metro",
    boardingStage: "Ronald Ngala",
    fareOffPeak: [80, 120],
    farePeak: [120, 200],
    fareWeekend: [100, 150],
    journeyMinutes: 60,
    vehicle: "33-seater",
    firstMatatu: "4:00 AM",
    lastMatatu: "11:30 PM",
    saccoPhone: "+254 722 178 178",
    frequency: 10,
    stops: [
      { name: "Ronald Ngala", km: 0 },
      { name: "Pangani", km: 4 },
      { name: "Roysambu", km: 12 },
      { name: "Kahawa West", km: 18 },
      { name: "Ruiru", km: 25 },
      { name: "Thika Town", km: 45 },
    ],
  },
  {
    id: "32",
    number: "32",
    badgeColor: "bg-indigo-700",
    from: "CBD",
    to: "Dandora",
    sacco: "Forward Travellers",
    boardingStage: "Commercial Stage",
    fareOffPeak: [40, 60],
    farePeak: [60, 80],
    fareWeekend: [50, 70],
    journeyMinutes: 40,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 322 322",
    frequency: 8,
    stops: [
      { name: "Commercial", km: 0 },
      { name: "Buruburu", km: 6 },
      { name: "Donholm", km: 8 },
      { name: "Umoja", km: 11 },
      { name: "Dandora Phase 4", km: 14 },
    ],
  },
  {
    id: "23",
    number: "23",
    badgeColor: "bg-amber-600",
    from: "CBD",
    to: "Kibera",
    sacco: "Kibera SACCO",
    boardingStage: "Railways",
    fareOffPeak: [30, 50],
    farePeak: [50, 70],
    fareWeekend: [40, 60],
    journeyMinutes: 25,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 232 323",
    frequency: 9,
    stops: [
      { name: "Railways", km: 0 },
      { name: "Nyayo Stadium", km: 3 },
      { name: "Olympic", km: 6 },
      { name: "Kibera DC", km: 8 },
    ],
  },
  {
    id: "44",
    number: "44",
    badgeColor: "bg-teal-700",
    from: "CBD",
    to: "Kahawa Sukari",
    sacco: "Sukari SACCO",
    boardingStage: "Ronald Ngala",
    fareOffPeak: [50, 80],
    farePeak: [80, 120],
    fareWeekend: [70, 100],
    journeyMinutes: 50,
    vehicle: "33-seater",
    firstMatatu: "4:30 AM",
    lastMatatu: "10:30 PM",
    saccoPhone: "+254 720 444 044",
    frequency: 7,
    stops: [
      { name: "Ronald Ngala", km: 0 },
      { name: "Pangani", km: 4 },
      { name: "Roysambu", km: 12 },
      { name: "USIU", km: 14 },
      { name: "Kahawa Sukari", km: 18 },
    ],
  },
  {
    id: "8",
    number: "8",
    badgeColor: "bg-cyan-700",
    from: "CBD",
    to: "South B",
    sacco: "South B Operators",
    boardingStage: "Bus Station",
    fareOffPeak: [30, 40],
    farePeak: [40, 60],
    fareWeekend: [40, 50],
    journeyMinutes: 20,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 808 808",
    frequency: 9,
    stops: [
      { name: "Bus Station", km: 0 },
      { name: "Nyayo Stadium", km: 2 },
      { name: "Mater", km: 4 },
      { name: "South B Shopping", km: 6 },
    ],
  },
  {
    id: "9",
    number: "9",
    badgeColor: "bg-lime-700",
    from: "CBD",
    to: "South C",
    sacco: "South C SACCO",
    boardingStage: "Bus Station",
    fareOffPeak: [30, 50],
    farePeak: [50, 70],
    fareWeekend: [40, 60],
    journeyMinutes: 25,
    vehicle: "14-seater",
    firstMatatu: "5:00 AM",
    lastMatatu: "10:00 PM",
    saccoPhone: "+254 720 909 909",
    frequency: 8,
    stops: [
      { name: "Bus Station", km: 0 },
      { name: "Nyayo Stadium", km: 2 },
      { name: "Wilson Airport", km: 5 },
      { name: "South C Shopping", km: 7 },
    ],
  },
];

export const POPULAR_ROUTES: { label: string; from: string; to: string }[] = [
  { label: "CBD → Rongai", from: "CBD", to: "Rongai" },
  { label: "CBD → Westlands", from: "CBD", to: "Westlands" },
  { label: "Ngong Rd → CBD", from: "Ngong Road", to: "CBD" },
  { label: "Thika Rd → CBD", from: "Thika", to: "CBD" },
  { label: "Eastleigh → CBD", from: "Eastleigh", to: "CBD" },
  { label: "Karen → CBD", from: "Karen", to: "CBD" },
];

export type Stage = {
  name: string;
  area: string;
  routeIds: string[];
};

function uniqStages(): Stage[] {
  const map = new Map<string, Stage>();
  const addStage = (name: string, area: string, routeId: string) => {
    const key = name.toLowerCase();
    if (!map.has(key)) map.set(key, { name, area, routeIds: [] });
    if (!map.get(key)!.routeIds.includes(routeId))
      map.get(key)!.routeIds.push(routeId);
  };
  for (const r of ROUTES) {
    addStage(r.from, "Nairobi", r.id);
    addStage(r.to, "Nairobi", r.id);
    for (const s of r.stops) addStage(s.name, "Nairobi", r.id);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export const STAGES = uniqStages();

export const ALL_STAGE_NAMES = STAGES.map((s) => s.name);

export function isPeakNow(now = new Date()): boolean {
  const h = now.getHours();
  return (h >= 6 && h < 10) || (h >= 16 && h < 20);
}

export function findRoutes(from: string, to: string): Route[] {
  const f = from.trim().toLowerCase();
  const t = to.trim().toLowerCase();
  if (!f || !t) return [];
  const matches = (val: string, term: string) =>
    val.toLowerCase().includes(term) || term.includes(val.toLowerCase());
  return ROUTES.filter((r) => {
    const stops = [r.from, r.to, ...r.stops.map((s) => s.name)];
    const hasFrom = stops.some((s) => matches(s, f));
    const hasTo = stops.some((s) => matches(s, t));
    return hasFrom && hasTo;
  });
}
