import { useCallback, useEffect, useRef, useState } from "react";

export const DASHBOARD_RANKING_ALL = 0;
export const DASHBOARD_RANKING_PREFETCH_MS = 280;

export function useDashboardRankingExpand<T>(
  load: () => Promise<T>,
  options?: { allowPrefetch?: boolean },
) {
  const allowPrefetch = options?.allowPrefetch ?? true;
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<Promise<T> | null>(null);
  const timerRef = useRef(0);

  const start = useCallback(() => {
    if (requestRef.current) return;
    setLoading(true);
    const request = load()
      .then((next) => {
        setData(next);
        setError(null);
        return next;
      })
      .catch((reason) => {
        requestRef.current = null;
        const message = reason instanceof Error ? reason.message : String(reason);
        setError(message);
        throw reason;
      })
      .finally(() => setLoading(false));
    requestRef.current = request;
  }, [load]);

  const prefetch = useCallback(() => {
    if (!allowPrefetch) return;
    if (requestRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      start();
    }, DASHBOARD_RANKING_PREFETCH_MS);
  }, [allowPrefetch, start]);

  const openDialog = useCallback(() => {
    window.clearTimeout(timerRef.current);
    start();
    setOpen(true);
  }, [start]);

  const closeDialog = useCallback(() => setOpen(false), []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  return { open, openDialog, closeDialog, prefetch, data, error, loading };
}
