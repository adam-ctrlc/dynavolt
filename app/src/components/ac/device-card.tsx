import { useColorScheme } from 'nativewind';
import CheckCircle from 'phosphor-react-native/src/icons/CheckCircle';
import Eye from 'phosphor-react-native/src/icons/Eye';
import EyeSlash from 'phosphor-react-native/src/icons/EyeSlash';
import Password from 'phosphor-react-native/src/icons/Password';
import PencilSimple from 'phosphor-react-native/src/icons/PencilSimple';
import Check from 'phosphor-react-native/src/icons/Check';
import WarningCircle from 'phosphor-react-native/src/icons/WarningCircle';
import WifiHigh from 'phosphor-react-native/src/icons/WifiHigh';
import WifiSlash from 'phosphor-react-native/src/icons/WifiSlash';
import X from 'phosphor-react-native/src/icons/X';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconInput } from '@/components/ui/icon-input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as deviceApi from '@/features/device/api';
import type { ConnectionEvent, DeviceStatus, WifiConfig } from '@/features/device/types';
import { useAppearance } from '@/lib/appearance';
import { formatShortDateTime } from '@/lib/datetime';

const ON_PRIMARY = '#ffffff';
const STATUS_POLL_MS = 5000;

function uptimeLabel(seconds: number | null): string {
  if (seconds === null) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text variant="muted" className="text-[10px] uppercase">
        {label}
      </Text>
      <Text className="text-xs font-medium">{value}</Text>
    </View>
  );
}

export function DeviceCard() {
  const { token } = useAuth();
  const { primary } = useAppearance();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const muted = isDark ? '#a1a1aa' : '#71717a';
  const danger = isDark ? '#f87171' : '#dc2626';

  const [status, setStatus] = useState<DeviceStatus | null>(null);
  const [history, setHistory] = useState<ConnectionEvent[]>([]);
  const [config, setConfig] = useState<WifiConfig | null>(null);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [live, events, wifi] = await Promise.all([
        deviceApi.status(token ?? ''),
        deviceApi.history(token ?? ''),
        deviceApi.wifi(token ?? ''),
      ]);
      setStatus(live);
      setHistory(events);
      setConfig(wifi);
      setSsid(wifi.wifiSsid);
      setPassword(wifi.wifiPassword);
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the link state fresh without refetching the config being edited.
  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const id = setInterval(() => {
      deviceApi
        .status(token, controller.signal)
        .then(setStatus)
        .catch(() => undefined);
    }, STATUS_POLL_MS);

    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [token]);

  function cancel() {
    setSsid(config?.wifiSsid ?? '');
    setPassword(config?.wifiPassword ?? '');
    setEditing(false);
    setReveal(false);
    setError(null);
    setSaved(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const next = await deviceApi.updateWifi(token ?? '', ssid, password);
      setConfig(next);
      setSsid(next.wifiSsid);
      setPassword(next.wifiPassword);
      setEditing(false);
      setReveal(false);
      setSaved('Network saved. The ESP32 uses it on its next connect.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.connected ?? false;
  const accent = connected ? primary.hex : danger;
  const dirty = ssid !== (config?.wifiSsid ?? '') || password !== (config?.wifiPassword ?? '');

  return (
    <View className="gap-4">
      <Card className="gap-0 py-0">
        <CardHeader className="border-border flex-row items-center justify-between border-b p-4">
          <View className="flex-1 gap-0.5">
            <CardTitle className="text-base">ESP32 device</CardTitle>
            <Text variant="muted" className="text-xs">
              The sensor board that reports readings.
            </Text>
          </View>
          {loading ? (
            <Skeleton className="h-5 w-20 rounded-full" />
          ) : (
            <Badge variant={connected ? 'default' : 'destructive'}>
              <Text>{connected ? 'CONNECTED' : 'OFFLINE'}</Text>
            </Badge>
          )}
        </CardHeader>

        <CardContent className="gap-3 p-4">
          {loading ? (
            <>
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </>
          ) : (
            <>
              <View className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${accent}1f` }}>
                  {connected ? (
                    <WifiHigh size={20} weight="bold" color={accent} />
                  ) : (
                    <WifiSlash size={20} weight="bold" color={accent} />
                  )}
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="text-sm font-semibold">{status?.ssid ?? '--'}</Text>
                  <Text variant="muted" className="text-xs">
                    {connected
                      ? `Last seen ${status?.lastSeenLabel ?? '--'}`
                      : 'No report received'}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-x-6 gap-y-2">
                <Detail label="Device" value={status?.deviceId ?? '--'} />
                <Detail label="IP" value={status?.ipAddress ?? '--'} />
                <Detail
                  label="Signal"
                  value={status?.signalDbm === null ? '--' : `${status?.signalDbm} dBm`}
                />
                <Detail label="Uptime" value={uptimeLabel(status?.uptimeSeconds ?? null)} />
                <Detail label="Firmware" value={status?.firmware ?? '--'} />
              </View>

              {status?.simulated ? (
                <View className="flex-row items-center gap-1.5">
                  <WarningCircle size={13} weight="bold" color={muted} />
                  <Text variant="muted" className="flex-1 text-[10px]">
                    Placeholder values. No ESP32 is reporting yet.
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-border flex-row items-center justify-between border-b p-4">
          <View className="flex-1 gap-0.5">
            <CardTitle className="text-base">Wi-Fi network</CardTitle>
            <Text variant="muted" className="text-xs">
              Where the ESP32 connects on boot.
            </Text>
          </View>
          {editing || loading ? null : (
            <Button
              variant="outline"
              size="sm"
              disabled={!connected}
              onPress={() => setEditing(true)}>
              <PencilSimple size={14} weight="bold" color={connected ? primary.hex : muted} />
              <Text>Edit</Text>
            </Button>
          )}
        </CardHeader>

        <CardContent className="gap-4 p-4">
          {loading ? (
            <>
              <Skeleton className="h-11 w-full rounded-md" />
              <Skeleton className="h-11 w-full rounded-md" />
            </>
          ) : (
            <>
              {connected ? null : (
                <View className="flex-row items-start gap-1.5">
                  <WarningCircle size={13} weight="bold" color={muted} />
                  <Text variant="muted" className="flex-1 text-[10px]">
                    The board stores these credentials itself, so the network can only be changed
                    while it is connected.
                  </Text>
                </View>
              )}
              <View className="gap-1.5">
                <Text className="text-sm font-medium">Network name (SSID)</Text>
                <IconInput
                  icon={WifiHigh}
                  iconColor={primary.hex}
                  value={ssid}
                  onChangeText={setSsid}
                  editable={editing}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="DynaVolt-Field"
                />
              </View>

              <View className="gap-1.5">
                <Text className="text-sm font-medium">Password</Text>
                <IconInput
                  icon={Password}
                  iconColor={primary.hex}
                  value={password}
                  onChangeText={setPassword}
                  editable={editing}
                  secureTextEntry={!reveal}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Open network"
                  action={{
                    icon: reveal ? EyeSlash : Eye,
                    label: reveal ? 'Hide password' : 'Show password',
                    onPress: () => setReveal((v) => !v),
                  }}
                />
                <Text variant="muted" className="text-[10px]">
                  Leave empty for an open network. WPA2 needs 8 to 63 characters.
                </Text>
              </View>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
              {saved ? <Text className="text-primary text-sm">{saved}</Text> : null}

              {editing ? (
                <View className="flex-row gap-2">
                  <Button variant="outline" className="flex-1" disabled={busy} onPress={cancel}>
                    <X size={14} weight="bold" color={muted} />
                    <Text>Cancel</Text>
                  </Button>
                  <Button className="flex-1" disabled={busy || !dirty} onPress={() => void save()}>
                    <Check size={14} weight="bold" color={ON_PRIMARY} />
                    <Text>{busy ? 'Saving...' : 'Save network'}</Text>
                  </Button>
                </View>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-border p-4">
          <CardTitle className="text-base">Connection history</CardTitle>
          <Text variant="muted" className="text-xs">
            Recent link events reported by the board.
          </Text>
        </CardHeader>

        <CardContent className="gap-0 p-0">
          {loading ? (
            <View className="gap-3 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </View>
          ) : (
            history.map((event, index) => {
              const up = event.kind === 'connected';
              const color = up ? primary.hex : danger;

              return (
                <View
                  key={event.id}
                  className={index === 0 ? 'flex-row items-center gap-3 p-4' : 'border-border flex-row items-center gap-3 border-t p-4'}>
                  {up ? (
                    <CheckCircle size={16} weight="fill" color={color} />
                  ) : (
                    <WarningCircle size={16} weight="fill" color={color} />
                  )}
                  <View className="flex-1 gap-0.5">
                    <Text className="text-xs font-semibold capitalize">{event.kind}</Text>
                    <Text variant="muted" className="text-[10px]">
                      {event.detail} | {event.ssid}
                    </Text>
                  </View>
                  <Text variant="muted" className="text-[10px]">
                    {formatShortDateTime(event.at)}
                  </Text>
                </View>
              );
            })
          )}
        </CardContent>
      </Card>
    </View>
  );
}
