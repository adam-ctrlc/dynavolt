use serde::Serialize;

/// A window over a filtered result set. `total` counts every row matching the
/// filters, not just the ones in this window, so a client can size its pager.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page<T> {
    pub rows: Vec<T>,
    pub total: i64,
    pub limit: i64,
    pub offset: i64,
}

impl<T> Page<T> {
    #[must_use]
    pub const fn new(rows: Vec<T>, total: i64, limit: i64, offset: i64) -> Self {
        Self {
            rows,
            total,
            limit,
            offset,
        }
    }
}

/// Pagination inputs shared by every list endpoint.
///
/// Kept as plain `Option<i64>` fields that each query struct declares inline.
/// `#[serde(flatten)]` cannot be used here: axum's `Query` runs on
/// `serde_urlencoded`, which buffers flattened fields as strings and then fails
/// with `invalid type: string "1", expected i64`.
#[derive(Debug, Clone, Copy)]
pub struct Paging {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

impl Paging {
    #[must_use]
    pub const fn new(limit: Option<i64>, offset: Option<i64>) -> Self {
        Self { limit, offset }
    }

    /// Clamps the window so a caller cannot ask for an unbounded or negative page.
    #[must_use]
    pub fn resolve(self, default_limit: i64, max_limit: i64) -> (i64, i64) {
        let limit = self.limit.unwrap_or(default_limit).clamp(1, max_limit);
        let offset = self.offset.unwrap_or(0).max(0);

        (limit, offset)
    }
}
