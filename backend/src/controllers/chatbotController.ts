import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { processMessage, clearSession } from '../services/chatbotService';

export const handleMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, session_id } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message is required.' });
      return;
    }

    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const result = await processMessage(sessionId, message);

    res.json({
      response: result.response,
      session_id: sessionId,
      ticket_id: result.ticketId || null,
    });
  } catch (error) {
    console.error('[Chatbot] Error:', error);
    res.status(500).json({ error: 'Chatbot service error.' });
  }
};

export const resetSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const { session_id } = req.body;
  if (session_id) clearSession(session_id);
  res.json({ message: 'Session reset.' });
};
