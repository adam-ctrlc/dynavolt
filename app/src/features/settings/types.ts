export type SourceMode = 'simulation' | 'hardware';

export type Settings = {
  loadThresholdVa: number;
  tempThresholdC: number;
  sourceMode: SourceMode;
  updatedAt: string;
};
