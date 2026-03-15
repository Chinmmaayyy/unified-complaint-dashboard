import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { sendEmail } from '../services/emailService';
import { query } from '../config/database';

export const sendEmailToCustomer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { customer_email, subject, message, complaint_id } = req.body;

    if (!customer_email || !subject || !message) {
      res.status(400).json({ error: 'customer_email, subject, and message are required.' });
      return;
    }

    const result = await sendEmail(customer_email, subject, message);

    // Audit log
    if (req.user && complaint_id) {
      await query(
        'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, 'SEND_EMAIL', 'complaint', null, JSON.stringify({ complaint_id, to: customer_email, subject })]
      );
    }

    if (result.success) {
      res.json({ 
        message: 'Email sent successfully.',
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send email.',
        details: result.error,
      });
    }
  } catch (error) {
    console.error('[Email] Controller error:', error);
    res.status(500).json({ error: 'Email service error.' });
  }
};
