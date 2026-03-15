import { Router } from 'express';
import { verifyAccount, createAccount, listBranches } from '../controllers/accountController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/verify', authenticate, verifyAccount);
router.post('/create', authenticate, createAccount);
router.get('/branches', authenticate, listBranches);

export default router;
