import { Router } from 'express';
import { sql } from '@nairobi-move/db';

const router = Router();

// ─── DB init: ensure incident_reports table exists ────────────────────────────

async function ensureIncidentTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number  TEXT NOT NULL DEFAULT 'anonymous',
        incident_type TEXT NOT NULL,
        description   TEXT,
        lat           NUMERIC(9,6),
        lng           NUMERIC(9,6),
        status        TEXT DEFAULT 'active',
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  } catch (e) {
    console.error('incident_reports table init error:', e);
  }
}
ensureIncidentTable();

// ─── Hardcoded demo stages (DB stages table not yet seeded in prod) ────────────

type TrafficLevel = 'low' | 'moderate' | 'heavy' | 'severe';

const DEMO_STAGES = [
  { id: 's1',  name: 'CBD (Archives)',     area: 'CBD',        lat: -1.2833, lng: 36.8167, routes: [{ route_number: '111', name: 'CBD–Rongai',     peak_min: 80,  peak_max: 100 }, { route_number: '125', name: 'CBD–Karen',      peak_min: 80,  peak_max: 120 }] },
  { id: 's2',  name: 'Westlands',          area: 'Westlands',  lat: -1.2641, lng: 36.8020, routes: [{ route_number: '23',  name: 'Westlands–CBD', peak_min: 30,  peak_max: 50  }] },
  { id: 's3',  name: 'Rongai',             area: 'Rongai',     lat: -1.3966, lng: 36.7462, routes: [{ route_number: '111', name: 'CBD–Rongai',     peak_min: 80,  peak_max: 100 }] },
  { id: 's4',  name: 'Ngong Road',         area: 'Ngong',      lat: -1.3031, lng: 36.7677, routes: [{ route_number: '15',  name: 'Ngong Rd–CBD',  peak_min: 40,  peak_max: 60  }] },
  { id: 's5',  name: 'Thika Road',         area: 'Thika',      lat: -1.0333, lng: 37.0833, routes: [{ route_number: '17B', name: 'CBD–Thika',     peak_min: 120, peak_max: 200 }] },
  { id: 's6',  name: 'Eastleigh',          area: 'Eastleigh',  lat: -1.2741, lng: 36.8452, routes: [{ route_number: '58',  name: 'CBD–Eastleigh', peak_min: 30,  peak_max: 50  }] },
  { id: 's7',  name: 'Karen',              area: 'Karen',      lat: -1.3171, lng: 36.7094, routes: [{ route_number: '125', name: 'CBD–Karen',     peak_min: 80,  peak_max: 120 }] },
  { id: 's8',  name: 'Kasarani (TRM)',     area: 'Kasarani',   lat: -1.2197, lng: 36.8880, routes: [{ route_number: '45',  name: 'CBD–Kasarani',  peak_min: 50,  peak_max: 70  }] },
  { id: 's9',  name: 'Kawangware',         area: 'Kawangware', lat: -1.3019, lng: 36.7430, routes: [{ route_number: '33',  name: 'CBD–Kawangware',peak_min: 50,  peak_max: 70  }] },
  { id: 's10', name: 'Railway Station',    area: 'CBD',        lat: -1.2921, lng: 36.8219, routes: [{ route_number: '111', name: 'CBD–Rongai',    peak_min: 80,  peak_max: 100 }] },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEATTime() {
  const eatMs = Date.now() + 3 * 60 * 60 * 1000;
  const d = new Date(eatMs);
  return { hour: d.getUTCHours(), dayOfWeek: d.getUTCDay() };
}

function stageTraffic(name: string, hour: number, isWeekend: boolean): { level: TrafficLevel; score: number } {
  const n = name.toLowerCase();
  const isCBD = n.includes('cbd') || n.includes('archives') || n.includes('railway');

  if (isWeekend) {
    if (hour >= 9 && hour <= 12) return { level: isCBD ? 'moderate' : 'low', score: isCBD ? 4 : 3 };
    return { level: 'low', score: 2 };
  }
  if (hour >= 6 && hour < 9)   return isCBD ? { level: 'severe', score: 10 } : { level: 'heavy', score: 8 };
  if (hour >= 16 && hour < 20) return { level: 'severe', score: isCBD ? 10 : 9 };
  if (hour >= 11 && hour < 14) return { level: 'moderate', score: isCBD ? 6 : 5 };
  return { level: 'low', score: isCBD ? 3 : 2 };
}

function timeAgo(date: Date | string): string {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
}

function demoIncidents() {
  const n = Date.now();
  return [
    { id: 'demo-1', lat: -1.2860, lng: 36.8200, type: 'congestion',  description: 'Slow-moving traffic near Archives roundabout, matatus backing up',         reported_at: new Date(n - 25 * 60000).toISOString(), time_ago: '25 mins ago' },
    { id: 'demo-2', lat: -1.2611, lng: 36.7940, type: 'accident',    description: 'Minor accident on Waiyaki Way near Westlands. One lane blocked.',          reported_at: new Date(n - 42 * 60000).toISOString(), time_ago: '42 mins ago' },
    { id: 'demo-3', lat: -1.3031, lng: 36.7677, type: 'police',      description: 'Police spot-check near Ngong Road Shell station. Expect delays.',          reported_at: new Date(n -  8 * 60000).toISOString(), time_ago: '8 mins ago'  },
    { id: 'demo-4', lat: -1.2197, lng: 36.8880, type: 'roadworks',   description: 'Road repairs near TRM. Use alternative routes.',                            reported_at: new Date(n - 120 * 60000).toISOString(), time_ago: '2 hrs ago'  },
    { id: 'demo-5', lat: -1.3966, lng: 36.7462, type: 'congestion',  description: 'Rongai stage very busy. Long queues reported by commuters.',                reported_at: new Date(n - 18 * 60000).toISOString(), time_ago: '18 mins ago' },
  ];
}

// ─── GET /api/traffic/map-data ────────────────────────────────────────────────

router.get('/map-data', async (_req, res) => {
  try {
    const { hour, dayOfWeek } = getEATTime();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeak    = !isWeekend && ((hour >= 6 && hour < 10) || (hour >= 16 && hour < 21));
    const peakLabel = isPeak && hour < 12 ? 'Morning peak' : isPeak ? 'Evening peak' : isWeekend ? 'Weekend' : 'Off-peak';
    const { level: overallLevel } = stageTraffic('CBD Archives', hour, isWeekend);

    const stages = DEMO_STAGES.map(s => {
      const { level, score } = stageTraffic(s.name, hour, isWeekend);
      return {
        id: s.id, name: s.name, area: s.area,
        lat: s.lat, lng: s.lng,
        traffic_level: level, congestion_score: score,
        route_count: s.routes.length, available_routes: s.routes,
      };
    });

    let incidents: any[] = [];
    try {
      const rows = await sql`
        SELECT id, lat::float, lng::float, incident_type AS type, description, created_at
        FROM incident_reports WHERE status = 'active'
        ORDER BY created_at DESC LIMIT 20
      `;
      incidents = rows.length > 0
        ? rows.map((i: any) => ({ id: i.id, lat: i.lat, lng: i.lng, type: i.type, description: i.description, reported_at: i.created_at, time_ago: timeAgo(i.created_at) }))
        : demoIncidents();
    } catch (_) {
      incidents = demoIncidents();
    }

    res.json({
      stages,
      incidents,
      traffic_summary: { overall_level: overallLevel, is_peak: isPeak, peak_label: peakLabel, updated_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Map data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/traffic/report ─────────────────────────────────────────────────

router.post('/report', async (req, res) => {
  try {
    const { lat, lng, type, description, phone_number } = req.body;
    if (!lat || !lng || !type) return res.status(400).json({ error: 'lat, lng and type are required' });

    const rows = await sql`
      INSERT INTO incident_reports (lat, lng, incident_type, description, phone_number, status)
      VALUES (${lat}, ${lng}, ${type}, ${description || ''}, ${phone_number || 'anonymous'}, 'active')
      RETURNING id, lat::float, lng::float, incident_type AS type, description
    `;
    res.json({ success: true, incident: { ...rows[0], time_ago: 'just now' } });
  } catch (error) {
    console.error('Report incident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/traffic/incidents (all, for alerts feed) ───────────────────────

router.get('/incidents', async (_req, res) => {
  try {
    const rows = await sql`
      SELECT id,
             lat::float, lng::float,
             incident_type AS type,
             description,
             status,
             created_at
      FROM incident_reports
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const incidents = rows.map((i: any) => ({
      id: i.id, lat: i.lat, lng: i.lng,
      type: i.type, description: i.description,
      status: i.status,
      reported_at: i.created_at,
      time_ago: timeAgo(i.created_at),
    }));
    res.json({ incidents });
  } catch (_) {
    res.json({ incidents: demoIncidents().map(i => ({ ...i, status: 'active' })) });
  }
});

// ─── DELETE /api/traffic/incidents/:id (soft delete) ─────────────────────────

router.delete('/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id.startsWith('demo-')) {
      await sql`UPDATE incident_reports SET status = 'resolved' WHERE id = ${id}`;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Resolve incident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
