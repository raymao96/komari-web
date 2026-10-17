export function mcpAuthorizationPolicy({
  selected,
  allNodes,
  keepExpiry,
  durationMinutes,
  longTerm,
  note,
}: {
  selected: string[];
  allNodes: boolean;
  keepExpiry: boolean;
  durationMinutes: number | null;
  longTerm: boolean;
  note: string;
}) {
  return {
    target_uuids: allNodes ? [] : [...selected],
    all_nodes: allNodes,
    ...(keepExpiry ? {} : {
      duration_minutes: durationMinutes,
      long_term: longTerm,
    }),
    note,
  };
}
