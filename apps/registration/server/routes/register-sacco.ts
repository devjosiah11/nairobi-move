import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for SACCO registration
const saccoRegistrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/register/sacco - Public SACCO registration
router.post('/', saccoRegistrationLimit, async (req, res) => {
  try {
    const { 
      name, 
      owner_name, 
      phone_number, 
      county, 
      physical_address 
    } = req.body;

    // Validate required fields
    if (!name || !owner_name || !phone_number || !county) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'owner_name', 'phone_number', 'county']
      });
    }

    // Validate phone number format
    const phoneRegex = /^(\+254|0)?[17]\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Invalid Kenyan phone number format' });
    }

    // Normalize phone number to +254 format
    const normalizedPhone = phone_number.startsWith('+') 
      ? phone_number 
      : phone_number.startsWith('0') 
        ? `+254${phone_number.substring(1)}`
        : `+254${phone_number}`;

    // Check if phone number already exists
    const existing = await sql`
      SELECT id FROM saccos WHERE phone_number = ${normalizedPhone}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'SACCO with this phone number already exists' 
      });
    }

    // Check if SACCO name already exists
    const existingName = await sql`
      SELECT id FROM saccos WHERE name = ${name}
    `;
    
    if (existingName.length > 0) {
      return res.status(409).json({ 
        error: 'SACCO with this name already exists' 
      });
    }

    // Generate unique SACCO ID
    const saccoId = `sacco-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Insert SACCO
    const result = await sql`
      INSERT INTO saccos (id, name, owner_name, phone_number, county, physical_address)
      VALUES (${saccoId}, ${name}, ${owner_name}, ${normalizedPhone}, ${county}, ${physical_address})
      RETURNING id, name, owner_name, phone_number, county, created_at
    `;

    const sacco = result[0];

    // Send welcome SMS
    const welcomeMessage = `Karibu NairobiMove, ${owner_name}! Your SACCO "${name}" is registered.
Login to manage your fleet: https://sacco.nairobi-move.co.ke
Phone: ${normalizedPhone}
Default password: your phone number
Change it after first login.

Need help? Call support.`;

    try {
      await sendSMS(normalizedPhone, welcomeMessage);
      await logSMS(sql, 'registration', 'outbound', normalizedPhone, welcomeMessage);
    } catch (smsError) {
      console.error('Failed to send welcome SMS:', smsError);
      // Don't fail the registration if SMS fails
    }

    // Notify FleetPulse about new SACCO (if webhook URL is configured)
    const webhookUrl = process.env.FLEET_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FLEET_WEBHOOK_SECRET || 'default-secret'}`
          },
          body: JSON.stringify({
            event: 'sacco_registered',
            sacco: {
              id: sacco.id,
              name: sacco.name,
              owner_name: sacco.owner_name,
              phone_number: sacco.phone_number,
              county: sacco.county
            }
          })
        });
        
        if (!response.ok) {
          console.error('Failed to notify FleetPulse:', response.statusText);
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    res.status(201).json({ 
      message: 'SACCO registered successfully',
      sacco: {
        id: sacco.id,
        name: sacco.name,
        owner_name: sacco.owner_name,
        phone_number: sacco.phone_number,
        county: sacco.county,
        created_at: sacco.created_at
      }
    });
  } catch (error) {
    console.error('SACCO registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/register/sacco/validate - Validate registration data
router.post('/validate', async (req, res) => {
  try {
    const { name, phone_number } = req.body;

    const checks = {};

    // Check phone number
    if (phone_number) {
      const phoneRegex = /^(\+254|0)?[17]\d{8}$/;
      if (!phoneRegex.test(phone_number)) {
        checks.phone_number = { valid: false, error: 'Invalid Kenyan phone number format' };
      } else {
        const normalizedPhone = phone_number.startsWith('+') 
          ? phone_number 
          : phone_number.startsWith('0') 
            ? `+254${phone_number.substring(1)}`
            : `+254${phone_number}`;

        const existingPhone = await sql`
          SELECT id FROM saccos WHERE phone_number = ${normalizedPhone}
        `;
        
        checks.phone_number = { 
          valid: existingPhone.length === 0, 
          error: existingPhone.length > 0 ? 'Phone number already registered' : null 
        };
      }
    }

    // Check SACCO name
    if (name) {
      const existingName = await sql`
        SELECT id FROM saccos WHERE name = ${name}
      `;
      
      checks.name = { 
        valid: existingName.length === 0, 
        error: existingName.length > 0 ? 'SACCO name already registered' : null 
      };
    }

    const isValid = Object.values(checks).every(check => check.valid);

    res.json({ 
      valid: isValid,
      checks 
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
