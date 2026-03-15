import { Router } from 'express';
import { handleMessage, resetSession } from '../controllers/chatbotController';

const router = Router();

// Chatbot endpoints — no auth required (public-facing)
router.post('/message', handleMessage);
router.post('/reset', resetSession);

export default router;
