import { sql } from '@nairobi-move/db';
import { sendAirtime } from './at-mock.js';

export type IncentiveReason =
  | 'spot_check'
  | 'anomaly_match'
  | 'daily_clean'
  | 'weekly_clean';

/**
 * Pay airtime and log to `incentives`. Returns the created row's id, or null
 * if the airtime send failed (DB write is skipped on send failure so we don't
 * over-report incentives).
 */
export async function payIncentive(opts: {
  recipientPhone: string;
  role: 'conductor' | 'passenger';
  amountKES: number;
  reason: IncentiveReason;
  relatedId?: string;
}): Promise<string | null> {
  try {
    await sendAirtime(opts.recipientPhone, opts.amountKES);
  } catch (err) {
    console.error('[incentive] airtime send failed:', err);
    return null;
  }

  const rows = (await sql`
    INSERT INTO incentives
      (recipient_phone, recipient_role, airtime_kes, reason, related_id, paid_at)
    VALUES
      (${opts.recipientPhone}, ${opts.role}, ${opts.amountKES},
       ${opts.reason}, ${opts.relatedId ?? null}, NOW())
    RETURNING id
  `) as any[];

  return rows[0]?.id ?? null;
}
