import { useColorScheme } from 'nativewind';
import ArrowsClockwise from 'phosphor-react-native/src/icons/ArrowsClockwise';
import ChartLine from 'phosphor-react-native/src/icons/ChartLine';
import MagnifyingGlass from 'phosphor-react-native/src/icons/MagnifyingGlass';
import Warning from 'phosphor-react-native/src/icons/Warning';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';

import { LogListSkeleton } from '@/components/ac/log-skeleton';
import { SourceBadge } from '@/components/ac/source-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pager } from '@/components/ui/pager';
import { SearchField } from '@/components/ui/search-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import { useNotifications } from '@/features/notifications/context';
import * as readingsApi from '@/features/readings/api';
import * as settingsApi from '@/features/settings/api';
import type { Reading, TrendPoint } from '@/features/readings/types';
import { useDebounced } from '@/hooks/use-debounced';
import { useAppearance } from '@/lib/appearance';
import { formatDateTime, formatDayLabel } from '@/lib/datetime';
import { PAGE_SIZE } from '@/lib/pagination';

const CHART_HEIGHT = 150;
const MAX_BAR_WIDTH = 44;
const BAR_GAP = 10;
/** Room under the baseline for day labels. */
const AXIS_HEIGHT = 16;
/** Room above the tallest bar for its value label. */
const LABEL_HEIGHT = 14;

/** Matches `--primary-foreground`, which the appearance provider pins to white. */
const ON_PRIMARY = '#ffffff';

/**
 * Bars rather than a line: the series is usually a handful of days, and a single
 * day has no segment to draw at all.
 */
function TrendChart({
  points,
  color,
  gridColor,
  overColor,
  threshold,
  labelColor,
}: {
  points: TrendPoint[];
  color: string;
  gridColor: string;
  overColor: string;
  threshold: number | null;
  labelColor: string;
}) {
  const [width, setWidth] = useState(0);

  const bars = useMemo(() => {
    if (width <= 0 || points.length === 0) return [];

    // Headroom above the peak so the tallest bar does not touch the value label.
    const ceiling = Math.max(...points.map((p) => p.maxPowerVa), 1) * 1.2;
    const count = points.length;
    const barWidth = Math.min(MAX_BAR_WIDTH, (width - BAR_GAP * (count - 1)) / count);
    const spread = barWidth * count + BAR_GAP * (count - 1);
    const startX = (width - spread) / 2;
    const plot = CHART_HEIGHT - AXIS_HEIGHT - LABEL_HEIGHT;

    return points.map((point, index) => {
      const height = Math.max((point.avgPowerVa / ceiling) * plot, 2);

      return {
        point,
        x: startX + index * (barWidth + BAR_GAP),
        y: CHART_HEIGHT - AXIS_HEIGHT - height,
        width: barWidth,
        height,
        peakY: CHART_HEIGHT - AXIS_HEIGHT - (point.maxPowerVa / ceiling) * plot,
      };
    });
  }, [points, width]);

  const baseline = CHART_HEIGHT - AXIS_HEIGHT;

  return (
    <View
      style={{ height: CHART_HEIGHT }}
      className="w-full"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          {bars.map((bar) => {
            const over = threshold !== null && bar.point.maxPowerVa >= threshold;
            const fill = over ? overColor : color;

            return (
              <G key={bar.point.day}>
                <SvgText
                  x={bar.x + bar.width / 2}
                  y={bar.y - 5}
                  fill={labelColor}
                  fontSize={9}
                  fontWeight="600"
                  textAnchor="middle">
                  {bar.point.avgPowerVa.toFixed(0)}
                </SvgText>
                <Rect x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={4} fill={fill} />
                {/* Peak sits above the average bar, so a spiky day is not hidden by its mean. */}
                <Line
                  x1={bar.x}
                  y1={bar.peakY}
                  x2={bar.x + bar.width}
                  y2={bar.peakY}
                  stroke={fill}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
                <SvgText
                  x={bar.x + bar.width / 2}
                  y={CHART_HEIGHT - 4}
                  fill={labelColor}
                  fontSize={9}
                  textAnchor="middle">
                  {formatDayLabel(bar.point.day)}
                </SvgText>
              </G>
            );
          })}
          <Line x1={0} y1={baseline} x2={width} y2={baseline} stroke={gridColor} strokeWidth={1} />
        </Svg>
      ) : null}
    </View>
  );
}

export default function LogsScreen() {
  const { token } = useAuth();
  const { markLogsSeen } = useNotifications();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const ac = primary.hex;
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const danger = isDark ? '#f87171' : '#dc2626';
  const gridColor = 'rgba(148, 163, 184, 0.25)';

  const [rows, setRows] = useState<Reading[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [query, setQuery] = useState('');
  const [onlyOverload, setOnlyOverload] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState<number | null>(null);

  const scroller = useRef<ScrollView>(null);
  const debouncedQuery = useDebounced(query);

  // The bars are only meaningful against the limit they are judged by.
  useEffect(() => {
    if (!token) return;

    settingsApi
      .read(token)
      .then((current) => setThreshold(current.loadThresholdVa))
      .catch(() => undefined);
  }, [token]);

  // A narrowed result set can be shorter than the current offset, which would
  // land the pager on an empty page, so any filter change returns to page one.
  useEffect(() => {
    setOffset(0);
  }, [debouncedQuery, onlyOverload]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [history, trend] = await Promise.all([
        readingsApi.history(token ?? '', {
          limit: PAGE_SIZE,
          offset,
          status: onlyOverload ? 'overload' : undefined,
          q: debouncedQuery,
        }),
        readingsApi.trend(token ?? '', 7),
      ]);
      setRows(history.rows);
      setTotal(history.total);
      setPoints(trend);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, onlyOverload, debouncedQuery, offset]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Clears the tab dot once this screen's data has loaded.
  useEffect(() => {
    if (!loading) markLogsSeen();
  }, [loading, markLogsSeen]);

  // Paging replaces every row, so staying scrolled down would land you in the
  // middle of records you have not seen.
  function goToPage(next: number) {
    setOffset(next);
    scroller.current?.scrollTo({ y: 0, animated: true });
  }

  const filtering = debouncedQuery.trim().length > 0 || onlyOverload;

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior="padding">
      <ScrollView
        ref={scroller}
        contentContainerClassName="gap-3 p-4 pb-8"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-2">
          <ChartLine size={22} weight="fill" color={ac} />
          <Text className="text-lg font-bold">Data Logs</Text>
        </View>

        <Card className="py-0">
          <CardContent className="gap-2 p-4">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Daily average load (7 days)
            </Text>
            <TrendChart
              points={points}
              color={ac}
              gridColor={gridColor}
              overColor={danger}
              threshold={threshold}
              labelColor={muted}
            />
            <Text variant="muted" className="text-xs">
              {points.length === 0
                ? 'No samples yet'
                : `${points.length} day(s), peak ${Math.max(...points.map((p) => p.maxPowerVa)).toFixed(0)} VA`}
            </Text>
          </CardContent>
        </Card>

        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Search status, source, VA, date..."
        />

        <View className="flex-row items-center gap-2">
          <Button
            variant={onlyOverload ? 'default' : 'outline'}
            size="sm"
            onPress={() => setOnlyOverload((v) => !v)}>
            <Warning size={14} weight="bold" color={onlyOverload ? ON_PRIMARY : muted} />
            <Text>{onlyOverload ? 'Showing overloads' : 'Overloads only'}</Text>
          </Button>
          <Button variant="outline" size="sm" onPress={() => void refresh()}>
            <ArrowsClockwise size={14} weight="bold" color={muted} />
            <Text>Refresh</Text>
          </Button>
          {loading ? (
            <Skeleton className="ml-auto h-3 w-20" />
          ) : (
            <Text variant="muted" className="ml-auto text-xs">
              {total} record{total === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

        {loading ? <LogListSkeleton /> : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            icon={filtering ? MagnifyingGlass : ChartLine}
            title={filtering ? 'No matching records' : 'No records yet'}
            description={
              filtering ? 'Try a different search or filter.' : 'Readings appear here once sampled.'
            }
          />
        ) : null}

        {loading
          ? null
          : rows.map((row) => {
              const over = row.status === 'overload';
              const accent = over ? danger : ac;

              return (
                <Card key={row.id} className="py-0">
                  <CardContent className="gap-2 p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-baseline gap-1.5">
                        <Text className="text-xl font-bold leading-none" style={{ color: accent }}>
                          {row.apparentPowerVa.toFixed(0)}
                        </Text>
                        <Text variant="muted" className="text-xs">
                          VA
                        </Text>
                      </View>
                      <Text
                        className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: over ? danger : muted }}>
                        {row.status}
                      </Text>
                    </View>

                    <View className="flex-row gap-4">
                      <View>
                        <Text variant="muted" className="text-[10px] uppercase">
                          Voltage
                        </Text>
                        <Text className="text-xs font-medium">{row.voltageV.toFixed(1)} V</Text>
                      </View>
                      <View>
                        <Text variant="muted" className="text-[10px] uppercase">
                          Current
                        </Text>
                        <Text className="text-xs font-medium">{row.currentA.toFixed(2)} A</Text>
                      </View>
                      <View>
                        <Text variant="muted" className="text-[10px] uppercase">
                          Temp
                        </Text>
                        <Text className="text-xs font-medium">{row.temperatureC.toFixed(1)} °C</Text>
                      </View>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Text variant="muted" className="flex-1 text-[10px]">
                        {formatDateTime(row.recordedAt)}
                      </Text>
                      <SourceBadge source={row.source} />
                    </View>
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
            noun="record"
            onInputFocus={() =>
              setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 150)
            }
          />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
