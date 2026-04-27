import type { Request, Response } from 'express';
import { UserModel } from '../models/userModel';

type LeaderType = 'xp' | 'watch' | 'level';

const VALID_TYPES = new Set<LeaderType>(['xp', 'watch', 'level']);

const SORT_FIELD: Record<LeaderType, string> = {
  xp: 'xp',
  watch: 'watchTime',
  level: 'level',
};

export async function getLeaderboard(req: Request, res: Response) {
  const type: LeaderType = VALID_TYPES.has(req.query.type as LeaderType)
    ? (req.query.type as LeaderType)
    : 'xp';

  const sortField = SORT_FIELD[type];

  const docs = await UserModel.find()
    .select('username avatar level xp watchTime')
    .sort({ [sortField]: -1, _id: 1 })
    .limit(50)
    .lean<{ _id: { toHexString: () => string }; username: string; avatar: string; level: number; xp: number; watchTime: number }[]>();

  const users = docs.map((doc, index) => ({
    rank: index + 1,
    id: (doc._id as any).toHexString(),
    username: doc.username,
    avatar: doc.avatar ?? null,
    level: doc.level ?? 1,
    xp: doc.xp ?? 0,
    watchTime: doc.watchTime ?? 0,
  }));

  res.json({ type, users });
}
