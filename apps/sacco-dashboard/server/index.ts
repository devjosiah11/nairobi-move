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

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/sms-log', smsLogRouter);
app.use('/api/saccos', saccosRouter);
app.use('/api/stats', statsRouter);

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
}

// Start reminder cron job
startReminderCron();

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`🚀 SACCO Dashboard (FleetPulse) API running on :${PORT}`);
  console.log(`📊 Dashboard: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5173`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});
