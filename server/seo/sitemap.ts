import { Request, Response } from 'express';
import { siteUrl, escapeHtml } from './shell';
import { getTrending, getPopular } from './upstream';

const CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function urlEntry(loc: string, priority = '0.7', changefreq = 'daily') {
  return `  <url><loc>${escapeHtml(loc)}</loc><lastmod>${today()}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

function xmlWrap(urls: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

function send(res: Response, xml: string) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', CACHE_CONTROL);
  res.send(xml);
}

export async function robotsTxt(_req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
}

export async function sitemapXml(_req: Request, res: Response) {
  const base = siteUrl;
  const urls = [
    urlEntry(`${base}/`, '1.0', 'daily'),
    urlEntry(`${base}/popular-movies`, '0.9', 'daily'),
    urlEntry(`${base}/popular-tv`, '0.9', 'daily'),
    urlEntry(`${base}/trending-movies`, '0.9', 'daily'),
    urlEntry(`${base}/trending-tv`, '0.9', 'daily'),
    urlEntry(`${base}/top-rated-movies`, '0.8', 'weekly'),
    urlEntry(`${base}/top-rated-tv`, '0.8', 'weekly'),
    urlEntry(`${base}/now-playing`, '0.8', 'daily'),
    urlEntry(`${base}/on-air`, '0.8', 'daily'),
    urlEntry(`${base}/upcoming`, '0.8', 'weekly'),
    urlEntry(`${base}/genres`, '0.7', 'weekly'),
    urlEntry(`${base}/search`, '0.6', 'monthly'),
    urlEntry(`${base}/leaderboard`, '0.5', 'weekly'),
  ];

  try {
    const [movies, tvShows] = await Promise.all([getTrending('movie'), getTrending('tv')]);
    for (const m of movies.slice(0, 20)) {
      urls.push(urlEntry(`${base}/movie/${m.id}`, '0.8', 'weekly'));
    }
    for (const t of tvShows.slice(0, 20)) {
      urls.push(urlEntry(`${base}/tv/${t.id}`, '0.8', 'weekly'));
    }
  } catch {}

  send(res, xmlWrap(urls));
}

export async function sitemapStaticXml(_req: Request, res: Response) {
  const base = siteUrl;
  const urls = [
    urlEntry(`${base}/`, '1.0', 'daily'),
    urlEntry(`${base}/genres`, '0.8', 'weekly'),
    urlEntry(`${base}/search`, '0.6', 'monthly'),
  ];
  send(res, xmlWrap(urls));
}
