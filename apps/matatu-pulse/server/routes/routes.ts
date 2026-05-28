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
type FareType    = 'peak' | 'off_peak' | 'weekend';
type FareChange  = 'rising' | 'stable' | 'falling';

function deriveTraffic(hour: number, isWeekend: boolean): { level: TrafficLevel; score: number } {
  if (isWeekend) return hour >= 9 && hour <= 12 ? { level: 'moderate', score: 4 } : { level: 'low', score: 3 };
  if (hour >= 7  && hour <  9)  return { level: 'heavy',    score: 8  };
  if (hour >= 17 && hour <  19) return { level: 'severe',   score: 10 };
  if (hour === 16 || hour === 19) return { level: 'severe', score: 9  };
  if (hour >= 12 && hour <  14) return { level: 'moderate', score: 5  };
  if (hour >= 6  && hour <  7)  return { level: 'moderate', score: 5  };
  if (hour >= 9  && hour <  12) return { level: 'moderate', score: 4  };
  if (hour >= 20)               return { level: 'low',      score: 2  };
  return { level: 'low', score: 2 };
}

function deriveFareType(hour: number, isWeekend: boolean): FareType {
  if (isWeekend) return 'weekend';
  return (hour >= 6 && hour < 10) || (hour >= 16 && hour < 21) ? 'peak' : 'off_peak';
}

function deriveFareChange(hour: number, isWeekend: boolean): FareChange {
  if (isWeekend) return 'stable';
  if (hour === 5 || hour === 15) return 'rising';
  if (hour === 9 || hour === 10 || hour === 20) return 'falling';
  return 'stable';
}

function predictedFare(maxFare: number, hour: number, isPeak: boolean, isWeekend: boolean): number {
  if (!isWeekend && isPeak && ((hour >= 7 && hour <= 8) || (hour >= 17 && hour <= 18)))
    return Math.round((maxFare * 1.2) / 10) * 10;
  if (!isWeekend && hour === 15)
    return Math.round((maxFare * 1.1) / 10) * 10;
  if (!isWeekend && (hour === 9 || hour === 19 || hour === 20))
    return Math.round((maxFare * 0.85) / 10) * 10;
  return maxFare;
}

function suggestedDeparture(level: TrafficLevel, fareChange: FareChange, hour: number, isWeekend: boolean): string {
  if (level === 'severe')          return 'Consider waiting 30-40 mins for traffic to ease';
  if (fareChange === 'rising')     return 'Leave within the next 15 mins before fares rise';
  if (isWeekend && hour >= 6 && hour <= 10) return 'Light traffic — good time to travel';
  if (fareChange === 'falling')    return 'Consider waiting — fares dropping soon';
  if (level === 'heavy')           return 'Heavy traffic — allow 15-20 extra mins';
  if (level === 'moderate')        return 'Moderate traffic — allow extra time';
  return 'Good time to travel';
}

function alternativeMsg(origin: string, dest: string, level: TrafficLevel): string | null {
  const s = (origin + dest).toLowerCase();
  if (level === 'low') return null;
  if (s.includes('rongai'))    return 'Via Langata Rd may save 10-15 mins during heavy traffic';
  if (s.includes('thika'))     return 'Outer ring road bypass avoids the main Thika Rd jam';
  if (s.includes('westlands')) return 'Waiyaki Way direct to CBD can be faster than Upper Hill during peak';
  return null;
}

// ─── GET /api/routes/insights?origin=CBD&dest=Rongai ──────────────────────────

router.get('/insights', async (req, res) => {
  try {
    const { origin = '', dest = '' } = req.query as { origin: string; dest: string };
    const { hour, dayOfWeek } = getEATTime();
    const isWeekend  = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeak     = !isWeekend && ((hour >= 6 && hour < 10) || (hour >= 16 && hour < 21));
    const fareType   = deriveFareType(hour, isWeekend);
    const fareChange = deriveFareChange(hour, isWeekend);
    const { level: traffic_level, score: congestion_score } = deriveTraffic(hour, isWeekend);

    // Max fare for matching route
    let maxFare = 100;
    try {
      const rows = await sql`
        SELECT f.max_fare FROM fares f
        JOIN routes r ON r.id = f.route_id
        JOIN stages os ON os.id = r.origin_stage_id
        JOIN stages ds ON ds.id = r.dest_stage_id
        WHERE f.fare_type = ${fareType}
          AND (os.name ILIKE ${'%' + origin + '%'} OR ds.name ILIKE ${'%' + dest + '%'})
        ORDER BY f.max_fare DESC LIMIT 1
      `;
      if (rows.length > 0) maxFare = rows[0].max_fare;
    } catch (_) { /* use fallback */ }

    // Commuter reports in last hour
    let commuter_reports_last_hour = 0;
    try {
      const rows = await sql`
        SELECT COUNT(*) AS total FROM traffic_reports
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `;
      commuter_reports_last_hour = parseInt(rows[0].total);
    } catch (_) { /* 0 */ }

    // Latest fare confirmation for this route pair
    let last_fare_confirmation: string | null = null;
    try {
      const rows = await sql`
        SELECT fr.reported_fare, fr.created_at FROM fare_reports fr
        JOIN routes r ON r.id = fr.route_id
        JOIN stages os ON os.id = r.origin_stage_id
        JOIN stages ds ON ds.id = r.dest_stage_id
        WHERE os.name ILIKE ${'%' + origin + '%'} OR ds.name ILIKE ${'%' + dest + '%'}
        ORDER BY fr.created_at DESC LIMIT 1
      `;
      if (rows.length > 0) {
        const mins = Math.round((Date.now() - new Date(rows[0].created_at).getTime()) / 60000);
        last_fare_confirmation = `KES ${rows[0].reported_fare} confirmed ${mins} min${mins !== 1 ? 's' : ''} ago`;
      }
    } catch (_) { /* null */ }

    res.json({
      traffic_level,
      congestion_score,
      current_fare_type: fareType,
      predicted_fare_change: fareChange,
      predicted_fare_in_30min: predictedFare(maxFare, hour, isPeak, isWeekend),
      suggested_departure: suggestedDeparture(traffic_level, fareChange, hour, isWeekend),
      alternative_message: alternativeMsg(origin, dest, traffic_level),
      commuter_reports_last_hour,
      last_fare_confirmation,
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
