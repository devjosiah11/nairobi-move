import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
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
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://boda-dispatch.up.railway.app']
    : ['http://localhost:5174', 'http://localhost:3002'],
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

// In production, serve Vite dist folder
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Catch-all handler: return index.html for any non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

const PORT = process.env.PORT ?? 3002;
httpServer.listen(PORT, () => {
  console.log(`🏍️ BodaDispatch API running on :${PORT}`);
  console.log(`📊 Dashboard: ${process.env.NODE_ENV === 'production' ? 'Production' : `http://localhost:5174`}`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`🔌 Socket.io: ws://localhost:${PORT}`);
});
