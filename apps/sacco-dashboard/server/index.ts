import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Import routes
import authRouter from './routes/auth.js';
import vehiclesRouter from './routes/vehicles.js';
import alertsRouter from './routes/alerts.js';
import smsLogRouter from './routes/sms-log.js';
import saccosRouter from './routes/saccos.js';
import statsRouter from './routes/stats.js';
import ussdRouter from './routes/ussd.js';
import smsIncomingRouter from './routes/sms-incoming.js';
import { startReminderCron } from './jobs/reminder-cron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL || 'https://sacco-production-1ad8.up.railway.app',
      'https://matatu-pulse-production.up.railway.app',
      'https://boda-dispach-production.up.railway.app',
      'https://registeration-production.up.railway.app',
    ]
  : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:5176', 'http://localhost:5174', 'http://localhost:5175'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true
};

// AT callback routes — open CORS BEFORE general cors middleware
app.options('/api/ussd', cors({ origin: '*' }));
app.use('/api/ussd', cors({ origin: '*' }));
app.options('/api/fleet-sms', cors({ origin: '*' }));
app.use('/api/fleet-sms', cors({ origin: '*' }));
app.options('/api/stats/public', cors({ origin: '*' }));
app.use('/api/stats/public', cors({ origin: '*' }));

app.use(cors(corsOptions));

// urlencoded MUST come before json — AT POSTs form-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/sms-log', smsLogRouter);
app.use('/api/saccos', saccosRouter);
app.use('/api/stats', statsRouter);
app.use('/api/ussd', ussdRouter);
app.use('/api/fleet-sms', smsIncomingRouter);

// Debug: test SMS send — GET /api/debug/sms
app.get('/api/debug/sms', async (req, res) => {
  const to = '+254740717201';
  const sender = process.env.AT_SENDER_ID || process.env.AT_SHORTCODE;
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY?.slice(0, 12) + '...';
  try {
    const { atSMS } = await import('@nairobi-move/utils');
    const result = await (atSMS as any).send({
      to: [to],
      message: 'FleetPulse debug: SMS working!',
      from: sender,
    });
    res.json({ ok: true, result, sender, username, apiKey });
  } catch (e: any) {
    res.json({ ok: false, error: e?.message, sender, username, apiKey, stack: e?.response?.data ?? e?.stack?.slice(0, 400) });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    service: 'sacco-dashboard', 
    status: 'ok', 
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve frontend (production: from dist/, dev: Vite handles it)
const distPath = path.join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({ service: 'FleetPulse (SACCO Dashboard) API', status: 'running', endpoints: { health: '/api/health', vehicles: '/api/vehicles', saccos: '/api/saccos' } });
  });
}

// Start reminder cron job
startReminderCron();

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`🚀 SACCO Dashboard (FleetPulse) API running on :${PORT}`);
  console.log(`📊 Dashboard: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5173`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});
