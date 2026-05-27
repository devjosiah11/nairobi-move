import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { sendSMS, logSMS } from '@nairobi-move/utils';

const router = Router();

// SMS Handler - Africa's Talking SMS API
router.post('/incoming', async (req, res) => {
  try {
    const { from, to, text, messageId, date } = req.body;

    console.log(`[SMS] From: ${from}, To: ${to}, Message: "${text}"`);

    // Normalize phone number
    const normalizedPhone = from.startsWith('+') 
      ? from 
      : `+254${from.replace(/^0/, '')}`;

    // Parse SMS command
    const message = text.toLowerCase().trim();
    let response = '';

    // Handle different SMS commands
    if (message === 'help' || message === 'menu') {
      response = `MatatuPulse Commands:
TRAFFIC <route> - Report traffic (e.g. TRAFFIC 11 HEAVY)
FIND <route> - Find matatu (e.g. FIND 125)
SOS - Emergency help
REPORT <type> - Report incident (e.g. REPORT ACCIDENT)
STOP - Unsubscribe from alerts`;
    } else if (message === 'sos') {
      await handleSmsSOS(normalizedPhone, res);
      return;
    } else if (message.startsWith('find ')) {
      const routeNumber = message.substring(5).trim();
      await handleSmsFindMatatu(normalizedPhone, routeNumber, res);
      return;
    } else if (message.startsWith('traffic ')) {
      await handleSmsTrafficReport(normalizedPhone, message.substring(8).trim(), res);
      return;
    } else if (message.startsWith('report ')) {
      await handleSmsIncidentReport(normalizedPhone, message.substring(7).trim(), res);
      return;
    } else if (message === 'stop') {
      await handleSmsUnsubscribe(normalizedPhone, res);
      return;
    } else if (message === 'status') {
      await handleSmsStatus(normalizedPhone, res);
      return;
    } else {
      response = `Unknown command. Text HELP for commands or dial *384*3133# for USSD menu.`;
    }

    // Send response SMS
    try {
      await sendSMS(normalizedPhone, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', normalizedPhone, response);
    } catch (error) {
      console.error('Failed to send SMS response:', error);
    }

    res.json({ status: 'success', message: 'SMS processed' });
  } catch (error) {
    console.error('SMS processing error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process SMS' });
  }
});

// Delivery callback from Africa's Talking
router.post('/delivery', async (req, res) => {
  try {
    const { id, status, failureReason } = req.body;
    
    console.log(`[SMS Delivery] ID: ${id}, Status: ${status}, Reason: ${failureReason}`);
    
    // Update SMS delivery status in database
    await sql`
      UPDATE sms_logs 
      SET delivery_status = ${status}, delivery_reason = ${failureReason || null}, delivered_at = NOW()
      WHERE external_id = ${id}
    `;

    res.json({ status: 'success' });
  } catch (error) {
    console.error('SMS delivery callback error:', error);
    res.status(500).json({ status: 'error' });
  }
});

async function handleSmsSOS(phoneNumber: string, res: any) {
  try {
    // Create SOS record
    await sql`
      INSERT INTO commuter_sos (phone_number, status, created_at)
      VALUES (${phoneNumber}, 'active', NOW())
    `;

    // Get user info
    const userResult = await sql`
      SELECT full_name FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    const userName = userResult.length > 0 ? userResult[0].full_name : 'Commuter';

    // Send emergency SMS to contacts
    const emergencyContacts = process.env.EMERGENCY_CONTACTS?.split(',') || [];
    
    for (const contact of emergencyContacts) {
      const message = `EMERGENCY SOS: ${userName} (${phoneNumber}) needs immediate help!
SMS SOS activated. Please call immediately!`;
      
      try {
        await sendSMS(contact.trim(), message);
        await logSMS(sql, 'matatu-pulse', 'outbound', contact.trim(), message);
      } catch (error) {
        console.error(`Failed to send emergency SMS to ${contact}:`, error);
      }
    }

    // Send confirmation to user
    const confirmationMessage = `SOS activated! Help is on the way.
Emergency contacts notified. Stay safe.`;
    
    try {
      await sendSMS(phoneNumber, confirmationMessage);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, confirmationMessage);
    } catch (error) {
      console.error('Failed to send SOS confirmation:', error);
    }

    res.json({ status: 'success', message: 'SOS processed' });
  } catch (error) {
    console.error('SMS SOS error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process SOS' });
  }
}

async function handleSmsFindMatatu(phoneNumber: string, routeNumber: string, res: any) {
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

    let response;
    if (matatusResult.length === 0) {
      response = `No active matatus found on route ${routeNumber.toUpperCase()}.
Try again later or dial *384*3133# for more options.`;
    } else {
      response = `Route ${routeNumber.toUpperCase()} matatus:
${matatusResult.map(m => `${m.plate_number} at ${m.stage_name}`).join(', ')}
Last updated: ${new Date().toLocaleTimeString()}`;
    }
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send matatu info SMS:', error);
    }

    res.json({ status: 'success', message: 'Matatu info sent' });
  } catch (error) {
    console.error('SMS find matatu error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to find matatus' });
  }
}

async function handleSmsTrafficReport(phoneNumber: string, reportText: string, res: any) {
  try {
    // Parse traffic report (e.g. "11 HEAVY" or "ACCIDENT ON THIKA ROAD")
    const parts = reportText.split(' ');
    const routeNumber = parts[0]?.toUpperCase();
    const trafficType = parts.slice(1).join(' ').toUpperCase();

    // Create traffic report
    await sql`
      INSERT INTO traffic_reports (phone_number, report_type, route_number, status, created_at)
      VALUES (${phoneNumber}, ${trafficType || 'UNKNOWN'}, ${routeNumber}, 'active', NOW())
    `;

    const response = `Traffic report received: ${trafficType || 'UNKNOWN'} on route ${routeNumber || 'UNKNOWN'}.
Thank you for helping other commuters!`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send traffic confirmation:', error);
    }

    res.json({ status: 'success', message: 'Traffic report processed' });
  } catch (error) {
    console.error('SMS traffic report error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process traffic report' });
  }
}

async function handleSmsIncidentReport(phoneNumber: string, incidentText: string, res: any) {
  try {
    // Create incident report
    await sql`
      INSERT INTO incident_reports (phone_number, incident_type, description, status, created_at)
      VALUES (${phoneNumber}, ${incidentText.split(' ')[0] || 'OTHER'}, ${incidentText}, 'active', NOW())
    `;

    const response = `Incident report received: ${incidentText}.
Thank you for reporting. Stay safe!`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send incident confirmation:', error);
    }

    res.json({ status: 'success', message: 'Incident report processed' });
  } catch (error) {
    console.error('SMS incident report error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process incident report' });
  }
}

async function handleSmsUnsubscribe(phoneNumber: string, res: any) {
  try {
    // Update user subscription status
    await sql`
      UPDATE commuters 
      SET sms_subscribed = false, updated_at = NOW()
      WHERE phone_number = ${phoneNumber}
    `;

    const response = `You have been unsubscribed from SMS alerts.
Dial *384*3133# to reactivate or text HELP for commands.`;
    
    try {
      await sendSMS(phoneNumber, response);
      await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
    } catch (error) {
      console.error('Failed to send unsubscribe confirmation:', error);
    }

    res.json({ status: 'success', message: 'User unsubscribed' });
  } catch (error) {
    console.error('SMS unsubscribe error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to unsubscribe' });
  }
}

async function handleSmsStatus(phoneNumber: string, res: any) {
  try {
    // Get user stats
    const userResult = await sql`
      SELECT * FROM commuters WHERE phone_number = ${phoneNumber}
    `;

    if (userResult.length === 0) {
      const response = `You're not registered. Dial *384*3133# to register.`;
      
      try {
        await sendSMS(phoneNumber, response);
        await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
      } catch (error) {
        console.error('Failed to send status SMS:', error);
      }
    } else {
      const user = userResult[0];
      const reportsCount = await sql`
        SELECT COUNT(*) as count FROM traffic_reports 
        WHERE phone_number = ${phoneNumber}
      `;
      
      const response = `Account: ${user.full_name}
Reports: ${reportsCount[0].count}
Member: ${user.created_at.toLocaleDateString()}
SMS alerts: ${user.sms_subscribed ? 'Active' : 'Inactive'}`;
      
      try {
        await sendSMS(phoneNumber, response);
        await logSMS(sql, 'matatu-pulse', 'outbound', phoneNumber, response);
      } catch (error) {
        console.error('Failed to send status SMS:', error);
      }
    }

    res.json({ status: 'success', message: 'Status sent' });
  } catch (error) {
    console.error('SMS status error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get status' });
  }
}

export default router;
