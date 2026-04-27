import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { claimDailyReward, getRewardStatusHandler } from '../controllers/rewardController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/rewards/status — check if daily reward is claimable
router.get('/status', getRewardStatusHandler);

// POST /api/rewards/claim — claim the daily reward
router.post('/claim', claimDailyReward);

export default router;
