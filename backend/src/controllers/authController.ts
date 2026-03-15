import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials. Please try again.' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'complaintiq_default_secret';
    const expiresInSeconds = 86400; // 24 hours

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret as jwt.Secret,
      { expiresIn: expiresInSeconds }
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Audit log
    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, 'LOGIN', 'user', user.id, JSON.stringify({ email: user.email }), req.ip]
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.branch_id, b.name as branch_name, 
             u.last_login, u.created_at, u.is_active
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('[Auth] GetProfile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }

    // Check if email is already taken by another user
    const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
    if (emailCheck.rows.length > 0) {
      res.status(400).json({ error: 'Email is already in use by another account.' });
      return;
    }

    const result = await query(
      'UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, email, role',
      [name, email, userId]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, 'UPDATE_PROFILE', 'user', userId, JSON.stringify({ name, email })]
    );

    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('[Auth] UpdateProfile error:', error);
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
};

export const getAgents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, branch_id } = req.user!;
    let queryStr = "SELECT id, name, email FROM users WHERE role = 'Agent' AND is_active = true";
    const params: any[] = [];

    if (role === 'Supervisor' && branch_id) {
      queryStr += " AND branch_id = $1";
      params.push(branch_id);
    }

    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (error) {
    console.error('[Auth] GetAgents error:', error);
    res.status(500).json({ error: 'Failed to fetch agents.' });
  }
};
