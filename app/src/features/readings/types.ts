export type Status = 'normal' | 'overload';

export type LiveReading = {
  voltageV: number;
  currentA: number;
  temperatureC: number;
  apparentPowerVa: number;
  status: Status;
  loadThresholdVa: number;
  tempThresholdC: number;
  loadPercent: number;
  overTemperature: boolean;
  recordedAt: string;
};

export type Reading = {
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
