# StreamVault — MongoDB Setup Guide

## ✅ MongoDB is already configured!

Your `.env` file has been pre-configured with your MongoDB Atlas connection string.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (MongoDB connects automatically)
npm run dev
```

The server starts on **http://localhost:5000**

## MongoDB Details

- **Cluster**: `streamvault.dcekvnc.mongodb.net`
- **Database**: `streamvault`
- **User**: `zu7hunter_db_user`

> **Note**: Collections are created automatically when data is first inserted.
> No manual table/collection creation needed — Mongoose handles this via schemas.

## Collections created automatically

| Collection | Created when |
|---|---|
| `users` | First user registers |
| `comments` | First comment is posted |
| `watchlists` | First item added to watchlist |
| `favorites` | First favorite saved |
| `follows` | First follow action |
| `notifications` | First notification |
| `searchhistories` | First search |
| `watchprogresses` | First video progress saved |
| `useractivities` | First activity logged |
| `badges` | Badge system triggered |
| `userrewards` | First reward claimed |

## Production Deployment (Vercel / Render)

Set these environment variables in your hosting platform:

```
MONGODB_URI=mongodb+srv://zu7hunter_db_user:JsdLCIMSz41WHNbE@streamvault.dcekvnc.mongodb.net/?appName=streamvault
MONGODB_DB=streamvault
JWT_SECRET=streamvault_super_secret_jwt_key_2026
TMDB_API_KEY=004fbc43b2d09ad149ed78443d237382
VITE_SITE_URL=https://your-domain.vercel.app
SITE_URL=https://your-domain.vercel.app
CORS_ORIGINS=https://your-domain.vercel.app
NODE_ENV=production
```
