import { useColorScheme } from 'nativewind';
import Bell from 'phosphor-react-native/src/icons/Bell';
import BellRinging from 'phosphor-react-native/src/icons/BellRinging';
import FunnelSimple from 'phosphor-react-native/src/icons/FunnelSimple';
import ListBullets from 'phosphor-react-native/src/icons/ListBullets';
import Thermometer from 'phosphor-react-native/src/icons/Thermometer';
import Warning from 'phosphor-react-native/src/icons/Warning';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertListSkeleton } from '@/components/ac/alert-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pager } from '@/components/ui/pager';
import { SearchField } from '@/components/ui/search-field';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import * as alertsApi from '@/features/alerts/api';
import type { Alert, AlertKind } from '@/features/alerts/types';
import { useAuth } from '@/features/auth/context';
import { useDebounced } from '@/hooks/use-debounced';
import { usePoll } from '@/hooks/use-poll';
import { useAppearance } from '@/lib/appearance';
import { formatDateTime } from '@/lib/datetime';
import { PAGE_SIZE, type Page } from '@/lib/pagination';

const POLL_MS = 2000;

/** Matches `--primary-foreground`, which the appearance provider pins to white. */
const ON_PRIMARY = '#ffffff';

type PhosphorIcon = typeof Warning;

const KINDS: { label: string; value: AlertKind | null; icon: PhosphorIcon }[] = [
  { label: 'All kinds', value: null, icon: FunnelSimple },
  { label: 'Overload', value: 'overload', icon: Warning },
  { label: 'Temperature', value: 'temperature', icon: Thermometer },
];

/** Scope is a different axis from kind, so it gets its own control next to the list. */
const SCOPES = [
  { label: 'Active', value: false, icon: BellRinging },
  { label: 'All', value: true, icon: ListBullets },
];


export default function AlertsScreen() {
  const { token } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const danger = isDark ? '#f87171' : '#dc2626';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const onPrimary = ON_PRIMARY;

  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<AlertKind | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const scroller = useRef<ScrollView>(null);
  const debouncedQuery = useDebounced(query);

  // A narrowed result set can be shorter than the current offset, which would
  // land the pager on an empty page, so any filter change returns to page one.
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, kind, showAll]);

  // Paging replaces every card, so staying scrolled down would land you in the
  // middle of alerts you have not seen.
  function goToPage(next: number) {
    setOffset(next);
    scroller.current?.scrollTo({ y: 0, animated: true });
  }

  const fetcher = useCallback(
    (signal: AbortSignal) =>
      alertsApi.list(
        token ?? '',
        {
          activeOnly: !showAll,
          q: debouncedQuery,
          kind: kind ?? undefined,
          limit: PAGE_SIZE,
          offset,
        },
        signal
      ),
    [token, showAll, debouncedQuery, kind, offset, nonce]
  );

  // Any filter change resets: the rows on screen no longer answer the new question.
  // Acknowledging only reloads, so one row changing does not blank the list.
  const { data, error } = usePoll<Page<Alert>>(fetcher, POLL_MS, Boolean(token), {
    resetKey: `${showAll}|${kind}|${debouncedQuery}|${offset}`,
    reloadKey: nonce,
  });

  async function acknowledge(id: number) {
    setBusy(id);
    try {
      await alertsApi.acknowledge(token ?? '', id);
      setNonce((n) => n + 1);
    } finally {
      setBusy(null);
    }
  }

  const list = data?.rows ?? [];
  const total = data?.total ?? 0;
  const filtering = debouncedQuery.trim().length > 0 || kind !== null;
  // Null data means the first poll has not landed; an empty page is a real empty result.
  const loading = data === null && error === null;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView
        ref={scroller}
        contentContainerClassName="gap-3 p-4 pb-8"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-2">
          <Bell size={22} weight="fill" color={primary.hex} />
          <Text className="text-lg font-bold">Alerts</Text>
        </View>

        <SearchField value={query} onChangeText={setQuery} placeholder="Search alerts..." />

        <View className="flex-row items-center gap-2">
          {KINDS.map((option) => {
            const selected = kind === option.value;
            const Icon = option.icon;
            return (
              <Button
                key={option.label}
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="flex-1 px-1"
                onPress={() => setKind(option.value)}>
                <Icon size={14} weight="bold" color={selected ? onPrimary : muted} />
                <Text className="text-xs">{option.label}</Text>
              </Button>
            );
          })}
        </View>

        {error ? <Text className="text-destructive text-sm">{error.message}</Text> : null}

        <View className="flex-row items-center justify-between gap-2">
          {loading ? (
            <Skeleton className="h-3 w-32" />
          ) : (
            <Text variant="muted" className="flex-1 text-xs">
              {total} {showAll ? 'total' : 'active'} alert{total === 1 ? '' : 's'}
              {filtering ? ' matching filters' : ''}
            </Text>
          )}
          <Segmented
            options={SCOPES}
            value={showAll}
            onChange={setShowAll}
            activeColor={primary.hex}
            inactiveColor={muted}
          />
        </View>

        {loading ? <AlertListSkeleton /> : null}

        {!loading && list.length === 0 ? (
          <Card className="py-0">
            <CardContent className="items-center gap-1 p-6">
              <Text className="font-semibold">
                {filtering ? 'No matching alerts' : `No ${showAll ? '' : 'active '}alerts`}
              </Text>
              <Text variant="muted" className="text-center text-sm">
                {filtering
                  ? 'Try a different search or kind.'
                  : 'Conditions are within the configured thresholds.'}
              </Text>
            </CardContent>
          </Card>
        ) : null}

        {(loading ? [] : list).map((alert) => {
          const open = alert.acknowledgedAt === null;
          const accent = open ? danger : muted;

          return (
            <Card key={alert.id} className="py-0">
              <CardContent className="gap-2 p-4">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${accent}1f` }}>
                    {alert.kind === 'temperature' ? (
                      <Thermometer size={16} weight="bold" color={accent} />
                    ) : (
                      <Warning size={16} weight="bold" color={accent} />
                    )}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className="font-semibold capitalize leading-none">{alert.kind}</Text>
                    <Text variant="muted" className="text-xs">
                      {formatDateTime(alert.createdAt)}
                    </Text>
                  </View>
                  <Badge variant={open ? 'destructive' : 'secondary'}>
                    <Text>{open ? 'ACTIVE' : 'ACKNOWLEDGED'}</Text>
                  </Badge>
                </View>

                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-2xl font-bold leading-none" style={{ color: accent }}>
                    {alert.value.toFixed(1)}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    vs {alert.threshold} threshold
                  </Text>
                </View>

                <Text variant="muted" className="text-sm">
                  {alert.message}
                </Text>

                {open ? (
                  <Button size="sm" disabled={busy === alert.id} onPress={() => void acknowledge(alert.id)}>
                    <Text>{busy === alert.id ? 'Acknowledging...' : 'Acknowledge alert'}</Text>
                  </Button>
                ) : (
                  <Text variant="muted" className="text-xs">
                    Responded in{' '}
                    {alert.responseMs === null ? '--' : `${(alert.responseMs / 1000).toFixed(1)}s`}
                  </Text>
                )}
              </CardContent>
            </Card>
          );
        })}

        {loading ? null : (
          <Pager
            total={total}
            limit={PAGE_SIZE}
            offset={offset}
            onOffsetChange={goToPage}
            noun="alert"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
