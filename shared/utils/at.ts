import AfricasTalking from 'africastalking';

const apiKey = process.env.AT_API_KEY || 'sandbox';
const username = process.env.AT_USERNAME || 'sandbox';

const at = AfricasTalking({ apiKey, username });

export const atSMS = at.SMS;
export const atVoice = at.VOICE;
export const atAirtime = at.AIRTIME;

export default at;

// Usage in any server:
// import { atSMS } from '@nairobi-move/utils';
// await atSMS.send({ to: [phone], message: 'Hello', from: process.env.AT_SHORTCODE });
