import { formatDistanceToNow } from "date-fns";

export function formatLastSeen(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Offline";

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // If timestamp is within 60 seconds (or slightly in future due to clock skew)
  if (diffInSeconds < 60) {
    return "Last seen just now";
  }

  const distance = formatDistanceToNow(date, { addSuffix: false });
  return `Last seen ${distance} ago`;
}
