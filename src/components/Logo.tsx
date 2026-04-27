import { Link } from 'react-router-dom';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center select-none ${className}`} aria-label="AniWave – Home">
      <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white group-hover:opacity-80 transition-opacity">
        ani<span className="text-indigo-500">wave</span>
      </span>
    </Link>
  );
}
