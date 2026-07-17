/** The envelope every paginated list endpoint returns. */
export type Page<T> = {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
};

export const PAGE_SIZE = 20;

export function pageCount(total: number, limit: number): number {
  return Math.max(1, Math.ceil(total / Math.max(limit, 1)));
}

export function pageIndex(offset: number, limit: number): number {
  return Math.floor(offset / Math.max(limit, 1));
}

/** Inclusive 1-based range of the current window, clamped to what exists. */
export function pageRange(offset: number, limit: number, total: number) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);

  return { from, to };
}
