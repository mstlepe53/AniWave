import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { findUserByUsername, findUserById } from '../models/userModel';
import {
  followUser,
  getFollowStats,
  getFollowersList,
  getFollowingList,
  isFollowing,
  unfollowUser,
} from '../models/followModel';
import { createNotification } from '../models/notificationModel';

async function getTarget(username: string | undefined) {
  if (!username) return null;
  return findUserByUsername(username);
}

export async function followProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) return res.status(401).json({ message: 'Please log in to follow users.' });

  const target = await getTarget(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found.' });
  if (target.id === req.userId) return res.status(400).json({ message: 'You cannot follow yourself.' });

  await followUser(req.userId, target.id);
  const stats = await getFollowStats(target.id);
  const following = await isFollowing(req.userId, target.id);

  // Notify the target user that someone followed them (fire-and-forget)
  const followerId = req.userId;
  findUserById(followerId).then(follower => {
    if (follower) {
      return createNotification(
        target.id,
        'follow',
        `${follower.username} started following you.`,
        follower.username,
        follower.avatar ?? undefined,
      );
    }
  }).catch(() => {});

  return res.json({ following, stats });
}

export async function unfollowProfile(req: AuthenticatedRequest, res: Response) {
  if (!req.userId) return res.status(401).json({ message: 'Please log in to unfollow users.' });

  const target = await getTarget(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found.' });
  if (target.id === req.userId) return res.status(400).json({ message: 'You cannot unfollow yourself.' });

  await unfollowUser(req.userId, target.id);
  const stats = await getFollowStats(target.id);

  return res.json({ following: false, stats });
}

export async function getProfileFollowers(req: AuthenticatedRequest, res: Response) {
  const target = await getTarget(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found.' });

  const followers = await getFollowersList(target.id, 50);
  return res.json({ followers });
}

export async function getProfileFollowing(req: AuthenticatedRequest, res: Response) {
  const target = await getTarget(req.params.username);
  if (!target) return res.status(404).json({ message: 'User not found.' });

  const following = await getFollowingList(target.id, 50);
  return res.json({ following });
}
