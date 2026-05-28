import { sql } from '@nairobi-move/db';

/** Write a row to the shared sms_logs table. Never throws. */
export async function logSMS(
  direction: 'inbound' | 'outbound',
  phone: string,
  message: string,
  relatedId?: string,
): Promise<void> {
  try {
    await sql`
      INSERT INTO sms_logs (service, direction, phone_number, message, related_id, created_at)
      VALUES ('waybill', ${direction}, ${phone}, ${message}, ${relatedId ?? null}, NOW())
    `;
  } catch (err) {
    console.error('[waybill] logSMS failed:', err);
  }
}
