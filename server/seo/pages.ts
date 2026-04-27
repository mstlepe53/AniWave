/**
 * SSR Page Handlers for TMDB-based StreamVault
 * Pre-renders meta tags for crawlers/bots on movie/:id and tv/:id routes.
 */
import { Request, Response } from 'express';
import { absoluteUrl, breadcrumbSchema, escapeHtml, renderShell, SITE_NAME } from './shell';
import {
  cleanText,
  getHome,
  getMovieDetails,
  getTVDetails,
  getPopular,
  getTrending,
  getByGenre,
  getMovieGenres,
  getTVGenres,
  posterUrl,
  backdropUrl,
  ShowItem,
  ContentDetails,
} from './upstream';

function sendHtml(res: Response, html: string, cache = 'public, s-maxage=3600, stale-while-revalidate=86400') {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.send(html);
}

function metaDescription(text: string, max = 156): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function renderShowCards(shows: ShowItem[], heading: string, baseRoute: string): string {
  if (!shows.length) return '';
  return `<section class="section"><h2>${escapeHtml(heading)}</h2><div class="grid">${shows.slice(0, 12).map(show => `
    <a class="card" href="/${escapeHtml(baseRoute)}/${escapeHtml(show.id)}">
      <img class="thumb" src="${escapeHtml(show.image)}" alt="${escapeHtml(`Watch ${show.title} online`)}" width="300" height="400" loading="lazy" decoding="async" />
      <div class="card-body"><div class="card-title">${escapeHtml(show.title)}</div><div class="muted">${escapeHtml(show.year || '')}</div></div>
    </a>`).join('')}</div></section>`;
}

/** GET / */
export async function homePage(req: Request, res: Response) {
  try {
    const [{ trendingMovies, trendingTV }, popularMovies] = await Promise.all([
      getHome(),
      getPopular('movie'),
    ]);
    const desc = `Stream movies and TV shows online free in HD on ${SITE_NAME}. Powered by TMDB — thousands of titles, no subscription needed.`;
    const body = `
      <h1>Watch Movies &amp; TV Shows Online Free</h1>
      <p>${escapeHtml(desc)}</p>
      ${renderShowCards(trendingMovies, 'Trending Movies', 'movie')}
      ${renderShowCards(trendingTV, 'Trending TV Shows', 'tv')}
      ${renderShowCards(popularMovies, 'Popular Movies', 'movie')}
    `;
    sendHtml(res, renderShell({
      title: `${SITE_NAME} – Watch Movies & TV Shows Online Free`,
      description: desc,
      url: absoluteUrl(req),
      body,
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl(req) },
    }));
  } catch (err) {
    res.status(500).send('Error');
  }
}

/** GET /movie/:id */
export async function moviePage(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const movie = await getMovieDetails(id) as any;
    const title = `Watch ${movie.title}${movie.release_date ? ` (${movie.release_date.slice(0,4)})` : ''} Online Free`;
    const desc = metaDescription(movie.overview || `Watch ${movie.title} online free in HD on ${SITE_NAME}.`);
    const image = posterUrl(movie.poster_path, 'w500');
    const url = absoluteUrl(req);
    const genres = (movie.genres || []).map((g: any) => escapeHtml(g.name)).join(', ');

    const related = movie.genres?.[0]
      ? await getByGenre(String(movie.genres[0].id), 'movie').catch(() => [])
      : [];

    const body = `
      <article class="detail">
        <img class="poster" src="${escapeHtml(image)}" alt="${escapeHtml(movie.title)}" width="300" height="450" />
        <div class="info">
          <h1>${escapeHtml(movie.title)}</h1>
          ${movie.tagline ? `<p class="tagline"><em>${escapeHtml(movie.tagline)}</em></p>` : ''}
          <p class="meta">Movie · ${escapeHtml(movie.release_date || '')} · ${escapeHtml(genres)}</p>
          <p>${escapeHtml(movie.overview || '')}</p>
          <a class="btn" href="/watch/movie/${escapeHtml(id)}">▶ Watch Now</a>
        </div>
      </article>
      ${renderShowCards(related.filter((r: any) => r.id !== id).slice(0, 8), 'More Movies', 'movie')}
    `;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Movie',
      name: movie.title,
      description: desc,
      image,
      dateCreated: movie.release_date,
      url,
      aggregateRating: movie.vote_average ? {
        '@type': 'AggregateRating',
        ratingValue: movie.vote_average.toFixed(1),
        ratingCount: movie.vote_count || 0,
        bestRating: 10,
      } : undefined,
    };

    sendHtml(res, renderShell({ title, description: desc, image, url, body, jsonLd, type: 'video.movie' }));
  } catch (err) {
    res.status(404).send('Not found');
  }
}

/** GET /tv/:id */
export async function tvPage(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const show = await getTVDetails(id) as any;
    const title = `Watch ${show.name}${show.first_air_date ? ` (${show.first_air_date.slice(0,4)})` : ''} Online Free`;
    const desc = metaDescription(show.overview || `Watch ${show.name} online free in HD on ${SITE_NAME}.`);
    const image = posterUrl(show.poster_path, 'w500');
    const url = absoluteUrl(req);
    const genres = (show.genres || []).map((g: any) => escapeHtml(g.name)).join(', ');

    const related = show.genres?.[0]
      ? await getByGenre(String(show.genres[0].id), 'tv').catch(() => [])
      : [];

    const body = `
      <article class="detail">
        <img class="poster" src="${escapeHtml(image)}" alt="${escapeHtml(show.name)}" width="300" height="450" />
        <div class="info">
          <h1>${escapeHtml(show.name)}</h1>
          ${show.tagline ? `<p class="tagline"><em>${escapeHtml(show.tagline)}</em></p>` : ''}
          <p class="meta">TV Show · ${escapeHtml(show.first_air_date || '')} · ${escapeHtml(genres)}</p>
          ${show.number_of_seasons ? `<p>${escapeHtml(String(show.number_of_seasons))} Seasons · ${escapeHtml(String(show.number_of_episodes || ''))} Episodes</p>` : ''}
          <p>${escapeHtml(show.overview || '')}</p>
          <a class="btn" href="/watch/tv/${escapeHtml(id)}/1/1">▶ Watch Season 1</a>
        </div>
      </article>
      ${renderShowCards(related.filter((r: any) => r.id !== id).slice(0, 8), 'More TV Shows', 'tv')}
    `;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: show.name,
      description: desc,
      image,
      startDate: show.first_air_date,
      url,
      numberOfSeasons: show.number_of_seasons,
      numberOfEpisodes: show.number_of_episodes,
      aggregateRating: show.vote_average ? {
        '@type': 'AggregateRating',
        ratingValue: show.vote_average.toFixed(1),
        ratingCount: show.vote_count || 0,
        bestRating: 10,
      } : undefined,
    };

    sendHtml(res, renderShell({ title, description: desc, image, url, body, jsonLd, type: 'video.tv_show' }));
  } catch (err) {
    res.status(404).send('Not found');
  }
}

/** GET /search */
export async function searchPage(req: Request, res: Response) {
  const q = String(req.query.q || '');
  const title = q ? `Search: "${q}" – ${SITE_NAME}` : `Search Movies & TV Shows – ${SITE_NAME}`;
  const desc = q ? `Search results for "${q}" on ${SITE_NAME}.` : `Search thousands of movies and TV shows on ${SITE_NAME}.`;
  sendHtml(res, renderShell({ title, description: desc, url: absoluteUrl(req), body: `<h1>${escapeHtml(title)}</h1>` }));
}

/** GET /genres */
export async function genresPage(req: Request, res: Response) {
  try {
    const [movieGenres, tvGenres] = await Promise.all([getMovieGenres(), getTVGenres()]);
    const body = `
      <h1>Browse by Genre</h1>
      <h2>Movie Genres</h2>
      <div class="grid">${movieGenres.map(g => `<a class="card" href="/genre/movie/${escapeHtml(g.id)}">${escapeHtml(g.name)}</a>`).join('')}</div>
      <h2>TV Genres</h2>
      <div class="grid">${tvGenres.map(g => `<a class="card" href="/genre/tv/${escapeHtml(g.id)}">${escapeHtml(g.name)}</a>`).join('')}</div>
    `;
    sendHtml(res, renderShell({ title: `Browse Genres – ${SITE_NAME}`, description: 'Browse movies and TV shows by genre.', url: absoluteUrl(req), body }));
  } catch {
    res.status(500).send('Error');
  }
}

/** GET /genre/movie/:slug and /genre/tv/:slug */
export async function genreListPage(req: Request, res: Response) {
  const { slug } = req.params;
  const isTV = req.path.includes('/genre/tv/');
  try {
    const shows = await getByGenre(slug, isTV ? 'tv' : 'movie');
    const type = isTV ? 'TV Shows' : 'Movies';
    const title = `${slug} ${type} – ${SITE_NAME}`;
    const body = `<h1>${escapeHtml(title)}</h1>${renderShowCards(shows, title, isTV ? 'tv' : 'movie')}`;
    sendHtml(res, renderShell({ title, description: `Watch ${slug} ${type} online free.`, url: absoluteUrl(req), body }));
  } catch {
    res.status(500).send('Error');
  }
}

/** GET /popular-movies, /popular-tv, /trending-movies, /trending-tv, /top-rated-movies, etc. */
export async function listingPage(req: Request, res: Response) {
  const path = req.path;
  let shows: ShowItem[] = [];
  let title = 'Movies & TV Shows';

  try {
    if (path === '/popular-movies') { shows = await getPopular('movie'); title = 'Popular Movies'; }
    else if (path === '/popular-tv') { shows = await getPopular('tv'); title = 'Popular TV Shows'; }
    else if (path === '/trending-movies') { shows = await getTrending('movie'); title = 'Trending Movies'; }
    else if (path === '/trending-tv') { shows = await getTrending('tv'); title = 'Trending TV Shows'; }

    const isTV = path.includes('-tv');
    const body = `<h1>${escapeHtml(title)}</h1>${renderShowCards(shows, title, isTV ? 'tv' : 'movie')}`;
    sendHtml(res, renderShell({ title: `${title} – ${SITE_NAME}`, description: `Watch ${title} online free in HD.`, url: absoluteUrl(req), body }));
  } catch {
    res.status(500).send('Error');
  }
}
