/**
 * Watch Page – AniList + Sub/Dub + Multi-Server
 * Fixes:
 *  - Video not playing: removed restrictive sandbox + referrerPolicy, simplified iframe
 *  - Airing countdown NaN: use airingAt (Unix timestamp) to compute seconds remaining
 *  - Button sizes: smaller compact buttons (xs text, smaller padding)
 *  - Menu z-index: Watch page uses z-20 so nav header (z-30) always stays on top
 *  - Button order: SUB/DUB → Servers → Auto-Next in one clean row
 * Route: /watch/:id/:episode
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, SkipBack, SkipForward, Heart, Bookmark, Share2,
  LightbulbOff, AlertCircle, Info, Search, Server, List, Grid3X3,
  RefreshCw, Timer, ChevronRight,
} from 'lucide-react';
import { useAnimeDetails } from '../hooks/useAnimeQueries';
import { FALLBACK_IMAGE, STREAM_SERVERS, AudioType, stripHtml } from '../services/anilist';
import { useAuth } from '../context/AuthContext';
import { useList } from '../hooks/useList';
import SEOHead from '../components/SEOHead';
import Toast from '../components/Toast';
import CommentSection from '../components/comments/CommentSection';

const WATCH_HISTORY_KEY = 'animevault_history';

function addToHistory(item: { title: string; image: string; url: string; subtitle?: string }) {
  try {
    const h = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
    const f = h.filter((x: any) => x.url !== item.url);
    f.unshift(item);
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(f.slice(0, 20)));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

// FIX: Use airingAt (Unix timestamp in seconds) to compute seconds remaining
function getSecondsUntilAiring(airingAt: number): number {
  return Math.max(0, airingAt - Math.floor(Date.now() / 1000));
}

function formatCountdown(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return 'soon';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function buildCard(node: any) {
  return {
    id: node.id,
    title: node.title?.english || node.title?.romaji || '',
    image: node.coverImage?.extraLarge || node.coverImage?.large || FALLBACK_IMAGE,
    rating: node.averageScore ? `${node.averageScore}%` : '?',
    episodes: node.episodes ? `${node.episodes} EP` : '?',
    status: node.status || '',
    format: node.format || '',
    year: node.seasonYear ? String(node.seasonYear) : '',
    genres: node.genres || [],
    color: node.coverImage?.color || null,
    relationType: '',
  };
}

export default function Watch() {
  const { id, episode: epParam } = useParams<{ id: string; episode: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const episode = parseInt(epParam || '1', 10);

  const [audio, setAudio] = useState<AudioType>('sub');
  const [activeServer, setActiveServer] = useState(STREAM_SERVERS[0].id);
  const [lightsOff, setLightsOff] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('Link copied!');
  const [epFilter, setEpFilter] = useState('');
  const [epView, setEpView] = useState<'list' | 'grid'>('grid');
  const [autoNext, setAutoNext] = useState(() => localStorage.getItem('av_autonext') !== 'false');
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null);
  const [airingSecondsLeft, setAiringSecondsLeft] = useState<number | null>(null);
  const autoNextTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const airingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: anime, isPending: loading } = useAnimeDetails(id!);
  const {
    favorited, watchlisted, favLoading, wlLoading,
    handleToggleFavorite, handleToggleWatchlist,
  } = useList(
    id || '', token,
    anime?.title?.english || anime?.title?.romaji || '',
    anime?.coverImage?.extraLarge || '',
  );

  const server = STREAM_SERVERS.find(s => s.id === activeServer) || STREAM_SERVERS[0];
  const embedUrl = id ? server.getUrl(id, episode, audio) : '';
  const totalEps = anime?.episodes || (anime?.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 0) || 0;
  const title = anime ? (anime.title.english || anime.title.romaji || 'Anime') : 'Anime';
  const posterImg = anime?.coverImage?.extraLarge || anime?.coverImage?.large || FALLBACK_IMAGE;

  const prevEp = episode > 1 ? episode - 1 : null;
  const nextEp = totalEps > 0 && episode < totalEps ? episode + 1 : null;
  const nextAiring = anime?.nextAiringEpisode;

  const epNums = totalEps > 0 ? Array.from({ length: totalEps }, (_, i) => i + 1) : [];
  const filteredEps = epFilter ? epNums.filter(n => String(n).includes(epFilter)) : epNums;

  const relations = (anime?.relations?.edges || [])
    .filter((e: any) => e.node?.type === 'ANIME')
    .map((e: any) => ({ ...buildCard(e.node), relationType: e.relationType }));

  useEffect(() => { setIframeError(false); }, [id, episode, activeServer, audio]);

  useEffect(() => {
    if (anime && id) {
      addToHistory({ title, image: posterImg, url: `/watch/${id}/${episode}`, subtitle: `Episode ${episode}` });
    }
  }, [anime, id, episode]);

  // FIX: Live airing countdown using airingAt Unix timestamp (not timeUntilAiring which doesn't exist)
  useEffect(() => {
    if (airingTimer.current) clearInterval(airingTimer.current);
    if (!nextAiring?.airingAt) { setAiringSecondsLeft(null); return; }
    const tick = () => setAiringSecondsLeft(getSecondsUntilAiring(nextAiring.airingAt));
    tick();
    airingTimer.current = setInterval(tick, 60000);
    return () => { if (airingTimer.current) clearInterval(airingTimer.current); };
  }, [nextAiring?.airingAt]);

  const startAutoNext = useCallback(() => {
    if (!autoNext || !nextEp) return;
    setAutoNextCountdown(10);
    if (autoNextTimer.current) clearInterval(autoNextTimer.current);
    autoNextTimer.current = setInterval(() => {
      setAutoNextCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(autoNextTimer.current!);
          navigate(`/watch/${id}/${nextEp}`);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [autoNext, nextEp, id, navigate]);

  const cancelAutoNext = () => {
    if (autoNextTimer.current) clearInterval(autoNextTimer.current);
    setAutoNextCountdown(null);
  };

  useEffect(() => {
    return () => {
      if (autoNextTimer.current) clearInterval(autoNextTimer.current);
      if (airingTimer.current) clearInterval(airingTimer.current);
    };
  }, []);

  const toggleAutoNext = () => {
    const next = !autoNext;
    setAutoNext(next);
    localStorage.setItem('av_autonext', String(next));
    if (!next) cancelAutoNext();
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMsg('Link copied!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch {}
  };

  return (
    // FIX: z-20 ensures page content stays below nav header (z-30) — fixes menu going behind player
    <div className={`max-w-[1600px] mx-auto p-3 md:p-5 relative z-20 ${lightsOff ? 'bg-black' : ''}`}>
      <SEOHead
        title={anime ? `Watch ${title} Episode ${episode} – AnimeVault` : 'Watch Anime – AnimeVault'}
        description={anime ? stripHtml(anime.description).slice(0, 160) : 'Watch anime online free.'}
        image={posterImg}
        url={`/watch/${id}/${episode}`}
        type="video.tv_show"
      />

      {lightsOff && (
        <div
          className="fixed inset-0 bg-black/90 z-25 cursor-pointer"
          onClick={() => setLightsOff(false)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 relative z-20">

        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-3">

          {/* Player */}
          <div className="w-full bg-black rounded-xl overflow-hidden relative aspect-video shadow-2xl">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : iframeError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-6 text-center bg-gray-900">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-sm text-gray-300 max-w-sm">
                  This server could not load. Try switching servers below.
                </p>
                <div className="flex gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setIframeError(false)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                  {STREAM_SERVERS.filter(s => s.id !== activeServer).map(sv => (
                    <button
                      key={sv.id}
                      onClick={() => { setActiveServer(sv.id); setIframeError(false); }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold"
                    >
                      Try {sv.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // FIX: Removed restrictive sandbox + referrerPolicy="no-referrer" that blocked megaplay.buzz
              // Using the same simple iframe as the working deploy version
              <iframe
                key={`${id}-${episode}-${audio}-${activeServer}`}
                src={embedUrl}
                className="absolute inset-0 w-full h-full border-0"
                frameBorder="0"
                scrolling="no"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`${title} Episode ${episode}`}
              />
            )}
          </div>

          {/* Auto-next countdown */}
          {autoNextCountdown !== null && nextEp && (
            <div className="flex items-center justify-between bg-indigo-900/80 border border-indigo-500/50 rounded-xl px-4 py-2.5 text-white">
              <span className="text-sm font-bold flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-400" />
                Episode {nextEp} in{' '}
                <span className="text-indigo-300 font-black text-lg">{autoNextCountdown}s</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/watch/${id}/${nextEp}`)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" /> Play Now
                </button>
                <button
                  onClick={cancelAutoNext}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* FIX: Controls row — compact button sizes, proper order: SUB/DUB → Servers → Auto-Next */}
          <div className="flex flex-wrap items-center gap-1.5">

            {/* SUB / DUB */}
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
              {(['sub', 'dub'] as const).map(a => (
                <button
                  key={a}
                  onClick={() => { setAudio(a); setIframeError(false); }}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-all ${
                    audio === a
                      ? a === 'sub'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {a.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Server buttons */}
            {STREAM_SERVERS.map(sv => (
              <button
                key={sv.id}
                onClick={() => { setActiveServer(sv.id); setIframeError(false); }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeServer === sv.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Server className="w-3 h-3" /> {sv.name}
              </button>
            ))}

            {/* Auto-next */}
            <button
              onClick={toggleAutoNext}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ml-auto ${
                autoNext
                  ? 'bg-green-600/20 text-green-500 border border-green-500/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              <SkipForward className="w-3 h-3" /> Auto {autoNext ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Prev / Next nav */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevEp && navigate(`/watch/${id}/${prevEp}`)}
              disabled={!prevEp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="w-3.5 h-3.5" /> Prev
            </button>

            <span className="flex-1 text-center text-xs font-bold text-gray-500 dark:text-gray-400">
              Episode {episode}{totalEps > 0 ? ` / ${totalEps}` : ''}
            </span>

            <button
              onClick={() => { if (nextEp) { cancelAutoNext(); navigate(`/watch/${id}/${nextEp}`); } }}
              disabled={!nextEp}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setLightsOff(!lightsOff)}
              className={`p-1.5 rounded-lg transition-colors ${
                lightsOff
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title="Lights off"
            >
              <LightbulbOff className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={share}
              className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* FIX: Next airing countdown — uses airingAt timestamp, no more NaN */}
          {nextAiring && nextAiring.episode > episode && airingSecondsLeft !== null && airingSecondsLeft > 0 && (
            <div className="flex items-center gap-3 bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-2.5">
              <Timer className="w-4 h-4 text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-green-400">
                  Episode {nextAiring.episode} airs in {formatCountdown(airingSecondsLeft)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Next episode airing countdown</p>
              </div>
            </div>
          )}

          {/* Title + actions */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1 border-t border-gray-200 dark:border-gray-800">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 dark:text-white truncate">
                {loading ? 'Loading...' : `${title} – Episode ${episode}`}
              </h1>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  audio === 'sub'
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                }`}>
                  {audio === 'sub' ? 'JP SUB' : 'EN DUB'}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  {server.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleFavorite}
                disabled={!token || favLoading}
                className={`p-1.5 rounded-lg transition-colors ${
                  favorited
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                } disabled:opacity-50`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleToggleWatchlist}
                disabled={!token || wlLoading}
                className={`p-1.5 rounded-lg transition-colors ${
                  watchlisted
                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                } disabled:opacity-50`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${watchlisted ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Anime info card */}
          {anime && (
            <div className="flex gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
              <img
                src={posterImg}
                alt={title}
                className="w-14 aspect-[3/4] object-cover rounded-lg shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
              />
              <div className="flex-1 min-w-0">
                <Link
                  to={`/anime/${id}`}
                  className="text-sm font-bold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 block mb-1 truncate"
                >
                  {title}
                </Link>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {(anime.genres || []).slice(0, 3).map((g: string) => (
                    <Link
                      key={g}
                      to={`/genre/${encodeURIComponent(g)}`}
                      className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-[10px] font-medium"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {stripHtml(anime.description)}
                </p>
                <Link
                  to={`/anime/${id}`}
                  className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline font-medium mt-1"
                >
                  <Info className="w-3 h-3" /> Full Details
                </Link>
              </div>
            </div>
          )}

          {/* Comments */}
          <CommentSection episodeId={`anime-${id}-ep${episode}`} />
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Episode List */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
              <span className="text-sm font-bold dark:text-white shrink-0">
                Episodes {totalEps > 0 ? `(${totalEps})` : ''}
              </span>
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Jump to..."
                  value={epFilter}
                  onChange={e => setEpFilter(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  onClick={() => setEpView('list')}
                  className={`p-1.5 transition-colors ${epView === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEpView('grid')}
                  className={`p-1.5 transition-colors ${epView === 'grid' ? 'bg-indigo-600 text-white' : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <Grid3X3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {totalEps === 0 && !loading ? (
                <div className="p-4 text-center text-sm text-gray-500">Episode info unavailable.</div>
              ) : loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 m-2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))
              ) : filteredEps.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No episodes match.</div>
              ) : epView === 'grid' ? (
                <div className="grid grid-cols-6 gap-1.5 p-2">
                  {filteredEps.map(ep => {
                    const isActive = ep === episode;
                    return (
                      <Link
                        key={ep}
                        to={`/watch/${id}/${ep}`}
                        className={`aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-[#1a1a2e] text-gray-600 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }`}
                      >
                        {isActive ? <Play className="w-3.5 h-3.5 fill-current" /> : ep}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                filteredEps.map(ep => {
                  const isActive = ep === episode;
                  const epThumb = anime?.streamingEpisodes?.[ep - 1]?.thumbnail || posterImg;
                  const epUrl = `/watch/${id}/${ep}`;
                  const epTitle = anime?.streamingEpisodes?.[ep - 1]?.title;
                  return (
                    <Link
                      key={ep}
                      to={epUrl}
                      onClick={() => addToHistory({ title, image: epThumb, url: epUrl, subtitle: `Episode ${ep}` })}
                      className={`flex gap-2 p-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group items-center ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    >
                      <div className="w-12 h-8 shrink-0 rounded overflow-hidden bg-gray-200 dark:bg-gray-700 relative">
                        <img
                          src={epThumb}
                          alt={`Ep ${ep}`}
                          className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                          <Play className="w-3 h-3 text-white fill-current" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${
                          isActive
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-900 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                        }`}>
                          Ep {ep}
                          {epTitle && epTitle !== `Episode ${ep}` && (
                            <span className="text-gray-400 ml-1 font-normal text-[10px]">– {epTitle}</span>
                          )}
                        </p>
                        <span className={`text-[10px] px-1 py-0.5 rounded font-bold ${
                          audio === 'sub'
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500'
                            : 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'
                        }`}>
                          {audio.toUpperCase()}
                        </span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Related Anime / Seasons */}
          {relations.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-3 border-b border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold dark:text-white">Related & Seasons</h3>
              </div>
              <div className="p-3 space-y-2">
                {relations.map((r: any) => (
                  <Link
                    key={r.id}
                    to={`/anime/${r.id}`}
                    className="flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-1.5 transition-colors group"
                  >
                    <img
                      src={r.image}
                      alt={r.title}
                      className="w-10 aspect-[2/3] object-cover rounded-lg shrink-0"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                    />
                    <div className="flex-1 min-w-0 py-0.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase block mb-0.5">
                        {r.relationType?.replace(/_/g, ' ')}
                      </span>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2">
                        {r.title}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {r.format?.replace(/_/g, ' ')} {r.year ? `· ${r.year}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast message={toastMsg} show={showToast} />
    </div>
  );
}
