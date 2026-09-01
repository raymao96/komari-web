import { compareNodesByBackendOrder } from "../lib/nodeOrder.ts";

export type RemoteExecNodeSearchItem = {
  uuid: string;
  name: string;
  ipv4?: string;
  ipv6?: string;
  group?: string;
  remark?: string;
  tags?: string;
  weight?: number | null;
  created_at?: string | null;
};

const normalizeSearchValue = (value: unknown) =>
  value === null || value === undefined
    ? ""
    : String(value).trim().toLocaleLowerCase();

export function remoteExecNodeSearchText(node: RemoteExecNodeSearchItem): string {
  return [node.name, node.ipv4, node.ipv6, node.group, node.remark, node.tags]
    .map(normalizeSearchValue)
    .filter(Boolean)
    .join("\n");
}

export function matchesRemoteExecNode(
  node: RemoteExecNodeSearchItem,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  return (
    normalizedQuery === "" ||
    remoteExecNodeSearchText(node).includes(normalizedQuery)
  );
}

export function orderRemoteExecNodes<T extends RemoteExecNodeSearchItem>(
  nodes: readonly T[],
): T[] {
  return [...nodes].sort(compareNodesByBackendOrder);
}
