import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as alertsApi from '@/features/alerts/api';
import { useAuth } from '@/features/auth/context';
import * as readingsApi from '@/features/readings/api';

const POLL_MS = 5000;

type NotificationsValue = {
  /** Unacknowledged alerts. Stays lit until someone acknowledges them. */
  activeAlerts: number;
  /** Overload readings recorded since the Logs tab was last opened. */
  newOverloads: number;
  markLogsSeen: () => void;
};

const NotificationsContext = createContext<NotificationsValue>({
  activeAlerts: 0,
  newOverloads: 0,
  markLogsSeen: () => undefined,
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({
  children,
  watchLogs,
}: {
  children: ReactNode;
  watchLogs: boolean;
}) {
  const { token } = useAuth();

  const [activeAlerts, setActiveAlerts] = useState(0);
  const [overloadTotal, setOverloadTotal] = useState<number | null>(null);
  const [seenOverloads, setSeenOverloads] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const controller = new AbortController();

    async function tick() {
      try {
        const count = await alertsApi.activeCount(token ?? '', controller.signal);
        if (active) setActiveAlerts(count);

        if (!watchLogs) return;

        const overloads = await readingsApi.history(
          token ?? '',
          { status: 'overload', limit: 1 },
          controller.signal
        );
        if (active) setOverloadTotal(overloads.total);
      } catch {
        // A failed poll just leaves the badge as it was; the screens surface errors.
      }
    }

    void tick();
    const id = setInterval(() => void tick(), POLL_MS);

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, [token, watchLogs]);

  // The first successful poll establishes the baseline, so opening the app does
  // not light the badge for overloads that were already there.
  useEffect(() => {
    if (overloadTotal !== null && seenOverloads === null) setSeenOverloads(overloadTotal);
  }, [overloadTotal, seenOverloads]);

  const markLogsSeen = useCallback(() => {
    setSeenOverloads(overloadTotal ?? 0);
  }, [overloadTotal]);

  const newOverloads =
    overloadTotal === null || seenOverloads === null ? 0 : Math.max(0, overloadTotal - seenOverloads);

  const value = useMemo(
    () => ({ activeAlerts, newOverloads, markLogsSeen }),
    [activeAlerts, newOverloads, markLogsSeen]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
