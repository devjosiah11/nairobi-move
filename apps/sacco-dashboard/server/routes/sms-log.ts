import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/sms-log
router.get('/', async (req, res) => {
  try {
    const { 
      plate, 
      type, 
      from, 
      to, 
      page = '1', 
      limit = '50' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE conditions
    const conditions = ['service = \'fleetpulse\''];
    const params: any[] = [];

    // Filter by this SACCO's vehicles
    conditions.push(`related_id IN (SELECT id FROM vehicles WHERE sacco_id = ${req.user!.saccoId})`);

    if (plate) {
      conditions.push(`EXISTS (
        SELECT 1 FROM vehicles v 
        WHERE v.id = sms_logs.related_id 
        AND v.plate_number ILIKE ${'%' + plate + '%'}
      )`);
    }

    if (type) {
      conditions.push(`direction = ${type}`);
    }

    if (from) {
      conditions.push(`created_at >= ${from}`);
    }

    if (to) {
      conditions.push(`created_at <= ${to}`);
    }

    const whereClause = conditions.join(' AND ');

    // Get SMS logs with vehicle info
    const logsResult = await sql`
      SELECT 
        sl.*,
        v.plate_number,
        v.driver_name,
        v.driver_phone
      FROM sms_logs sl
      LEFT JOIN vehicles v ON sl.related_id = v.id
      WHERE ${sql(whereClause)}
      ORDER BY sl.created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM sms_logs sl
      WHERE ${sql(whereClause)}
    `;

    const total = parseInt(countResult[0].total);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      logs: logsResult,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_records: total,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get SMS logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
