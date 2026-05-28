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
  await realSMS.send({ to: [to], message, from: process.env.AT_SHORTCODE });
  return { mocked: false, to, payload: { message } };
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
  await realAirtime.send({
    recipients: [{ phoneNumber: to, amount: `KES ${amountKES}` }],
  });
  return { mocked: false, to, payload: { amountKES } };
}
