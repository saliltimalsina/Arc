const AVATAR_COLORS = [
  "#F97316", // orange
  "#9353D3", // purple
  "#338EF7", // blue
  "#17C964", // green
  "#F31260", // red
  "#F5A524", // amber
  "#06B7DB", // cyan
  "#FF4ECD", // pink
];

export function userColor(userId: string | null | undefined): string {
  if (!userId) return "#9A9FAB";
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function userInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}
