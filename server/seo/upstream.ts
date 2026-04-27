/**
 * TMDB upstream fetcher for SSR (server-side SEO rendering)
 * Used by the express server to pre-render meta tags for crawlers.
 */

const TMDB_API_KEY = '004fbc43b2d09ad149ed78443d237382';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

type CacheEntry<T> = { expires: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return Promise.resolve(entry.value as T);
  return fn().then(val => {
    cache.set(key, { expires: Date.now() + ttlMs, value: val });
    return val;
  });
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export interface GenreItem { name: string; id: string; }

export interface ShowItem {
  title: string;
  image: string;
  id: string;
  type?: string;
  year?: string;
  rating?: string;
  episode?: string;
}

export interface MovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: GenreItem[];
  release_date: string;
  vote_average: number;
  runtime?: number;
  status?: string;
  tagline?: string;
  imdb_id?: string;
}

export interface TVDetails {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: GenreItem[];
  first_air_date: string;
  vote_average: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  tagline?: string;
}

// Union type for SEO pages
export type ContentDetails = (MovieDetails & { mediaType: 'movie' }) | (TVDetails & { mediaType: 'tv' });

export function posterUrl(path: string | null, size = 'w500'): string {
  if (!path) return 'https://placehold.co/300x400/1f2937/9ca3af?text=No+Image';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/w1280${path}`;
}

export function cleanText(text: string): string {
  return text?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
}

function normalizeMovie(m: any): ShowItem {
  return {
    id: String(m.id),
    title: m.title || m.original_title,
    image: posterUrl(m.poster_path),
    type: 'movie',
    year: m.release_date?.slice(0, 4),
    rating: m.vote_average ? m.vote_average.toFixed(1) : undefined,
  };
}

function normalizeTV(t: any): ShowItem {
  return {
    id: String(t.id),
    title: t.name || t.original_name,
    image: posterUrl(t.poster_path),
    type: 'tv',
    year: t.first_air_date?.slice(0, 4),
    rating: t.vote_average ? t.vote_average.toFixed(1) : undefined,
    episode: t.number_of_episodes ? `${t.number_of_episodes} EP` : undefined,
  };
}

export async function getMovieDetails(id: string): Promise<ContentDetails> {
  const data = await withCache(`movie-${id}`, 3600_000, () =>
    tmdbFetch<MovieDetails>(`/movie/${id}`, { append_to_response: 'genres' })
  );
  return { ...data, mediaType: 'movie' } as ContentDetails;
}

export async function getTVDetails(id: string): Promise<ContentDetails> {
  const data = await withCache(`tv-${id}`, 3600_000, () =>
    tmdbFetch<TVDetails>(`/tv/${id}`)
  );
  return { ...data, mediaType: 'tv' } as ContentDetails;
}

export async function getTrending(type: 'movie' | 'tv' = 'movie'): Promise<ShowItem[]> {
  return withCache(`trending-${type}`, 300_000, async () => {
    const res = await tmdbFetch<{ results: any[] }>(`/trending/${type}/week`);
    return type === 'movie' ? res.results.map(normalizeMovie) : res.results.map(normalizeTV);
  });
}

export async function getPopular(type: 'movie' | 'tv' = 'movie'): Promise<ShowItem[]> {
  return withCache(`popular-${type}`, 300_000, async () => {
    const res = await tmdbFetch<{ results: any[] }>(`/${type}/popular`);
    return type === 'movie' ? res.results.map(normalizeMovie) : res.results.map(normalizeTV);
  });
}

export async function getByGenre(genreId: string, type: 'movie' | 'tv' = 'movie'): Promise<ShowItem[]> {
  return withCache(`genre-${type}-${genreId}`, 300_000, async () => {
    const res = await tmdbFetch<{ results: any[] }>(`/discover/${type}`, {
      with_genres: genreId,
      sort_by: 'popularity.desc',
    });
    return type === 'movie' ? res.results.map(normalizeMovie) : res.results.map(normalizeTV);
  });
}

export async function getMovieGenres(): Promise<GenreItem[]> {
  return withCache('movie-genres', 86400_000, async () => {
    const res = await tmdbFetch<{ genres: any[] }>('/genre/movie/list');
    return res.genres.map((g: any) => ({ id: String(g.id), name: g.name }));
  });
}

export async function getTVGenres(): Promise<GenreItem[]> {
  return withCache('tv-genres', 86400_000, async () => {
    const res = await tmdbFetch<{ genres: any[] }>('/genre/tv/list');
    return res.genres.map((g: any) => ({ id: String(g.id), name: g.name }));
  });
}

// Legacy exports used by pages.ts - map to TMDB equivalents
export const getHome = async () => {
  const [trendingMovies, trendingTV] = await Promise.all([getTrending('movie'), getTrending('tv')]);
  return { trendingMovies, trendingTV };
};
export const getMostPopular = () => getPopular('movie');
export const getPopularOngoing = () => getPopular('tv');
export const getRecentlyAdded = () => getTrending('movie');
export const getDramaDetails = getMovieDetails; // legacy alias
