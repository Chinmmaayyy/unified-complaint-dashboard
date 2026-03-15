import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query } from '../config/database';

export const getComplaintsTrend = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        COUNT(*) as complaints,
        COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) as resolved,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('Resolved', 'Closed')) as breaches
      FROM complaints
      WHERE created_at > NOW() - INTERVAL '8 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    res.json({ trend: result.rows });
  } catch (error) {
    console.error('[Analytics] Trend error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints trend.' });
  }
};

export const getCategoryDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        category as name,
        COUNT(*) as value,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM complaints), 0), 1) as percentage
      FROM complaints
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY value DESC
      LIMIT 10
    `);

    res.json({ categories: result.rows });
  } catch (error) {
    console.error('[Analytics] Category error:', error);
    res.status(500).json({ error: 'Failed to fetch category distribution.' });
  }
};

export const getSentimentDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        sentiment as name,
        COUNT(*) as value,
        ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM complaints), 0), 1) as percentage
      FROM complaints
      WHERE sentiment IS NOT NULL
      GROUP BY sentiment
      ORDER BY 
        CASE sentiment 
          WHEN 'Very Negative' THEN 1 
          WHEN 'Negative' THEN 2 
          WHEN 'Neutral' THEN 3 
          WHEN 'Positive' THEN 4 
        END
    `);

    res.json({ sentiments: result.rows });
  } catch (error) {
    console.error('[Analytics] Sentiment error:', error);
    res.status(500).json({ error: 'Failed to fetch sentiment distribution.' });
  }
};

export const getSlaCompliance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const overall = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE sla_deadline >= NOW() OR status IN ('Resolved', 'Closed')) as compliant,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('Resolved', 'Closed')) as breached,
        ROUND(
          COUNT(*) FILTER (WHERE sla_deadline >= NOW() OR status IN ('Resolved', 'Closed')) * 100.0 / 
          NULLIF(COUNT(*), 0), 1
        ) as compliance_rate,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (
            CASE WHEN status IN ('Resolved', 'Closed') THEN updated_at ELSE NOW() END - created_at
          )) / 3600
        )::DECIMAL, 1) as avg_resolution_hours
      FROM complaints
    `);

    const byMonth = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        ROUND(
          COUNT(*) FILTER (WHERE sla_deadline >= created_at + INTERVAL '1 day' OR status IN ('Resolved', 'Closed')) * 100.0 / 
          NULLIF(COUNT(*), 0), 1
        ) as compliance_rate
      FROM complaints
      WHERE created_at > NOW() - INTERVAL '8 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    res.json({
      overall: overall.rows[0],
      monthly: byMonth.rows,
    });
  } catch (error) {
    console.error('[Analytics] SLA error:', error);
    res.status(500).json({ error: 'Failed to fetch SLA compliance.' });
  }
};

export const getFraudAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        c.complaint_id, c.customer_name, c.account_number, c.branch,
        c.category, c.severity, c.fraud_risk, c.description,
        c.created_at, c.status, c.priority_score,
        u.name as agent_name
      FROM complaints c
      LEFT JOIN users u ON c.assigned_agent = u.id
      WHERE c.fraud_risk IN ('High', 'Medium')
      ORDER BY 
        CASE c.fraud_risk WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 END,
        c.created_at DESC
      LIMIT 20
    `);

    const summary = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE fraud_risk = 'High') as high_risk,
        COUNT(*) FILTER (WHERE fraud_risk = 'Medium') as medium_risk,
        COUNT(*) FILTER (WHERE fraud_risk IN ('High', 'Medium') AND status = 'Open') as unresolved
      FROM complaints
    `);

    res.json({
      alerts: result.rows,
      summary: summary.rows[0],
    });
  } catch (error) {
    console.error('[Analytics] Fraud alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts.' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id: userId, branch_id: branchId } = req.user!;
    let whereClause = 'WHERE 1=1';
    let params: any[] = [];

    if (role === 'Agent') {
      whereClause = 'WHERE assigned_agent = $1';
      params = [userId];
    } else if (role === 'Supervisor' && branchId) {
      // Get branch name for supervisor
      const branchRes = await query('SELECT name FROM branches WHERE id = $1', [branchId]);
      if (branchRes.rows.length > 0) {
        whereClause = 'WHERE branch = $1';
        params = [branchRes.rows[0].name];
      }
    }

    const stats = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'Open') as open_count,
        COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) as resolved_count,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('Resolved', 'Closed')) as sla_breaches,
        COUNT(*) FILTER (WHERE fraud_risk = 'High') as fraud_alerts,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as today_count,
        ROUND(AVG(
          EXTRACT(EPOCH FROM (
            CASE WHEN status IN ('Resolved', 'Closed') THEN updated_at ELSE NOW() END - created_at
          )) / 3600
        )::DECIMAL, 1) as avg_resolution_hours,
        ROUND(
          COUNT(*) FILTER (WHERE sla_deadline >= NOW() OR status IN ('Resolved', 'Closed')) * 100.0 / 
          NULLIF(COUNT(*), 0), 1
        ) as sla_compliance
      FROM complaints
      ${whereClause}
    `, params);

    const trends = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        COUNT(*) as complaints,
        COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) as resolved,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('Resolved', 'Closed')) as breaches
      FROM complaints
      ${whereClause} AND created_at > NOW() - INTERVAL '8 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `, params);

    const categories = await query(`
      SELECT 
        category as name,
        COUNT(*) as value,
        CASE 
          WHEN category = 'UPI/Digital Payment' THEN '#1A5CFF'
          WHEN category = 'ATM Services' THEN '#00D4FF'
          WHEN category = 'Internet Banking' THEN '#00B8A9'
          WHEN category = 'Credit Card' THEN '#F5A623'
          WHEN category = 'Loan/EMI' THEN '#FF3B5C'
          ELSE '#7B5EA7'
        END as color
      FROM complaints
      ${whereClause}
      GROUP BY category
      ORDER BY value DESC
      LIMIT 5
    `, params);

    const sentiments = await query(`
      SELECT 
        sentiment as name,
        COUNT(*) as value,
        CASE 
          WHEN sentiment = 'Very Negative' THEN '#FF3B5C'
          WHEN sentiment = 'Negative' THEN '#F5A623'
          WHEN sentiment = 'Neutral' THEN '#8B9CBD'
          WHEN sentiment = 'Positive' THEN '#00C896'
        END as color
      FROM complaints
      ${whereClause} AND sentiment IS NOT NULL
      GROUP BY sentiment
    `, params);

    const branches = await query(`
      SELECT 
        branch,
        COUNT(*) as complaints,
        COUNT(*) FILTER (WHERE status IN ('Resolved', 'Closed')) as resolved
      FROM complaints
      ${whereClause}
      GROUP BY branch
      ORDER BY complaints DESC
      LIMIT 8
    `, params);

    res.json({ 
      kpis: {
        open: parseInt(stats.rows[0].open_count) || 0,
        resolved: parseInt(stats.rows[0].resolved_count) || 0,
        critical: parseInt(stats.rows[0].critical_count) || 0,
        breaches: parseInt(stats.rows[0].sla_breaches) || 0,
        fraud: parseInt(stats.rows[0].fraud_alerts) || 0,
        today: parseInt(stats.rows[0].today_count) || 0,
        avg_res: stats.rows[0].avg_resolution_hours,
        compliance: stats.rows[0].sla_compliance
      },
      trends: trends.rows,
      categories: categories.rows,
      sentiments: sentiments.rows,
      branches: branches.rows
    });
  } catch (error) {
    console.error('[Analytics] Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats.' });
  }
};

export const getBranchLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        branch as name,
        COUNT(*) as count,
        CASE 
          WHEN COUNT(*) FILTER (WHERE severity = 'Critical') > 0 THEN 'high'
          WHEN COUNT(*) FILTER (WHERE severity = 'High') > 2 THEN 'high'
          WHEN COUNT(*) FILTER (WHERE severity = 'High') > 0 THEN 'medium'
          ELSE 'low'
        END as severity
      FROM complaints
      GROUP BY branch
    `);

    // Mock coordinates for demo
    const coords: {[key: string]: {lat: number, lng: number}} = {
      "Mumbai Main": { lat: 19.076, lng: 72.877 },
      "Delhi CP": { lat: 28.632, lng: 77.219 },
      "Bangalore MG": { lat: 12.975, lng: 77.580 },
      "Chennai Anna Nagar": { lat: 13.085, lng: 80.270 },
      "Kolkata Park Street": { lat: 22.556, lng: 88.362 },
      "Hyderabad Banjara": { lat: 17.415, lng: 78.448 },
      "Pune FC Road": { lat: 18.520, lng: 73.856 },
      "Ahmedabad SG": { lat: 23.022, lng: 72.571 },
      "Jaipur MI Road": { lat: 26.912, lng: 75.787 },
      "Lucknow Hazratganj": { lat: 26.847, lng: 80.946 }
    };

    const branches = result.rows.map(row => ({
      ...row,
      lat: coords[row.name]?.lat || 20.5937,
      lng: coords[row.name]?.lng || 78.9629
    }));

    res.json({ branches });
  } catch (error) {
    console.error('[Analytics] Branch locations error:', error);
    res.status(500).json({ error: 'Failed to fetch branch locations.' });
  }
};

export const getProductDistribution = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        product as name,
        COUNT(*) as value
      FROM complaints
      WHERE product IS NOT NULL
      GROUP BY product
      ORDER BY value DESC
      LIMIT 6
    `);
    res.json({ products: result.rows });
  } catch (error) {
    console.error('[Analytics] Product dist error:', error);
    res.status(500).json({ error: 'Failed to fetch product distribution.' });
  }
};

export const getHourlyVolume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        TO_CHAR(created_at, 'HH24:00') as hour,
        COUNT(*) as count
      FROM complaints
      WHERE created_at > NOW() - INTERVAL '1 day'
      GROUP BY TO_CHAR(created_at, 'HH24:00')
      ORDER BY hour
    `);
    res.json({ hourly: result.rows });
  } catch (error) {
    console.error('[Analytics] Hourly volume error:', error);
    res.status(500).json({ error: 'Failed to fetch hourly volume.' });
  }
};
