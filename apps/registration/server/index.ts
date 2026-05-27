import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import registerRiderRouter from './routes/register-rider.js';
import registerSaccoRouter from './routes/register-sacco.js';
import stagesRouter from './routes/stages.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration - open for public registration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://registration.up.railway.app']
    : ['http://localhost:5175', 'http://localhost:3003'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/register/rider', registerRiderRouter);
app.use('/api/register/sacco', registerSaccoRouter);
app.use('/api/stages', stagesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    service: 'registration', 
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
    const ridersResult = await sql`SELECT COUNT(*) as total FROM riders WHERE is_active = true`;
    const saccosResult = await sql`SELECT COUNT(*) as total FROM saccos`;
    const stagesResult = await sql`SELECT COUNT(*) as total FROM stages`;
    const tripsResult = await sql`SELECT COUNT(*) as total FROM trips WHERE DATE(booked_at) = CURRENT_DATE`;

    const stats = {
      totalRiders: parseInt(ridersResult[0].total),
      totalSaccos: parseInt(saccosResult[0].total),
      totalStages: parseInt(stagesResult[0].total),
      tripsToday: parseInt(tripsResult[0].total)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// In production, serve Vite dist folder
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Catch-all handler: return index.html for any non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT ?? 3003;
app.listen(PORT, () => {
  console.log(`📝 Registration API running on :${PORT}`);
  console.log(`📊 Portal: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5175`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
});
