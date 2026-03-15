import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { runAiPipeline } from '../ai/aiPipeline';

// Generate complaint ID: CIQ-YYYY-XXXX
function generateComplaintId(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CIQ-${year}-${String(random).padStart(4, '0')}`;
}

// Compute SLA deadline based on severity
function computeSlaDeadline(severity: string, createdAt: Date): Date {
  const hours = { Critical: 4, High: 12, Medium: 24, Low: 48 }[severity] || 24;
  return new Date(createdAt.getTime() + hours * 3600000);
}

export const getComplaints = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      sort = 'created_at',
      order = 'DESC',
      page = '1',
      limit = '100',
      branch, category, status, agent, product, source, severity, search,
    } = req.query;

    // Validate sort column
    const allowedSorts = ['severity', 'sla_deadline', 'created_at', 'fraud_risk', 'priority_score', 'sentiment_score'];
    const sortCol = allowedSorts.includes(sort as string) ? sort : 'created_at';
    const sortOrder = (order as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Build dynamic WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    // --- Role-Based Automatic Filtering ---
    const { role, id: userId, branch_id: branchId } = req.user!;
    if (role === 'Agent') {
      conditions.push(`c.assigned_agent = $${paramIdx++}`);
      params.push(userId);
    } else if (role === 'Supervisor' && branchId) {
      const branchRes = await query('SELECT name FROM branches WHERE id = $1', [branchId]);
      if (branchRes.rows.length > 0) {
        conditions.push(`c.branch = $${paramIdx++}`);
        params.push(branchRes.rows[0].name);
      }
    }

    // --- Query Parameter Filters ---
    if (branch && role === 'Admin') { conditions.push(`c.branch = $${paramIdx++}`); params.push(branch); }
    if (category) { conditions.push(`c.category = $${paramIdx++}`); params.push(category); }
    if (status) { conditions.push(`c.status = $${paramIdx++}::complaint_status`); params.push(status); }
    if (severity) { conditions.push(`c.severity = $${paramIdx++}::severity_level`); params.push(severity); }
    if (product) { conditions.push(`c.product = $${paramIdx++}`); params.push(product); }
    if (source) { conditions.push(`c.source = $${paramIdx++}`); params.push(source); }
    if (agent && role !== 'Agent') { conditions.push(`u.name ILIKE $${paramIdx++}`); params.push(`%${agent}%`); }
    if (search) {
      conditions.push(`(c.complaint_id ILIKE $${paramIdx} OR c.customer_name ILIKE $${paramIdx} OR c.category ILIKE $${paramIdx} OR c.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM complaints c LEFT JOIN users u ON c.assigned_agent = u.id ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get complaints with sorting
    const dataQuery = `
      SELECT c.*, u.name as agent_name, u.email as agent_email,
        EXTRACT(EPOCH FROM (c.sla_deadline - NOW())) / 3600 as hours_remaining,
        CASE WHEN c.sla_deadline < NOW() THEN true ELSE false END as sla_breach,
        array_agg(DISTINCT ct.tag) FILTER (WHERE ct.tag IS NOT NULL) as tags
      FROM complaints c
      LEFT JOIN users u ON c.assigned_agent = u.id
      LEFT JOIN complaint_tags ct ON ct.complaint_id = c.id
      ${whereClause}
      GROUP BY c.id, u.name, u.email
      ORDER BY ${sortCol === 'severity' 
        ? `CASE c.severity WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END` 
        : `c.${sortCol}`} ${sortOrder}
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(limitNum, offset);

    const result = await query(dataQuery, params);

    res.json({
      complaints: result.rows.map(row => ({
        ...row,
        hours_remaining: row.hours_remaining ? parseFloat(parseFloat(row.hours_remaining).toFixed(1)) : null,
        tags: row.tags || [],
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Complaints] List error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
};

export const getComplaintById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT c.*, u.name as agent_name, u.email as agent_email,
        b.name as branch_name, b.city as branch_city,
        EXTRACT(EPOCH FROM (c.sla_deadline - NOW())) / 3600 as hours_remaining,
        CASE WHEN c.sla_deadline < NOW() THEN true ELSE false END as sla_breach,
        i.incident_id as incident_code, i.incident_title,
        array_agg(DISTINCT ct.tag) FILTER (WHERE ct.tag IS NOT NULL) as tags
      FROM complaints c
      LEFT JOIN users u ON c.assigned_agent = u.id
      LEFT JOIN branches b ON c.branch = b.name
      LEFT JOIN incidents i ON c.incident_id = i.id
      LEFT JOIN complaint_tags ct ON ct.complaint_id = c.id
      WHERE c.complaint_id = $1 OR c.id::text = $1
      GROUP BY c.id, u.name, u.email, b.name, b.city, i.incident_id, i.incident_title`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const complaint = result.rows[0];
    res.json({
      ...complaint,
      hours_remaining: complaint.hours_remaining ? parseFloat(parseFloat(complaint.hours_remaining).toFixed(1)) : null,
      tags: complaint.tags || [],
    });
  } catch (error) {
    console.error('[Complaints] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint.' });
  }
};

export const createComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { account_number, description, category, product, source, branch } = req.body;

    if (!account_number || !description) {
      res.status(400).json({ error: 'Account number and description are required.' });
      return;
    }

    // Verify account exists
    const accountResult = await query('SELECT * FROM accounts WHERE account_number = $1', [account_number]);
    if (accountResult.rows.length === 0) {
      res.status(400).json({ error: 'Account not found. Please verify the account number.' });
      return;
    }

    const account = accountResult.rows[0];
    const complaintId = generateComplaintId();
    const createdAt = new Date();
    const defaultSeverity = 'Medium';
    const slaDeadline = computeSlaDeadline(defaultSeverity, createdAt);

    // Assign a random agent
    const agentResult = await query("SELECT id FROM users WHERE role = 'Agent' AND is_active = true ORDER BY RANDOM() LIMIT 1");
    const assignedAgent = agentResult.rows[0]?.id || null;

    // Get branch name from account if not provided
    let branchName = branch;
    if (!branchName && account.branch_id) {
      const branchResult = await query('SELECT name FROM branches WHERE id = $1', [account.branch_id]);
      branchName = branchResult.rows[0]?.name;
    }

    // Insert complaint
    const insertResult = await query(
      `INSERT INTO complaints (complaint_id, customer_name, account_number, branch, category, product, source, severity, status, description, assigned_agent, created_at, sla_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::severity_level, 'Open'::complaint_status, $9, $10, $11, $12)
       RETURNING *`,
      [complaintId, account.customer_name, account_number, branchName || 'Mumbai Main',
       category || 'Account Operations', product || 'Savings Account', source || 'Mobile App',
       defaultSeverity, description, assignedAgent, createdAt, slaDeadline]
    );

    const complaint = insertResult.rows[0];

    // Audit log
    if (req.user) {
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'CREATE_COMPLAINT', 'complaint', complaint.id, JSON.stringify({ complaint_id: complaintId })]
      );
    }

    // Run AI pipeline asynchronously (don't block the response)
    runAiPipeline(complaint.id, description, complaintId).catch(err => {
      console.error('[AI Pipeline] Background error:', err);
    });

    res.status(201).json({
      message: 'Complaint created successfully. AI analysis in progress.',
      complaint: {
        ...complaint,
        complaint_id: complaintId,
      },
    });
  } catch (error) {
    console.error('[Complaints] Create error:', error);
    res.status(500).json({ error: 'Failed to create complaint.' });
  }
};

export const updateComplaintStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const result = await query(
      `UPDATE complaints SET status = $1::complaint_status WHERE complaint_id = $2 OR id::text = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Audit log
    if (req.user) {
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'UPDATE_STATUS', 'complaint', result.rows[0].id, JSON.stringify({ new_status: status })]
      );
    }

    res.json({ message: 'Complaint status updated.', complaint: result.rows[0] });
  } catch (error) {
    console.error('[Complaints] Update status error:', error);
    res.status(500).json({ error: 'Failed to update complaint status.' });
  }
};

export const assignComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;

    if (!agentId) {
      res.status(400).json({ error: 'Agent ID is required.' });
      return;
    }

    // Verify user is an agent and active
    const agentCheck = await query("SELECT id, name FROM users WHERE id = $1 AND role = 'Agent' AND is_active = true", [agentId]);
    if (agentCheck.rows.length === 0) {
      res.status(400).json({ error: 'Invalid agent selection.' });
      return;
    }

    const result = await query(
      `UPDATE complaints SET assigned_agent = $1 WHERE complaint_id = $2 OR id::text = $2 RETURNING *`,
      [agentId, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    // Audit log
    if (req.user) {
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'REASSIGN_AGENT', 'complaint', result.rows[0].id, JSON.stringify({ assigned_to: agentCheck.rows[0].name })]
      );
    }

    res.json({ message: 'Complaint reassigned successfully.', complaint: result.rows[0] });
  } catch (error) {
    console.error('[Complaints] Reassign error:', error);
    res.status(500).json({ error: 'Failed to reassign complaint.' });
  }
};
