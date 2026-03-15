import { Router } from 'express';
import { getComplaints, getComplaintById, createComplaint, updateComplaintStatus, assignComplaint } from '../controllers/complaintController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getComplaints);
router.get('/:id', authenticate, getComplaintById);
router.post('/create', authenticate, createComplaint);
router.patch('/:id/status', authenticate, updateComplaintStatus);
router.patch('/:id/assign', authenticate, assignComplaint);

export default router;
