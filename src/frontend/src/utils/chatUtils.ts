export function getAvatarColor(name: string): string {
  const colors = [
    "#1F5D4A",
    "#2563EB",
    "#7C3AED",
    "#DB2777",
    "#D97706",
    "#059669",
    "#0284C7",
    "#9333EA",
    "#EA580C",
    "#16A34A",
    "#0891B2",
    "#C026D3",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getInitials(name: string): string {
  return (
    name
      .split(/[\s_-]+/)
      .map((p) => p[0]?.toUpperCase() || "")
      .slice(0, 2)
      .join("") ||
    name[0]?.toUpperCase() ||
    "?"
  );
}

export function formatTimestamp(nanos: bigint): string {
  const ms = Number(nanos / 1_000_000n);
  const date = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (diffDays === 0) return timeStr;
  if (diffDays < 7) {
    const day = date.toLocaleDateString([], { weekday: "short" });
    return `${day} ${timeStr}`;
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatDateSeparator(nanos: bigint): string {
  const ms = Number(nanos / 1_000_000n);
  const date = new Date(ms);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
