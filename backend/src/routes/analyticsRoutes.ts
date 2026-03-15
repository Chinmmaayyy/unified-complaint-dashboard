import { Router } from 'express';
import { 
  getComplaintsTrend, 
  getCategoryDistribution, 
  getSentimentDistribution, 
  getSlaCompliance, 
  getFraudAlerts,
  getDashboardStats,
  getBranchLocations,
  getProductDistribution,
  getHourlyVolume
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/complaints-trend', authenticate, getComplaintsTrend);
router.get('/category-distribution', authenticate, getCategoryDistribution);
router.get('/sentiment', authenticate, getSentimentDistribution);
router.get('/sla-compliance', authenticate, getSlaCompliance);
router.get('/fraud-alerts', authenticate, getFraudAlerts);
router.get('/dashboard', authenticate, getDashboardStats);
router.get('/branches', authenticate, getBranchLocations);
router.get('/products', authenticate, getProductDistribution);
router.get('/hourly', authenticate, getHourlyVolume);

export default router;
