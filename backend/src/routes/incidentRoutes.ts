import { Router } from 'express';
import { getIncidents, getIncidentById } from '../controllers/incidentController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getIncidents);
router.get('/:id', authenticate, getIncidentById);

export default router;
