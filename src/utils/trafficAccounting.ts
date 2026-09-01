export type TrafficLimitType = "sum" | "max" | "min" | "up" | "down" | string | undefined | null;

/** 这台服务器自己存的统计方式。 */
export function nodeTrafficType(node: {
  effective_traffic_type?: string | null;
  traffic_limit_type?: string | null;
}): string {
  return String(node.effective_traffic_type || node.traffic_limit_type || "")
    .trim()
    .toLowerCase();
}

/** 按该节点库里的统计方式计算已用流量：合计 / 上行 / 下行 / 较大值 / 较小值。 */
export function trafficUsed(
  type: TrafficLimitType,
  up: number,
  down: number,
): number {
  switch (String(type ?? "").trim().toLowerCase()) {
    case "up":
      return up;
    case "down":
      return down;
    case "min":
      return Math.min(up, down);
    case "max":
      return Math.max(up, down);
    case "sum":
    default:
      return up + down;
  }
}
