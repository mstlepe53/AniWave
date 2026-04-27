import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star, ChevronLeft, ChevronRight, Flame, TrendingUp, Trophy, Tv, Clapperboard, Clock } from 'lucide-react';
import { useHomeData } from '../hooks/useAnimeQueries';
import { FALLBACK_IMAGE, FALLBACK_BANNER, formatStatus, formatFormat, stripHtml, AnimeCard as AnimeCardType } from '../services/anilist';
import AnimeCard from '../components/AnimeCard';
import { SkeletonShowCard } from '../components/SkeletonCard';
import SEOHead from '../components/SEOHead';
import DailyRewardPopup from '../components/DailyRewardPopup';
import { useAuth } from '../context/AuthContext';

const WATCH_HISTORY_KEY = 'animevault_history';
const HERO_INTERVAL = 6500;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]'); } catch { return []; }
}

function HeroSlider({ items }: { items: AnimeCardType[] }) {
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const restart = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setIdx(i => (i + 1) % Math.min(items.length, 8)), HERO_INTERVAL);
  };
  useEffect(() => { restart(); return () => clearInterval(timer.current); }, [items.length]);

  if (!items.length) return null;
  const item = items[Math.min(idx, items.length - 1)];
  const bannerImg = item.image;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden min-h-[340px] md:min-h-[460px] bg-gray-900">
      <img key={item.id} src={bannerImg} alt={item.title}
        className="absolute inset-0 w-full h-full object-cover opacity-35 transition-opacity duration-700 scale-105"
        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_BANNER; }} />
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-900/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />

      <div className="relative z-10 p-6 md:p-12 flex flex-col md:flex-row gap-6 items-end min-h-[340px] md:min-h-[460px]">
        <img src={item.image} alt={item.title}
          className="w-28 md:w-40 aspect-[3/4] object-cover rounded-xl shadow-2xl border-2 border-white/10 hidden sm:block shrink-0"
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
        <div className="flex-1 pb-2 text-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {item.format && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/15 text-white backdrop-blur-sm">{formatFormat(item.format)}</span>}
            {item.episodes && item.episodes !== '?' && <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-white/15 text-white backdrop-blur-sm"><Tv className="w-3 h-3" />{item.episodes}</span>}
            {item.rating !== '?' && <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-white/15 text-white backdrop-blur-sm"><Star className="w-3 h-3" />{item.rating}</span>}
            {item.year && <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-white/15 text-white backdrop-blur-sm">{item.year}</span>}
          </div>
          <h2 className="text-2xl md:text-4xl font-black mb-2 drop-shadow-md line-clamp-2"
            style={{ color: item.color || 'white', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>
            {item.title}
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {item.genres.slice(0, 4).map(g => (
              <Link key={g} to={`/genre/${encodeURIComponent(g)}`}
                className="px-2 py-0.5 text-xs bg-white/10 hover:bg-indigo-500 rounded-full transition-colors">{g}</Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/watch/${item.id}/1`}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-900 rounded-full font-bold active:scale-95 transition-all text-sm hover:bg-gray-100">
              <Play className="w-4 h-4 fill-current" /> Watch Now
            </Link>
            <Link to={`/anime/${item.id}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-black/60 text-white rounded-full font-bold active:scale-95 transition-all backdrop-blur-sm text-sm border border-white/20">
              Details
            </Link>
          </div>
        </div>
      </div>

      <button onClick={() => { setIdx(i => (i - 1 + items.length) % items.length); restart(); }}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button onClick={() => { setIdx(i => (i + 1) % items.length); restart(); }}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-black/40 hover:bg-indigo-600 text-white rounded-full flex items-center justify-center transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {items.slice(0, 8).map((_, i) => (
          <button key={i} onClick={() => { setIdx(i); restart(); }}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-indigo-400' : 'w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}

function Section({ title, items, loading, link, icon }: {
  title: string; items?: AnimeCardType[]; loading: boolean; link: string; icon: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">{icon}{title}</h2>
        <Link to={link} className="text-sm text-indigo-500 hover:underline font-medium">See all →</Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonShowCard key={i} />)
          : (items || []).slice(0, 8).map(a => <AnimeCard key={a.id} anime={a} />)
        }
      </div>
    </div>
  );
}

export default function Home() {
  const { data, isPending: loading } = useHomeData();
  const { user } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [heroTab, setHeroTab] = useState<'trending' | 'seasonal'>('trending');

  useEffect(() => {
    setHistory(getHistory());
    const h = () => setHistory(getHistory());
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  const heroItems = heroTab === 'trending' ? (data?.trending || []) : (data?.seasonal || []);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-10">
      <SEOHead title="AnimeVault – Watch Anime Online Free" description="Stream anime online free in HD. Trending, popular, seasonal anime with sub and dub. Powered by AniList." keywords="watch anime online free, anime streaming, sub dub anime, anilist" />
      {user && <DailyRewardPopup />}

      {/* Hero */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['trending', 'seasonal'] as const).map(t => (
            <button key={t} onClick={() => setHeroTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${heroTab === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
              {t === 'trending' ? <Flame className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
              {t === 'trending' ? 'Trending' : 'This Season'}
            </button>
          ))}
        </div>
        {loading ? <div className="w-full rounded-2xl bg-gray-800 animate-pulse min-h-[340px] md:min-h-[460px]" />
          : <HeroSlider items={heroItems} />}
      </div>

      {/* Continue Watching */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" />Continue Watching</h2>
            <button onClick={() => { localStorage.removeItem(WATCH_HISTORY_KEY); setHistory([]); }}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors">Clear</button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {history.slice(0, 10).map((item: any) => (
              <Link key={item.url} to={item.url} className="group shrink-0 w-28 flex flex-col gap-1">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-800">
                  <img src={item.image || FALLBACK_IMAGE} alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE; }} />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                </div>
                <p className="text-xs font-bold dark:text-gray-300 truncate">{item.title}</p>
                {item.subtitle && <p className="text-[10px] text-indigo-400">{item.subtitle}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Genres */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold dark:text-white">Browse Genres</h2>
          <Link to="/genres" className="text-sm text-indigo-500 hover:underline">All →</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mystery','Romance','Sci-Fi','Slice of Life','Sports','Supernatural'].map(g => (
            <Link key={g} to={`/genre/${encodeURIComponent(g)}`}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full text-sm font-medium transition-colors">
              {g}
            </Link>
          ))}
        </div>
      </div>

      <Section title="Trending Now" items={data?.trending} loading={loading} link="/trending" icon={<Flame className="w-5 h-5 text-orange-500" />} />
      <Section title="This Season" items={data?.seasonal} loading={loading} link="/seasonal" icon={<TrendingUp className="w-5 h-5 text-green-500" />} />
      <Section title="Most Popular" items={data?.popular} loading={loading} link="/popular" icon={<Trophy className="w-5 h-5 text-yellow-500" />} />
      <Section title="Top Rated" items={data?.topRated} loading={loading} link="/top-rated" icon={<Star className="w-5 h-5 text-blue-500 fill-current" />} />
    </div>
  );
}
