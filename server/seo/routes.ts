import { Express, Request, Response, NextFunction } from 'express';
import {
  homePage,
  moviePage,
  tvPage,
  searchPage,
  genresPage,
  genreListPage,
  listingPage,
} from './pages';
import { robotsTxt, sitemapXml, sitemapStaticXml } from './sitemap';

const BOT_PATTERN =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|linkedinbot|twitterbot|discordbot|whatsapp|applebot|facebookexternalhit|embedly|quora\slink\spreview|rogerbot|showyoubot|outbrain|pinterest|vkshare|w3c_validator|lighthouse|chrome-lighthouse|headlesschrome|prerender|screaming\sfrog|seomator|ahrefs|majestic|moz|semrush|dotbot|petalbot|bytespider|gptbot|ccbot/i;

function isBot(req: Request): boolean {
  const ua = req.headers['user-agent'] || '';
  return BOT_PATTERN.test(ua);
}

function botOnly(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isBot(req)) { next(); return; }
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function registerSeoRoutes(app: Express) {
  app.get('/robots.txt', asyncHandler(robotsTxt));
  app.get('/sitemap.xml', asyncHandler(sitemapXml));
  app.get('/sitemap-static.xml', asyncHandler(sitemapStaticXml));

  // Home
  app.get('/', botOnly(homePage));

  // Content detail pages
  app.get('/movie/:id', botOnly(moviePage));
  app.get('/tv/:id', botOnly(tvPage));

  // Search
  app.get('/search', botOnly(searchPage));

  // Genres hub
  app.get('/genres', botOnly(genresPage));
  app.get('/genre/movie/:slug', botOnly(genreListPage));
  app.get('/genre/tv/:slug', botOnly(genreListPage));

  // Listing pages
  app.get('/popular-movies', botOnly(listingPage));
  app.get('/popular-tv', botOnly(listingPage));
  app.get('/trending-movies', botOnly(listingPage));
  app.get('/trending-tv', botOnly(listingPage));
  app.get('/top-rated-movies', botOnly(listingPage));
  app.get('/top-rated-tv', botOnly(listingPage));
  app.get('/now-playing', botOnly(listingPage));
  app.get('/on-air', botOnly(listingPage));
  app.get('/upcoming', botOnly(listingPage));
}
