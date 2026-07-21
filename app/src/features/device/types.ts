export type DeviceStatus = {
  connected: boolean;
  deviceId: string;
  firmware: string;
  ipAddress: string | null;
  signalDbm: number | null;
  uptimeSeconds: number | null;
  ssid: string;
  lastSeenAt: string | null;
  lastSeenLabel: string | null;
  /** True while the API is serving placeholders rather than real device reports. */
  simulated: boolean;
};

export type ConnectionEventKind = 'connected' | 'disconnected';

export type ConnectionEvent = {
  id: number;
  kind: ConnectionEventKind;
  detail: string;
  ssid: string;
  at: string;
  atLabel: string;
};

export type WifiNetwork = {
  id: number;
  ssid: string;
  password: string;
  isDefault: boolean;
  selected: boolean;
  updatedAt: string;
};
