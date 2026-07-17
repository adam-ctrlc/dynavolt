import { useColorScheme } from 'nativewind';
import ChartLine from 'phosphor-react-native/src/icons/ChartLine';
import MagnifyingGlass from 'phosphor-react-native/src/icons/MagnifyingGlass';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Polyline } from 'react-native-svg';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as readingsApi from '@/features/readings/api';
import type { Reading, TrendPoint } from '@/features/readings/types';
import { useAppearance } from '@/lib/appearance';

const CHART_HEIGHT = 120;

function TrendChart({ points, color, gridColor }: { points: TrendPoint[]; color: string; gridColor: string }) {
  const [width, setWidth] = useState(0);

  const polyline = useMemo(() => {
    if (width <= 0 || points.length === 0) return '';
    const values = points.map((p) => p.avgPowerVa);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    const step = points.length > 1 ? width / (points.length - 1) : 0;

    return points
      .map((point, index) => {
        const x = points.length > 1 ? index * step : width / 2;
        const y = CHART_HEIGHT - ((point.avgPowerVa - min) / span) * (CHART_HEIGHT - 16) - 8;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [points, width]);

  return (
    <View
      style={{ height: CHART_HEIGHT }}
      className="w-full"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Line x1={0} y1={CHART_HEIGHT / 2} x2={width} y2={CHART_HEIGHT / 2} stroke={gridColor} strokeWidth={1} />
          {polyline ? (
            <Polyline
              points={polyline}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

export default function LogsScreen() {
  const { token } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const ac = primary.hex;
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const gridColor = 'rgba(148, 163, 184, 0.25)';

  const [rows, setRows] = useState<Reading[]>([]);
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [query, setQuery] = useState('');
  const [onlyOverload, setOnlyOverload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [history, trend] = await Promise.all([
        readingsApi.history(token ?? '', 200, onlyOverload ? 'overload' : undefined),
        readingsApi.trend(token ?? '', 7),
      ]);
      setRows(history);
      setPoints(trend);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }, [token, onlyOverload]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.status, row.source, row.apparentPowerVa.toFixed(0), new Date(row.recordedAt).toLocaleString()]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [rows, query]);

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top']}>
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <ChartLine size={22} weight="fill" color={ac} />
            <Text className="text-lg font-bold">Data Logs</Text>
          </View>
          <Button variant="outline" size="sm" onPress={() => void refresh()}>
            <Text>Refresh</Text>
          </Button>
        </View>

        <Card>
          <CardContent className="gap-2 pt-0">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Daily average load (7 days)
            </Text>
            <TrendChart points={points} color={ac} gridColor={gridColor} />
            <Text variant="muted" className="text-xs">
              {points.length === 0
                ? 'No samples yet'
                : `${points.length} day(s), peak ${Math.max(...points.map((p) => p.maxPowerVa)).toFixed(0)} VA`}
            </Text>
          </CardContent>
        </Card>

        <View className="border-border flex-row items-center gap-2 rounded-md border px-3">
          <MagnifyingGlass size={18} color={muted} />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search logs..."
            className="h-11 flex-1 border-0 shadow-none"
          />
        </View>

        <Button variant={onlyOverload ? 'default' : 'outline'} size="sm" onPress={() => setOnlyOverload((v) => !v)}>
          <Text>{onlyOverload ? 'Showing overloads' : 'Show overloads only'}</Text>
        </Button>

        {error ? <Text className="text-destructive text-sm">{error}</Text> : null}

        <Text variant="muted" className="text-xs">
          {filtered.length} record(s)
        </Text>

        {filtered.map((row) => (
          <Card key={row.id} className="py-0">
            <CardContent className="flex-row items-center justify-between p-3">
              <View className="gap-0.5">
                <Text className="text-sm font-semibold">
                  {row.apparentPowerVa.toFixed(0)} VA
                </Text>
                <Text variant="muted" className="text-xs">
                  {row.voltageV.toFixed(1)} V | {row.currentA.toFixed(2)} A | {row.temperatureC.toFixed(1)} C
                </Text>
                <Text variant="muted" className="text-xs">
                  {new Date(row.recordedAt).toLocaleString()} | {row.source}
                </Text>
              </View>
              <Text
                className="text-xs font-semibold uppercase"
                style={{ color: row.status === 'overload' ? '#dc2626' : muted }}>
                {row.status}
              </Text>
            </CardContent>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
