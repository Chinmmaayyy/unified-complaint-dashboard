import { Request, Response } from 'express';
import { query } from '../config/database';

export const verifyAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_number } = req.body;

    if (!account_number) {
      res.status(400).json({ error: 'Account number is required.' });
      return;
    }

    const result = await query(
      `SELECT account_number, customer_name, a.account_type, a.email, a.mobile_number, b.name as branch_name
       FROM accounts a 
       LEFT JOIN branches b ON a.branch_id = b.id 
       WHERE a.account_number = $1`,
      [account_number]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ 
        verified: false, 
        error: 'Account not found. Please check the account number.' 
      });
      return;
    }

    const account = result.rows[0];
    res.json({
      verified: true,
      account: {
        account_number: account.account_number,
        customer_name: account.customer_name,
        account_type: account.account_type,
        email: account.email,
        mobile_number: account.mobile_number,
        branch: account.branch_name,
      },
    });
  } catch (error) {
    console.error('[Account] Verification error:', error);
    res.status(500).json({ error: 'Internal server error during account verification.' });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { account_number, customer_name, branch_id, mobile_number, email, account_type } = req.body;

    if (!account_number || !customer_name || !branch_id) {
      res.status(400).json({ error: 'Account number, customer name, and branch ID are required.' });
      return;
    }

    // Check if account already exists
    const existing = await query('SELECT id FROM accounts WHERE account_number = $1', [account_number]);
    if (existing.rows.length > 0) {
      res.status(400).json({ error: 'Account number already exists.' });
      return;
    }

    await query(
      `INSERT INTO accounts (account_number, customer_name, branch_id, mobile_number, email, account_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [account_number, customer_name, branch_id, mobile_number, email, account_type || 'Savings']
    );

    res.status(201).json({ message: 'Account created successfully.', account_number });
  } catch (error) {
    console.error('[Account] Creation error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
};

export const listBranches = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query('SELECT id, name FROM branches ORDER BY name ASC');
    res.json({ branches: result.rows });
  } catch (error) {
    console.error('[Account] List branches error:', error);
    res.status(500).json({ error: 'Failed to fetch branches.' });
  }
};
