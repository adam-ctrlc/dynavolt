import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, Vibration } from 'react-native';

import * as alertsApi from '@/features/alerts/api';
import { useAuth } from '@/features/auth/context';
import { notifyLocally, registerDevice } from '@/features/notifications/push';
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
  /** Null until the first poll, so opening the app never announces old alerts. */
  const lastCount = useRef<number | null>(null);

  // Remote push covers a closed app, but only from a development build. This is what
  // makes an alert visible in Expo Go, and it costs nothing where push also works.
  useEffect(() => {
    if (!token) return;

    void registerDevice(token);
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    const controller = new AbortController();

    async function tick() {
      try {
        const count = await alertsApi.activeCount(token ?? '', controller.signal);
        if (!active) return;

        // Only a rise means something new opened. Acknowledging lowers the count and
        // must stay silent.
        if (lastCount.current !== null && count > lastCount.current) {
          const raised = count - lastCount.current;
          if (Platform.OS !== 'web') Vibration.vibrate([0, 400, 200, 400, 200, 600]);
          void notifyLocally(
            raised === 1 ? 'Transformer alert' : `${raised} transformer alerts`,
            raised === 1
              ? 'A reading crossed a threshold. Open VITAL to acknowledge it.'
              : 'Readings crossed the thresholds. Open VITAL to acknowledge them.'
          );
        }
        lastCount.current = count;
        setActiveAlerts(count);

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
