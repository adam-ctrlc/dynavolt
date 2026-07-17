export type Status = 'normal' | 'overload';

/** Null whenever the reporting board has no PZEM or DHT to measure it. */
type MeterFields = {
  powerW: number | null;
  powerFactor: number | null;
  frequencyHz: number | null;
  energyKwh: number | null;
  humidityPct: number | null;
};

export type LiveReading = MeterFields & {
  voltageV: number;
  currentA: number;
  temperatureC: number;
  /** Derived server-side from temperatureC; never stored. */
  temperatureF: number;
  apparentPowerVa: number;
  status: Status;
  loadThresholdVa: number;
  tempThresholdC: number;
  tempThresholdF: number;
  loadPercent: number;
  overTemperature: boolean;
  /** Q = sqrt(S^2 - P^2). Null unless real power was measured. */
  reactivePowerVar: number | null;
  /** VA left before the load threshold. Negative once over. */
  headroomVa: number;
  recordedAt: string;
};

export type Reading = MeterFields & {
  id: number;
  voltageV: number;
  currentA: number;
  temperatureC: number;
  apparentPowerVa: number;
  status: Status;
  source: string;
  recordedAt: string;
};

export type TrendPoint = {
  day: string;
  avgPowerVa: number;
  maxPowerVa: number;
  avgTemperatureC: number;
  samples: number;
};
