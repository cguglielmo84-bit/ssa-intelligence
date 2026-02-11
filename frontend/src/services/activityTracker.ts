/**
 * Activity Tracker Service
 * Batches user activity events and sends them to the backend
 */

import { useEffect, useRef, useCallback } from 'react';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export type ActivityEventType =
  | 'article_open'
  | 'article_close'
  | 'article_link_click'
  | 'page_view'
  | 'page_leave'
  | 'pin'
  | 'unpin'
  | 'export_pdf'
  | 'export_markdown'
  | 'search'
  | 'filter_change';

interface ActivityEvent {
  type: ActivityEventType;
  articleId?: string;
  pagePath?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 10;

let eventQueue: ActivityEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const flushEvents = () => {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0);

  const url = `${API_BASE.replace(/\/$/, '')}/news/activity`;
  const body = JSON.stringify({ events: batch });

  // Try sendBeacon first (reliable on page unload), fall back to fetch
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    const sent = navigator.sendBeacon(url, blob);
    if (sent) return;
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'include',
    keepalive: true,
  }).then((res) => {
    if (res.status === 401) {
      console.warn('[ActivityTracker] 401 Unauthorized — session may have expired');
    }
  }).catch(() => {
    // Fire-and-forget; don't block the UI
  });
};

const startFlushTimer = () => {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (eventQueue.length > 0) flushEvents();
  }, FLUSH_INTERVAL_MS);
};

const stopFlushTimer = () => {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
};

export const trackEvent = (event: ActivityEvent) => {
  eventQueue.push(event);
  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushEvents();
  }
};

/**
 * Hook to automatically track page views and flush on unmount.
 * Mount this once at the app level.
 */
export const useActivityTracker = () => {
  useEffect(() => {
    startFlushTimer();

    const handleBeforeUnload = () => {
      trackEvent({ type: 'page_leave', pagePath: window.location.hash });
      flushEvents();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushEvents();
      stopFlushTimer();
    };
  }, []);

  // Track hash-based page views
  useEffect(() => {
    const handleHashChange = () => {
      trackEvent({ type: 'page_view', pagePath: window.location.hash });
    };

    // Track initial page view
    trackEvent({ type: 'page_view', pagePath: window.location.hash });

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
};

/**
 * Hook to track article open/close with duration.
 * Mount inside article detail views.
 */
export const useArticleViewTracker = (articleId: string | null) => {
  const openTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!articleId) return;

    openTimeRef.current = Date.now();
    trackEvent({ type: 'article_open', articleId });

    return () => {
      if (openTimeRef.current) {
        const durationMs = Date.now() - openTimeRef.current;
        trackEvent({ type: 'article_close', articleId, durationMs });
        openTimeRef.current = null;
      }
    };
  }, [articleId]);
};

/**
 * Returns a stable callback for tracking arbitrary events.
 */
export const useTrackEvent = () => {
  return useCallback((type: ActivityEventType, data?: Omit<ActivityEvent, 'type'>) => {
    trackEvent({ type, ...data });
  }, []);
};
