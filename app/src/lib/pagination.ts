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

/**
 * The page numbers to show, with 'gap' markers where a run is elided. Always keeps
 * the first and last page plus the current one and its immediate neighbours, so even
 * a long list stays one compact row: current 10 of 20 becomes [1, gap, 9, 10, 11,
 * gap, 20], and current 1 becomes [1, 2, gap, 20]. The prev/next arrows do the rest.
 *
 * @param current 1-based current page.
 */
export function pageItems(current: number, totalPages: number): (number | 'gap')[] {
  if (totalPages <= 1) return [1];

  // Up to 7 pages fit without eliding, so show them all rather than add ellipses.
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  const items: (number | 'gap')[] = [1];

  if (start > 2) items.push('gap');
  for (let page = start; page <= end; page += 1) items.push(page);
  if (end < totalPages - 1) items.push('gap');

  items.push(totalPages);

  return items;
}
