import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

// USSD Handler - Africa's Talking USSD API
router.post('/', async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    console.log(`[USSD] Session: ${sessionId}, Phone: ${phoneNumber}, Text: "${text}"`);

    // Normalize phone number
    const normalizedPhone = phoneNumber.startsWith('+') 
      ? phoneNumber 
      : `+254${phoneNumber.replace(/^0/, '')}`;

    // Parse USSD input
    const textArray = text ? text.split('*').filter(Boolean) : [];
    const level = textArray.length;

    // Get or create USSD session
    let session = await sql`
      SELECT * FROM ussd_sessions 
      WHERE session_id = ${sessionId}
    `;

    if (session.length === 0) {
      // Create new session
      await sql`
        INSERT INTO ussd_sessions (session_id, phone_number, state, created_at, updated_at)
        VALUES (${sessionId}, ${normalizedPhone}, 'MAIN', NOW(), NOW())
      `;
      session = await sql`
        SELECT * FROM ussd_sessions 
        WHERE session_id = ${sessionId}
      `;
    } else {
      // Update session
      await sql`
        UPDATE ussd_sessions 
        SET updated_at = NOW()
        WHERE session_id = ${sessionId}
      `;
    }

    let response = '';

    switch (level) {
      case 0:
        // Main menu
        response = `CON Karibu NairobiMove MatatuPulse!
1. Report Traffic
2. Find Matatu
3. Report Incident
4. Emergency SOS
5. My Account`;
        break;

      case 1:
        switch (textArray[0]) {
          case '1':
            // Report Traffic
            response = `CON Report Traffic:
1. Heavy Traffic
2. Light Traffic
3. Clear Road
4. Accident
5. Police Check`;
            break;

          case '2':
            // Find Matatu
            response = `CON Find Matatu:
Enter route number (e.g. 11, 125, 44)`;
            break;

          case '3':
            // Report Incident
            response = `CON Report Incident:
1. Breakdown
2. Accident
3. Police Harassment
4. Robbery
5. Other`;
            break;

          case '4':
            // Emergency SOS
            await handleEmergencySOS(normalizedPhone, res);
            return;

          case '5':
            // My Account
            await handleAccountMenu(normalizedPhone, textArray, res);
            return;

          default:
            response = `END Invalid selection. Try again.`;
        }
        break;

      case 2:
        if (textArray[0] === '1') {
          // Traffic report details
          await handleTrafficReport(normalizedPhone, textArray[1], res);
          return;
        } else if (textArray[0] === '2') {
          // Find matatu by route
          await handleFindMatatu(normalizedPhone, textArray[1], res);
          return;
        } else if (textArray[0] === '3') {
          // Incident report details
          await handleIncidentReport(normalizedPhone, textArray[1], res);
          return;
        }
        break;

      default:
        response = `END Invalid input. Please start again.`;
    }

    // Set response headers for Africa's Talking USSD
    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    console.error('USSD error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Service temporarily unavailable. Please try again later.');
  }
});

async function handleEmergencySOS(phoneNumber: string, res: any) {
  try {
    // Create SOS record
    await sql`
      INSERT INTO commuter_sos (phone_number, status, created_at)
      VALUES (${phoneNumber}, 'active', NOW())
    `;

    // Get user location if available
    const userResult = await sql`
      SELECT full_name FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    const userName = userResult.length > 0 ? userResult[0].full_name : 'Commuter';

    // Send emergency SMS to contacts (if configured)
    const emergencyContacts = process.env.EMERGENCY_CONTACTS?.split(',') || [];
    
    for (const contact of emergencyContacts) {
      const message = `EMERGENCY SOS: ${userName} (${phoneNumber}) needs immediate help!
Location: Unknown (user on USSD)
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
Stay calm and safe. Emergency contacts notified.`;
    
    try {
      await sendSMS(phoneNumber, confirmationMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, confirmationMessage);
    } catch (error) {
      console.error('Failed to send SOS confirmation:', error);
    }

    res.set('Content-Type', 'text/plain');
    res.send('END Emergency SOS activated! Help is on the way. Stay safe.');
  } catch (error) {
    console.error('Emergency SOS error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Failed to activate SOS. Please call emergency services directly.');
  }
}

async function handleTrafficReport(phoneNumber: string, trafficType: string, res: any) {
  try {
    const trafficLabels = {
      '1': 'Heavy Traffic',
      '2': 'Light Traffic', 
      '3': 'Clear Road',
      '4': 'Accident',
      '5': 'Police Check'
    };

    const label = trafficLabels[trafficType] || 'Unknown';
    
    // Create traffic report
    await sql`
      INSERT INTO traffic_reports (phone_number, report_type, status, created_at)
      VALUES (${phoneNumber}, ${label}, 'active', NOW())
    `;

    // Send confirmation SMS
    const message = `Thank you! Traffic report received: ${label}.
This helps other commuters avoid delays.
Stay safe!`;
    
    try {
      await sendSMS(phoneNumber, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, message);
    } catch (error) {
      console.error('Failed to send traffic confirmation:', error);
    }

    res.set('Content-Type', 'text/plain');
    res.send(`END Traffic report submitted: ${label}. Thank you for helping others!`);
  } catch (error) {
    console.error('Traffic report error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Failed to submit report. Please try again.');
  }
}

async function handleFindMatatu(phoneNumber: string, routeNumber: string, res: any) {
  try {
    // Find active matatus on this route
    const matatusResult = await sql`
      SELECT 
        v.plate_number,
        v.driver_name,
        v.current_location,
        s.name as stage_name,
        v.last_updated
      FROM vehicles v
      JOIN stages s ON v.current_stage_id = s.id
      WHERE v.route_number = ${routeNumber.toUpperCase()}
      AND v.is_active = true
      AND v.last_updated >= NOW() - INTERVAL '30 minutes'
      ORDER BY v.last_updated DESC
      LIMIT 5
    `;

    if (matatusResult.length === 0) {
      res.set('Content-Type', 'text/plain');
      res.send(`END No active matatus found on route ${routeNumber.toUpperCase()}.
Try again later or check a different route.`);
      return;
    }

    // Format response
    let response = `END Matatus on route ${routeNumber.toUpperCase()}:\n`;
    matatusResult.forEach((matatu, index) => {
      response += `${index + 1}. ${matatu.plate_number} - ${matatu.stage_name}\n`;
      response += `   Driver: ${matatu.driver_name}\n`;
      response += `   Location: ${matatu.current_location}\n\n`;
    });

    // Send detailed info via SMS
    const smsMessage = `MatatuPulse - Route ${routeNumber.toUpperCase()}:
${matatusResult.map(m => `${m.plate_number} at ${m.stage_name}`).join(', ')}
Last updated: ${new Date().toLocaleTimeString()}`;
    
    try {
      await sendSMS(phoneNumber, smsMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, smsMessage);
    } catch (error) {
      console.error('Failed to send matatu info SMS:', error);
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
  } catch (error) {
    console.error('Find matatu error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Failed to find matatus. Please try again.');
  }
}

async function handleIncidentReport(phoneNumber: string, incidentType: string, res: any) {
  try {
    const incidentLabels = {
      '1': 'Breakdown',
      '2': 'Accident',
      '3': 'Police Harassment',
      '4': 'Robbery',
      '5': 'Other'
    };

    const label = incidentLabels[incidentType] || 'Unknown';
    
    // Create incident report
    await sql`
      INSERT INTO incident_reports (phone_number, incident_type, status, created_at)
      VALUES (${phoneNumber}, ${label}, 'active', NOW())
    `;

    // Send confirmation SMS
    const message = `Incident report received: ${label}.
Thank you for reporting. Authorities will be notified if needed.
Stay safe!`;
    
    try {
      await sendSMS(phoneNumber, message);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, message);
    } catch (error) {
      console.error('Failed to send incident confirmation:', error);
    }

    res.set('Content-Type', 'text/plain');
    res.send(`END Incident reported: ${label}. Thank you for keeping others safe!`);
  } catch (error) {
    console.error('Incident report error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Failed to submit report. Please try again.');
  }
}

async function handleAccountMenu(phoneNumber: string, textArray: string[], res: any) {
  try {
    // Check if user exists
    const userResult = await sql`
      SELECT * FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    if (userResult.length === 0) {
      // New user - prompt for registration
      if (textArray.length === 1) {
        res.set('Content-Type', 'text/plain');
        res.send(`CON New user detected!
Enter your full name to register:`);
        return;
      } else if (textArray.length === 2) {
        // Register new user
        const fullName = textArray[1];
        await sql`
          INSERT INTO commuters (phone_number, full_name, created_at)
          VALUES (${phoneNumber}, ${fullName}, NOW())
        `;

        const welcomeMessage = `Welcome to MatatuPulse, ${fullName}!
You can now:
- Report traffic and incidents
- Find matatu routes
- Get emergency help
Dial *384*3133# anytime to access services.`;
        
        try {
          await sendSMS(phoneNumber, welcomeMessage);
          await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, welcomeMessage);
        } catch (error) {
          console.error('Failed to send welcome SMS:', error);
        }

        res.set('Content-Type', 'text/plain');
        res.send(`END Registration complete! Welcome ${fullName}. Check your SMS for details.`);
        return;
      }
    } else {
      // Existing user - show account info
      const user = userResult[0];
      const reportsCount = await sql`
        SELECT COUNT(*) as count FROM traffic_reports 
        WHERE phone_number = ${phoneNumber}
      `;
      
      res.set('Content-Type', 'text/plain');
      res.send(`END Account: ${user.full_name}
Reports: ${reportsCount[0].count}
Member since: ${user.created_at.toLocaleDateString()}
Thank you for using MatatuPulse!`);
      return;
    }
  } catch (error) {
    console.error('Account menu error:', error);
    res.set('Content-Type', 'text/plain');
    res.send('END Account service unavailable. Please try again.');
  }
}

export default router;
