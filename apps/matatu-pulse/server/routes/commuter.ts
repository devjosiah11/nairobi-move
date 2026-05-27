import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

// GET /api/commuter/routes - Get available matatu routes
router.get('/routes', async (req, res) => {
  try {
    const { area } = req.query;

    // Get unique route numbers with vehicle counts
    const routesResult = await sql`
      SELECT 
        route_number,
        COUNT(*) as vehicle_count,
        COUNT(CASE WHEN is_active = true AND last_updated >= NOW() - INTERVAL '30 minutes' THEN 1 END) as active_count,
        STRING_AGG(DISTINCT area, ', ') as areas
      FROM vehicles v
      JOIN stages s ON v.current_stage_id = s.id
      WHERE route_number IS NOT NULL
      ${area ? sql`AND area = ${area}` : sql``}
      GROUP BY route_number
      ORDER BY route_number
    `;

    // Get unique areas
    const areasResult = await sql`
      SELECT DISTINCT area FROM stages WHERE area IS NOT NULL ORDER BY area
    `;

    res.json({
      routes: routesResult,
      areas: areasResult.map(row => row.area)
    });
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/commuter/routes/:routeNumber - Get specific route info
router.get('/routes/:routeNumber', async (req, res) => {
  try {
    const { routeNumber } = req.params;

    // Get active vehicles on this route
    const vehiclesResult = await sql`
      SELECT 
        v.plate_number,
        v.driver_name,
        v.current_location,
        v.last_updated,
        s.name as stage_name,
        s.area as stage_area,
        s.lat as stage_lat,
        s.lng as stage_lng
      FROM vehicles v
      JOIN stages s ON v.current_stage_id = s.id
      WHERE v.route_number = ${routeNumber.toUpperCase()}
      AND v.is_active = true
      AND v.last_updated >= NOW() - INTERVAL '30 minutes'
      ORDER BY v.last_updated DESC
    `;

    // Get route statistics
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_vehicles,
        COUNT(CASE WHEN last_updated >= NOW() - INTERVAL '30 minutes' THEN 1 END) as recent_vehicles
      FROM vehicles 
      WHERE route_number = ${routeNumber.toUpperCase()}
    `;

    // Get recent traffic reports for this route
    const trafficResult = await sql`
      SELECT 
        report_type,
        created_at,
        phone_number
      FROM traffic_reports 
      WHERE route_number = ${routeNumber.toUpperCase()}
      AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    res.json({
      route_number: routeNumber.toUpperCase(),
      vehicles: vehiclesResult,
      stats: statsResult[0] || { total_vehicles: 0, active_vehicles: 0, recent_vehicles: 0 },
      recent_traffic: trafficResult
    });
  } catch (error) {
    console.error('Get route details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/commuter/traffic - Get traffic reports
router.get('/traffic', async (req, res) => {
  try {
    const { route_number, area, hours = '6' } = req.query;

    const hoursNum = parseInt(hours as string);
    const conditions = [`created_at >= NOW() - INTERVAL '${hoursNum} hours'`];
    
    if (route_number) {
      conditions.push(`route_number = ${route_number}`);
    }

    const whereClause = conditions.join(' AND ');

    const trafficResult = await sql`
      SELECT 
        tr.*,
        c.full_name as reporter_name
      FROM traffic_reports tr
      LEFT JOIN commuters c ON tr.phone_number = c.phone_number
      WHERE ${sql(whereClause)}
      ORDER BY tr.created_at DESC
      LIMIT 50
    `;

    // Get traffic summary by route
    const summaryResult = await sql`
      SELECT 
        route_number,
        COUNT(*) as report_count,
        MAX(created_at) as latest_report
      FROM traffic_reports 
      WHERE created_at >= NOW() - INTERVAL '${hoursNum} hours'
      ${route_number ? sql`AND route_number = ${route_number}` : sql``}
      GROUP BY route_number
      ORDER BY report_count DESC
    `;

    res.json({
      reports: trafficResult,
      summary: summaryResult,
      time_range: `Last ${hoursNum} hours`
    });
  } catch (error) {
    console.error('Get traffic reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/commuter/traffic - Submit traffic report
router.post('/traffic', async (req, res) => {
  try {
    const { phone_number, report_type, route_number, description } = req.body;

    if (!phone_number || !report_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['phone_number', 'report_type']
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Create traffic report
    const result = await sql`
      INSERT INTO traffic_reports (phone_number, report_type, route_number, description, status, created_at)
      VALUES (${normalizedPhone}, ${report_type}, ${route_number}, ${description}, 'active', NOW())
      RETURNING *
    `;

    const report = result[0];

    // Send confirmation SMS
    const message = `Traffic report received: ${report_type}${route_number ? ` on route ${route_number}` : ''}.
Thank you for helping other commuters!`;
    
    try {
      await sendSMS(normalizedPhone, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, message);
    } catch (error) {
      console.error('Failed to send traffic confirmation:', error);
    }

    res.status(201).json({ 
      message: 'Traffic report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Submit traffic report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/commuter/incidents - Get incident reports
router.get('/incidents', async (req, res) => {
  try {
    const { incident_type, hours = '24' } = req.query;

    const hoursNum = parseInt(hours as string);
    const conditions = [`created_at >= NOW() - INTERVAL '${hoursNum} hours'`];
    
    if (incident_type) {
      conditions.push(`incident_type = ${incident_type}`);
    }

    const whereClause = conditions.join(' AND ');

    const incidentsResult = await sql`
      SELECT 
        ir.*,
        c.full_name as reporter_name
      FROM incident_reports ir
      LEFT JOIN commuters c ON ir.phone_number = c.phone_number
      WHERE ${sql(whereClause)}
      ORDER BY ir.created_at DESC
      LIMIT 50
    `;

    // Get incident summary by type
    const summaryResult = await sql`
      SELECT 
        incident_type,
        COUNT(*) as report_count,
        MAX(created_at) as latest_report
      FROM incident_reports 
      WHERE created_at >= NOW() - INTERVAL '${hoursNum} hours'
      ${incident_type ? sql`AND incident_type = ${incident_type}` : sql``}
      GROUP BY incident_type
      ORDER BY report_count DESC
    `;

    res.json({
      incidents: incidentsResult,
      summary: summaryResult,
      time_range: `Last ${hoursNum} hours`
    });
  } catch (error) {
    console.error('Get incident reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/commuter/incidents - Submit incident report
router.post('/incidents', async (req, res) => {
  try {
    const { phone_number, incident_type, description, lat, lng } = req.body;

    if (!phone_number || !incident_type) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['phone_number', 'incident_type']
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Create incident report
    const result = await sql`
      INSERT INTO incident_reports (phone_number, incident_type, description, lat, lng, status, created_at)
      VALUES (${normalizedPhone}, ${incident_type}, ${description}, ${lat}, ${lng}, 'active', NOW())
      RETURNING *
    `;

    const incident = result[0];

    // Send confirmation SMS
    const message = `Incident report received: ${incident_type}.
Thank you for reporting. Stay safe!`;
    
    try {
      await sendSMS(normalizedPhone, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, message);
    } catch (error) {
      console.error('Failed to send incident confirmation:', error);
    }

    res.status(201).json({ 
      message: 'Incident report submitted successfully',
      incident
    });
  } catch (error) {
    console.error('Submit incident report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/commuter/sos - Trigger emergency SOS
router.post('/sos', async (req, res) => {
  try {
    const { phone_number, description, lat, lng } = req.body;

    if (!phone_number) {
      return res.status(400).json({ 
        error: 'Missing required field: phone_number'
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Create SOS record
    const result = await sql`
      INSERT INTO commuter_sos (phone_number, description, lat, lng, status, created_at)
      VALUES (${normalizedPhone}, ${description}, ${lat}, ${lng}, 'active', NOW())
      RETURNING *
    `;

    const sos = result[0];

    // Get user info
    const userResult = await sql`
      SELECT full_name FROM commuters WHERE phone_number = ${normalizedPhone}
    `;

    const userName = userResult.length > 0 ? userResult[0].full_name : 'Commuter';

    // Send emergency SMS to contacts
    const emergencyContacts = process.env.EMERGENCY_CONTACTS?.split(',') || [];
    
    for (const contact of emergencyContacts) {
      const message = `EMERGENCY SOS: ${userName} (${normalizedPhone}) needs immediate help!
${description ? `Details: ${description}` : ''}
Location: ${lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : 'Unknown'}
Please call immediately!`;
      
      try {
        await sendSMS(contact.trim(), message);
        await logSMS(sql, 'matatu-pulse', 'outbound', contact.trim(), message);
      } catch (error) {
        console.error(`Failed to send emergency SMS to ${contact}:`, error);
      }
    }

    // Send confirmation to user
    const confirmationMessage = `SOS activated! Help is on the way.
Emergency contacts notified. Stay calm and safe.`;
    
    try {
      await sendSMS(normalizedPhone, confirmationMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, confirmationMessage);
    } catch (error) {
      console.error('Failed to send SOS confirmation:', error);
    }

    res.status(201).json({ 
      message: 'Emergency SOS activated',
      sos
    });
  } catch (error) {
    console.error('SOS activation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/commuter/profile - Get commuter profile
router.get('/profile', async (req, res) => {
  try {
    const { phone_number } = req.query;

    if (!phone_number) {
      return res.status(400).json({ error: 'phone_number is required' });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Get commuter profile
    const profileResult = await sql`
      SELECT * FROM commuters WHERE phone_number = ${normalizedPhone}
    `;

    if (profileResult.length === 0) {
      return res.status(404).json({ error: 'Commuter not found' });
    }

    const profile = profileResult[0];

    // Get commuter stats
    const statsResult = await sql`
      SELECT 
        (SELECT COUNT(*) FROM traffic_reports WHERE phone_number = ${normalizedPhone}) as traffic_reports,
        (SELECT COUNT(*) FROM incident_reports WHERE phone_number = ${normalizedPhone}) as incident_reports,
        (SELECT COUNT(*) FROM commuter_sos WHERE phone_number = ${normalizedPhone}) as sos_count
    `;

    res.json({
      profile,
      stats: statsResult[0]
    });
  } catch (error) {
    console.error('Get commuter profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/commuter/register - Register new commuter
router.post('/register', async (req, res) => {
  try {
    const { full_name, phone_number, email, preferred_routes } = req.body;

    if (!full_name || !phone_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['full_name', 'phone_number']
      });
    }

    // Normalize phone number
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : `+254${phone_number.replace(/^0/, '')}`;

    // Check if already exists
    const existing = await sql`
      SELECT id FROM commuters WHERE phone_number = ${normalizedPhone}
    `;

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Commuter already registered' });
    }

    // Register commuter
    const result = await sql`
      INSERT INTO commuters (full_name, phone_number, email, preferred_routes, sms_subscribed, created_at)
      VALUES (${full_name}, ${normalizedPhone}, ${email}, ${preferred_routes}, true, NOW())
      RETURNING *
    `;

    const commuter = result[0];

    // Send welcome SMS
    const welcomeMessage = `Karibu MatatuPulse, ${full_name}!
You can now:
- Report traffic and incidents
- Find matatu routes
- Get emergency help
Dial *384*3133# or text HELP anytime.`;
    
    try {
      await sendSMS(normalizedPhone, welcomeMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, welcomeMessage);
    } catch (error) {
      console.error('Failed to send welcome SMS:', error);
    }

    res.status(201).json({ 
      message: 'Registration successful',
      commuter
    });
  } catch (error) {
    console.error('Commuter registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
