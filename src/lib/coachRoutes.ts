export function coachPlayerProfileHref(playerId: string) {
  return `/dashboard/coach/players/${encodeURIComponent(playerId)}`;
}
