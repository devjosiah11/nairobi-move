import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { sendSMS, logSMS, sendAirtime } from '@nairobi-move/utils';

const router = Router();

// Apply admin auth middleware to all routes
router.use(adminAuthMiddleware);

// GET /api/trips
router.get('/', async (req, res) => {
  try {
    const { status, rider_id, stage_id, page = '1', limit = '50' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = [];
    const params: any[] = [];

    if (status) {
      conditions.push(`t.status = ${status}`);
    }

    if (rider_id) {
      conditions.push(`t.rider_id = ${rider_id}`);
    }

    if (stage_id) {
      conditions.push(`t.pickup_stage_id = ${stage_id}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get trips with rider and stage info
    const tripsResult = await sql`
      SELECT 
        t.*,
        r.full_name as rider_name,
        r.phone_number as rider_phone,
        r.plate_number as rider_plate,
        s.name as pickup_stage_name,
        s.area as pickup_stage_area
      FROM trips t
      JOIN riders r ON t.rider_id = r.id
      JOIN stages s ON t.pickup_stage_id = s.id
      ${sql(whereClause)}
      ORDER BY t.booked_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM trips t
      ${sql(whereClause)}
    `;

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      trips: tripsResult,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: total,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trips/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await sql`
      SELECT 
        t.*,
        r.full_name as rider_name,
        r.phone_number as rider_phone,
        r.plate_number as rider_plate,
        s.name as pickup_stage_name,
        s.area as pickup_stage_area
      FROM trips t
      JOIN riders r ON t.rider_id = r.id
      JOIN stages s ON t.pickup_stage_id = s.id
      WHERE t.id = ${id}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ trip: result[0] });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/trips - Create booking (internal use)
router.post('/', async (req, res) => {
  try {
    const { rider_id, pickup_stage_id, customer_phone, customer_name } = req.body;

    if (!rider_id || !pickup_stage_id) {
      return res.status(400).json({ error: 'rider_id and pickup_stage_id are required' });
    }

    // Check if rider is available
    const riderResult = await sql`
      SELECT * FROM riders 
      WHERE id = ${rider_id} AND is_active = true AND is_available = true
    `;

    if (riderResult.length === 0) {
      return res.status(400).json({ error: 'Rider not available' });
    }

    // Check if rider already has active trip
    const activeTripResult = await sql`
      SELECT id FROM trips 
      WHERE rider_id = ${rider_id} AND status = 'booked'
    `;

    if (activeTripResult.length > 0) {
      return res.status(400).json({ error: 'Rider already has active trip' });
    }

    // Get stage info
    const stageResult = await sql`
      SELECT * FROM stages WHERE id = ${pickup_stage_id}
    `;

    if (stageResult.length === 0) {
      return res.status(400).json({ error: 'Stage not found' });
    }

    const rider = riderResult[0];
    const stage = stageResult[0];

    // Create trip
    const result = await sql`
      INSERT INTO trips (rider_id, pickup_stage_id, customer_phone, customer_name)
      VALUES (${rider_id}, ${pickup_stage_id}, ${customer_phone}, ${customer_name})
      RETURNING *
    `;

    const trip = result[0];

    // Update rider availability
    await sql`
      UPDATE riders SET is_available = false WHERE id = ${rider_id}
    `;

    // Send SMS to rider
    const riderMessage = `NairobiMove: New booking at ${stage.name}! Customer: ${customer_name || 'Anonymous'}. Please proceed to pickup. Reply DONE when complete.`;
    try {
      await sendSMS(rider.phone_number, riderMessage);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, riderMessage, rider.id);
    } catch (smsError) {
      console.error('Failed to send rider SMS:', smsError);
    }

    // Send SMS to customer
    const customerMessage = `NairobiMove: Your rider is ${rider.full_name} (${rider.plate_number}). They're on the way to ${stage.name}. Safe ride!`;
    try {
      if (customer_phone) {
        await sendSMS(customer_phone, customerMessage);
        await logSMS(sql, 'boda', 'outbound', customer_phone, customerMessage, rider.id);
      }
    } catch (smsError) {
      console.error('Failed to send customer SMS:', smsError);
    }

    // Emit socket events
    const { emitRiderUpdate, emitTripUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: rider_id, 
      is_available: false,
      status: 'on_trip'
    });
    emitTripUpdate('trip:created', { trip });

    res.status(201).json({ trip });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trips/:id/complete
router.put('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { airtime_rewarded } = req.body;

    // Get trip details
    const tripResult = await sql`
      SELECT * FROM trips WHERE id = ${id}
    `;

    if (tripResult.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult[0];

    if (trip.status !== 'booked') {
      return res.status(400).json({ error: 'Trip cannot be completed' });
    }

    // Update trip
    const result = await sql`
      UPDATE trips 
      SET status = 'completed', completed_at = NOW(), airtime_rewarded = ${airtime_rewarded || 50}
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedTrip = result[0];

    // Update rider availability
    await sql`
      UPDATE riders SET is_available = true WHERE id = ${trip.rider_id}
    `;

    // Get rider info for airtime
    const riderResult = await sql`
      SELECT * FROM riders WHERE id = ${trip.rider_id}
    `;

    const rider = riderResult[0];

    // Send airtime reward
    if (airtime_rewarded && airtime_rewarded > 0) {
      try {
        await sendAirtime(rider.phone_number, airtime_rewarded, 'KES', 'Trip reward');
        console.log(`Airtime ${airtime_rewarded} KES sent to ${rider.phone_number}`);
      } catch (airtimeError) {
        console.error('Failed to send airtime:', airtimeError);
      }
    }

    // Send confirmation SMS
    const message = `Trip completed! ${airtime_rewarded || 50} KES airtime sent. You're now available for bookings. Text ON to stay live.`;
    try {
      await sendSMS(rider.phone_number, message);
      await logSMS(sql, 'boda', 'outbound', rider.phone_number, message, rider.id);
    } catch (smsError) {
      console.error('Failed to send completion SMS:', smsError);
    }

    // Emit socket events
    const { emitRiderUpdate, emitTripUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: trip.rider_id, 
      is_available: true,
      status: 'available'
    });
    emitTripUpdate('trip:completed', { trip: updatedTrip });

    res.json({ trip: updatedTrip });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/trips/:id/cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Get trip details
    const tripResult = await sql`
      SELECT * FROM trips WHERE id = ${id}
    `;

    if (tripResult.length === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    const trip = tripResult[0];

    if (trip.status !== 'booked') {
      return res.status(400).json({ error: 'Trip cannot be cancelled' });
    }

    // Update trip
    const result = await sql`
      UPDATE trips 
      SET status = 'cancelled', cancelled_at = NOW(), notes = ${reason || 'Cancelled by admin'}
      WHERE id = ${id}
      RETURNING *
    `;

    const updatedTrip = result[0];

    // Update rider availability
    await sql`
      UPDATE riders SET is_available = true WHERE id = ${trip.rider_id}
    `;

    // Send cancellation SMS
    const message = `Trip cancelled. Reason: ${reason || 'Admin cancellation'}. You're now available for bookings.`;
    try {
      await sendSMS(trip.rider_phone, message);
      await logSMS(sql, 'boda', 'outbound', trip.rider_phone, message, trip.rider_id);
    } catch (smsError) {
      console.error('Failed to send cancellation SMS:', smsError);
    }

    // Emit socket events
    const { emitRiderUpdate, emitTripUpdate } = await import('../socket.js');
    emitRiderUpdate('rider:updated', { 
      rider_id: trip.rider_id, 
      is_available: true,
      status: 'available'
    });
    emitTripUpdate('trip:cancelled', { trip: updatedTrip });

    res.json({ trip: updatedTrip });
  } catch (error) {
    console.error('Cancel trip error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
