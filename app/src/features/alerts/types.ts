export type AlertKind = 'overload' | 'temperature';

export type Alert = {
  id: number;
  readingId: number | null;
  kind: AlertKind;
  message: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  responseMs: number | null;
};
