import { Router } from 'express';
import { analyzeComplaint, detectDuplicate, generateResponse, generateBatchReport } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/analyze', authenticate, analyzeComplaint);
router.post('/analyze-batch', authenticate, generateBatchReport);
router.post('/duplicate', authenticate, detectDuplicate);
router.post('/generate-response', authenticate, generateResponse);

export default router;
