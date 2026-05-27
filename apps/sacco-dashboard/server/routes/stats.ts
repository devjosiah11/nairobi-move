import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/stats (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const saccoId = req.user!.saccoId;

    // Get basic vehicle counts
    const vehicleStats = await sql`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN 
          compliance_status(ntsa_expiry) = 'compliant' AND 
          compliance_status(insurance_expiry) = 'compliant' AND 
          compliance_status(psv_expiry) = 'compliant'
        THEN 1 END) as compliant_count,
        COUNT(CASE WHEN 
          compliance_status(ntsa_expiry) = 'expiring' OR 
          compliance_status(insurance_expiry) = 'expiring' OR 
          compliance_status(psv_expiry) = 'expiring'
        THEN 1 END) as expiring_count,
        COUNT(CASE WHEN 
          compliance_status(ntsa_expiry) = 'overdue' OR 
          compliance_status(insurance_expiry) = 'overdue' OR 
          compliance_status(psv_expiry) = 'overdue'
        THEN 1 END) as overdue_count
      FROM vehicles 
      WHERE sacco_id = ${saccoId}
    `;

    // Get compliance events this month
    const complianceEvents = await sql`
      SELECT 
        COUNT(CASE WHEN event_type = 'reminder_sent' THEN 1 END) as reminders_sent_this_month,
        COUNT(CASE WHEN event_type = 'renewed' THEN 1 END) as renewals_this_month
      FROM compliance_events ce
      JOIN vehicles v ON ce.vehicle_id = v.id
      WHERE v.sacco_id = ${saccoId}
      AND ce.created_at >= date_trunc('month', CURRENT_DATE)
    `;

    const stats = {
      ...vehicleStats[0],
      ...complianceEvents[0]
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/stats/public (no auth)
router.get('/public', async (req, res) => {
  try {
    // Get aggregate public stats
    const saccoStats = await sql`
      SELECT COUNT(*) as total_saccos FROM saccos
    `;

    const vehicleStats = await sql`
      SELECT COUNT(*) as total_vehicles FROM vehicles
    `;

    const reminderStats = await sql`
      SELECT COUNT(*) as reminders_sent_total 
      FROM compliance_events 
      WHERE event_type = 'reminder_sent'
    `;

    const stats = {
      total_saccos: parseInt(saccoStats[0].total_saccos),
      total_vehicles: parseInt(vehicleStats[0].total_vehicles),
      reminders_sent_total: parseInt(reminderStats[0].reminders_sent_total)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
