import { useEffect, useRef, useState } from 'react';

/// Fast heartbeat: re-runs `fetcher` on an interval and keeps the newest value.
export function usePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const saved = useRef(fetcher);

  useEffect(() => {
    saved.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    const controller = new AbortController();

    async function tick() {
      try {
        const result = await saved.current(controller.signal);
        if (active) {
          setData(result);
          setError(null);
        }
      } catch (caught) {
        if (active && (caught as Error).name !== 'AbortError') {
          setError(caught as Error);
        }
      }
    }

    void tick();
    const id = setInterval(() => void tick(), intervalMs);

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [intervalMs, enabled]);

  return { data, error };
}
