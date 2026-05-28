import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Import routes
import ussdRouter from './routes/ussd.js';
import smsRouter from './routes/sms.js';
import commuterRouter from './routes/commuter.js';
import faresRouter from './routes/fares.js';
import routesRouter from './routes/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration - open for public access
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://matatu-pulse.up.railway.app']
    : ['http://localhost:5176', 'http://localhost:3004'],
  credentials: true
};

app.use(cors(corsOptions));
// AT sends form-encoded POST for USSD and SMS — must come before json()
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Mount routes
app.use('/api/ussd', ussdRouter);        // POST /api/ussd - AT USSD webhook
app.use('/api/sms', smsRouter);         // POST /api/sms/incoming - AT SMS webhook
app.use('/api/sms/delivery', smsRouter); // POST /api/sms/delivery - AT delivery callback
app.use('/api/commuter', commuterRouter); // Public commuter API
app.use('/api/fares', faresRouter);     // Fare alerts and reports
app.use('/api/routes', routesRouter);   // Route insights and search

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    service: 'matatu-pulse', 
    status: 'ok', 
    time: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public stats endpoint
app.get('/api/stats/public', async (_req, res) => {
  try {
    const { sql } = await import('@nairobi-move/db');
    
    // Get aggregate public stats
    const commutersResult = await sql`SELECT COUNT(*) as total FROM commuters`;
    const vehiclesResult = await sql`SELECT COUNT(*) as total FROM vehicles WHERE is_active = true`;
    const trafficResult = await sql`SELECT COUNT(*) as total FROM traffic_reports WHERE created_at >= CURRENT_DATE`;
    const incidentsResult = await sql`SELECT COUNT(*) as total FROM incident_reports WHERE created_at >= CURRENT_DATE`;

    const stats = {
      totalCommuters: parseInt(commutersResult[0].total),
      activeVehicles: parseInt(vehiclesResult[0].total),
      trafficReportsToday: parseInt(trafficResult[0].total),
      incidentsToday: parseInt(incidentsResult[0].total)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Africa's Talking webhook verification endpoint
app.get('/api/webhook/verify', (req, res) => {
  // AT sends a GET request to verify webhook URL
  const { status } = req.query;
  res.status(200).send('Active');
});

// In production, serve Vite dist if available, otherwise show API info
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        service: 'MatatuPulse API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/api/health',
          ussd: '/api/ussd',
          sms: '/api/sms/incoming',
          stats: '/api/stats/public'
        }
      });
    });
  }
}

const PORT = process.env.PORT ?? 3004;
app.listen(PORT, () => {
  console.log(`🚌 MatatuPulse API running on :${PORT}`);
  console.log(`📱 USSD: *384*3133#`);
  console.log(`📊 Portal: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5176`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`📡 Webhooks: /api/ussd, /api/sms/incoming`);
});
