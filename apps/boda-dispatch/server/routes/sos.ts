import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSMS, makeVoiceCall, logSMS } from '@nairobi-move/utils';

const router = Router();

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// GET /api/sos
router.get('/', async (req, res) => {
  try {
    const { resolved, rider_id, stage_id, page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = [];
    const params: any[] = [];

    if (resolved !== undefined) {
      conditions.push(`sos.is_resolved = ${resolved === 'true'}`);
    }

    if (rider_id) {
      conditions.push(`sos.rider_id = ${rider_id}`);
    }

    if (stage_id) {
      conditions.push(`sos.stage_id = ${stage_id}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get SOS events with rider and stage info
    const sosResult = await sql`
      SELECT 
        sos.*,
        r.full_name as rider_name,
        r.phone_number as rider_phone,
        r.plate_number as rider_plate,
        r.next_of_kin_name,
        r.next_of_kin_phone,
        s.name as stage_name,
        s.area as stage_area
      FROM sos_events sos
      JOIN riders r ON sos.rider_id = r.id
      LEFT JOIN stages s ON sos.stage_id = s.id
      ${sql(whereClause)}
      ORDER BY sos.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM sos_events sos
      ${sql(whereClause)}
    `;

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      sos_events: sosResult,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: total,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get SOS events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/sos/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql`
      SELECT 
        sos.*,
        r.full_name as rider_name,
        r.phone_number as rider_phone,
        r.plate_number as rider_plate,
        r.next_of_kin_name,
        r.next_of_kin_phone,
        s.name as stage_name,
        s.area as stage_area
      FROM sos_events sos
      JOIN riders r ON sos.rider_id = r.id
      LEFT JOIN stages s ON sos.stage_id = s.id
      WHERE sos.id = ${id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'SOS event not found' });
    }

    res.json({ sos_event: result[0] });
  } catch (error) {
    console.error('Get SOS event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/sos - Trigger SOS for a rider
router.post('/', async (req, res) => {
  try {
    const { rider_id, stage_id, description, lat, lng } = req.body;

    if (!rider_id) {
      return res.status(400).json({ error: 'rider_id is required' });
    }

    // Get rider details
    const riderResult = await sql`
      SELECT * FROM riders WHERE id = ${rider_id}
    `;

    if (riderResult.length === 0) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const rider = riderResult[0];

    // Check if there's already an active SOS for this rider
    const existingSOS = await sql`
      SELECT id FROM sos_events 
      WHERE rider_id = ${rider_id} AND is_resolved = false
    `;

    if (existingSOS.length > 0) {
      return res.status(400).json({ error: 'Active SOS already exists for this rider' });
    }

    // Get stage info if provided
    let stage = null;
    if (stage_id) {
      const stageResult = await sql`
        SELECT * FROM stages WHERE id = ${stage_id}
      `;
      if (stageResult.length > 0) {
        stage = stageResult[0];
      }
    }

    // Create SOS event
    const result = await sql`
      INSERT INTO sos_events (rider_id, stage_id, description, lat, lng)
      VALUES (${rider_id}, ${stage_id}, ${description}, ${lat}, ${lng})
      RETURNING *
    `;

    const sosEvent = result[0];

    // Send SMS to next of kin
    if (rider.next_of_kin_phone) {
      const kinMessage = `URGENT: ${rider.full_name} (NairobiMove rider) has triggered an SOS. Location: ${stage ? stage.name : 'Unknown'}. Please call them immediately at ${rider.phone_number}.`;
      try {
        await sendSMS(rider.next_of_kin_phone, kinMessage);
        await logSMS(sql, 'boda', 'outbound', rider.next_of_kin_phone, kinMessage, rider.id);
      } catch (smsError) {
        console.error('Failed to send kin SMS:', smsError);
      }
    }

    // Make voice call to next of kin
    if (rider.next_of_kin_phone) {
      try {
        await makeVoiceCall(rider.next_of_kin_phone);
        console.log(`Voice call made to kin: ${rider.next_of_kin_phone}`);
      } catch (callError) {
        console.error('Failed to make voice call:', callError);
      }
    }

    // Send SMS to rider
    const riderMessage = "SOS triggered! We've contacted your emergency contact. Help is on the way. Stay safe.";
    try {
      await sendSMS(rider.phone_number, riderMessage);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, riderMessage, rider.id);
    } catch (smsError) {
      console.error('Failed to send rider SMS:', smsError);
    }

    // Emit socket events
    const { emitSOSAlert, emitRiderUpdate } = await import('../socket.js');
    emitSOSAlert('sos:triggered', { 
      sos_event: sosEvent,
      rider,
      stage
    });
    emitRiderUpdate('rider:updated', { 
      rider_id: rider_id, 
      is_available: false,
      status: 'sos'
    });

    res.status(201).json({ sos_event: sosEvent });
  } catch (error) {
    console.error('Create SOS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/sos/:id/resolve
router.put('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    // Get SOS event details
    const sosResult = await sql`
      SELECT * FROM sos_events WHERE id = ${id}
    `;

    if (sosResult.length === 0) {
      return res.status(404).json({ error: 'SOS event not found' });
    }

    const sosEvent = sosResult[0];

    if (sosEvent.is_resolved) {
      return res.status(400).json({ error: 'SOS event already resolved' });
    }

    // Update SOS event
    const result = await sql`
      UPDATE sos_events 
      SET is_resolved = true, resolved_at = NOW(), resolution_notes = ${resolution_notes || 'Resolved by admin'}
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedSOS = result[0];

    // Get rider info
    const riderResult = await sql`
      SELECT * FROM riders WHERE id = ${sosEvent.rider_id}
    `;

    const rider = riderResult[0];

    // Send resolution SMS to rider
    const riderMessage = "SOS resolved. You're now available for bookings. Stay safe!";
    try {
      await sendSMS(rider.phone_number, riderMessage);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, riderMessage, rider.id);
    } catch (smsError) {
      console.error('Failed to send resolution SMS:', smsError);
    }

    // Update rider availability back to true
    await sql`
      UPDATE riders SET is_available = true WHERE id = ${sosEvent.rider_id}
    `;

    // Emit socket events
    const { emitSOSAlert, emitRiderUpdate } = await import('../socket.js');
    emitSOSAlert('sos:resolved', { 
      sos_event: updatedSOS,
      rider
    });
    emitRiderUpdate('rider:updated', { 
      rider_id: sosEvent.rider_id, 
      is_available: true,
      status: 'available'
    });

    res.json({ sos_event: updatedSOS });
  } catch (error) {
    console.error('Resolve SOS error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
