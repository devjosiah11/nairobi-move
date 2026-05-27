import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

// POST /api/fares/alerts - Subscribe to fare alerts for a route
router.post('/alerts', async (req, res) => {
  try {
    const { phone_number, route_id, alert_channel = 'sms' } = req.body;

    if (!phone_number || !route_id) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['phone_number', 'route_id']
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Check if route exists
    const routeResult = await sql`
      SELECT * FROM routes WHERE id = ${route_id}
    `;

    if (routeResult.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Check if already subscribed
    const existingAlert = await sql`
      SELECT * FROM fare_alerts 
      WHERE phone_number = ${normalizedPhone} AND route_id = ${route_id}
    `;

    if (existingAlert.length > 0) {
      // Reactivate if inactive
      await sql`
        UPDATE fare_alerts 
        SET is_active = true 
        WHERE phone_number = ${normalizedPhone} AND route_id = ${route_id}
      `;
    } else {
      // Create new alert
      await sql`
        INSERT INTO fare_alerts (phone_number, route_id, alert_channel, is_active, created_at)
        VALUES (${normalizedPhone}, ${route_id}, ${alert_channel}, true, NOW())
      `;
    }

    const route = routeResult[0];
    
    // Send confirmation SMS
    const message = `Fare alert activated for route ${route.route_number} (${route.name}).
You'll receive updates when commuters report fare changes.
Reply STOP to unsubscribe.`;
    
    try {
      await sendSMS(normalizedPhone, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, message);
    } catch (error) {
      console.error('Failed to send fare alert confirmation:', error);
    }

    res.json({ 
      message: 'Fare alert subscription successful',
      route: route.route_number,
      alert_channel
    });
  } catch (error) {
    console.error('Subscribe fare alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fares/unsubscribe - Unsubscribe from fare alerts
router.post('/unsubscribe', async (req, res) => {
  try {
    const { phone_number, route_id } = req.body;

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    if (route_id) {
      // Unsubscribe from specific route
      await sql`
        UPDATE fare_alerts 
        SET is_active = false 
        WHERE phone_number = ${normalizedPhone} AND route_id = ${route_id}
      `;
    } else {
      // Unsubscribe from all routes
      await sql`
        UPDATE fare_alerts 
        SET is_active = false 
        WHERE phone_number = ${normalizedPhone}
      `;
    }

    // Send confirmation SMS
    const message = `You've been unsubscribed from fare alerts.
Reply ALERT to reactivate for any route.`;
    
    try {
      await sendSMS(normalizedPhone, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, message);
    } catch (error) {
      console.error('Failed to send unsubscribe confirmation:', error);
    }

    res.json({ 
      message: 'Unsubscribe successful'
    });
  } catch (error) {
    console.error('Unsubscribe fare alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fares/report - Submit fare report
router.post('/report', async (req, res) => {
  try {
    const { phone_number, route_id, reported_fare } = req.body;

    if (!phone_number || !route_id || !reported_fare) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['phone_number', 'route_id', 'reported_fare']
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Check if route exists
    const routeResult = await sql`
      SELECT * FROM routes WHERE id = ${route_id}
    `;

    if (routeResult.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Create fare report
    await sql`
      INSERT INTO fare_reports (route_id, phone_number, reported_fare, created_at)
      VALUES (${route_id}, ${normalizedPhone}, ${reported_fare}, NOW())
    `;

    const route = routeResult[0];

    // Send confirmation SMS
    const message = `Fare report received: KES ${reported_fare} for route ${route.route_number}.
Thank you for helping other commuters!`;
    
    try {
      await sendSMS(normalizedPhone, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, message);
    } catch (error) {
      console.error('Failed to send fare report confirmation:', error);
    }

    // Check if we should notify subscribers (if we have multiple reports for the same route)
    const recentReports = await sql`
      SELECT COUNT(*) as count 
      FROM fare_reports 
      WHERE route_id = ${route_id} 
      AND created_at >= NOW() - INTERVAL '1 hour'
    `;

    if (recentReports[0].count >= 3) {
      // Notify all active subscribers for this route
      const subscribersResult = await sql`
        SELECT phone_number FROM fare_alerts 
        WHERE route_id = ${route_id} AND is_active = true
      `;

      for (const subscriber of subscribersResult) {
        const notifyMessage = `Fare Update: Route ${route.route_number} recent reports show KES ${reported_fare}.
Multiple commuters confirmed this fare.`;
        
        try {
          await sendSMS(subscriber.phone_number, notifyMessage);
          await logSMS(sql, 'matatu-pulse', 'outbound', subscriber.phone_number, notifyMessage);
        } catch (error) {
          console.error(`Failed to notify subscriber ${subscriber.phone_number}:`, error);
        }
      }
    }

    res.json({ 
      message: 'Fare report submitted successfully',
      route: route.route_number,
      reported_fare
    });
  } catch (error) {
    console.error('Submit fare report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fares/:routeId - Get fare information for a route
router.get('/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;

    // Get route information with current fares
    const routeResult = await sql`
      SELECT 
        r.*,
        json_agg(
          json_build_object(
            'fare_type', f.fare_type,
            'min_fare', f.min_fare,
            'max_fare', f.max_fare
          )
        ) as fares
      FROM routes r
      LEFT JOIN fares f ON r.id = f.route_id
      WHERE r.id = ${routeId}
      GROUP BY r.id
    `;

    if (routeResult.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const route = routeResult[0];

    // Get recent fare reports
    const reportsResult = await sql`
      SELECT 
        reported_fare,
        phone_number,
        created_at
      FROM fare_reports 
      WHERE route_id = ${routeId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Calculate average fare from recent reports
    const avgFare = await sql`
      SELECT AVG(reported_fare) as average_fare
      FROM fare_reports 
      WHERE route_id = ${routeId}
      AND created_at >= NOW() - INTERVAL '24 hours'
    `;

    res.json({
      route,
      recent_reports: reportsResult,
      average_reported_fare: avgFare[0].average_fare ? 
        Math.round(avgFare[0].average_fare) : null,
      total_reports: reportsResult.length
    });
  } catch (error) {
    console.error('Get route fares error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
