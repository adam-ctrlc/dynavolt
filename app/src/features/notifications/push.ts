import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { request } from '@/lib/api-client';

/** Expo Go dropped remote push in SDK 53+; a development build is required. */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Alerts are the point of the app, so show them even while it is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function canReceiveRemotePush(): boolean {
  return !IS_EXPO_GO && Device.isDevice && Boolean(projectId());
}

function projectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined
  );
}

export async function ensurePermission(): Promise<boolean> {
  // Android needs a channel before anything will surface, and `max` is what lets an
  // overload interrupt rather than sit silently in the tray.
  if (Platform.OS === 'android') {
    // Android freezes a channel's settings once it exists, so a stronger vibration
    // only takes effect under a fresh id; drop the old channel to keep the list clean.
    await Notifications.setNotificationChannelAsync('alerts-v2', {
      name: 'Transformer alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400, 200, 600],
      lightColor: '#ef4444',
    });
    try {
      await Notifications.deleteNotificationChannelAsync('alerts');
    } catch {
      // The old channel may already be gone on a fresh install; nothing to clean up.
    }
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Registers this device for remote push.
 *
 * Returns false, rather than throwing, whenever remote push is unavailable: in Expo
 * Go, on a simulator, or without an EAS project. Local notifications still work in
 * all of those, so a failure here must not take them down with it.
 */
export async function registerDevice(token: string): Promise<boolean> {
  if (!canReceiveRemotePush()) return false;

  try {
    if (!(await ensurePermission())) return false;

    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await request<void>('/notifications/register', {
      method: 'POST',
      token,
      body: { token: pushToken.data, platform: Platform.OS },
    });

    return true;
  } catch {
    // Nothing here is worth interrupting sign-in for.
    return false;
  }
}

export async function unregisterDevice(token: string): Promise<void> {
  if (!canReceiveRemotePush()) return;

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
    await request<void>('/notifications/unregister', {
      method: 'POST',
      token,
      body: { token: pushToken.data },
    });
  } catch {
    // Signing out locally matters more than tidying the server's token list.
  }
}

/**
 * Raises a notification from the device itself.
 *
 * This is what makes alerts visible in Expo Go, where remote push cannot reach us.
 * It only fires while the app is running, so it complements remote push rather than
 * replacing it.
 */
export async function notifyLocally(title: string, body: string): Promise<void> {
  try {
    if (!(await ensurePermission())) return;

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null,
    });
  } catch {
    // A missing banner is not worth surfacing an error over.
  }
}
