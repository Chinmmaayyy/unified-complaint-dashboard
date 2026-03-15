import { Response } from 'express';
import { query } from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getIncidents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category } = req.query;

    let whereClause = '';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) { conditions.push(`i.status = $${conditions.length + 1}::incident_status`); params.push(status); }
    if (category) { conditions.push(`i.category = $${conditions.length + 1}`); params.push(category); }

    if (conditions.length > 0) whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT i.*, 
        COUNT(c.id) as linked_complaints,
        COUNT(c.id) FILTER (WHERE c.status IN ('Resolved', 'Closed')) as resolved_complaints
      FROM incidents i
      LEFT JOIN complaints c ON c.incident_id = i.id
      ${whereClause}
      GROUP BY i.id
      ORDER BY i.created_at DESC`,
      params
    );

    res.json({ incidents: result.rows });
  } catch (error) {
    console.error('[Incidents] List error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents.' });
  }
};

export const getIncidentById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const incidentResult = await query(
      `SELECT i.* FROM incidents i WHERE i.incident_id = $1 OR i.id::text = $1`,
      [id]
    );

    if (incidentResult.rows.length === 0) {
      res.status(404).json({ error: 'Incident not found.' });
      return;
    }

    const incident = incidentResult.rows[0];

    // Get linked complaints
    const complaintsResult = await query(
      `SELECT c.complaint_id, c.customer_name, c.category, c.severity, c.status, c.created_at
       FROM complaints c WHERE c.incident_id = $1 ORDER BY c.created_at DESC`,
      [incident.id]
    );

    res.json({
      ...incident,
      complaints: complaintsResult.rows,
    });
  } catch (error) {
    console.error('[Incidents] Get by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch incident.' });
  }
};
