import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Import routes
import authRouter from './routes/auth.js';
import ridersRouter from './routes/riders.js';
import tripsRouter from './routes/trips.js';
import sosRouter from './routes/sos.js';
import stagesRouter from './routes/stages.js';
import { initializeSocket } from './socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      process.env.FRONTEND_URL || 'https://boda-dispach-production.up.railway.app',
      'https://matatu-pulse-production.up.railway.app',
      'https://sacco-production-1ad8.up.railway.app',
      'https://registeration-production.up.railway.app',
    ]
  : ['http://localhost:5174', 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:5175', 'http://localhost:5176'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', authRouter);
app.use('/api/riders', ridersRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/sos', sosRouter);
app.use('/api/stages', stagesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    service: 'boda-dispatch', 
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
    const tripsResult = await sql`SELECT COUNT(*) as total FROM trips WHERE DATE(booked_at) = CURRENT_DATE`;
    const sosResult = await sql`SELECT COUNT(*) as total FROM sos_events WHERE is_resolved = true`;

    const stats = {
      totalRiders: parseInt(ridersResult[0].total),
      tripsToday: parseInt(tripsResult[0].total),
      sosResolved: parseInt(sosResult[0].total)
    };

    res.json(stats);
  } catch (error) {
    console.error('Get public stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
    res.json({ service: 'BodaDispatch API', status: 'running', endpoints: { health: '/api/health', riders: '/api/riders', trips: '/api/trips' } });
  });
}

const PORT = process.env.PORT ?? 3002;
httpServer.listen(PORT, () => {
  console.log(`🏍️ BodaDispatch API running on :${PORT}`);
  console.log(`📊 Dashboard: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5174`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io: ws://localhost:${PORT}`);
});
