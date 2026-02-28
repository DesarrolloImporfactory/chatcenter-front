export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatDuration(totalSeconds = 0) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  // Formato tipo: "1d 19h" / "54m 14s" / "8m 32s"
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatPct(value, decimals = 1) {
  const n = Number(value);
  if (Number.isNaN(n)) return "0%";
  return `${n.toFixed(decimals)}%`;
}

export function classNames(...arr) {
  return arr.filter(Boolean).join(" ");
}
