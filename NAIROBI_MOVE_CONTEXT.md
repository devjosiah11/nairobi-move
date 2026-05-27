# NairobiMove — Project Context & Reference

> Single-source-of-truth for architecture, data flows, AT integration, and prompt guides.
> Keep this file up-to-date as backends are built.

---

## Monorepo Structure

```
nairobi-move/
├── shared/
│   ├── db/
│   │   ├── client.ts          # single Neon client (import { sql } from '@nairobi-move/db')
│   │   └── schema.sql         # master schema — run once on Neon
│   ├── types/
│   │   └── index.ts           # shared TS interfaces for all DB tables
│   └── utils/
│       └── at.ts              # Africa's Talking SDK wrapper
│
├── apps/
│   ├── sacco-dashboard/       # FleetPulse — SACCO owner dashboard
│   ├── boda-dispatch/         # BodaDispatch — rider operations
│   ├── registration/          # Rider & Vehicle onboarding
│   ├── matatu-pulse/          # MatatuPulse commuter app + USSD/SMS webhooks
│   └── landing/               # Static marketing site
│
├── package.json               # root workspaces config
├── .env.root                  # shared secrets template
└── NAIROBI_MOVE_CONTEXT.md    # this file
```

---

## Apps: Ports & Roles

| App               | Frontend | Backend | Purpose                              |
|-------------------|----------|---------|--------------------------------------|
| sacco-dashboard   | :5173    | :3001   | FleetPulse — SACCO owner             |
| boda-dispatch     | :5174    | :3002   | BodaDispatch — rider ops             |
| registration      | :5175    | :3003   | Onboarding forms (riders + vehicles) |
| matatu-pulse      | :5176    | :3004   | Commuter app + USSD/SMS webhooks     |
| landing           | :5177    | —       | Static marketing site                |

---

## Source-to-Monorepo Mapping

The Lovable frontend projects were placed into the monorepo as follows:

| Original Folder          | Monorepo Location              |
|--------------------------|--------------------------------|
| fleet-pulse-kenya/       | apps/sacco-dashboard/src/      |
| boda-dispatch-live/      | apps/boda-dispatch/src/        |
| matatupulse-navigator/   | apps/matatu-pulse/src/         |
| nairobimove-onboarding/  | apps/registration/src/         |
| nairobimove-connect/     | apps/landing/src/              |

---

## Database: One Neon DB, Four Service Domains

**Connection:** Single `DATABASE_URL` shared across all services.  
All services import `sql` from `@nairobi-move/db`.

### Table Ownership

| Service           | Owns (writes)                                         | Reads from            |
|-------------------|-------------------------------------------------------|-----------------------|
| sacco-dashboard   | saccos, vehicles, compliance_events, sms_logs         | —                     |
| boda-dispatch     | riders, trips, sos_events                             | stages                |
| registration      | riders (INSERT only), saccos (INSERT), vehicles (INSERT) | stages             |
| matatu-pulse      | routes, fares, ussd_sessions, fare_alerts, fare_reports | stages, riders     |
| shared (seeded)   | stages                                                | all                   |

### Cross-Service Data Rule
- **Cross-service reads**: OK (SELECT only from another service's tables)
- **Cross-service writes**: Only registration → riders/saccos/vehicles on signup
- **No HTTP between services** except landing → sacco + boda for live stats

---

## Shared DB Client Usage

```typescript
import { sql } from '@nairobi-move/db';

// Tagged template literal — auto-parameterized, SQL-injection safe
const vehicles = await sql`
  SELECT * FROM vehicles
  WHERE sacco_id = ${saccoId}
  AND compliance_status(insurance_expiry) = 'expiring'
`;
```

---

## Africa's Talking Integration

### Config
```
AT_API_KEY=...
AT_USERNAME=...
AT_SHORTCODE=21606
AT_USSD_CODE=*384#
```

### Sandbox Setup
1. account.africastalking.com → switch to Sandbox
2. Settings → API Key → copy key + username
3. USSD → Create Channel → code `*384*1#` → callback: `https://YOUR_NGROK/api/ussd`
4. SMS → Shortcodes → inbound callback: `https://YOUR_NGROK/api/sms/incoming`
5. Run: `ngrok http 3004` → paste URL into AT dashboard

### All AT traffic enters via matatu-pulse only (:3004)

---

## USSD Flows (*384#)

AT sends cumulative `text` field split by `*`.  
`text=""` = first screen | `text="1*2"` = user picked 1 then 2

### Flow 1 — Fare Lookup
```
text=""     → CON main menu (1. Matatu 2. Boda 3. Alerts 4. Verify)
text="1"    → CON Select origin (1.CBD 2.Westlands 3.Ngong 4.Thika 5.Eastlands)
text="1*1"  → CON Select destination
text="1*1*1"→ END fare info + SMS sent with details
```

### Flow 2 — Book Boda
```
text="2"    → CON list stages
text="2*1"  → END rider found + dispatch info SMS
```

### Key: CON = keep open, END = close session (fire SMS here)

---

## SMS Keywords (all handled by matatu-pulse/server/routes/sms.ts)

| Keyword         | Sender       | Action                                          |
|-----------------|--------------|-------------------------------------------------|
| `BODA <stage>`  | Passenger    | Find available rider at stage, create trip      |
| `ON`            | Rider        | Set is_available=true, confirm with stage name  |
| `OFF`           | Rider        | Set is_available=false                          |
| `DONE`          | Rider/Driver | Rider: complete trip + KES 5 airtime reward     |
|                 |              | Driver: log compliance update (FleetPulse)      |
| `SOS`           | Rider        | Alert next of kin via SMS + voice call          |
| `FARE <o> <d>`  | Anyone       | Quick fare lookup via SMS                       |

### Full sms.ts handler (reference implementation)

See apps/matatu-pulse/server/routes/sms.ts for stub.  
Full implementation includes:
- `BODA` → query riders WHERE stage ILIKE AND is_available=true ORDER BY RANDOM()
- `ON/OFF` → UPDATE riders SET is_available
- `DONE` → if rider: complete trip + airtime; if driver: log compliance_event
- `SOS` → insert sos_events + SMS kin + voice call to kin
- `FARE` → query routes JOIN fares WHERE stage names ILIKE

---

## FleetPulse SMS Flow (sacco-dashboard)

Cron: `reminder-cron.ts` runs daily.

```
System → Driver SMS: "FleetPulse: KCA 123G insurance expires in 7 days (30 Jun 2026). 
                       Reply: DONE [insurer name]"
Driver → DONE Jubilee Insurance
System → Driver SMS: "FleetPulse: Logged. KCA 123G insurance updated. 
                       Next: NTSA inspection in 47 days."
```

`DONE` keyword handler in matatu-pulse/server/routes/sms.ts checks `vehicles.driver_phone` to route correctly.

---

## Landing Page — Live Stats API

```typescript
// apps/landing/src/api/stats.ts
const SACCO_URL = import.meta.env.VITE_SACCO_API_URL;
const BODA_URL  = import.meta.env.VITE_BODA_API_URL;

export async function getPlatformStats() {
  const [saccoStats, bodaStats] = await Promise.all([
    fetch(`${SACCO_URL}/api/stats/public`).then(r => r.json()),
    fetch(`${BODA_URL}/api/stats/public`).then(r => r.json()),
  ]);
  return { ...saccoStats, ...bodaStats };
}
// sacco returns: { totalVehicles, compliantCount }
// boda returns:  { totalRiders, tripsToday, sosResolved }
```

---

## Development Commands

```bash
# Root — start all apps at once
npm run dev

# Per-app
npm run dev:sacco     # sacco-dashboard frontend :5173 + API :3001
npm run dev:boda      # boda-dispatch frontend :5174 + API :3002
npm run dev:reg       # registration frontend :5175 + API :3003
npm run dev:matatu    # matatu-pulse frontend :5176 + API :3004
npm run dev:landing   # landing :5177

# Inside each app
npm run dev:frontend  # Vite only
npm run dev:server    # tsx watch server/index.ts

# Initial install (from root)
npm install
```

---

## Shared DB Setup

```bash
# Run schema once on your Neon database
psql $DATABASE_URL -f shared/db/schema.sql

# Or using the Neon SQL Editor — paste contents of shared/db/schema.sql
```

---

## Deployment (Railway)

Each app (`sacco-dashboard`, `boda-dispatch`, `registration`, `matatu-pulse`) deploys as its own Railway service.

**Build command per app:** `npm run build`  
**Start command per app:** `node dist/server/index.js` (after tsc compile)  
**Or use:** `tsx server/index.ts` (no build step needed)

Set `DATABASE_URL`, `AT_API_KEY`, `AT_USERNAME`, `AT_SHORTCODE`, `JWT_SECRET` as Railway environment variables.

After deploy, update AT dashboard callbacks from ngrok URLs to Railway URLs:
- USSD callback: `https://matatu-pulse.up.railway.app/api/ussd`
- SMS inbound: `https://matatu-pulse.up.railway.app/api/sms/incoming`

---

## Prompt Guide for Building Backends

When providing prompts to build each backend, include:

### For any route file:
```
Build [route-name].ts for [app-name]/server.
Import { sql } from '@nairobi-move/db' and types from '@nairobi-move/types'.
Tables this service owns: [list].
Implement: [list of endpoints with HTTP method, path, body, response].
```

### For sacco-dashboard/server:
- Tables: `saccos`, `vehicles`, `compliance_events`, `sms_logs`
- Key feature: `compliance_status(expiry_date)` DB function returns `'compliant'|'expiring'|'overdue'|'unknown'`
- Reminder cron: query `WHERE compliance_status(ntsa_expiry) IN ('expiring','overdue')` → SMS driver

### For boda-dispatch/server:
- Tables: `riders`, `trips`, `sos_events`
- Riders are written by `registration/server` — boda only reads on dispatch
- SOS: SMS + VOICE call to `next_of_kin_phone` via AT

### For registration/server:
- Writes to `riders` (shared with boda) and `saccos`+`vehicles` (shared with sacco-dashboard)
- No other service needs to be notified — shared DB handles it

### For matatu-pulse/server:
- Tables: `routes`, `fares`, `ussd_sessions`, `fare_alerts`, `fare_reports`
- All AT webhooks enter here
- USSD: stateless via `text` field split on `*`
- SMS: keyword dispatch (BODA/ON/OFF/DONE/SOS/FARE)
