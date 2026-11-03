import { differenceInMinutes, format, isToday, isYesterday } from "date-fns";

/** Compact age for list rows: "now", "4m", "1h", "2d", then a date. */
export function shortAgo(date: string | Date) {
  const d = new Date(date);
  const mins = Math.max(0, differenceInMinutes(new Date(), d));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return format(d, "MMM d");
}

/** "Today", "Yesterday" or "Jan 22". */
export function dayLabel(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

/** Seconds as m:ss, or h:mm:ss past an hour. */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
