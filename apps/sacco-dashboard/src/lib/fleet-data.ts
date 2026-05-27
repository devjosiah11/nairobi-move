export type VehicleType = "matatu" | "bus" | "lorry";
export type ComplianceStatus = "Compliant" | "Expiring" | "Overdue";

export interface Vehicle {
  plate: string;
  type: VehicleType;
  driverName: string;
  driverPhone: string;
  ownerPhone: string;
  ntsaExpiry: string; // ISO
  insuranceExpiry: string;
  psvExpiry: string;
  ntsaLastRenewed: string;
  insuranceLastRenewed: string;
  psvLastRenewed: string;
}

const today = new Date();
const offset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const vehicles: Vehicle[] = [
  {
    plate: "KCA 123G",
    type: "matatu",
    driverName: "Joseph Kamau",
    driverPhone: "+254712345678",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(120),
    insuranceExpiry: offset(95),
    psvExpiry: offset(200),
    ntsaLastRenewed: offset(-245),
    insuranceLastRenewed: offset(-270),
    psvLastRenewed: offset(-165),
  },
  {
    plate: "KBZ 456T",
    type: "matatu",
    driverName: "Peter Otieno",
    driverPhone: "+254713222333",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(60),
    insuranceExpiry: offset(6),
    psvExpiry: offset(150),
    ntsaLastRenewed: offset(-305),
    insuranceLastRenewed: offset(-359),
    psvLastRenewed: offset(-215),
  },
  {
    plate: "KDA 789M",
    type: "bus",
    driverName: "Samuel Mwangi",
    driverPhone: "+254714333444",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(-3),
    insuranceExpiry: offset(45),
    psvExpiry: offset(80),
    ntsaLastRenewed: offset(-368),
    insuranceLastRenewed: offset(-320),
    psvLastRenewed: offset(-285),
  },
  {
    plate: "KCB 321F",
    type: "matatu",
    driverName: "David Njoroge",
    driverPhone: "+254715444555",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(180),
    insuranceExpiry: offset(220),
    psvExpiry: offset(310),
    ntsaLastRenewed: offset(-185),
    insuranceLastRenewed: offset(-145),
    psvLastRenewed: offset(-55),
  },
  {
    plate: "KCC 654H",
    type: "matatu",
    driverName: "James Wanjiku",
    driverPhone: "+254716555666",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(90),
    insuranceExpiry: offset(160),
    psvExpiry: offset(12),
    ntsaLastRenewed: offset(-275),
    insuranceLastRenewed: offset(-205),
    psvLastRenewed: offset(-353),
  },
  {
    plate: "KCD 987J",
    type: "lorry",
    driverName: "Francis Kiprop",
    driverPhone: "+254717666777",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(250),
    insuranceExpiry: offset(140),
    psvExpiry: offset(300),
    ntsaLastRenewed: offset(-115),
    insuranceLastRenewed: offset(-225),
    psvLastRenewed: offset(-65),
  },
  {
    plate: "KCE 111A",
    type: "bus",
    driverName: "Anthony Mutua",
    driverPhone: "+254718777888",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(70),
    insuranceExpiry: offset(-8),
    psvExpiry: offset(110),
    ntsaLastRenewed: offset(-295),
    insuranceLastRenewed: offset(-373),
    psvLastRenewed: offset(-255),
  },
  {
    plate: "KCF 222B",
    type: "matatu",
    driverName: "Brian Achieng",
    driverPhone: "+254719888999",
    ownerPhone: "+254722111222",
    ntsaExpiry: offset(165),
    insuranceExpiry: offset(195),
    psvExpiry: offset(240),
    ntsaLastRenewed: offset(-200),
    insuranceLastRenewed: offset(-170),
    psvLastRenewed: offset(-125),
  },
];

export function daysUntil(iso: string): number {
  const target = new Date(iso);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function itemStatus(iso: string): ComplianceStatus {
  const d = daysUntil(iso);
  if (d < 0) return "Overdue";
  if (d <= 14) return "Expiring";
  return "Compliant";
}

export function vehicleStatus(v: Vehicle): ComplianceStatus {
  const statuses = [v.ntsaExpiry, v.insuranceExpiry, v.psvExpiry].map(itemStatus);
  if (statuses.includes("Overdue")) return "Overdue";
  if (statuses.includes("Expiring")) return "Expiring";
  return "Compliant";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export interface SmsMessage {
  id: string;
  timestamp: string;
  plate: string;
  direction: "outbound" | "inbound";
  type: "reminder" | "confirmation" | "escalation";
  body: string;
  status: "Delivered" | "Failed";
}

export const smsLog: SmsMessage[] = [
  {
    id: "s1",
    timestamp: "2026-05-20T08:30:00Z",
    plate: "KBZ 456T",
    direction: "outbound",
    type: "reminder",
    body: "Reminder: Insurance for KBZ 456T expires in 14 days. Renew with Jubilee to avoid downtime.",
    status: "Delivered",
  },
  {
    id: "s2",
    timestamp: "2026-05-24T10:15:00Z",
    plate: "KBZ 456T",
    direction: "outbound",
    type: "reminder",
    body: "Reminder: Insurance for KBZ 456T expires in 7 days. Please renew now.",
    status: "Delivered",
  },
  {
    id: "s3",
    timestamp: "2026-05-24T12:02:00Z",
    plate: "KBZ 456T",
    direction: "inbound",
    type: "confirmation",
    body: "DONE Jubilee Insurance",
    status: "Delivered",
  },
  {
    id: "s4",
    timestamp: "2026-05-25T06:00:00Z",
    plate: "KDA 789M",
    direction: "outbound",
    type: "escalation",
    body: "URGENT: NTSA inspection for KDA 789M is OVERDUE by 2 days. Vehicle should be off the road.",
    status: "Delivered",
  },
  {
    id: "s5",
    timestamp: "2026-05-26T09:45:00Z",
    plate: "KCE 111A",
    direction: "outbound",
    type: "escalation",
    body: "URGENT: Insurance for KCE 111A is OVERDUE. Renew immediately.",
    status: "Failed",
  },
  {
    id: "s6",
    timestamp: "2026-05-23T07:30:00Z",
    plate: "KCC 654H",
    direction: "outbound",
    type: "reminder",
    body: "Reminder: PSV Licence for KCC 654H expires in 14 days.",
    status: "Delivered",
  },
  {
    id: "s7",
    timestamp: "2026-05-15T11:00:00Z",
    plate: "KCA 123G",
    direction: "outbound",
    type: "reminder",
    body: "Reminder: Insurance for KCA 123G expires in 30 days.",
    status: "Delivered",
  },
];

export function smsForVehicle(plate: string): SmsMessage[] {
  return smsLog
    .filter((s) => s.plate === plate)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
