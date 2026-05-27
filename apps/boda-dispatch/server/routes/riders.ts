import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// GET /api/riders
router.get('/', async (req, res) => {
  try {
    const { stage, status, search, page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = ['r.is_active = true'];
    const params: any[] = [];

    if (stage) {
      conditions.push(`r.stage_id = ${stage}`);
    }

    if (search) {
      conditions.push(`(r.full_name ILIKE ${'%' + search + '%'} OR r.plate_number ILIKE ${'%' + search + '%'} OR r.phone_number ILIKE ${'%' + search + '%'})`);
    }

    // Status filtering
    if (status === 'available') {
      conditions.push(`r.is_available = true AND NOT EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false)`);
    } else if (status === 'on_trip') {
      conditions.push(`EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked')`);
    } else if (status === 'offline') {
      conditions.push(`r.is_available = false AND NOT EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked')`);
    } else if (status === 'sos') {
      conditions.push(`EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false)`);
    }

    const whereClause = conditions.join(' AND ');

    // Get riders with computed status
    const ridersResult = await sql`
      SELECT 
        r.*,
        s.name as stage_name,
        s.area as stage_area,
        CASE 
          WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false)
          THEN 'sos'
          WHEN EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked')
          THEN 'on_trip'
          WHEN r.is_available = true
          THEN 'available'
          ELSE 'offline'
        END as computed_status,
        (SELECT COUNT(*) FROM trips t WHERE t.rider_id = r.id AND DATE(t.booked_at) = CURRENT_DATE) as today_trips,
        (SELECT COALESCE(SUM(t.airtime_rewarded), 0) FROM trips t WHERE t.rider_id = r.id AND DATE(t.booked_at) = CURRENT_DATE) as today_airtime_earned
      FROM riders r
      LEFT JOIN stages s ON r.stage_id = s.id
      WHERE ${sql(whereClause)}
      ORDER BY 
        CASE 
          WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false) THEN 1
          WHEN r.is_available = true THEN 2
          ELSE 3
        END,
        r.full_name
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM riders r
      WHERE ${sql(whereClause)}
    `;

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      riders: ridersResult,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: total,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get riders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/riders/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get rider details
    const riderResult = await sql`
      SELECT 
        r.*,
        s.name as stage_name,
        s.area as stage_area,
        CASE 
          WHEN EXISTS (SELECT 1 FROM sos_events se WHERE se.rider_id = r.id AND se.is_resolved = false)
          THEN 'sos'
          WHEN EXISTS (SELECT 1 FROM trips t WHERE t.rider_id = r.id AND t.status = 'booked')
          THEN 'on_trip'
          WHEN r.is_available = true
          THEN 'available'
          ELSE 'offline'
        END as computed_status
      FROM riders r
      LEFT JOIN stages s ON r.stage_id = s.id
      WHERE r.id = ${id}
    `;

    if (riderResult.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const rider = riderResult[0];

    // Get trip history (last 20)
    const tripsResult = await sql`
      SELECT 
        t.*,
        st.name as pickup_stage_name
      FROM trips t
      LEFT JOIN stages st ON t.pickup_stage_id = st.id
      WHERE t.rider_id = ${id}
      ORDER BY t.booked_at DESC
      LIMIT 20
    `;

    // Get SMS history
    const smsResult = await sql`
      SELECT * FROM sms_logs
      WHERE phone_number = ${rider.phone_number}
      ORDER BY created_at DESC
      LIMIT 30
    `;

    // Get SOS history
    const sosResult = await sql`
      SELECT 
        sos.*,
        s.name as stage_name
      FROM sos_events sos
      LEFT JOIN stages s ON sos.stage_id = s.id
      WHERE sos.rider_id = ${id}
      ORDER BY sos.created_at DESC
    `;

    // Get stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_trips,
        COALESCE(SUM(airtime_rewarded), 0) as total_airtime_earned,
        (SELECT COUNT(*) FROM trips WHERE rider_id = ${id} AND DATE(booked_at) >= CURRENT_DATE - INTERVAL '7 days') as trips_this_week,
        (SELECT COUNT(*) FROM sos_events WHERE rider_id = ${id} AND is_resolved = false) as active_sos_count
      FROM trips 
      WHERE rider_id = ${id}
    `;

    res.json({
      rider,
      trip_history: tripsResult,
      sms_history: smsResult,
      sos_history: sosResult,
      stats: statsResult[0]
    });
  } catch (error) {
    console.error('Get rider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/riders
router.post('/', async (req, res) => {
  try {
    const { 
      full_name, 
      phone_number, 
      id_number, 
      stage_id, 
      plate_number, 
      motorcycle_make, 
      psb_licence, 
      next_of_kin_name, 
      next_of_kin_phone 
    } = req.body;

    if (!full_name || !phone_number || !stage_id || !plate_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Normalize phone number to +254 format
    const normalizedPhone = phone_number.startsWith('+') ? phone_number : `+254${phone_number.replace(/^0/, '')}`;

    // Check if phone or plate already exists
    const existing = await sql`
      SELECT id FROM riders 
      WHERE phone_number = ${normalizedPhone} OR plate_number = ${plate_number.toUpperCase()}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Rider with this phone number or plate already exists' });
    }

    // Get stage info for welcome SMS
    const stageResult = await sql`
      SELECT name, area FROM stages WHERE id = ${stage_id}
    `;

    if (stageResult.length === 0) {
      return res.status(400).json({ error: 'Stage not found' });
    }

    const stage = stageResult[0];

    // Insert rider
    const result = await sql`
      INSERT INTO riders (
        full_name, phone_number, id_number, stage_id, plate_number,
        motorcycle_make, psb_licence, next_of_kin_name, next_of_kin_phone
      ) VALUES (
        ${full_name}, ${normalizedPhone}, ${id_number}, ${stage_id}, 
        ${plate_number.toUpperCase()}, ${motorcycle_make}, ${psb_licence}, 
        ${next_of_kin_name}, ${next_of_kin_phone}
      )
      RETURNING *
    `;

    const rider = result[0];

    // Send welcome SMS
    const welcomeMessage = `Welcome to NairobiMove, ${full_name}! You're registered at ${stage.name}.
Text ON to go available for bookings.
Text BODA ${stage.name} to get a booking.
Text SOS for emergency help.
Stay safe!`;

    try {
      await sendSMS(normalizedPhone, welcomeMessage);
      await logSMS(sql, 'boda', 'outbound', normalizedPhone, welcomeMessage, rider.id);
    } catch (smsError) {
      console.error('Failed to send welcome SMS:', smsError);
    }

    // Emit socket event (will be handled in main server)
    const { emitRiderUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:new', { rider });

    res.status(201).json({ rider });
  } catch (error) {
    console.error('Create rider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/riders/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, stage_id, motorcycle_make, next_of_kin_name, next_of_kin_phone } = req.body;

    // Check if rider exists
    const existing = await sql`
      SELECT id FROM riders WHERE id = ${id}
    `;
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const result = await sql`
      UPDATE riders 
      SET 
        full_name = COALESCE(${full_name}, full_name),
        stage_id = COALESCE(${stage_id}, stage_id),
        motorcycle_make = COALESCE(${motorcycle_make}, motorcycle_make),
        next_of_kin_name = COALESCE(${next_of_kin_name}, next_of_kin_name),
        next_of_kin_phone = COALESCE(${next_of_kin_phone}, next_of_kin_phone),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Emit socket event
    const { emitRiderUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: id, 
      is_available: result[0].is_available,
      status: result[0].is_available ? 'available' : 'offline'
    });

    res.json({ rider: result[0] });
  } catch (error) {
    console.error('Update rider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/riders/:id/toggle-availability
router.put('/:id/toggle-availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ error: 'is_available must be a boolean' });
    }

    // Check if rider exists
    const existing = await sql`
      SELECT id FROM riders WHERE id = ${id}
    `;
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const result = await sql`
      UPDATE riders 
      SET is_available = ${is_available}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    const rider = result[0];

    // Emit socket event
    const { emitRiderUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: id, 
      is_available: rider.is_available,
      status: rider.is_available ? 'available' : 'offline'
    });

    res.json({ rider });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/riders/:id/suspend
router.put('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql`
      UPDATE riders 
      SET is_active = false, is_available = false, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const rider = result[0];

    // Send suspension SMS
    const message = "Your NairobiMove account has been suspended. Contact support.";
    try {
      await sendSMS(rider.phone_number, message);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, message, rider.id);
    } catch (smsError) {
      console.error('Failed to send suspension SMS:', smsError);
    }

    // Emit socket event
    const { emitRiderUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: id, 
      is_available: false,
      status: 'offline'
    });

    res.json({ rider });
  } catch (error) {
    console.error('Suspend rider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/riders/:id/reinstate
router.put('/:id/reinstate', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql`
      UPDATE riders 
      SET is_active = true, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const rider = result[0];

    // Send reinstatement SMS
    const message = "Your NairobiMove account has been reinstated. Text ON to go live.";
    try {
      await sendSMS(rider.phone_number, message);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, message, rider.id);
    } catch (smsError) {
      console.error('Failed to send reinstatement SMS:', smsError);
    }

    // Emit socket event
    const { emitRiderUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: id, 
      is_available: rider.is_available,
      status: rider.is_available ? 'available' : 'offline'
    });

    res.json({ rider });
  } catch (error) {
    console.error('Reinstate rider error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
