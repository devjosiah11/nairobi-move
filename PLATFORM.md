# NairobiMove — Platform Documentation

> **Smarter movement for every Kenyan.**  
> Real-time matatu fares and SACCO fleet compliance — over SMS, USSD and the web.  
> Built on Africa's Talking APIs. Deployed on Railway. Powered by Neon PostgreSQL.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture](#2-architecture)
3. [Module 01 — MatatuPulse](#3-module-01--matatupulse)
4. [Module 02 — FleetPulse (SACCO Dashboard)](#4-module-02--fleetpulse-sacco-dashboard)
5. [Africa's Talking Integration](#5-africas-talking-integration)
6. [Database Schema](#6-database-schema)
7. [Deployment](#7-deployment)
8. [Environment Variables](#8-environment-variables)
9. [USSD Flow Diagrams](#9-ussd-flow-diagrams)
10. [SMS Command Reference](#10-sms-command-reference)

---

## 1. Platform Overview

NairobiMove is a multi-app transport intelligence platform built for the Nairobi public transport ecosystem. It targets two distinct user groups:

| User | Problem | Solution |
|---|---|---|
| **Commuters** | Don't know matatu fares until they're already on board. No reliable route info. | MatatuPulse — fare lookup, route finder, incident reporting via USSD & SMS |
| **SACCO Owners / Fleet Managers** | NTSA fines arrive because paper renewal reminders get lost or ignored. | FleetPulse — automated compliance tracking, renewal reminders, USSD fleet management |

Both apps share a single Neon PostgreSQL database, a shared utility library (`@nairobi-move/utils`), and are deployed as separate services on Railway, each with their own Express backend.

---

## 2. Architecture

```
nairobi-move/                          (monorepo root)
├── apps/
│   ├── landing/                       React + TanStack Router landing page
│   ├── matatu-pulse/                  MatatuPulse — commuter fare app
│   │   ├── src/                       React frontend (Vite)
│   │   └── server/                    Express API server
│   │       ├── routes/ussd.ts         USSD handler — *384*3133#
│   │       ├── routes/sms.ts          SMS handler — incoming + delivery
│   │       ├── routes/fares.ts        Fare alerts API
│   │       ├── routes/routes.ts       Route search + insights API
│   │       └── lib/fare-data.ts       Static route/fare data + fuzzy matching
│   └── sacco-dashboard/               FleetPulse — SACCO compliance app
│       ├── src/                       React frontend (Vite)
│       └── server/                    Express API server
│           ├── routes/ussd.ts         USSD handler — *384*3138#
│           ├── routes/sms-incoming.ts SMS command handler
│           ├── routes/vehicles.ts     Fleet CRUD API
│           ├── routes/auth.ts         JWT authentication
│           └── jobs/reminder-cron.ts  Automated renewal reminder scheduler
└── shared/
    ├── db/                            Neon PostgreSQL client + schema
    │   ├── schema.sql                 Master schema (all tables)
    │   └── seed-fleet.sql             FleetPulse test vehicle data
    └── utils/                         Shared utilities
        ├── at.ts                      Africa's Talking SDK wrapper
        └── sms.ts                     sendSMS, logSMS, sendSMSWithLog
```

### Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TanStack Router, TailwindCSS, Lucide Icons |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | Neon PostgreSQL (serverless, shared across all apps) |
| **SMS / USSD / Voice** | Africa's Talking APIs |
| **Build** | Vite (frontend), tsc (backend) |
| **Deployment** | Railway (separate service per app) |
| **Monorepo** | npm workspaces |

---

## 3. Module 01 — MatatuPulse

**Live URL:** https://matatu-pulse-production.up.railway.app  
**USSD Code:** `*384*3133#`  
**SMS Shortcode:** `31333`  
**Sender ID:** `Matatupulse`

### 3.1 What It Does

MatatuPulse gives Nairobi commuters instant access to accurate matatu fare information, route discovery, incident reporting and fare alert subscriptions — without requiring a smartphone or mobile data. Everything works over basic USSD and SMS.

### 3.2 USSD Menu — `*384*3133#`

Dialling the code presents a 4-option menu. All navigation is done by replying with a number. The system is **fully stateless** — no session is stored in the database. All state is encoded in the `text` field that Africa's Talking passes with each request (e.g. `1*CBD*Rongai` means: module 1, from CBD, to Rongai).

The system responds synchronously to AT within the 5-second timeout, then fires all database writes and SMS sends asynchronously in the background.

#### Menu 1 — Check Fare
```
Dial *384*3133#
→ 1 (Check fare)
→ Enter FROM stage: e.g. CBD
→ Enter TO stage: e.g. Rongai
→ END: Shows route number + peak/off-peak fare range on screen
→ [async] Full fare breakdown SMS delivered to your number
```

The fare lookup uses fuzzy matching — typos like "Ronga" or "Rongai " are resolved to the correct place name. Supports common aliases (e.g. "town" → "CBD", "GPO" → "CBD").

#### Menu 2 — Find Route
```
→ 2 (Find route)
→ Enter FROM stage
→ Enter TO stage
→ END: Shows up to 3 matching routes with fares
→ [async] Full route list with both fare tiers sent by SMS
```

#### Menu 3 — Fare Alerts
```
→ 3 (Fare alerts)
→ Enter route number: e.g. 111
→ END: Subscribed to fare change alerts for that route
→ [async] Confirmation SMS + DB subscription record created
→ Cancel any time by texting STOP to 31333
```

#### Menu 4 — Report Incident
```
→ 4 (Report incident)
→ Pick type: 1=Accident, 2=Congestion, 3=Police check, 4=Roadworks, 5=Other
→ Enter location: e.g. Odeon Cinema Moi Ave
→ END: Incident logged and visible on the map for all commuters
→ [async] Incident saved to DB + SMS confirmation to reporter
```

### 3.3 SMS Commands (text to `31333`)

| Command | Example | Response |
|---|---|---|
| `FARE [from] [to]` | `FARE CBD Rongai` | Off-peak & peak fare range for all matching routes |
| `ROUTE [from] [to]` | `ROUTE Westlands Karen` | Route numbers, SACCOs, boarding stages |
| `ALERTS [route]` | `ALERTS 111` | Subscribe to fare change alerts for route 111 |
| `REPORT [type] [location]` | `REPORT congestion Odeon` | Log traffic incident |
| `STOP` | `STOP` | Unsubscribe from all alerts |
| `STATUS` | `STATUS` | Your active alert subscriptions |
| `HELP` | `HELP` | Full command list |

### 3.4 Web App Features

- **Route search** — origin/destination with fuzzy matching
- **Fare insights** — real-time traffic level, peak detection, fare trend prediction, suggested departure time
- **Incident map** — live crowdsourced traffic incidents on Google Maps
- **Alerts page** — subscribe to fare and disruption alerts by route
- **Commuter reports** — view fare confirmations submitted by other commuters

### 3.5 Fare Data

Fare and route data is stored in `server/lib/fare-data.ts` as a static TypeScript file, mirroring the frontend `src/lib/data.ts`. It includes:

- **8 major Nairobi routes** (111, 125, 33, 34, 58, 23, 105, 44)
- Per-route: route number, SACCO name, origin, destination, off-peak fare range, peak fare range
- **Peak detection** — weekdays 6–10 AM and 4–8 PM EAT
- **Fuzzy matching** — Levenshtein distance, common aliases, partial match fallback

---

## 4. Module 02 — FleetPulse (SACCO Dashboard)

**Live URL:** https://sacco-production-1ad8.up.railway.app  
**USSD Code:** `*384*3138#`  
**SMS Shortcode:** `21606`  
**Sender ID:** `FleetPulse`

### 4.1 What It Does

FleetPulse is a compliance management platform for Nairobi SACCO operators and fleet managers. It tracks three critical compliance documents for every vehicle — NTSA inspection certificate, insurance policy, and PSV (Public Service Vehicle) licence — and ensures renewal reminders reach drivers before fines occur.

### 4.2 Compliance Status Logic

Each document is evaluated by a PostgreSQL function `compliance_status(expiry_date)`:

| Status | Condition |
|---|---|
| `compliant` | Expires more than 14 days from today |
| `expiring` | Expires within the next 14 days |
| `overdue` | Already expired |
| `unknown` | No date recorded |

### 4.3 USSD Menu — `*384*3138#`

Designed for fleet managers who need quick access from any phone — on the road, at a stage, without internet.

#### Menu 1 — Check Vehicle Compliance
```
Dial *384*3138#
→ 1 (Check vehicle compliance)
→ Enter plate number: e.g. KDA421X
→ END: "Checking KDA421X... details sent by SMS shortly."
→ [async] DB lookup → SMS with NTSA/Insurance/PSV status + expiry dates
```

**SMS example:**
```
FleetPulse: KDA 421X (John Mwangi)
NTSA: OK — expires 15 Mar 2026
Insurance: EXPIRING SOON — expires 20 Aug 2026
PSV: OK — expires 30 Jun 2026
Dial *384*3138# for more.
```

#### Menu 2 — Send Renewal Reminder to Driver
```
→ 2 (Send renewal reminder)
→ Enter plate number
→ Pick document:
     1. NTSA inspection
     2. Insurance
     3. PSV licence
     4. All documents
→ END: "Reminder sent to driver of [plate] for [doc]."
→ [async] SMS sent to driver's registered phone with expiry date
→ [async] SMS confirmation sent to manager who dialled
→ [async] Compliance event logged in DB
```

**Driver SMS example:**
```
FleetPulse REMINDER: Dear John Mwangi, your Insurance 
expires 20 Aug 2026. Please renew urgently.
Vehicle: KDA 421X
```

#### Menu 3 — Report Vehicle Issue
```
→ 3 (Report vehicle issue)
→ Pick issue type:
     1. Mechanical breakdown
     2. Accident
     3. Road unfit
     4. Driver absence
     5. Other
→ Enter plate number
→ END: "[issue] reported for [plate]. Fleet manager notified. Asante!"
→ [async] Compliance event logged in DB
→ [async] SMS confirmation to manager
```

#### Menu 4 — Fleet Summary
```
→ 4 (Fleet summary)
→ END: "Fetching fleet summary... SMS sent shortly."
→ [async] Aggregate DB query across all vehicles
→ [async] SMS with total/compliant/expiring/overdue counts
```

**SMS example:**
```
FleetPulse Summary:
Total vehicles: 10
Compliant: 6
Expiring soon: 2
Expired/Overdue: 2
Open FleetPulse dashboard for full details.
```

### 4.4 SMS Commands (text to `21606` or `FleetPulse`)

| Command | Example | Response |
|---|---|---|
| `CHECK [plate]` | `CHECK KDA421X` | Full compliance status for that vehicle |
| `REMIND [plate]` | `REMIND KDA421X` | Sends renewal reminder to driver + confirmation |
| `SUMMARY` | `SUMMARY` | Fleet-wide compliance counts |
| `HELP` | `HELP` | Full command list |

### 4.5 Web Dashboard Features

- **Authentication** — JWT-based login for SACCO owner accounts
- **Vehicle management** — add, edit, delete vehicles with plate, driver details, expiry dates
- **Compliance table** — colour-coded status badges (green=compliant, amber=expiring, red=overdue)
- **Stats overview** — total vehicles, compliant count, expiring count, overdue count
- **SMS log** — history of all inbound and outbound messages
- **Automated reminders** — cron job sends SMS at 30 / 14 / 7 / 1 days before expiry

### 4.6 Automated Reminder Cron

The file `server/jobs/reminder-cron.ts` runs a scheduled job that:

1. Queries all vehicles where any document expires within 30 days
2. Sends an SMS reminder to the driver's registered phone
3. Logs a `compliance_event` record so reminders aren't duplicated
4. Escalates to a voice call (via AT Voice API) if the driver doesn't respond

### 4.7 Test Fleet Data

The seed file `shared/db/seed-fleet.sql` inserts 10 real test vehicles for **Rongai Express SACCO** with a realistic compliance mix:

| Plate | Driver | Phone | Status |
|---|---|---|---|
| KDA 421X | John Mwangi | +254740717201 | Compliant |
| KCJ 089M | Peter Otieno | +254740406442 | Compliant |
| KDG 332T | Samuel Kimani | +254740717201 | Compliant |
| KBZ 771R | Grace Wanjiku | +254740406442 | Compliant |
| KDD 512K | David Njoroge | +254740717201 | **Expiring (NTSA +10d, Ins +7d)** |
| KDF 903P | Mary Akinyi | +254740406442 | **Expiring (PSV +5d)** |
| KBX 214W | James Oduya | +254740717201 | **Overdue (NTSA, PSV)** |
| KCC 671H | Alice Muthoni | +254740406442 | **Overdue (NTSA, Ins)** |
| KDB 198N | Brian Kamau | +254740717201 | Compliant |
| KCT 445G | Ruth Chebet | +254740406442 | Compliant |

Driver phones alternate between the two test numbers so USSD reminder tests reach a real handset in the AT sandbox simulator.

---

## 5. Africa's Talking Integration

NairobiMove uses four Africa's Talking APIs:

### 5.1 USSD API

Both apps register a USSD service code in the AT sandbox. AT sends a `POST` request with form-encoded body to the app's callback URL on every keypress.

| App | USSD Code | Callback URL |
|---|---|---|
| MatatuPulse | `*384*3133#` | `https://matatu-pulse-production.up.railway.app/api/ussd` |
| FleetPulse | `*384*3138#` | `https://sacco-production-1ad8.up.railway.app/api/ussd` |

**Key design decisions:**
- **Stateless handlers** — no database session table. All navigation state is embedded in the AT-provided `text` field (e.g. `1*CBD*Rongai`).
- **Reply-first pattern** — `res.send()` is called synchronously before any `await`. This guarantees AT receives a response within its 5-second timeout, even when Neon PostgreSQL takes 3–8 seconds to cold-start.
- **Fire-and-forget async** — all DB writes and SMS sends run in an IIFE `(async () => { ... })()` after the USSD reply has been sent.

### 5.2 SMS API

Outbound SMS is sent using `sendSMS()` from `shared/utils/sms.ts`, which wraps `atSMS.send()`. The `from` field uses `AT_SENDER_ID` if set, falling back to `AT_SHORTCODE`.

Inbound SMS is received at `/api/sms/incoming` (MatatuPulse) and `/api/fleet-sms/incoming` (FleetPulse). Commands are parsed by splitting the message text and matching the first word.

**Sandbox behaviour:** In AT sandbox, SMS is only delivered to numbers whitelisted under Settings → Sandbox Phone Numbers. Messages appear in the AT simulator, not on real handsets. Production AT accounts send to real phones.

### 5.3 Voice API

Used for escalation calls when SACCO drivers don't acknowledge an SMS reminder within a configurable window. Implemented via `atVoice.call()` in `shared/utils/sms.ts`.

### 5.4 Airtime API

Planned for rewarding MatatuPulse commuters who submit verified incident reports. Implemented via `atAirtime.send()`.

### 5.5 CORS Configuration

AT servers POST to callback URLs from their own IP ranges. Both app servers apply `cors({ origin: '*' })` specifically to the USSD and SMS routes, before the general CORS middleware runs:

```typescript
app.options('/api/ussd', cors({ origin: '*' }));
app.use('/api/ussd', cors({ origin: '*' }));
app.use(cors(corsOptions));           // restrictive CORS for everything else
app.use(express.urlencoded({ extended: true }));  // BEFORE json() — AT sends form-encoded
app.use(express.json());
```

---

## 6. Database Schema

All apps share a single Neon PostgreSQL database. Tables are namespaced by service.

### Shared Tables
- `stages` — matatu boarding stages (name, GPS coordinates, area)

### MatatuPulse Tables
- `routes` — route definitions (number, name, SACCO, origin/destination stage)
- `fares` — fare records per route and fare type (off_peak, peak, weekend)
- `fare_alerts` — commuter subscriptions to route fare change notifications
- `fare_reports` — commuter-submitted fare confirmations
- `ussd_sessions` — (legacy, not used by current stateless handler)
- `incident_reports` — crowdsourced traffic incidents (type, description, GPS, status)

### FleetPulse Tables
- `saccos` — SACCO accounts (name, owner, phone, password hash)
- `vehicles` — fleet vehicles with all compliance expiry dates and driver details
- `compliance_events` — audit log of all reminder sends, renewals and overdue flags
- `sms_logs` — all inbound/outbound SMS across all services

### Key Database Function

```sql
CREATE OR REPLACE FUNCTION compliance_status(expiry_date DATE)
RETURNS TEXT AS $$
BEGIN
  IF expiry_date IS NULL THEN RETURN 'unknown'; END IF;
  IF expiry_date < CURRENT_DATE THEN RETURN 'overdue'; END IF;
  IF expiry_date <= CURRENT_DATE + INTERVAL '14 days' THEN RETURN 'expiring'; END IF;
  RETURN 'compliant';
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 7. Deployment

Each app is a separate Railway service, all deploying from the same GitHub monorepo. Railway detects the correct app via `nixpacks.toml` or build configuration per service.

| Service | URL |
|---|---|
| Landing page | Deployed via Railway/Netlify |
| MatatuPulse | https://matatu-pulse-production.up.railway.app |
| FleetPulse (SACCO) | https://sacco-production-1ad8.up.railway.app |

**Build process per app:**
1. Railway runs `npm install` at monorepo root
2. Builds the TypeScript server with `tsc`
3. Builds the Vite frontend with `vite build`
4. Starts the Express server which serves both API and static frontend

---

## 8. Environment Variables

### MatatuPulse (`apps/matatu-pulse/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | `sandbox` or production username |
| `AT_SHORTCODE` | `31333` — SMS shortcode |
| `AT_SENDER_ID` | `Matatupulse` — registered AT sender ID |
| `AT_USSD_CODE` | `*384*3133#` |
| `PORT` | `3004` |
| `EMERGENCY_CONTACTS` | Comma-separated numbers for SOS escalation |

### FleetPulse (`apps/sacco-dashboard/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (same DB) |
| `AT_API_KEY` | Africa's Talking API key |
| `AT_USERNAME` | `sandbox` or production username |
| `AT_SHORTCODE` | `21606` — SMS shortcode |
| `AT_SENDER_ID` | `FleetPulse` — registered AT sender ID |
| `AT_USSD_CODE` | `*384*3138#` |
| `JWT_SECRET` | Secret for signing authentication tokens |
| `PORT` | `3001` |

---

## 9. USSD Flow Diagrams

### MatatuPulse `*384*3133#`

```
DIAL *384*3133#
│
├─ CON: Main Menu
│   1. Check fare
│   2. Find route
│   3. Fare alerts
│   4. Report incident
│
├─[1] Check fare
│   ├─ CON: Enter FROM stage (e.g. CBD)
│   │   └─ CON: Enter TO stage (e.g. Rongai)
│   │       └─ END: Fare shown on screen
│   │           [async] → SMS: full fare breakdown
│
├─[2] Find route
│   ├─ CON: Enter FROM stage
│   │   └─ CON: Enter TO stage
│   │       └─ END: Route list on screen
│   │           [async] → SMS: full route list
│
├─[3] Fare alerts
│   └─ CON: Enter route number
│       └─ END: Subscribed!
│           [async] → DB: save subscription
│           [async] → SMS: confirmation
│
└─[4] Report incident
    ├─ CON: Pick type (accident/congestion/etc)
    │   └─ CON: Enter location
    │       └─ END: Incident reported!
    │           [async] → DB: save incident
    │           [async] → SMS: confirmation
```

### FleetPulse `*384*3138#`

```
DIAL *384*3138#
│
├─ CON: Main Menu
│   1. Check vehicle compliance
│   2. Send renewal reminder
│   3. Report vehicle issue
│   4. Fleet summary
│
├─[1] Check compliance
│   └─ CON: Enter plate number (e.g. KDA421X)
│       └─ END: "Checking... SMS sent shortly."
│           [async] → DB: lookup vehicle
│           [async] → SMS: NTSA/Ins/PSV status + expiry dates
│
├─[2] Send renewal reminder
│   ├─ CON: Enter plate number
│   │   └─ CON: Pick document
│   │       1. NTSA  2. Insurance  3. PSV  4. All
│   │       └─ END: "Reminder sent to driver."
│   │           [async] → DB: lookup vehicle + driver phone
│   │           [async] → SMS to driver: renewal reminder
│   │           [async] → SMS to manager: confirmation
│   │           [async] → DB: log compliance_event
│
├─[3] Report vehicle issue
│   ├─ CON: Pick issue type
│   │   └─ CON: Enter plate number
│   │       └─ END: "[issue] reported. Asante!"
│   │           [async] → DB: log compliance_event
│   │           [async] → SMS to manager: confirmation
│
└─[4] Fleet summary
    └─ END: "Fetching... SMS sent shortly."
        [async] → DB: aggregate query
        [async] → SMS: total/compliant/expiring/overdue counts
```

---

## 10. SMS Command Reference

### MatatuPulse — Text to `31333`

```
FARE CBD Rongai          → Off-peak & peak fares for all CBD–Rongai routes
ROUTE Westlands Karen    → Route numbers, SACCOs, boarding stages
ALERTS 111               → Subscribe to fare alerts for Route 111
REPORT congestion Odeon  → Log traffic incident at Odeon
STOP                     → Cancel all alert subscriptions
STATUS                   → List your active subscriptions
HELP                     → Full command list
```

### FleetPulse — Text to `21606` or sender `FleetPulse`

```
CHECK KDA421X            → NTSA/Insurance/PSV status and expiry dates
REMIND KDA421X           → Send renewal reminder SMS to driver
SUMMARY                  → Fleet-wide compliance counts
HELP                     → Full command list
```

---

## Testing in AT Sandbox

1. Go to [simulator.africastalking.com:1517](https://simulator.africastalking.com:1517)
2. Select a whitelisted number (e.g. `+254740717201`)
3. **USSD:** Enter `*384*3133#` (MatatuPulse) or `*384*3138#` (FleetPulse) and press Call
4. **SMS:** Type a command (e.g. `FARE CBD Rongai`) and send to shortcode `31333` or `21606`
5. Check the **SMS tab** in the simulator for inbound messages

> **Note:** In sandbox mode, SMS is only delivered to numbers whitelisted under AT Settings → Sandbox Phone Numbers. Messages appear in the simulator, not on real handsets. Switch to a production AT account to enable real phone delivery.

---

*Generated: May 2026 | NairobiMove | Made in Nairobi*
