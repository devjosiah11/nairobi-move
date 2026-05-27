import { Router } from 'express';
import { sql } from '@nairobi-move/db';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/saccos/me
router.get('/me', async (req, res) => {
  try {
    const result = await sql`
      SELECT id, name, owner_name, phone_number, county, created_at
      FROM saccos 
      WHERE id = ${req.user!.saccoId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'SACCO not found' });
    }

    res.json({ sacco: result[0] });
  } catch (error) {
    console.error('Get sacco error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/saccos/me
router.put('/me', async (req, res) => {
  try {
    const { owner_name, county } = req.body;

    const result = await sql`
      UPDATE saccos 
      SET 
        owner_name = COALESCE(${owner_name}, owner_name),
        county = COALESCE(${county}, county)
      WHERE id = ${req.user!.saccoId}
      RETURNING id, name, owner_name, phone_number, county, created_at
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'SACCO not found' });
    }

    res.json({ sacco: result[0] });
  } catch (error) {
    console.error('Update sacco error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
