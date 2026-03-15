import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { runAiPipeline, checkDuplicate } from '../ai/aiPipeline';
import { callGroq } from '../ai/groqService';
import { callGemini } from '../ai/geminiService';
import { query } from '../config/database';

export const analyzeComplaint = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { complaint_id } = req.body;

    if (!complaint_id) {
      res.status(400).json({ error: 'complaint_id is required.' });
      return;
    }

    const result = await query(
      'SELECT id, description, complaint_id FROM complaints WHERE complaint_id = $1 OR id::text = $1',
      [complaint_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const complaint = result.rows[0];

    // Run the full AI pipeline
    await runAiPipeline(complaint.id, complaint.description, complaint.complaint_id);

    // Fetch updated complaint
    const updated = await query('SELECT * FROM complaints WHERE id = $1', [complaint.id]);

    res.json({
      message: 'AI analysis completed successfully.',
      analysis: {
        category: updated.rows[0].category,
        sentiment: updated.rows[0].sentiment,
        sentiment_score: updated.rows[0].sentiment_score,
        severity: updated.rows[0].severity,
        fraud_risk: updated.rows[0].fraud_risk,
        duplicate_flag: updated.rows[0].duplicate_flag,
        root_cause: updated.rows[0].root_cause,
        resolution_suggestion: updated.rows[0].resolution_suggestion,
        priority_score: updated.rows[0].priority_score,
      },
    });
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    res.status(500).json({ error: 'AI analysis failed.' });
  }
};

export const detectDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: 'description is required.' });
      return;
    }

    const result = await checkDuplicate(description);
    res.json(result);
  } catch (error) {
    console.error('[AI] Duplicate detection error:', error);
    res.status(500).json({ error: 'Duplicate detection failed.' });
  }
};

export const generateResponse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { complaint_id } = req.body;

    if (!complaint_id) {
      res.status(400).json({ error: 'complaint_id is required.' });
      return;
    }

    const result = await query(
      'SELECT * FROM complaints WHERE complaint_id = $1 OR id::text = $1',
      [complaint_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const c = result.rows[0];
    const prompt = `You are a professional customer service representative for Union Bank of India.

Generate a formal, empathetic customer response email for this banking complaint:

Complaint ID: ${c.complaint_id}
Category: ${c.category}
Product: ${c.product}
Customer: ${c.customer_name}
Severity: ${c.severity}
Description: ${c.description}
Root Cause (AI detected): ${c.root_cause || 'Under investigation'}

Write a formal bank response email that:
1. Acknowledges the issue empathetically
2. Explains what happened (based on root cause)
3. States the resolution steps and timeline
4. Offers compensation if appropriate for severity
5. Ends professionally with formal bank closing

Format as a formal email with subject line. Keep it 150-200 words.`;

    const systemPrompt = 'You are a professional customer service representative for Union Bank of India. Write formal, empathetic banking correspondence.';

    let response: string;
    try {
      response = await callGroq(prompt, systemPrompt, c.id, 'response_generation');
    } catch {
      response = await callGemini(prompt, systemPrompt, c.id, 'response_generation');
    }

    res.json({
      response,
      complaint_id: c.complaint_id,
      customer_name: c.customer_name,
    });
  } catch (error) {
    console.error('[AI] Response generation error:', error);
    res.status(500).json({ error: 'AI response generation failed.' });
  }
};

export const generateBatchReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    
    // Get some aggregate data to feed the AI for context
    const statsResult = await query(`
      SELECT 
        category, 
        severity, 
        status, 
        COUNT(*) as count 
      FROM complaints 
      GROUP BY category, severity, status
    `);
    
    const context = JSON.stringify(statsResult.rows);
    
    const prompts: {[key: string]: string} = {
      'Monthly Compliance Report': `Generate a Monthly Compliance Report for Union Bank of India. Data summary: ${context}. Focus on SLA compliance and regulatory risks.`,
      'Branch Performance Report': `Generate a Branch Performance Report. Data summary: ${context}. Focus on which branches are handling complaints best and which are lagging.`,
      'Fraud Risk Report': `Generate a Fraud Risk Report. Data summary: ${context}. Highlight patterns and suspicious activities.`,
      'Agent Performance Report': `Generate an Agent Performance Report. Focus on efficiency and resolution quality.`,
      'Category Trend Report': `Generate a Category Trend Report. Data summary: ${context}. Which complaint types are increasing?`,
      'Executive Summary Report': `Generate a high-level Executive Summary for senior management. Data summary: ${context}.`,
      'full_report': `Generate a comprehensive AI Insight Report for the entire complaint management system. Data summary: ${context}.`
    };

    const prompt = prompts[type] || prompts['Executive Summary Report'];
    const systemPrompt = 'You are a senior banking analyst and AI expert at Union Bank of India. Generate professional, data-driven executive reports.';

    let response: string;
    try {
      response = await callGroq(prompt, systemPrompt, undefined, 'batch_report');
    } catch {
      response = await callGemini(prompt, systemPrompt, undefined, 'batch_report');
    }

    res.json({
      analysis: response,
      response: response, // for compatibility
      type
    });
  } catch (error) {
    console.error('[AI] Batch report error:', error);
    res.status(500).json({ error: 'Failed to generate AI report.' });
  }
};
