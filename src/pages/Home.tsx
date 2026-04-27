/**
 * Home Page - AnimeVault
 *
 * The main landing page for AnimeVault.
 * Features:
 * - Hero spotlight carousel with auto‑rotation
 * - Genre quick‑access buttons
 * - Watch history panel (localStorage‑based)
 * - Tabbed sections for trending, seasonal, popular, and top-rated content
 * - SEO‑optimized meta tags and structured data
 * - Responsive grid layouts for anime cards
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronRight, Play, Info, Clock, Flame, 
  TrendingUp, Trophy, Star, Tv, Calendar, Eye, ThumbsUp,
  X, User, MessageSquare, AlertCircle, Zap, Sparkles
} from 'lucide-react';
import { useHomeData } from '../hooks/useAnimeQueries';
import { FALLBACK_IMAGE, FALLBACK_BANNER, formatStatus, formatFormat, AnimeCard as AnimeCardType } from '../services/anilist';
import AnimeCard from '../components/AnimeCard';
import { SkeletonShowCard } from '../components/SkeletonCard';
import SEOHead from '../components/SEOHead';
import DailyRewardPopup from '../components/DailyRewardPopup';
import { useAuth } from '../context/AuthContext';

const WATCH_HISTORY_KEY = 'animevault_history';
const HERO_AUTO_ROTATE_INTERVAL_MS = 6000;

function getWatchHistory(): any[] {
  try {
    return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function removeFromHistory(animeId: number, episodeNum?: number) {
  const history = getWatchHistory().filter(
    h => !(h.id === animeId && (!episodeNum || h.episode === episodeNum))
  );
  localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
}

/** Rotating messages shown in the community banner subtitle */
const BANNER_MESSAGES = [
  'Join 10,000+ Anime Fans!',
  'Share with Friends!',
  'Bookmark Your Favorites!',
  'Join our Discord!',
  'Support the Site!',
];

/** Discord SVG icon */
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.013.043.031.057a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

/** Reddit SVG icon */
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.5 12.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm-11 0c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5zm7.5 4.5c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm-3 2c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1z" />
    </svg>
  );
}

/** Community banner with rotating subtitle and social action buttons */
function CommunityBanner() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % BANNER_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800/80 dark:to-gray-800/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-100 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <Zap className="w-7 h-7 text-white" />
        </div>
        <div className="text-center sm:text-left">
          <h3 className="font-bold text-xl dark:text-white">Love AnimeVault?</h3>
          <p 
            className="text-sm text-gray-600 dark:text-gray-300 transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {BANNER_MESSAGES[msgIndex]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://discord.gg/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join our Discord"
          className="w-11 h-11 bg-[#5865F2] hover:bg-[#4752C4] rounded-full flex items-center justify-center transition-all shadow-md hover:scale-105"
        >
          <DiscordIcon className="w-5 h-5 text-white" />
        </a>
        <a
          href="https://reddit.com/r/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Join our Subreddit"
          className="w-11 h-11 bg-[#FF4500] hover:bg-[#CC3700] rounded-full flex items-center justify-center transition-all shadow-md hover:scale-105"
        >
          <RedditIcon className="w-5 h-5 text-white" />
        </a>
        <button
          aria-label="Community"
          className="w-11 h-11 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
        >
          <MessageSquare className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

/** Hero Spotlight Component */
function HeroSpotlight({ items, loading }: { items: AnimeCardType[]; loading: boolean }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (items.length === 0) return;
    heroTimer.current = setInterval(() => {
      setHeroIndex((i: number) => (i + 1) % items.length);
    }, HERO_AUTO_ROTATE_INTERVAL_MS);
    return () => { if (heroTimer.current) clearInterval(heroTimer.current); };
  }, [items.length]);

  const prevHero = useCallback(() => {
    if (heroTimer.current) clearInterval(heroTimer.current);
    setHeroIndex((i: number) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  const nextHero = useCallback(() => {
    if (heroTimer.current) clearInterval(heroTimer.current);
    setHeroIndex((i: number) => (i + 1) % items.length);
  }, [items.length]);

  const heroItem = items[heroIndex];

  if (loading || !heroItem) {
    return (
      <div className="relative w-full h-[400px] md:h-[520px] rounded-2xl overflow-hidden bg-gray-800 animate-pulse" />
    );
  }

  return (
    <div className="relative w-full h-[400px] md:h-[520px] rounded-2xl overflow-hidden group">
      <img
        src={heroItem.bannerImage || heroItem.image}
        alt={heroItem.title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_BANNER; }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent" />

      {/* Navigation buttons */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={prevHero} 
          className="w-10 h-10 bg-black/50 hover:bg-indigo-600 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="absolute top-1/2 right-4 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={nextHero} 
          className="w-10 h-10 bg-black/50 hover:bg-indigo-600 backdrop-blur-sm rounded-full flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {items.slice(0, 8).map((_, i) => (
          <button
            key={i}
            onClick={() => { setHeroIndex(i); if (heroTimer.current) clearInterval(heroTimer.current); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === heroIndex ? 'w-8 bg-indigo-500' : 'w-1.5 bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 max-w-3xl">
        <div className="flex flex-wrap gap-2 mb-3">
          {heroItem.format && (
            <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              {formatFormat(heroItem.format)}
            </span>
          )}
          {heroItem.episodes && heroItem.episodes !== '?' && (
            <span className="flex items-center gap-1 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              <Tv className="w-3 h-3" /> {heroItem.episodes} eps
            </span>
          )}
          {heroItem.rating !== '?' && (
            <span className="flex items-center gap-1 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-semibold text-white">
              <Star className="w-3 h-3 fill-yellow-400" /> {heroItem.rating}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg line-clamp-2">
          {heroItem.title}
        </h1>
        
        <p className="text-gray-200 text-sm md:text-base mb-4 line-clamp-2 max-w-2xl">
          {heroItem.description ? stripHtml(heroItem.description).slice(0, 120) + '...' : 'No description available.'}
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Link
            to={`/watch/${heroItem.id}/1`}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Play className="w-5 h-5 fill-current" /> Watch Now
          </Link>
          <Link
            to={`/anime/${heroItem.id}`}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-bold transition-all border border-white/20"
          >
            <Info className="w-5 h-5" /> Details
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Section Component with Tabs */
function SectionWithTabs({ 
  title, 
  items, 
  loading, 
  link, 
  icon,
  variant = 'default'
}: { 
  title: string; 
  items?: AnimeCardType[]; 
  loading: boolean; 
  link: string; 
  icon: React.ReactNode;
  variant?: 'default' | 'featured';
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
        </div>
        <Link to={link} className="text-sm text-indigo-500 hover:text-indigo-600 font-semibold transition-colors">
          View All →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => <SkeletonShowCard key={i} />)
        ) : variant === 'featured' ? (
          (items || []).slice(0, 6).map(anime => <AnimeCard key={anime.id} anime={anime} size="large" />)
        ) : (
          (items || []).slice(0, 12).map(anime => <AnimeCard key={anime.id} anime={anime} />)
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isPending: loading, isError } = useHomeData();
  const { user } = useAuth();
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'trending' | 'seasonal'>('trending');
  const navigate = useNavigate();

  useEffect(() => {
    setWatchHistory(getWatchHistory());
    const onStorage = () => setWatchHistory(getWatchHistory());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleRemoveHistory = useCallback((e: React.MouseEvent, animeId: number, episode?: number) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(animeId, episode);
    setWatchHistory(getWatchHistory());
  }, []);

  const heroItems = (activeTab === 'trending' ? data?.trending : data?.seasonal) || [];
  const genres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Mecha'];

  const siteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AnimeVault',
    url: 'https://animevault.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://animevault.com/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  if (isError) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 md:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Failed to Load Content</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Please check your connection and try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-10">
      <SEOHead
        title="AnimeVault – Watch Anime Online Free HD"
        description="Stream anime online free in HD. Watch trending, popular, and seasonal anime with English subtitles and dubs. Updated daily. The best free anime streaming site."
        url="/"
        keywords="watch anime online free, anime streaming, anime website, free anime, sub dub anime, anilist, anime episodes"
        jsonLd={siteJsonLd}
      />
      {user && <DailyRewardPopup />}

      {/* Hero Section */}
      <div className="space-y-4">
        {/* Hero Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('trending')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'trending' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Flame className="w-4 h-4" /> Trending Now
          </button>
          <button
            onClick={() => setActiveTab('seasonal')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'seasonal' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" /> This Season
          </button>
        </div>
        
        <HeroSpotlight items={heroItems} loading={loading} />
      </div>

      {/* Watch History */}
      {watchHistory.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-bold dark:text-white">Continue Watching</h2>
              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400">
                {watchHistory.length}
              </span>
            </div>
            <button 
              onClick={() => { localStorage.removeItem(WATCH_HISTORY_KEY); setWatchHistory([]); }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-3 hide-scrollbar">
            {watchHistory.slice(0, 12).map((item: any) => (
              <Link 
                key={`${item.id}-${item.episode}`} 
                to={`/watch/${item.id}/${item.episode || 1}`}
                className="group shrink-0 w-32 sm:w-36 flex flex-col gap-2"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-800 shadow-md">
                  <img 
                    src={item.image || FALLBACK_IMAGE} 
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                  {item.progress && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  <button
                    onClick={e => handleRemoveHistory(e, item.id, item.episode)}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-sm font-semibold dark:text-gray-200 truncate">{item.title}</p>
                {item.episode && (
                  <p className="text-xs text-indigo-400">Episode {item.episode}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Genre Quick Access */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold dark:text-white">Browse by Genre</h2>
          <Link to="/genres" className="text-sm text-indigo-500 hover:text-indigo-600 font-semibold">View All →</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {genres.map(genre => (
            <Link
              key={genre}
              to={`/genre/${encodeURIComponent(genre)}`}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-sm font-medium transition-all hover:scale-105"
            >
              {genre}
            </Link>
          ))}
        </div>
      </div>

      {/* Community Banner */}
      <CommunityBanner />

      {/* Content Sections */}
      <SectionWithTabs 
        title="Trending Now" 
        items={data?.trending} 
        loading={loading} 
        link="/trending" 
        icon={<Flame className="w-5 h-5 text-orange-500" />}
      />
      
      <SectionWithTabs 
        title="This Season's Hits" 
        items={data?.seasonal} 
        loading={loading} 
        link="/seasonal" 
        icon={<Sparkles className="w-5 h-5 text-green-500" />}
      />
      
      <SectionWithTabs 
        title="Most Popular All Time" 
        items={data?.popular} 
        loading={loading} 
        link="/popular" 
        icon={<Trophy className="w-5 h-5 text-yellow-500" />}
      />
      
      <SectionWithTabs 
        title="Top Rated Anime" 
        items={data?.topRated} 
        loading={loading} 
        link="/top-rated" 
        icon={<Star className="w-5 h-5 text-blue-500" />}
      />

      {/* Ad Banner */}
      <div className="relative w-full h-28 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl overflow-hidden group cursor-pointer">
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-white font-bold text-xl tracking-wider">Advertisement</span>
        </div>
      </div>
    </div>
  );
}
