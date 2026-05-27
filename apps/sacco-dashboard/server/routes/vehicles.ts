import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/vehicles
router.get('/', async (req, res) => {
  try {
    const result = await sql`
      SELECT 
        v.*,
        compliance_status(v.ntsa_expiry) as ntsa_status,
        compliance_status(v.insurance_expiry) as insurance_status,
        compliance_status(v.psv_expiry) as psv_status,
        CASE 
          WHEN compliance_status(v.ntsa_expiry) = 'overdue' OR 
               compliance_status(v.insurance_expiry) = 'overdue' OR 
               compliance_status(v.psv_expiry) = 'overdue' 
          THEN 'overdue'
          WHEN compliance_status(v.ntsa_expiry) = 'expiring' OR 
               compliance_status(v.insurance_expiry) = 'expiring' OR 
               compliance_status(v.psv_expiry) = 'expiring' 
          THEN 'expiring'
          ELSE 'compliant'
        END as overall_status,
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
      ORDER BY v.created_at DESC
    `;

    res.json({ vehicles: result });
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/vehicles/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get vehicle details
    const vehicleResult = await sql`
      SELECT 
        v.*,
        compliance_status(v.ntsa_expiry) as ntsa_status,
        compliance_status(v.insurance_expiry) as insurance_status,
        compliance_status(v.psv_expiry) as psv_status,
        CASE 
          WHEN compliance_status(v.ntsa_expiry) = 'overdue' OR 
               compliance_status(v.insurance_expiry) = 'overdue' OR 
               compliance_status(v.psv_expiry) = 'overdue' 
          THEN 'overdue'
          WHEN compliance_status(v.ntsa_expiry) = 'expiring' OR 
               compliance_status(v.insurance_expiry) = 'expiring' OR 
               compliance_status(v.psv_expiry) = 'expiring' 
          THEN 'expiring'
          ELSE 'compliant'
        END as overall_status,
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
      WHERE v.id = ${id} AND v.sacco_id = ${req.user!.saccoId}
    `;

    if (vehicleResult.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = vehicleResult[0];

    // Get compliance events
    const eventsResult = await sql`
      SELECT * FROM compliance_events
      WHERE vehicle_id = ${id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // Get SMS logs
    const smsResult = await sql`
      SELECT * FROM sms_logs
      WHERE related_id = ${id}
      ORDER BY created_at DESC
      LIMIT 30
    `;

    res.json({
      vehicle,
      compliance_events: eventsResult,
      sms_logs: smsResult
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vehicles
router.post('/', async (req, res) => {
  try {
    const { 
      plate_number, 
      vehicle_type, 
      driver_name, 
      driver_phone, 
      ntsa_expiry, 
      insurance_expiry, 
      psv_expiry 
    } = req.body;

    if (!plate_number || !vehicle_type || !driver_name || !driver_phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if plate already exists
    const existing = await sql`
      SELECT id FROM vehicles WHERE plate_number = ${plate_number.toUpperCase()}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Vehicle with this plate number already exists' });
    }

    const result = await sql`
      INSERT INTO vehicles (
        sacco_id, plate_number, vehicle_type, driver_name, driver_phone,
        ntsa_expiry, insurance_expiry, psv_expiry
      ) VALUES (
        ${req.user!.saccoId}, ${plate_number.toUpperCase()}, ${vehicle_type}, 
        ${driver_name}, ${driver_phone}, 
        ${ntsa_expiry || null}, ${insurance_expiry || null}, ${psv_expiry || null}
      )
      RETURNING *
    `;

    res.status(201).json({ vehicle: result[0] });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/vehicles/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      plate_number, 
      vehicle_type, 
      driver_name, 
      driver_phone, 
      ntsa_expiry, 
      insurance_expiry, 
      psv_expiry 
    } = req.body;

    // Check if vehicle belongs to this sacco
    const existing = await sql`
      SELECT id FROM vehicles WHERE id = ${id} AND sacco_id = ${req.user!.saccoId}
    `;
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if new plate conflicts with another vehicle
    if (plate_number) {
      const plateCheck = await sql`
        SELECT id FROM vehicles 
        WHERE plate_number = ${plate_number.toUpperCase()} AND id != ${id}
      `;
      
      if (plateCheck.length > 0) {
        return res.status(409).json({ error: 'Vehicle with this plate number already exists' });
      }
    }

    const result = await sql`
      UPDATE vehicles 
      SET 
        plate_number = COALESCE(${plate_number}, plate_number),
        vehicle_type = COALESCE(${vehicle_type}, vehicle_type),
        driver_name = COALESCE(${driver_name}, driver_name),
        driver_phone = COALESCE(${driver_phone}, driver_phone),
        ntsa_expiry = COALESCE(${ntsa_expiry}, ntsa_expiry),
        insurance_expiry = COALESCE(${insurance_expiry}, insurance_expiry),
        psv_expiry = COALESCE(${psv_expiry}, psv_expiry),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({ vehicle: result[0] });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/vehicles/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle belongs to this sacco
    const existing = await sql`
      SELECT id FROM vehicles WHERE id = ${id} AND sacco_id = ${req.user!.saccoId}
    `;
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await sql`DELETE FROM vehicles WHERE id = ${id}`;

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/vehicles/:id/renew
router.post('/:id/renew', async (req, res) => {
  try {
    const { id } = req.params;
    const { doc_type, new_expiry, notes } = req.body;

    if (!doc_type || !new_expiry) {
      return res.status(400).json({ error: 'doc_type and new_expiry are required' });
    }

    if (!['ntsa', 'insurance', 'psv'].includes(doc_type)) {
      return res.status(400).json({ error: 'Invalid doc_type' });
    }

    // Check if vehicle belongs to this sacco
    const existing = await sql`
      SELECT id FROM vehicles WHERE id = ${id} AND sacco_id = ${req.user!.saccoId}
    `;
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Update the relevant expiry date
    const updateField = doc_type === 'ntsa' ? 'ntsa_expiry' : 
                       doc_type === 'insurance' ? 'insurance_expiry' : 'psv_expiry';

    const result = await sql`
      UPDATE vehicles 
      SET ${sql(updateField)} = ${new_expiry}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    // Insert compliance event
    await sql`
      INSERT INTO compliance_events (vehicle_id, doc_type, event_type, notes)
      VALUES (${id}, ${doc_type}, 'renewed', ${notes || 'Document renewed'})
    `;

    res.json({ vehicle: result[0] });
  } catch (error) {
    console.error('Renew vehicle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
