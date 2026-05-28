# NairobiMove — Platform Overview

> Comprehensive reference for how the platform works, what each app does, and how everything connects.

---

## What Is NairobiMove?

NairobiMove is a Kenyan public transport platform that serves three distinct audiences from a single monorepo:

| Audience | App | What it does |
|---|---|---|
| **Commuters** | MatatuPulse | Look up matatu fares, find routes, set SMS/WhatsApp alerts, dial USSD from any phone |
| **SACCO owners / fleet managers** | FleetPulse (sacco-dashboard) | Track NTSA, insurance and PSV licence compliance across an entire fleet |
| **Boda riders & new SACCO registrants** | Registration | Onboard onto the platform in under 2 minutes via a web form |

All four apps share a **single Neon PostgreSQL database**. They never call each other over HTTP — they share data purely through the database, which means each service is independently deployable with no inter-service dependency at runtime.

There is a fifth app — **BodaDispatch** — that handles real-time boda boda dispatch operations. It is included in the monorepo but is out of scope for the current build phase.

---

## App 1 — MatatuPulse (Customer-Facing)

**URL (Railway):** `https://matatu-pulse-production.up.railway.app`  
**Frontend port (local):** `:5176`  
**Backend port (local):** `:3004`  
**Audience:** Nairobi commuters

### What it does

MatatuPulse is the public-facing commuter app. Its core promise: *know your fare before you board*. It surfaces live matatu fares, route options, and disruption alerts — and makes all of this accessible to people without smartphones via USSD and SMS.

### Frontend pages

#### `/` — Fare Search (Home)
- A hero section with a stage autocomplete search box
- Users type (or select from suggestions) an **origin** and **destination** stage
- Stages are drawn from a pre-loaded list of 20+ Nairobi stages (Westlands, Rongai, Karen, CBD, Langata, etc.)
- A swap button lets the user reverse the journey direction instantly
- Below the search box, **popular route shortcuts** (e.g. "CBD → Rongai", "CBD → Karen") let users jump straight to results with one tap
- A banner at the bottom reminds users that USSD (`*384#`) is free on any phone — tapping it goes to the alerts page

#### `/results?from=X&to=Y` — Route Results
- Shows all matching matatu routes for the selected origin/destination pair
- Each route card shows:
  - **Route number** (e.g. "111") with a colour-coded badge matching the SACCO livery
  - **SACCO name** (e.g. "Rongai-Maasai SACCO")
  - **Boarding stage** (the physical location to board)
  - **Peak fare range** (KES) and **off-peak fare range** (KES) — these are live, reading from the `fares` table
  - A **"Peak now" / "Off-peak now"** badge that reflects the current time of day (peak = 6–9am, 4–8pm weekdays)
  - **Journey time** in minutes
  - **Vehicle type** (14-seater, 33-seater, bus)
- Sort options: **Cheapest**, **Fastest**, **Most frequent**
- Each route card has a **"Set fare alert"** button that takes the user to `/alerts` pre-filled with that route

#### `/route/:id` — Single Route Detail
- Full details on one route: all stages along the route, departure times, frequency
- Shows peak and off-peak fare history

#### `/routes` — Browse All Routes
- Paginated list of all routes in the database, grouped by origin area

#### `/stages` — Stage Directory
- Lists all 20 Nairobi stages with their areas and GPS coordinates

#### `/alerts` — Fare Alert Sign-Up
- Users enter their phone number and select:
  - Their regular route
  - Delivery channel: **SMS** or **WhatsApp**
  - Alert types:
    - **Peak fare spike** — notified when fares jump above the usual peak rate
    - **Route disruption** — roadworks, accidents, traffic detours
    - **SACCO strike notice** — if a SACCO is going off-road
- On submit, a `fare_alerts` row is created in the database
- Africa's Talking SMS is used to deliver the alerts

### Backend — API routes

All backend routes are under `/api/`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ussd` | Africa's Talking USSD webhook — handles the full USSD menu tree |
| `POST` | `/api/sms/incoming` | Africa's Talking inbound SMS — keyword dispatch (BODA, ON, OFF, DONE, SOS, FARE) |
| `GET` | `/api/routes` | List all routes (with fares) |
| `GET` | `/api/routes/:id` | Single route detail |
| `GET` | `/api/stages` | All stages |
| `GET` | `/api/stats/public` | Aggregate stats for the landing page |
| `GET` | `/api/health` | Service health check |

### USSD Flow (`*384*3133#`)

Africa's Talking delivers USSD sessions as a cumulative `text` field split by `*`. `text=""` means the user just dialled. The flow:

```
Dial *384*3133#
  → CON "NairobiMove\n1. Traffic Report\n2. Find Matatu\n3. Report Incident\n4. Emergency SOS\n5. Account"

text="1"  → CON Traffic report sub-menu (report congestion level)
text="2"  → CON "Enter origin stage number:\n1.CBD 2.Westlands 3.Rongai..."
text="2*1"→ CON "Enter destination:\n1.Rongai 2.Karen 3.Westlands..."
text="2*1*2"→ END "Route 111 (CBD→Rongai): KES 60-80 off-peak, KES 80-100 peak. 
               14-seater, ~45 min. SMS sent with details."
               [AT sends fare details to the caller's phone via SMS]

text="4"  → CON Emergency SOS confirmation
text="4*1"→ END Logs commuter_sos, sends SMS to emergency contacts
```

Sessions are persisted in `ussd_sessions` (keyed on AT's session ID) so multi-step flows survive if the user pauses.

### SMS Keyword Handler

All Africa's Talking inbound SMS for the platform enter via matatu-pulse's `/api/sms/incoming`. The handler reads the first word and dispatches:

| Keyword | Who sends it | What happens |
|---|---|---|
| `FARE <origin> <dest>` | Anyone | Queries `routes` + `fares` and replies with current peak/off-peak fare |
| `BODA <stage>` | Passenger | Finds an available rider at that stage (`riders` table, `is_available=true`), creates a `trips` record, and SMS-confirms the rider's plate + ETA to the passenger |
| `ON` | Boda rider | Sets `riders.is_available = true`, confirms with their current stage name |
| `OFF` | Boda rider | Sets `riders.is_available = false` |
| `DONE` | Rider OR driver | **Rider**: marks their current trip as `completed`, awards KES 5 airtime via AT Airtime API, updates `total_trips` and `total_airtime_earned`. **Driver** (identified by `vehicles.driver_phone`): logs a `compliance_event` for their vehicle (used by FleetPulse) |
| `SOS` | Rider | Inserts a `sos_events` row, sends SMS to `next_of_kin_phone`, and makes a voice call to next of kin via AT Voice API |

---

## App 2 — FleetPulse / SACCO Dashboard

**URL (Railway):** `https://sacco-production-1ad8.up.railway.app`  
**Frontend port (local):** `:5173`  
**Backend port (local):** `:3001`  
**Audience:** Matatu and PSV SACCO owners, fleet managers

### What it does

FleetPulse is a compliance dashboard. Every matatu in Kenya needs three documents kept current: **NTSA inspection**, **insurance**, and a **PSV licence**. FleetPulse tracks these expiry dates across an entire fleet, surfaces which vehicles are at risk, and automatically reminds drivers by SMS before documents lapse.

### Frontend pages

#### `/` — Fleet Overview (Dashboard)
- **Stats bar** at the top: Total Vehicles / Compliant / Expiring Soon (within 14 days) / Overdue
- **Vehicle table** listing every vehicle in the SACCO:
  - Plate number, vehicle type (matatu/bus/lorry)
  - NTSA expiry date, insurance expiry date, PSV licence expiry date
  - Driver name
  - **Compliance status badge**: `Compliant` (green), `Expiring` (amber), `Overdue` (red)
- Filter by vehicle type (matatu, bus, lorry), search by plate or driver name
- Sort by compliance status (overdue first, then expiring, then compliant)
- Row action menu: View details / Send reminder / Mark as renewed

The compliance status is computed by the `compliance_status(expiry_date)` Postgres function:
- `overdue` — expiry date is in the past
- `expiring` — expiry date is within 14 days
- `compliant` — expiry date is more than 14 days away

#### `/vehicles/:plate` — Vehicle Detail
- All compliance dates for the vehicle, colour-coded
- Full compliance event history (reminders sent, renewals logged, `DONE` replies received)
- Driver contact details
- GPS location data (last known stage)

#### `/add-vehicle` — Add Vehicle Form
- Form to add a new vehicle to the SACCO: plate, type, driver name, driver phone, NTSA/insurance/PSV expiry dates
- Saves to `vehicles` table (linked to the logged-in SACCO's ID)

#### `/report` — Compliance Report
- Summary report of the fleet's overall compliance health
- Exportable data for SACCO records

#### `/sms` — SMS Log
- History of all inbound and outbound SMS messages for the SACCO (from `sms_logs` table)

### Backend — API routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | SACCO owner login (JWT) |
| `GET` | `/api/vehicles` | All vehicles for the authenticated SACCO |
| `POST` | `/api/vehicles` | Add a vehicle |
| `PUT` | `/api/vehicles/:id` | Update vehicle details / compliance dates |
| `DELETE` | `/api/vehicles/:id` | Remove a vehicle |
| `GET` | `/api/saccos/:id` | SACCO profile |
| `GET` | `/api/alerts` | Pending compliance alerts |
| `GET` | `/api/stats/public` | Public stats (`totalVehicles`, `compliantCount`) |
| `GET` | `/api/health` | Health check |

### Daily Compliance Cron (`reminder-cron.ts`)

A cron job runs every morning. It queries:

```sql
SELECT * FROM vehicles
WHERE compliance_status(ntsa_expiry) IN ('expiring', 'overdue')
   OR compliance_status(insurance_expiry) IN ('expiring', 'overdue')
   OR compliance_status(psv_expiry) IN ('expiring', 'overdue')
```

For each at-risk vehicle, it sends an SMS to `driver_phone`:

```
FleetPulse: KCA 123G insurance expires in 7 days (30 Jun 2026).
Reply: DONE [insurer name] to confirm renewal.
```

When the driver replies `DONE Jubilee Insurance`, the inbound SMS hits matatu-pulse's `/api/sms/incoming`, which matches `driver_phone` against the `vehicles` table and logs a `compliance_events` row with `event_type='renewed'` and the driver's reply as `notes`.

---

## App 3 — Registration (Onboarding Portal)

**URL (Railway):** `https://registeration-production.up.railway.app`  
**Frontend port (local):** `:5175`  
**Backend port (local):** `:3003`  
**Audience:** New boda riders and SACCO owners wanting to join the platform

### What it does

Registration is the public onboarding portal. It is the entry point for all new participants. It writes directly to the shared database (specifically to `riders`, `saccos`, and `vehicles`) — which immediately makes new registrants visible to FleetPulse and BodaDispatch without any API calls between services.

### Frontend pages

#### `/` — Role Selection
- Landing page with two options:
  - **"I'm a Boda Rider"** → `/rider`
  - **"I manage a SACCO or Fleet"** → `/fleet`
- Also links to `/verify` to check a rider's registration status

#### `/rider` — Boda Rider Registration
Fields collected:
- Full name, phone number, National ID number
- Motorcycle plate number, make (Honda, Bajaj, TVS, etc.)
- PSB (Public Service Board) licence number
- Home stage (where they operate from — dropdown of all stages)
- Next of kin name and phone number

On submit:
1. The `registration` backend POSTs to `/api/register/rider`
2. A `riders` row is inserted (with `is_available=false`, `registered_via='web'`)
3. An Africa's Talking welcome SMS is sent:  
   `"Welcome to NairobiMove, [Name]! Your boda is registered. Reply ON when you're ready for bookings. Dial *384*3133# for USSD. Reply SOS in an emergency."`

#### `/fleet` — SACCO / Fleet Registration
Fields collected:
- SACCO name, owner name, phone number, county
- One or more vehicles: plate, type, driver name, driver phone, NTSA/insurance/PSV expiry dates

On submit:
1. Backend POSTs to `/api/register/sacco`
2. A `saccos` row is inserted
3. Each vehicle is inserted into `vehicles` linked to the new SACCO ID
4. An AT welcome SMS is sent to the owner:  
   `"Welcome to FleetPulse by NairobiMove. Your fleet is registered. You'll receive compliance alerts automatically."`
5. The SACCO is immediately visible in the FleetPulse dashboard (same DB)

#### `/verify` — Rider Verification
- Enter a phone number or National ID to check if a rider is registered and active
- Reads from the `riders` table — useful for passengers wanting to verify the boda rider they're about to board

#### `/success` — Confirmation Page
- Post-registration confirmation with the commuter's details and next steps

### Backend — API routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/register/rider` | Create a new rider (writes to `riders`) |
| `POST` | `/api/register/sacco` | Create SACCO + vehicles |
| `GET` | `/api/stages` | All stages (for the home-stage dropdown) |
| `GET` | `/api/stats/public` | Aggregate stats for the landing page |
| `GET` | `/api/health` | Health check |

---

## How the Apps Connect

The most important architectural decision: **no HTTP calls between services**. Everything is connected through the **shared Neon database**.

```
┌─────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL                        │
│                                                          │
│  stages  routes  fares  fare_alerts  ussd_sessions       │
│  saccos  vehicles  compliance_events  sms_logs           │
│  riders  trips  sos_events                               │
│  commuters  traffic_reports  incident_reports            │
└─────────────────────────────────────────────────────────┘
       ▲               ▲               ▲
       │               │               │
  matatu-pulse   sacco-dashboard   registration
  (reads/writes  (reads/writes     (INSERT only:
   own tables,    own tables,       riders,
   reads riders   reads riders)     saccos,
   for BODA SMS)                    vehicles)
```

### Concrete connection examples

**Registration → FleetPulse:**  
A SACCO owner registers via the Registration portal. Their `saccos` + `vehicles` rows land in the shared DB. The next time they (or their staff) log in to FleetPulse, their entire fleet is already there — no syncing required.

**Registration → BodaDispatch:**  
A rider registers via the Registration portal. Their `riders` row is inserted with `is_available=false`. When they text `ON` to the shortcode, matatu-pulse's SMS handler sets `is_available=true`. When a passenger texts `BODA Westlands`, matatu-pulse queries `riders WHERE stage ILIKE '%westlands%' AND is_available=true` and dispatches.

**FleetPulse → MatatuPulse (via SMS):**  
FleetPulse's cron sends a reminder SMS to `driver_phone`. The driver replies `DONE`. That reply arrives at matatu-pulse's `/api/sms/incoming`, which looks up `driver_phone` in `vehicles` and logs the compliance event.

**MatatuPulse → Landing page (public stats):**  
The landing/marketing page fetches live stats from the public endpoints:
- `GET /api/stats/public` on sacco-dashboard → `{ totalVehicles, compliantCount }`
- `GET /api/stats/public` on boda-dispatch → `{ totalRiders, tripsToday, sosResolved }`
- `GET /api/stats/public` on matatu-pulse → route and fare counts

---

## Africa's Talking Integration

All AT traffic (USSD + SMS + Voice + Airtime) enters the platform through **matatu-pulse only** (`/api/ussd` and `/api/sms/incoming`). No other service has AT webhook endpoints.

### Services used

| AT Service | Used for |
|---|---|
| **USSD** | Full USSD menu tree on `*384*3133#` — fare lookup, traffic reports, SOS |
| **SMS (inbound)** | Keyword dispatch: BODA, ON, OFF, DONE, SOS, FARE |
| **SMS (outbound)** | Fare results, ride confirmations, welcome messages, compliance reminders, SOS alerts |
| **Airtime API** | KES 5 reward sent to boda rider on `DONE` keyword |
| **Voice API** | Call to next of kin on rider `SOS` |

### Credentials (sandbox)

```
AT_API_KEY=atsk_724c01cd85d...
AT_USERNAME=sandbox
AT_SHORTCODE=21606
AT_USSD_CODE=*384*3133#
```

### Production Railway callback URLs (configured in AT dashboard)

| AT Setting | URL |
|---|---|
| USSD callback | `https://matatu-pulse-production.up.railway.app/api/ussd` |
| SMS inbound | `https://matatu-pulse-production.up.railway.app/api/sms/incoming` |

---

## Database: Table Ownership Summary

| Table | Written by | Read by |
|---|---|---|
| `stages` | Seed script | All services |
| `routes` | matatu-pulse | matatu-pulse frontend |
| `fares` | matatu-pulse | matatu-pulse frontend |
| `ussd_sessions` | matatu-pulse | matatu-pulse |
| `fare_alerts` | matatu-pulse | matatu-pulse |
| `fare_reports` | matatu-pulse | matatu-pulse |
| `commuters` | matatu-pulse | matatu-pulse |
| `traffic_reports` | matatu-pulse (via USSD) | matatu-pulse |
| `incident_reports` | matatu-pulse (via USSD) | matatu-pulse |
| `commuter_sos` | matatu-pulse (via USSD) | matatu-pulse |
| `saccos` | registration | sacco-dashboard |
| `vehicles` | registration, sacco-dashboard | sacco-dashboard, matatu-pulse (DONE SMS) |
| `compliance_events` | sacco-dashboard (via matatu SMS) | sacco-dashboard |
| `sms_logs` | matatu-pulse, sacco-dashboard | sacco-dashboard |
| `riders` | registration | matatu-pulse (BODA/ON/OFF/DONE/SOS), boda-dispatch |
| `trips` | matatu-pulse (BODA SMS), boda-dispatch | boda-dispatch |
| `sos_events` | matatu-pulse (SOS SMS) | boda-dispatch |

### The `compliance_status()` Postgres function

Rather than computing expiry status in application code, a Postgres function handles it:

```sql
compliance_status(expiry_date DATE) → 'compliant' | 'expiring' | 'overdue' | 'unknown'
-- overdue   : expiry date is in the past
-- expiring  : expiry date is within the next 14 days
-- compliant : more than 14 days away
-- unknown   : NULL expiry date
```

FleetPulse's cron and the vehicle list both call this function directly in SQL:
```sql
WHERE compliance_status(ntsa_expiry) IN ('expiring', 'overdue')
```

---

## Deployment Architecture (Railway)

Each app is its own Railway service, all deployed from the same GitHub repo. Railway reads the root `railway.toml` (not the per-app ones), so build and start commands are set manually per service in the Railway dashboard.

```
GitHub repo: devjosiah11/nairobi-move
        │
        ├── Railway Service: matatu-pulse
        │     Build: npm install --include=dev && npm run build -w matatu-pulse
        │     Start: npm start -w matatu-pulse
        │     URL:   https://matatu-pulse-production.up.railway.app
        │
        ├── Railway Service: sacco-dashboard
        │     Build: npm install --include=dev && npm run build -w sacco-dashboard
        │     Start: npm start -w sacco-dashboard
        │     URL:   https://sacco-production-1ad8.up.railway.app
        │
        ├── Railway Service: boda-dispatch  (backend only, out of scope for now)
        │     Build: npm install --include=dev && npm run build -w boda-dispatch
        │     Start: npm start -w boda-dispatch
        │     URL:   https://boda-dispach-production.up.railway.app
        │
        └── Railway Service: registration
              Build: npm install --include=dev && npm run build -w registration
              Start: npm start -w registration
              URL:   https://registeration-production.up.railway.app
```

Each Railway service exposes **one port**. Express serves both the frontend (`dist/`) and the API (`/api/*`) from that single port. Railway injects `$PORT` at runtime; no hardcoded port is needed.

---

## Local Development

```bash
# From monorepo root — install everything once
npm install

# Start individual apps (frontend + backend together)
npm run dev:matatu    # MatatuPulse   → frontend :5176, API :3004
npm run dev:sacco     # FleetPulse    → frontend :5173, API :3001
npm run dev:reg       # Registration  → frontend :5175, API :3003
npm run dev:boda      # BodaDispatch  → frontend :5174, API :3002

# Start all at once
npm run dev
```

Locally, Vite runs the frontend on its own dev server with hot-reload. The Express API runs separately. The frontend's Vite config proxies `/api` requests to the Express port so they work together seamlessly without any CORS config changes.

---

## What Is NOT Yet Built (Pending)

- **BodaDispatch frontend** — out of scope for now; backend stubs exist
- **SACCO Dashboard login/auth** — JWT is scaffolded but auth gates are not enforced on every route
- **Live fare data feed** — fares are currently seeded static data; a crowdsourced reporting flow (commuters confirm fares via USSD) is designed but not wired to the frontend
- **Landing page live stats** — the fetch calls to `/api/stats/public` are designed but the landing app's environment variables need to point to the correct Railway URLs
- **Push notifications / WhatsApp channel** — the alert sign-up form supports WhatsApp as a channel but the delivery is currently SMS-only
