import { Router } from 'express';
import { login, getProfile, updateProfile, getAgents } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.get('/agents', authenticate, getAgents);

export default router;
