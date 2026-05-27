import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/alerts
router.get('/', async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        v.*,
        compliance_status(v.ntsa_expiry) as ntsa_status,
        compliance_status(v.insurance_expiry) as insurance_status,
        compliance_status(v.psv_expiry) as psv_status,
        CASE 
          WHEN v.ntsa_expiry IS NOT NULL 
          THEN (v.ntsa_expiry - CURRENT_DATE)::integer 
          ELSE NULL 
        END as ntsa_days_remaining,
        CASE 
          WHEN v.insurance_expiry IS NOT NULL 
          THEN (v.insurance_expiry - CURRENT_DATE)::integer 
          ELSE NULL 
        END as insurance_days_remaining,
        CASE 
          WHEN v.psv_expiry IS NOT NULL 
          THEN (v.psv_expiry - CURRENT_DATE)::integer 
          ELSE NULL 
        END as psv_days_remaining
      FROM vehicles v
      WHERE v.sacco_id = ${req.user!.saccoId}
      AND (
        compliance_status(v.ntsa_expiry) IN ('expiring', 'overdue') OR
        compliance_status(v.insurance_expiry) IN ('expiring', 'overdue') OR
        compliance_status(v.psv_expiry) IN ('expiring', 'overdue') OR
        (v.ntsa_expiry IS NOT NULL AND (v.ntsa_expiry - CURRENT_DATE) <= 30) OR
        (v.insurance_expiry IS NOT NULL AND (v.insurance_expiry - CURRENT_DATE) <= 30) OR
        (v.psv_expiry IS NOT NULL AND (v.psv_expiry - CURRENT_DATE) <= 30)
      )
      ORDER BY 
        CASE 
          WHEN compliance_status(v.ntsa_expiry) = 'overdue' OR 
               compliance_status(v.insurance_expiry) = 'overdue' OR 
               compliance_status(v.psv_expiry) = 'overdue' 
          THEN 1
          WHEN compliance_status(v.ntsa_expiry) = 'expiring' OR 
               compliance_status(v.insurance_expiry) = 'expiring' OR 
               compliance_status(v.psv_expiry) = 'expiring' 
          THEN 2
          ELSE 3
        END,
        LEAST(
          COALESCE((v.ntsa_expiry - CURRENT_DATE), 999),
          COALESCE((v.insurance_expiry - CURRENT_DATE), 999),
          COALESCE((v.psv_expiry - CURRENT_DATE), 999)
        )
    `;

    // Group by urgency
    const overdue = [];
    const expiring_soon = [];
    const upcoming = [];

    for (const vehicle of result) {
      const docStatuses = [
        { type: 'ntsa', status: vehicle.ntsa_status, days: vehicle.ntsa_days_remaining },
        { type: 'insurance', status: vehicle.insurance_status, days: vehicle.insurance_days_remaining },
        { type: 'psv', status: vehicle.psv_status, days: vehicle.psv_days_remaining }
      ];

      for (const doc of docStatuses) {
        if (doc.status === 'overdue') {
          overdue.push({
            vehicle,
            doc_type: doc.type,
            days_remaining: doc.days,
            urgency: 'overdue'
          });
        } else if (doc.status === 'expiring' || (doc.days !== null && doc.days <= 14)) {
          expiring_soon.push({
            vehicle,
            doc_type: doc.type,
            days_remaining: doc.days,
            urgency: 'expiring'
          });
        } else if (doc.days !== null && doc.days > 14 && doc.days <= 30) {
          upcoming.push({
            vehicle,
            doc_type: doc.type,
            days_remaining: doc.days,
            urgency: 'upcoming'
          });
        }
      }
    }

    res.json({
      overdue,
      expiring_soon,
      upcoming,
      summary: {
        total_alerts: overdue.length + expiring_soon.length + upcoming.length,
        overdue_count: overdue.length,
        expiring_count: expiring_soon.length,
        upcoming_count: upcoming.length
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/alerts/send
router.post('/send', async (req, res) => {
  try {
    const { vehicle_id, doc_type } = req.body;

    if (!vehicle_id || !doc_type) {
      return res.status(400).json({ error: 'vehicle_id and doc_type are required' });
    }

    if (!['ntsa', 'insurance', 'psv'].includes(doc_type)) {
      return res.status(400).json({ error: 'Invalid doc_type' });
    }

    // Get vehicle details
    const vehicleResult = await sql`
      SELECT * FROM vehicles 
      WHERE id = ${vehicle_id} AND sacco_id = ${req.user!.saccoId}
    `;

    if (vehicleResult.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = vehicleResult[0];
    
    // Get expiry date for the document type
    const expiryField = doc_type === 'ntsa' ? 'ntsa_expiry' : 
                       doc_type === 'insurance' ? 'insurance_expiry' : 'psv_expiry';
    const expiryDate = vehicle[expiryField];

    if (!expiryDate) {
      return res.status(400).json({ error: 'No expiry date set for this document type' });
    }

    // Import and use AT utilities
    const { sendSMS, logSMS } = await import('@nairobi-move/utils');
    
    const message = `FleetPulse: ${vehicle.plate_number} ${doc_type.toUpperCase()} expires on ${expiryDate.toISOString().split('T')[0]}. Reply DONE [details] when renewed.`;

    // Send SMS to driver
    await sendSMS(vehicle.driver_phone, message);
    
    // Log the SMS
    await logSMS(sql, 'fleetpulse', 'outbound', vehicle.driver_phone, message, vehicle.id);

    // Insert compliance event
    await sql`
      INSERT INTO compliance_events (vehicle_id, doc_type, event_type, notes)
      VALUES (${vehicle_id}, ${doc_type}, 'reminder_sent', 'Manual reminder sent from dashboard')
    `;

    res.json({ 
      message: 'Reminder sent successfully',
      vehicle: vehicle.plate_number,
      doc_type,
      driver_phone: vehicle.driver_phone
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
