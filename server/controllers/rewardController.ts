import type { Request, Response } from 'express';
import { claimReward, getRewardStatus } from '../models/userRewardModel';

export async function claimDailyReward(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const result = await claimReward(userId);

  if (!result) {
    const status = await getRewardStatus(userId);
    res.status(409).json({
      message: 'Reward already claimed for today.',
      nextClaimAt: status.nextClaimAt,
      streakCount: status.streakCount,
    });
    return;
  }

  res.json(result);
}

export async function getRewardStatusHandler(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const status = await getRewardStatus(userId);
  res.json(status);
}
