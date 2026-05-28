import { atSMS, atVoice, atAirtime } from './at.js';

/**
 * Send SMS to one or multiple phone numbers
 * @param to - Phone number(s) to send to
 * @param message - Message content
 */
export async function sendSMS(to: string | string[], message: string): Promise<void> {
  try {
    const options = {
      to: Array.isArray(to) ? to : [to],
      message,
      from: process.env.AT_SENDER_ID || process.env.AT_SHORTCODE || 'NairobiMove',
    };

    await atSMS.send(options);
    console.log(`SMS sent to ${Array.isArray(to) ? to.length : 1} recipient(s)`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error(`SMS sending failed: ${error}`);
  }
}

/**
 * Make voice call to phone number
 * @param to - Phone number to call
 */
export async function makeVoiceCall(to: string): Promise<void> {
  try {
    const options = {
      to,
      from: process.env.AT_SHORTCODE || 'NairobiMove',
    };

    await atVoice.call(options);
    console.log(`Voice call initiated to ${to}`);
  } catch (error) {
    console.error('Failed to make voice call:', error);
    throw new Error(`Voice call failed: ${error}`);
  }
}

/**
 * Send airtime to phone number
 * @param phoneNumber - Phone number to send airtime to
 * @param amountKES - Amount in Kenyan Shillings
 */
export async function sendAirtime(phoneNumber: string, amountKES: number): Promise<void> {
  try {
    const options = {
      recipients: [
        {
          phoneNumber,
          amount: `KES ${amountKES}`,
        },
      ],
    };

    await atAirtime.send(options);
    console.log(`Airtime of KES ${amountKES} sent to ${phoneNumber}`);
  } catch (error) {
    console.error('Failed to send airtime:', error);
    throw new Error(`Airtime sending failed: ${error}`);
  }
}

/**
 * Log SMS message to database
 * @param sql - SQL client from @nairobi-move/db
 * @param service - Service name (e.g., 'sacco-dashboard', 'boda-dispatch')
 * @param direction - 'inbound' or 'outbound'
 * @param phone - Phone number
 * @param message - Message content
 * @param relatedId - Optional related entity ID
 */
export async function logSMS(
  sql: any,
  service: string,
  direction: 'inbound' | 'outbound',
  phone: string,
  message: string,
  relatedId?: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO sms_logs (service, direction, phone_number, message, related_id, created_at)
      VALUES (${service}, ${direction}, ${phone}, ${message}, ${relatedId}, NOW())
    `;
    console.log(`SMS logged: ${service} ${direction} to ${phone}`);
  } catch (error) {
    console.error('Failed to log SMS:', error);
    // Don't throw error - logging failure shouldn't break the main flow
  }
}

/**
 * Send SMS with automatic logging
 * @param sql - SQL client from @nairobi-move/db
 * @param service - Service name
 * @param to - Phone number(s)
 * @param message - Message content
 * @param relatedId - Optional related entity ID
 */
export async function sendSMSWithLog(
  sql: any,
  service: string,
  to: string | string[],
  message: string,
  relatedId?: string
): Promise<void> {
  try {
    await sendSMS(to, message);
    await logSMS(sql, service, 'outbound', Array.isArray(to) ? to[0] : to, message, relatedId);
  } catch (error) {
    console.error('Failed to send SMS with logging:', error);
    throw error;
  }
}
