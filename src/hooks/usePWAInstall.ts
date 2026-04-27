/**
 * usePWAInstall Hook
 *
 * Handles Progressive Web App (PWA) install prompts and platform detection.
 * Manages when to show the install prompt based on user engagement:
 * - Minimum session time (90 seconds)
 * - Minimum page views (2 pages)
 * - Dismissal cooldown (7 days)
 *
 * Supports Android (beforeinstallprompt), iOS (manual instructions), and desktop.
 */
import { useEffect, useState, useCallback } from 'react';

type Platform = 'android' | 'ios' | 'desktop' | 'unknown';

interface PWAInstallState {
  canInstall: boolean;
  isIOS: boolean;
  platform: Platform;
  isStandalone: boolean;
  showPrompt: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
  dismissLater: () => void;
}

const DISMISS_KEY = 'streamvault_install_dismissed';
const PAGE_COUNT_KEY = 'streamvault_page_count';
const SESSION_START_KEY = 'streamvault_session_start';

const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;
const MIN_TIME_MS = 90_000;
const MIN_PAGES = 2;

function getPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream) return 'ios';
  if (window.matchMedia('(pointer: coarse)').matches) return 'android';
  return 'desktop';
}

function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < DISMISS_TTL;
  } catch {
    return false;
  }
}

function incrementPageCount(): number {
  try {
    const current = parseInt(sessionStorage.getItem(PAGE_COUNT_KEY) || '0', 10);
    const next = current + 1;
    sessionStorage.setItem(PAGE_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

function getSessionAge(): number {
  try {
    const start = sessionStorage.getItem(SESSION_START_KEY);
    if (!start) {
      sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
      return 0;
    }
    return Date.now() - parseInt(start, 10);
  } catch {
    return 0;
  }
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const platform = getPlatform();
  const isIOS = platform === 'ios';
  const standalone = isStandaloneMode();

  useEffect(() => {
    if (standalone || wasDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> });
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [standalone]);

  useEffect(() => {
    if (standalone || wasDismissedRecently()) return;

    getSessionAge();
    const pages = incrementPageCount();

    function tryShow() {
      const age = getSessionAge();
      if (age >= MIN_TIME_MS && pages >= MIN_PAGES) {
        setShowPrompt(true);
      }
    }

    if (pages >= 4) {
      const delay = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(delay);
    }

    const delay = setTimeout(tryShow, MIN_TIME_MS);
    return () => clearTimeout(delay);
  }, [standalone]);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
    if (outcome === 'accepted') {
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    }
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  const dismissLater = useCallback(() => {
    setShowPrompt(false);
  }, []);

  const canInstall = !standalone && !wasDismissedRecently() && (!!deferredPrompt || isIOS);

  return {
    canInstall,
    isIOS,
    platform,
    isStandalone: standalone,
    showPrompt: showPrompt && canInstall,
    install,
    dismiss,
    dismissLater,
  };
}
