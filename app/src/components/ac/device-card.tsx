import { useColorScheme } from 'nativewind';
import CheckCircle from 'phosphor-react-native/src/icons/CheckCircle';
import Eye from 'phosphor-react-native/src/icons/Eye';
import EyeSlash from 'phosphor-react-native/src/icons/EyeSlash';
import Password from 'phosphor-react-native/src/icons/Password';
import Plus from 'phosphor-react-native/src/icons/Plus';
import Trash from 'phosphor-react-native/src/icons/Trash';
import WarningCircle from 'phosphor-react-native/src/icons/WarningCircle';
import WifiHigh from 'phosphor-react-native/src/icons/WifiHigh';
import WifiSlash from 'phosphor-react-native/src/icons/WifiSlash';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { ConfirmModal } from '@/components/confirm-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconInput } from '@/components/ui/icon-input';
import { Pager } from '@/components/ui/pager';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useAuth } from '@/features/auth/context';
import * as deviceApi from '@/features/device/api';
import type { ConnectionEvent, DeviceStatus, WifiNetwork } from '@/features/device/types';
import { useAppearance } from '@/lib/appearance';
import { formatShortDateTime } from '@/lib/datetime';

const ON_PRIMARY = '#ffffff';
const STATUS_POLL_MS = 5000;
const HISTORY_PAGE = 5;
const MAX_NETWORKS = 5;

function uptimeLabel(seconds: number | null): string {
  if (seconds === null) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function maskPassword(password: string): string {
  return '*'.repeat(Math.min(Math.max(password.length, 8), 16));
}

function validateNetwork(ssid: string, password: string): string | null {
  const name = ssid.trim();
  if (!name) return 'Network name is required.';
  if (name.length > 32) return 'Network name must be 32 characters or fewer.';
  if (/["'\\]/.test(name)) return 'Network name cannot contain quotes or backslashes.';
  if (password.length > 0 && (password.length < 8 || password.length > 63)) {
    return 'Password must be empty or 8 to 63 characters.';
  }
  if (/["'\\]/.test(password)) return 'Password cannot contain quotes or backslashes.';

  return null;
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
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyOffset, setHistoryOffset] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [newSsid, setNewSsid] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newReveal, setNewReveal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectTarget, setSelectTarget] = useState<WifiNetwork | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WifiNetwork | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [live, events, nets] = await Promise.all([
        deviceApi.status(token ?? ''),
        deviceApi.history(token ?? ''),
        deviceApi.networks(token ?? ''),
      ]);
      setStatus(live);
      setHistory(events);
      setNetworks(nets);
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

  // Keep the link state fresh without disturbing the network list being managed.
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

  const refreshNetworks = useCallback(async () => {
    const nets = await deviceApi.networks(token ?? '');
    setNetworks(nets);
  }, [token]);

  function toggleReveal(id: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  function closeSheet() {
    setSheetOpen(false);
    setNewSsid('');
    setNewPassword('');
    setNewReveal(false);
    setFormError(null);
  }

  async function submitAdd() {
    const validation = validateNetwork(newSsid, newPassword);
    if (validation) {
      setFormError(validation);
      return;
    }

    setAdding(true);
    setFormError(null);
    try {
      await deviceApi.addNetwork(token ?? '', newSsid.trim(), newPassword);
      await refreshNetworks();
      closeSheet();
      setError(null);
      setSaved('Network added. The board tries it on its next sync.');
    } catch (caught) {
      setFormError((caught as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function confirmSelect() {
    if (!selectTarget) return;

    setConfirmBusy(true);
    try {
      await deviceApi.selectNetwork(token ?? '', selectTarget.id);
      await refreshNetworks();
      setError(null);
      setSaved('Preferred network updated.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSelectTarget(null);
      setConfirmBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setConfirmBusy(true);
    try {
      await deviceApi.removeNetwork(token ?? '', deleteTarget.id);
      await refreshNetworks();
      setError(null);
      setSaved('Network removed.');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setDeleteTarget(null);
      setConfirmBusy(false);
    }
  }

  const connected = status?.connected ?? false;
  const accent = connected ? primary.hex : danger;
  const atLimit = networks.length >= MAX_NETWORKS;

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
        <CardHeader className="border-border gap-0.5 border-b p-4">
          <CardTitle className="text-base">Wi-Fi networks</CardTitle>
          <Text variant="muted" className="text-xs">
            Stored networks the ESP32 connects to, in priority order.
          </Text>
        </CardHeader>

        <CardContent className="gap-3 p-4">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </>
          ) : (
            <>
              {networks.map((net, index) => {
                const isRevealed = revealed.has(net.id);
                const canDelete = !net.isDefault && !net.selected;

                return (
                  <View key={net.id} className="border-border gap-2 rounded-lg border p-3">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: net.selected ? `${primary.hex}1f` : `${muted}1f`,
                        }}>
                        <Text
                          className="text-xs font-bold"
                          style={{ color: net.selected ? primary.hex : muted }}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
                        {net.ssid}
                      </Text>
                      {net.selected ? (
                        <Badge variant="default">
                          <CheckCircle size={11} weight="fill" color={ON_PRIMARY} />
                          <Text>In use</Text>
                        </Badge>
                      ) : null}
                      {net.isDefault ? (
                        <Badge variant="secondary">
                          <Text>Default</Text>
                        </Badge>
                      ) : null}
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Password size={14} weight="bold" color={muted} />
                      <Text variant="muted" className="flex-1 text-xs" numberOfLines={1}>
                        {net.password
                          ? isRevealed
                            ? net.password
                            : maskPassword(net.password)
                          : 'Open network'}
                      </Text>
                      {net.password ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={isRevealed ? 'Hide password' : 'Show password'}
                          hitSlop={8}
                          onPress={() => toggleReveal(net.id)}>
                          {isRevealed ? (
                            <EyeSlash size={16} weight="bold" color={muted} />
                          ) : (
                            <Eye size={16} weight="bold" color={muted} />
                          )}
                        </Pressable>
                      ) : null}
                    </View>

                    <Text variant="muted" className="text-[10px]">
                      Last changed {formatShortDateTime(net.updatedAt)}
                    </Text>

                    {net.selected ? null : (
                      <View className="flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onPress={() => setSelectTarget(net)}>
                          <Text>Set as preferred</Text>
                        </Button>
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            accessibilityLabel="Delete network"
                            onPress={() => setDeleteTarget(net)}>
                            <Trash size={14} weight="bold" color={danger} />
                            <Text style={{ color: danger }}>Delete</Text>
                          </Button>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}

              <View className="gap-1.5">
                <View className="flex-row items-start gap-1.5">
                  <WarningCircle size={13} weight="bold" color={muted} />
                  <Text variant="muted" className="flex-1 text-[10px]">
                    The board tries these networks in order, top first, and falls back down the list.
                    If none work it opens its own setup hotspot (captive portal).
                  </Text>
                </View>
                <View className="flex-row items-start gap-1.5">
                  <WarningCircle size={13} weight="bold" color={muted} />
                  <Text variant="muted" className="flex-1 text-[10px]">
                    2.4 GHz Wi-Fi only, no 5 GHz. A phone hotspot works if set to 2.4 GHz. The board
                    has no SIM, so 4G is not possible directly.
                  </Text>
                </View>
              </View>

              {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
              {saved ? <Text className="text-primary text-sm">{saved}</Text> : null}

              {atLimit ? (
                <Text variant="muted" className="text-[10px]">
                  Maximum of {MAX_NETWORKS} networks. Remove one to add another.
                </Text>
              ) : (
                <Button onPress={() => setSheetOpen(true)}>
                  <Plus size={14} weight="bold" color={ON_PRIMARY} />
                  <Text>Add network</Text>
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <View className="gap-2">
        <View className="gap-0.5">
          <Text className="text-base font-semibold">Connection history</Text>
          <Text variant="muted" className="text-xs">
            Recent link events reported by the board.
          </Text>
        </View>

        {loading
          ? [0, 1, 2].map((row) => (
              <Card key={row} className="py-0">
                <CardContent className="gap-1.5 p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-44" />
                </CardContent>
              </Card>
            ))
          : history.slice(historyOffset, historyOffset + HISTORY_PAGE).map((event) => {
              const up = event.kind === 'connected';
              const color = up ? primary.hex : danger;

              return (
                <Card key={event.id} className="py-0">
                  <CardContent className="gap-1.5 p-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        {up ? (
                          <CheckCircle size={14} weight="fill" color={color} />
                        ) : (
                          <WarningCircle size={14} weight="fill" color={color} />
                        )}
                        <Text className="text-sm font-semibold capitalize leading-none">
                          {event.kind}
                        </Text>
                      </View>
                      <Text variant="muted" className="text-[10px]">
                        {formatShortDateTime(event.at)}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text variant="muted" className="flex-1 text-[10px]">
                        {event.detail}
                      </Text>
                      <Text variant="muted" className="text-[10px]">
                        {event.ssid}
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              );
            })}

        {!loading ? (
          <Pager
            total={history.length}
            limit={HISTORY_PAGE}
            offset={historyOffset}
            onOffsetChange={setHistoryOffset}
            noun="event"
          />
        ) : null}
      </View>

      <BottomSheet visible={sheetOpen} title="Add Wi-Fi network" onClose={closeSheet}>
        <View className="gap-1.5">
          <Text className="text-sm font-medium">Network name (SSID)</Text>
          <IconInput
            icon={WifiHigh}
            iconColor={primary.hex}
            value={newSsid}
            onChangeText={setNewSsid}
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
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!newReveal}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Open network"
            action={{
              icon: newReveal ? EyeSlash : Eye,
              label: newReveal ? 'Hide password' : 'Show password',
              onPress: () => setNewReveal((v) => !v),
            }}
          />
          <Text variant="muted" className="text-[10px]">
            Leave empty for an open network. WPA2 needs 8 to 63 characters.
          </Text>
        </View>

        {formError ? <Text className="text-destructive text-sm">{formError}</Text> : null}

        <Button disabled={adding} onPress={() => void submitAdd()}>
          <Plus size={14} weight="bold" color={ON_PRIMARY} />
          <Text>{adding ? 'Adding...' : 'Add network'}</Text>
        </Button>
      </BottomSheet>

      <ConfirmModal
        visible={selectTarget !== null}
        title="Switch preferred network"
        message={`The ESP32 will try ${
          selectTarget?.ssid ?? 'this network'
        } on its next sync and fall back automatically if it is unreachable.`}
        confirmLabel="Switch"
        busy={confirmBusy}
        onConfirm={() => void confirmSelect()}
        onClose={() => setSelectTarget(null)}
      />

      <ConfirmModal
        visible={deleteTarget !== null}
        title="Remove network"
        message={`${
          deleteTarget?.ssid ?? 'This network'
        } will be removed from the board's stored list.`}
        confirmLabel="Remove"
        destructive
        busy={confirmBusy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}
