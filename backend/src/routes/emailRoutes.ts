import { Router } from 'express';
import { sendEmailToCustomer } from '../controllers/emailController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/send', authenticate, authorize('Admin', 'Supervisor', 'Agent'), sendEmailToCustomer);

export default router;
