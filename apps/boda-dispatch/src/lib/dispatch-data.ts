export type RiderStatus = "available" | "ontrip" | "offline" | "sos";

export interface Rider {
  id: string;
  name: string;
  plate: string;
  phone: string;
  stage: string;
  status: RiderStatus;
  tripsToday: number;
  earningsToday: number; // KES
  lastActivity: string;
  registeredAt: string;
  rating: number;
  totalTrips: number;
  totalAirtime: number;
  kinName: string;
  kinPhone: string;
}

export interface Trip {
  id: string;
  riderId: string;
  riderName: string;
  time: string;
  pickup: string;
  dropoff: string;
  passengerPhone: string;
  status: "Completed" | "Cancelled";
  airtime: number;
}

export interface SmsMessage {
  id: string;
  riderId: string;
  direction: "in" | "out";
  body: string;
  time: string;
}

export interface SosEvent {
  id: string;
  riderId: string;
  riderName: string;
  plate: string;
  stage: string;
  time: string;
  kinCalled: boolean;
  smsSent: boolean;
  resolved: boolean;
}

export const STAGES = [
  "Westlands Total",
  "CBD Archives",
  "Rongai Stage",
  "Ngong Road",
  "Thika Road Mall",
];

export const riders: Rider[] = [
  // Westlands Total — 3
  { id: "r1", name: "Peter Otieno", plate: "KMCA 789J", phone: "0712 445 901", stage: "Westlands Total", status: "available", tripsToday: 8, earningsToday: 1240, lastActivity: "2 min ago", registeredAt: "2024-03-12", rating: 4.8, totalTrips: 1432, totalAirtime: 18200, kinName: "Mary Otieno", kinPhone: "0722 110 998" },
  { id: "r2", name: "Samuel Wanjiru", plate: "KMDA 221X", phone: "0701 332 014", stage: "Westlands Total", status: "ontrip", tripsToday: 6, earningsToday: 980, lastActivity: "just now", registeredAt: "2023-11-04", rating: 4.6, totalTrips: 2104, totalAirtime: 27450, kinName: "Grace Wanjiru", kinPhone: "0733 884 221" },
  { id: "r3", name: "Brian Kiprop", plate: "KMEB 540T", phone: "0798 221 887", stage: "Westlands Total", status: "offline", tripsToday: 0, earningsToday: 0, lastActivity: "4 hr ago", registeredAt: "2024-06-20", rating: 4.4, totalTrips: 612, totalAirtime: 7800, kinName: "Joyce Kiprop", kinPhone: "0711 442 990" },

  // CBD Archives — 2
  { id: "r4", name: "Daniel Mutua", plate: "KMCT 108B", phone: "0723 991 230", stage: "CBD Archives", status: "available", tripsToday: 12, earningsToday: 1875, lastActivity: "1 min ago", registeredAt: "2023-08-15", rating: 4.9, totalTrips: 2890, totalAirtime: 36200, kinName: "Esther Mutua", kinPhone: "0722 558 110" },
  { id: "r5", name: "Joseph Njoroge", plate: "KMDC 667R", phone: "0710 443 220", stage: "CBD Archives", status: "available", tripsToday: 9, earningsToday: 1430, lastActivity: "5 min ago", registeredAt: "2024-01-08", rating: 4.7, totalTrips: 1180, totalAirtime: 14900, kinName: "Anne Njoroge", kinPhone: "0701 884 220" },

  // Rongai — 2 (one SOS)
  { id: "r6", name: "James Mwangi", plate: "KDA 445P", phone: "0745 220 119", stage: "Rongai Stage", status: "sos", tripsToday: 5, earningsToday: 720, lastActivity: "30 sec ago", registeredAt: "2023-05-22", rating: 4.5, totalTrips: 1980, totalAirtime: 24100, kinName: "Lucy Mwangi", kinPhone: "0721 005 442" },
  { id: "r7", name: "Felix Omondi", plate: "KMEA 332L", phone: "0708 990 114", stage: "Rongai Stage", status: "available", tripsToday: 7, earningsToday: 1090, lastActivity: "3 min ago", registeredAt: "2024-02-19", rating: 4.6, totalTrips: 940, totalAirtime: 11800, kinName: "Pauline Omondi", kinPhone: "0712 339 008" },

  // Ngong Road — 2
  { id: "r8", name: "Anthony Kamau", plate: "KMCF 880D", phone: "0734 112 887", stage: "Ngong Road", status: "ontrip", tripsToday: 10, earningsToday: 1620, lastActivity: "just now", registeredAt: "2023-09-30", rating: 4.7, totalTrips: 2230, totalAirtime: 28900, kinName: "Diana Kamau", kinPhone: "0722 887 119" },
  { id: "r9", name: "Kevin Ouma", plate: "KMDD 776K", phone: "0719 446 200", stage: "Ngong Road", status: "offline", tripsToday: 3, earningsToday: 410, lastActivity: "1 hr ago", registeredAt: "2024-04-11", rating: 4.3, totalTrips: 780, totalAirtime: 9650, kinName: "Beatrice Ouma", kinPhone: "0700 221 904" },

  // Thika Road Mall — 3
  { id: "r10", name: "Stephen Kariuki", plate: "KMEC 998N", phone: "0727 003 118", stage: "Thika Road Mall", status: "available", tripsToday: 11, earningsToday: 1740, lastActivity: "4 min ago", registeredAt: "2023-07-02", rating: 4.8, totalTrips: 2510, totalAirtime: 31600, kinName: "Margaret Kariuki", kinPhone: "0711 992 003" },
  { id: "r11", name: "Patrick Maina", plate: "KMCG 224Q", phone: "0704 887 220", stage: "Thika Road Mall", status: "ontrip", tripsToday: 8, earningsToday: 1305, lastActivity: "just now", registeredAt: "2024-05-14", rating: 4.5, totalTrips: 1090, totalAirtime: 13420, kinName: "Ruth Maina", kinPhone: "0732 110 884" },
  { id: "r12", name: "George Achieng", plate: "KMDB 113F", phone: "0715 220 990", stage: "Thika Road Mall", status: "offline", tripsToday: 0, earningsToday: 0, lastActivity: "6 hr ago", registeredAt: "2024-07-01", rating: 4.2, totalTrips: 410, totalAirtime: 5100, kinName: "Hellen Achieng", kinPhone: "0708 443 117" },
];

export const trips: Trip[] = [
  { id: "t1", riderId: "r2", riderName: "Samuel Wanjiru", time: "14:22", pickup: "Westlands Total", dropoff: "Sarit Centre", passengerPhone: "0722 xxx xxx", status: "Completed", airtime: 25 },
  { id: "t2", riderId: "r4", riderName: "Daniel Mutua", time: "14:18", pickup: "CBD Archives", dropoff: "Kencom", passengerPhone: "0711 xxx xxx", status: "Completed", airtime: 20 },
  { id: "t3", riderId: "r8", riderName: "Anthony Kamau", time: "14:10", pickup: "Ngong Road", dropoff: "Prestige Plaza", passengerPhone: "0701 xxx xxx", status: "Completed", airtime: 25 },
  { id: "t4", riderId: "r10", riderName: "Stephen Kariuki", time: "14:02", pickup: "Thika Road Mall", dropoff: "Roasters", passengerPhone: "0733 xxx xxx", status: "Completed", airtime: 25 },
  { id: "t5", riderId: "r1", riderName: "Peter Otieno", time: "13:58", pickup: "Westlands Total", dropoff: "ABC Place", passengerPhone: "0722 xxx xxx", status: "Cancelled", airtime: 0 },
  { id: "t6", riderId: "r11", riderName: "Patrick Maina", time: "13:50", pickup: "Thika Road Mall", dropoff: "Garden City", passengerPhone: "0712 xxx xxx", status: "Completed", airtime: 25 },
  { id: "t7", riderId: "r6", riderName: "James Mwangi", time: "13:44", pickup: "Rongai Stage", dropoff: "Galleria", passengerPhone: "0745 xxx xxx", status: "Completed", airtime: 30 },
  { id: "t8", riderId: "r5", riderName: "Joseph Njoroge", time: "13:30", pickup: "CBD Archives", dropoff: "Afya Centre", passengerPhone: "0700 xxx xxx", status: "Completed", airtime: 20 },
  { id: "t9", riderId: "r7", riderName: "Felix Omondi", time: "13:21", pickup: "Rongai Stage", dropoff: "Karen", passengerPhone: "0728 xxx xxx", status: "Completed", airtime: 35 },
  { id: "t10", riderId: "r4", riderName: "Daniel Mutua", time: "13:10", pickup: "CBD Archives", dropoff: "Westlands", passengerPhone: "0711 xxx xxx", status: "Completed", airtime: 30 },
];

export function smsThreadFor(riderId: string): SmsMessage[] {
  if (riderId === "r6") {
    return [
      { id: "s1", riderId, direction: "in", body: "ON", time: "06:12" },
      { id: "s2", riderId, direction: "out", body: "Welcome James. You are now AVAILABLE at Rongai Stage.", time: "06:12" },
      { id: "s3", riderId, direction: "in", body: "DONE", time: "11:40" },
      { id: "s4", riderId, direction: "out", body: "Trip logged. 30 KES airtime sent. Karibu tena.", time: "11:40" },
      { id: "s5", riderId, direction: "in", body: "DONE", time: "13:44" },
      { id: "s6", riderId, direction: "out", body: "Trip logged. 30 KES airtime sent.", time: "13:44" },
      { id: "s7", riderId, direction: "in", body: "SOS", time: "14:24" },
      { id: "s8", riderId, direction: "out", body: "SOS received. Dispatch + next of kin Lucy Mwangi notified. Stay safe.", time: "14:24" },
    ];
  }
  return [
    { id: "s1", riderId, direction: "in", body: "ON", time: "07:02" },
    { id: "s2", riderId, direction: "out", body: "You are now AVAILABLE.", time: "07:02" },
    { id: "s3", riderId, direction: "in", body: "DONE", time: "09:18" },
    { id: "s4", riderId, direction: "out", body: "Trip logged. 25 KES airtime sent.", time: "09:18" },
    { id: "s5", riderId, direction: "in", body: "DONE", time: "12:30" },
    { id: "s6", riderId, direction: "out", body: "Trip logged. 25 KES airtime sent.", time: "12:30" },
  ];
}

export function tripsFor(riderId: string): Trip[] {
  const base = trips.filter((t) => t.riderId === riderId);
  if (base.length >= 3) return base;
  // pad with historical
  return [
    ...base,
    { id: `${riderId}-h1`, riderId, riderName: "", time: "Yesterday 18:22", pickup: "Westlands Total", dropoff: "Lavington", passengerPhone: "0722 xxx xxx", status: "Completed", airtime: 30 },
    { id: `${riderId}-h2`, riderId, riderName: "", time: "Yesterday 16:10", pickup: "Sarit Centre", dropoff: "Parklands", passengerPhone: "0711 xxx xxx", status: "Completed", airtime: 25 },
    { id: `${riderId}-h3`, riderId, riderName: "", time: "Yesterday 14:00", pickup: "Westlands Total", dropoff: "CBD", passengerPhone: "0701 xxx xxx", status: "Cancelled", airtime: 0 },
  ];
}

export const sosEvents: SosEvent[] = [
  { id: "sos1", riderId: "r6", riderName: "James Mwangi", plate: "KDA 445P", stage: "Rongai Stage", time: "Today 14:24", kinCalled: true, smsSent: true, resolved: false },
  { id: "sos2", riderId: "r3", riderName: "Brian Kiprop", plate: "KMEB 540T", stage: "Westlands Total", time: "Yesterday 22:10", kinCalled: true, smsSent: true, resolved: true },
  { id: "sos3", riderId: "r9", riderName: "Kevin Ouma", plate: "KMDD 776K", stage: "Ngong Road", time: "3 days ago 19:40", kinCalled: true, smsSent: true, resolved: true },
  { id: "sos4", riderId: "r12", riderName: "George Achieng", plate: "KMDB 113F", stage: "Thika Road Mall", time: "Last week", kinCalled: false, smsSent: true, resolved: true },
];

export function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function statusLabel(s: RiderStatus) {
  return s === "available" ? "Available" : s === "ontrip" ? "On Trip" : s === "offline" ? "Offline" : "SOS Active";
}
