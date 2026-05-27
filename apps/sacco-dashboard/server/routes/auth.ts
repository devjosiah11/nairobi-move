import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '@nairobi-move/db';
import { generateToken } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, owner_name, phone_number, county, password } = req.body;

    if (!name || !owner_name || !phone_number || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if sacco already exists
    const existing = await sql`
      SELECT id FROM saccos WHERE phone_number = ${phone_number}
    `;
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'SACCO with this phone number already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create sacco
    const result = await sql`
      INSERT INTO saccos (name, owner_name, phone_number, county, password_hash)
      VALUES (${name}, ${owner_name}, ${phone_number}, ${county || 'Nairobi'}, ${password_hash})
      RETURNING id, name, owner_name, phone_number, county, created_at
    `;

    const sacco = result[0];
    const token = generateToken(sacco.id, sacco.phone_number);

    res.status(201).json({
      sacco,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ error: 'Phone number and password required' });
    }

    // Find sacco
    const result = await sql`
      SELECT id, name, owner_name, phone_number, county, password_hash, created_at
      FROM saccos 
      WHERE phone_number = ${phone_number}
    `;

    if (result.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sacco = result[0];

    // Verify password
    const isValid = await bcrypt.compare(password, sacco.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response
    const { password_hash, ...saccoWithoutPassword } = sacco;
    const token = generateToken(sacco.id, sacco.phone_number);

    res.json({
      sacco: saccoWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await sql`
      SELECT id, name, owner_name, phone_number, county, created_at
      FROM saccos 
      WHERE id = ${req.user.saccoId}
    `;

    if (result.length === 0) {
      return res.status(404).json({ error: 'SACCO not found' });
    }

    res.json({ sacco: result[0] });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
