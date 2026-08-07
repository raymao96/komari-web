const SPARSE_SERIES_POINT_LIMIT = 12;

export const shouldShowPersistentMetricDots = (
  visibleSeriesCount: number,
  pointCount: number | undefined,
) =>
  visibleSeriesCount <= 1 ||
  (pointCount !== undefined && pointCount <= SPARSE_SERIES_POINT_LIMIT);
