import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import ussdRouter from './routes/ussd.js';
import smsRouter from './routes/sms.js';

const app = express();
const PORT = Number(process.env.PORT ?? 3005);

app.use(cors());
app.use(express.urlencoded({ extended: true }));  // AT posts form-urlencoded
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'waybill',
    mock_at: process.env.MOCK_AT !== 'false',
    time: new Date().toISOString(),
  });
});

app.use('/api/ussd', ussdRouter);
app.use('/api/sms', smsRouter);

app.listen(PORT, () => {
  console.log(`[waybill] listening on :${PORT}`);
  console.log(`[waybill] MOCK_AT=${process.env.MOCK_AT !== 'false' ? 'true' : 'false'}`);
  console.log(`[waybill] USSD endpoint: POST http://localhost:${PORT}/api/ussd`);
});
