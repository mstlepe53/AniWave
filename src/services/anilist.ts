/**
 * AniList GraphQL API Service
 * Primary source for all anime data.
 * AniList ID is used as the streaming ID for all embed URLs.
 */

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

export const FALLBACK_IMAGE = 'https://placehold.co/300x400/0f0f1a/6366f1?text=No+Image';
export const FALLBACK_BANNER = 'https://placehold.co/1280x400/0f0f1a/6366f1?text=AnimeVault';

// ─── Embed URL builders ──────────────────────────────────────────────────────
export type AudioType = 'sub' | 'dub';

export interface StreamServer {
  id: string;
  name: string;
  getUrl: (anilistId: string | number, episode: number, audio: AudioType) => string;
}

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: 'fast',
    name: 'Fast',
    // megaplay.buzz requires no referrer - handled via iframe referrerpolicy
    getUrl: (id, ep, audio) => `https://megaplay.buzz/stream/ani/${id}/${ep}/${audio}`,
  },
  {
    id: 'vidnest',
    name: 'VidNest',
    getUrl: (id, ep, audio) => `https://vidnest.fun/animepahe/${id}/${ep}/${audio}`,
  },
  {
    id: 'anime4up',
    name: 'Server 3',
    getUrl: (id, ep, audio) => `https://player.anime4up.tv/?id=${id}&ep=${ep}&type=${audio}`,
  },
];

// ─── GraphQL query helper ────────────────────────────────────────────────────
async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList request failed: ${res.status}`);
  const json = await res.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'AniList GraphQL error');
  }
  return json.data as T;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface AnimeTitle {
  romaji: string;
  english: string | null;
  native: string | null;
}

export interface AnimeTag {
  name: string;
  rank: number;
  isMediaSpoiler: boolean;
}

export interface AnimeStudio {
  id: number;
  name: string;
  isAnimationStudio: boolean;
}

export interface AnimeCharacter {
  id: number;
  name: { full: string };
  image: { medium: string };
  role: string;
}

export interface AnimeStaff {
  id: number;
  name: { full: string };
  image: { medium: string };
  primaryOccupations: string[];
}

export interface AnimeTrailer {
  id: string;
  site: string;
}

export interface AnimeRelation {
  id: number;
  title: AnimeTitle;
  coverImage: { large: string; medium: string };
  type: string;
  format: string;
  status: string;
}

export interface AnilistAnime {
  id: number;
  title: AnimeTitle;
  description: string | null;
  coverImage: { extraLarge: string; large: string; medium: string; color: string | null };
  bannerImage: string | null;
  genres: string[];
  tags: AnimeTag[];
  averageScore: number | null;
  popularity: number;
  favourites: number;
  episodes: number | null;
  duration: number | null;
  status: string;
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  format: string;
  source: string | null;
  countryOfOrigin: string | null;
  isAdult: boolean;
  trailer: AnimeTrailer | null;
  studios: { nodes: AnimeStudio[] };
  characters: { edges: { node: AnimeCharacter; role: string }[] };
  staff: { edges: { node: AnimeStaff; role: string }[] };
  relations: { edges: { node: AnimeRelation; relationType: string }[] };
  recommendations: { nodes: { mediaRecommendation: AnilistAnime | null }[] };
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  synonyms: string[];
  streamingEpisodes: { title: string; thumbnail: string; url: string }[];
}

// Normalized card type used everywhere in the UI
export interface AnimeCard {
  id: number;
  title: string;
  image: string;
  rating: string;
  episodes: string;
  status: string;
  format: string;
  year: string;
  genres: string[];
  color: string | null;
}

function normalizeCard(a: AnilistAnime): AnimeCard {
  return {
    id: a.id,
    title: a.title.english || a.title.romaji || a.title.native || 'Unknown',
    image: a.coverImage?.extraLarge || a.coverImage?.large || a.coverImage?.medium || FALLBACK_IMAGE,
    rating: a.averageScore ? `${a.averageScore}%` : '?',
    episodes: a.episodes ? `${a.episodes} EP` : '?',
    status: a.status || '',
    format: a.format || '',
    year: a.seasonYear ? String(a.seasonYear) : (a.startDate?.year ? String(a.startDate.year) : ''),
    genres: a.genres?.slice(0, 3) || [],
    color: a.coverImage?.color || null,
  };
}

// ─── Fragments ──────────────────────────────────────────────────────────────
const CARD_FRAGMENT = `
  id
  title { romaji english native }
  coverImage { extraLarge large medium color }
  averageScore
  popularity
  episodes
  status
  format
  seasonYear
  startDate { year month day }
  genres
`;

const FULL_FRAGMENT = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { extraLarge large medium color }
  bannerImage
  genres
  tags { name rank isMediaSpoiler }
  averageScore
  popularity
  favourites
  episodes
  duration
  status
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  format
  source
  countryOfOrigin
  isAdult
  trailer { id site }
  synonyms
  studios(isMain: true) { nodes { id name isAnimationStudio } }
  characters(sort: ROLE, perPage: 12) {
    edges { role node { id name { full } image { medium } } }
  }
  staff(perPage: 8) {
    edges { role node { id name { full } image { medium } } }
  }
  relations {
    edges {
      relationType
      node {
        id title { romaji english } coverImage { large medium }
        type format status
      }
    }
  }
  recommendations(perPage: 8) {
    nodes {
      mediaRecommendation {
        id title { romaji english } coverImage { extraLarge large }
        averageScore episodes format seasonYear
      }
    }
  }
  nextAiringEpisode { episode airingAt }
  streamingEpisodes { title thumbnail url }
`;

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getTrending(page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getPopular(page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getTopRated(page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: SCORE_DESC, type: ANIME, isAdult: false, minimumTagRank: 60) { ${CARD_FRAGMENT} }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getSeasonalAnime(page = 1, perPage = 20): Promise<AnimeCard[]> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const season = month < 3 ? 'WINTER' : month < 6 ? 'SPRING' : month < 9 ? 'SUMMER' : 'FALL';
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { season, year, page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getMovies(page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(format: MOVIE, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getByGenre(genre: string, page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(genre: $genre, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { genre, page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function searchAnime(query: string, page = 1, perPage = 20): Promise<AnimeCard[]> {
  const data = await gql<{ Page: { media: AnilistAnime[] } }>(`
    query($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, sort: SEARCH_MATCH, type: ANIME, isAdult: false) { ${CARD_FRAGMENT} }
      }
    }
  `, { search: query, page, perPage });
  return data.Page.media.map(normalizeCard);
}

export async function getAnimeDetails(id: number | string): Promise<AnilistAnime> {
  const data = await gql<{ Media: AnilistAnime }>(`
    query($id: Int) {
      Media(id: $id, type: ANIME) { ${FULL_FRAGMENT} }
    }
  `, { id: Number(id) });
  return data.Media;
}

export async function getHomeData() {
  const [trending, popular, topRated, seasonal] = await Promise.all([
    getTrending(1, 15),
    getPopular(1, 15),
    getTopRated(1, 15),
    getSeasonalAnime(1, 15),
  ]);
  return { trending, popular, topRated, seasonal };
}

export const ANIME_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
  'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
  'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

// Format helpers
export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    FINISHED: 'Finished', RELEASING: 'Airing', NOT_YET_RELEASED: 'Upcoming',
    CANCELLED: 'Cancelled', HIATUS: 'Hiatus',
  };
  return map[status] || status;
}

export function formatFormat(format: string): string {
  const map: Record<string, string> = {
    TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special',
    OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music',
  };
  return map[format] || format;
}

export function formatDate(d: { year: number | null; month: number | null; day: number | null }): string {
  if (!d?.year) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.month ? `${months[d.month - 1]} ${d.day || ''}, ${d.year}`.trim() : String(d.year);
}

export function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").trim();
}
