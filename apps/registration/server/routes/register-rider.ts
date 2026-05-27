import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for rider registration
const riderRegistrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/register/rider - Public rider registration
router.post('/', riderRegistrationLimit, async (req, res) => {
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

    // Validate required fields
    if (!full_name || !phone_number || !stage_id || !plate_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['full_name', 'phone_number', 'stage_id', 'plate_number']
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

    // Check if phone or plate already exists
    const existing = await sql`
      SELECT id FROM riders 
      WHERE phone_number = ${normalizedPhone} OR plate_number = ${plate_number.toUpperCase()}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Rider with this phone number or plate number already exists' 
      });
    }

    // Validate stage exists
    const stageResult = await sql`
      SELECT name, area FROM stages WHERE id = ${stage_id}
    `;

    if (stageResult.length === 0) {
      return res.status(400).json({ error: 'Invalid stage ID' });
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
      RETURNING id, full_name, phone_number, plate_number, created_at
    `;

    const rider = result[0];

    // Send welcome SMS
    const welcomeMessage = `Karibu NairobiMove, ${full_name}! You're registered at ${stage.name}.
Text ON to go available for bookings.
Text BODA ${stage.name} to get a booking.
Text SOS for emergency help.
Stay safe!`;

    try {
      await sendSMS(normalizedPhone, welcomeMessage);
      await logSMS(sql, 'registration', 'outbound', normalizedPhone, welcomeMessage, rider.id);
    } catch (smsError) {
      console.error('Failed to send welcome SMS:', smsError);
      // Don't fail the registration if SMS fails
    }

    // Notify BodaDispatch about new rider (if webhook URL is configured)
    const webhookUrl = process.env.BODA_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.BODA_WEBHOOK_SECRET || 'default-secret'}`
          },
          body: JSON.stringify({
            event: 'rider_registered',
            rider: {
              id: rider.id,
              full_name: rider.full_name,
              phone_number: rider.phone_number,
              plate_number: rider.plate_number,
              stage_name: stage.name
            }
          })
        });
        
        if (!response.ok) {
          console.error('Failed to notify BodaDispatch:', response.statusText);
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    res.status(201).json({ 
      message: 'Rider registered successfully',
      rider: {
        id: rider.id,
        full_name: rider.full_name,
        phone_number: rider.phone_number,
        plate_number: rider.plate_number,
        stage_name: stage.name,
        created_at: rider.created_at
      }
    });
  } catch (error) {
    console.error('Rider registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/register/rider/validate - Validate registration data
router.post('/validate', async (req, res) => {
  try {
    const { phone_number, plate_number } = req.body;

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
          SELECT id FROM riders WHERE phone_number = ${normalizedPhone}
        `;
        
        checks.phone_number = { 
          valid: existingPhone.length === 0, 
          error: existingPhone.length > 0 ? 'Phone number already registered' : null 
        };
      }
    }

    // Check plate number
    if (plate_number) {
      const existingPlate = await sql`
        SELECT id FROM riders WHERE plate_number = ${plate_number.toUpperCase()}
      `;
      
      checks.plate_number = { 
        valid: existingPlate.length === 0, 
        error: existingPlate.length > 0 ? 'Plate number already registered' : null 
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
