import { Router } from 'express';
import { sql } from '@nairobi-move/db';

const router = Router();

// GET /api/stages - Public stages list for registration
router.get('/', async (req, res) => {
  try {
    const { area } = req.query;

    // Build WHERE conditions
    const conditions = [];
    if (area) {
      conditions.push(`area = ${area}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get stages with rider counts (for public display)
    const stagesResult = await sql`
      SELECT 
        s.id,
        s.name,
        s.area,
        s.lat,
        s.lng,
        COUNT(r.id) as total_riders,
        COUNT(CASE WHEN r.is_available = true AND NOT EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false) THEN 1 END) as available_riders
      FROM stages s
      LEFT JOIN riders r ON s.id = r.stage_id AND r.is_active = true
      ${sql(whereClause)}
      GROUP BY s.id, s.name, s.area, s.lat, s.lng
      ORDER BY s.name
    `;

    // Get unique areas
    const areasResult = await sql`
      SELECT DISTINCT area FROM stages ORDER BY area
    `;

    res.json({ 
      stages: stagesResult,
      areas: areasResult.map(row => row.area)
    });
  } catch (error) {
    console.error('Get stages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stages/:id - Public stage details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get stage details with rider counts
    const stageResult = await sql`
      SELECT 
        s.id,
        s.name,
        s.area,
        s.lat,
        s.lng,
        COUNT(r.id) as total_riders,
        COUNT(CASE WHEN r.is_available = true AND NOT EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false) THEN 1 END) as available_riders,
        COUNT(CASE WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false) THEN 1 END) as sos_riders,
        COUNT(CASE WHEN EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked') THEN 1 END) as on_trip_riders
      FROM stages s
      LEFT JOIN riders r ON s.id = r.stage_id AND r.is_active = true
      WHERE s.id = ${id}
      GROUP BY s.id, s.name, s.area, s.lat, s.lng
    `;

    if (stageResult.length === 0) {
      return res.status(404).json({ error: 'Stage not found' });
    }

    const stage = stageResult[0];

    // Get available riders at this stage (for public display - limited info)
    const ridersResult = await sql`
      SELECT 
        r.id,
        r.full_name,
        r.plate_number,
        r.motorcycle_make,
        CASE 
          WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false)
          THEN 'sos'
          WHEN EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked')
          THEN 'on_trip'
          WHEN r.is_available = true
          THEN 'available'
          ELSE 'offline'
        END as status
      FROM riders r
      WHERE r.stage_id = ${id} AND r.is_active = true
      ORDER BY 
        CASE 
          WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false) THEN 1
          WHEN r.is_available = true THEN 2
          ELSE 3
        END,
        r.full_name
      LIMIT 50
    `;

    res.json({
      stage,
      riders: ridersResult
    });
  } catch (error) {
    console.error('Get stage error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
