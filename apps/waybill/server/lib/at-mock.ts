/**
 * Wrapper around Africa's Talking SDK. When MOCK_AT=true (default in dev),
 * sends are logged to stdout instead of hitting the AT API. This lets the
 * conductor USSD + reconciliation flow run end-to-end without credentials.
 */

const MOCK = process.env.MOCK_AT !== 'false';

type SendResult = { mocked: boolean; to: string; payload: unknown };

let realSMS: any = null;
let realVoice: any = null;
let realAirtime: any = null;

if (!MOCK) {
  const { atSMS, atVoice, atAirtime } = await import('@nairobi-move/utils');
  realSMS = atSMS;
  realVoice = atVoice;
  realAirtime = atAirtime;
}

export async function sendSMS(to: string, message: string): Promise<SendResult> {
  if (MOCK) {
    console.log(`[MOCK SMS] → ${to}\n         ${message.replace(/\n/g, '\n         ')}`);
    return { mocked: true, to, payload: { message } };
  }
  try {
    // In AT sandbox, omit `from` and AT uses its default sender ID.
    // In production, pass an approved shortcode/sender ID via AT_SHORTCODE.
    const sendArgs: { to: string[]; message: string; from?: string } = {
      to: [to],
      message,
    };
    if (process.env.AT_USERNAME && process.env.AT_USERNAME !== 'sandbox' && process.env.AT_SHORTCODE) {
      sendArgs.from = process.env.AT_SHORTCODE;
    }
    const result = await realSMS.send(sendArgs);
    console.log(`[AT SMS] → ${to}: ${JSON.stringify(result)}`);
    return { mocked: false, to, payload: { message, result } };
  } catch (err: any) {
    console.error(`[AT SMS] FAILED → ${to}:`, err?.message ?? err);
    throw err;
  }
}

export async function makeVoiceCall(to: string): Promise<SendResult> {
  if (MOCK) {
    console.log(`[MOCK VOICE] → calling ${to}`);
    return { mocked: true, to, payload: {} };
  }
  await realVoice.call({ to, from: process.env.AT_SHORTCODE });
  return { mocked: false, to, payload: {} };
}

export async function sendAirtime(to: string, amountKES: number): Promise<SendResult> {
  if (MOCK) {
    console.log(`[MOCK AIRTIME] → ${to} KES ${amountKES}`);
    return { mocked: true, to, payload: { amountKES } };
  }
  try {
    const result = await realAirtime.send({
      recipients: [
        { phoneNumber: to, currencyCode: 'KES', amount: amountKES },
      ],
    });
    console.log(`[AT AIRTIME] → ${to} KES ${amountKES}: ${JSON.stringify(result)}`);
    return { mocked: false, to, payload: { amountKES, result } };
  } catch (err: any) {
    console.error(`[AT AIRTIME] FAILED → ${to}:`, err?.message ?? err);
    throw err;
  }
}
