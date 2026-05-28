import { Router } from 'express';
import { sql } from '@nairobi-move/db';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEATTime() {
  const eatMs = Date.now() + 3 * 60 * 60 * 1000;
  const d = new Date(eatMs);
  return { hour: d.getUTCHours(), dayOfWeek: d.getUTCDay() };
}

type TrafficLevel = 'low' | 'moderate' | 'heavy' | 'severe';

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

    let stages: any[] = [];
    try {
      const stageRows = await sql`
        SELECT s.id, s.name, s.area,
               s.latitude::float  AS lat,
               s.longitude::float AS lng,
               COUNT(DISTINCT r.id) AS route_count
        FROM stages s
        LEFT JOIN routes r ON r.origin_stage_id = s.id OR r.dest_stage_id = s.id
        WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
        GROUP BY s.id, s.name, s.area, s.latitude, s.longitude
        ORDER BY s.name
      `;

      const routeRows = await sql`
        SELECT r.id, r.route_number, r.name,
               r.origin_stage_id, r.dest_stage_id,
               fp.min_fare AS peak_min, fp.max_fare AS peak_max
        FROM routes r
        LEFT JOIN fares fp ON fp.route_id = r.id AND fp.fare_type = 'peak'
      `;

      stages = stageRows.map((s: any) => {
        const { level, score } = stageTraffic(s.name, hour, isWeekend);
        const available_routes = routeRows
          .filter((r: any) => r.origin_stage_id === s.id || r.dest_stage_id === s.id)
          .map((r: any) => ({ route_number: r.route_number, name: r.name, peak_min: r.peak_min, peak_max: r.peak_max }));
        return {
          id: s.id, name: s.name, area: s.area,
          lat: s.lat, lng: s.lng,
          traffic_level: level, congestion_score: score,
          route_count: parseInt(s.route_count), available_routes,
        };
      });
    } catch (e) {
      console.error('Stages query error:', e);
    }

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
