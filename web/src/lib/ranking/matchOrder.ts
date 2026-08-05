import type { Match } from "../domain/types";

function orderKey(m: Match): [number, number, string] {
  const sessionMs = m.sessionStartsAt ? Date.parse(m.sessionStartsAt) : 0;
  const createdMs = m.createdAt ? Date.parse(m.createdAt) : 0;
  return [sessionMs, createdMs, m.id];
}

/** Chronological order for ranking: session start → match createdAt → id. */
export function compareMatches(a: Match, b: Match): number {
  const [as, ac, aid] = orderKey(a);
  const [bs, bc, bid] = orderKey(b);
  if (as !== bs) return as - bs;
  if (ac !== bc) return ac - bc;
  return aid.localeCompare(bid);
}
