import cron from 'node-cron';
import { sql } from '@nairobi-move/db';
import { sendSMS, makeVoiceCall, logSMS } from '@nairobi-move/utils';

export async function runReminderCron(): Promise<void> {
  console.log('[reminder-cron] running compliance check...');
  
  try {
    const today = new Date();
    let remindersSent = 0;
    let callsMade = 0;

    // Get all vehicles with their SACCO info
    const vehicles = await sql`
      SELECT 
        v.*,
        s.name as sacco_name,
        s.phone_number as sacco_phone
      FROM vehicles v
      JOIN saccos s ON v.sacco_id = s.id
    `;

    for (const vehicle of vehicles) {
      const docs = [
        { type: 'ntsa', expiry: vehicle.ntsa_expiry },
        { type: 'insurance', expiry: vehicle.insurance_expiry },
        { type: 'psv', expiry: vehicle.psv_expiry }
      ];

      for (const doc of docs) {
        if (!doc.expiry) continue;

        const daysUntilExpiry = Math.ceil((doc.expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        // Check if we should send reminder (30, 14, 7, 1 days before expiry)
        if ([30, 14, 7, 1].includes(daysUntilExpiry)) {
          const message = `FleetPulse: ${vehicle.plate_number} ${doc.type.toUpperCase()} expires in ${daysUntilExpiry} days (${doc.expiry.toISOString().split('T')[0]}). Reply DONE [insurer/inspector] when renewed.`;

          try {
            // Send to driver
            await sendSMS(vehicle.driver_phone, message);
            await logSMS(sql, 'fleetpulse', 'outbound', vehicle.driver_phone, message, vehicle.id);

            // Send to SACCO owner
            await sendSMS(vehicle.sacco_phone, message);
            await logSMS(sql, 'fleetpulse', 'outbound', vehicle.sacco_phone, message, vehicle.id);

            // Log compliance event
            await sql`
              INSERT INTO compliance_events (vehicle_id, doc_type, event_type, days_before, notes)
              VALUES (${vehicle.id}, ${doc.type}, 'reminder_sent', ${daysUntilExpiry}, ${`Automated reminder: ${daysUntilExpiry} days before expiry`})
            `;

            remindersSent += 2; // Count both SMS sent
            console.log(`[reminder-cron] Sent ${doc.type} reminder for ${vehicle.plate_number} (${daysUntilExpiry} days)`);
          } catch (error) {
            console.error(`[reminder-cron] Failed to send reminder for ${vehicle.plate_number} ${doc.type}:`, error);
          }
        }

        // Check if overdue (1 day past expiry) and no overdue call today
        if (daysUntilExpiry === -1) {
          const existingCall = await sql`
            SELECT id FROM compliance_events 
            WHERE vehicle_id = ${vehicle.id} 
            AND doc_type = ${doc.type}
            AND event_type = 'overdue_call'
            AND DATE(created_at) = CURRENT_DATE
          `;

          if (existingCall.length === 0) {
            try {
              await makeVoiceCall(vehicle.sacco_phone);
              
              await sql`
                INSERT INTO compliance_events (vehicle_id, doc_type, event_type, days_before, notes)
                VALUES (${vehicle.id}, ${doc.type}, 'overdue_call', ${daysUntilExpiry}, ${`Automated overdue call: ${doc.type} expired yesterday`})
              `;

              callsMade += 1;
              console.log(`[reminder-cron] Made overdue call to ${vehicle.sacco_name} for ${vehicle.plate_number} ${doc.type}`);
            } catch (error) {
              console.error(`[reminder-cron] Failed to make overdue call for ${vehicle.plate_number} ${doc.type}:`, error);
            }
          }
        }
      }
    }

    console.log(`[reminder-cron] Complete: ${remindersSent} reminders sent, ${callsMade} calls made`);
  } catch (error) {
    console.error('[reminder-cron] Error:', error);
  }
}

// Schedule the cron job to run daily at 7:00 AM EAT (04:00 UTC)
export function startReminderCron(): void {
  cron.schedule('0 4 * * *', async () => {
    await runReminderCron();
  });
  
  console.log('[reminder-cron] Scheduled to run daily at 7:00 AM EAT (04:00 UTC)');
}
