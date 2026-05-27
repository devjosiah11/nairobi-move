import { Router } from 'express';
import { generateAdminToken, adminAuthMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login - Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Hardcoded admin credentials (from environment or default)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@nairobi-move.co.ke';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email !== adminEmail || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateAdminToken('admin-001', adminEmail);

    res.json({
      admin: {
        id: 'admin-001',
        email: adminEmail,
        role: 'admin'
      },
      token
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Get current admin profile
router.get('/me', adminAuthMiddleware, async (req, res) => {
  try {
    res.json({
      admin: {
        id: req.admin!.adminId,
        email: req.admin!.email,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
