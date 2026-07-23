export type DeviceStatus = {
  connected: boolean;
  deviceId: string | null;
  firmware: string | null;
  ipAddress: string | null;
  signalDbm: number | null;
  uptimeSeconds: number | null;
  ssid: string | null;
  lastSeenAt: string | null;
  lastSeenLabel: string | null;
  /** True while the API is serving placeholders rather than real device reports. */
  simulated: boolean;
};
