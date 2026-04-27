import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from '../server/config/db';
import authRoutes from '../server/routes/authRoutes';
import profileRoutes from '../server/routes/profileRoutes';
import commentRoutes from '../server/routes/commentRoutes';
import leaderboardRoutes from '../server/routes/leaderboardRoutes';
import watchProgressRoutes from '../server/routes/watchProgressRoutes';
import rewardRoutes from '../server/routes/rewardRoutes';
import notificationRoutes from '../server/routes/notificationRoutes';
import recommendationRoutes from '../server/routes/recommendationRoutes';
import searchRoutes from '../server/routes/searchRoutes';
import listRoutes from '../server/routes/listRoutes';

const app = express();
app.use(cors({ origin: (_o, cb) => cb(null, true), methods: ['GET','POST','PUT','DELETE','OPTIONS'], credentials: true }));
app.use(express.json({ limit: '100kb' }));

let dbReady = false;
app.use(async (_req, _res, next) => {
  if (!dbReady) { try { await connectDB(); dbReady = true; } catch (e) { console.error('[DB]', e); } }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/progress', watchProgressRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/lists', listRoutes);
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'AnimeVault', ts: Date.now() }));
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ message: err instanceof Error ? err.message : 'Error' });
});
export default app;
