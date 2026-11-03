import clsx from "clsx";

/** The app mark: a soft lavender pebble. */
export function PebbleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 36" className={clsx("shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id="pebble-mark-body" x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stopColor="#b3b4ff" />
          <stop offset="0.55" stopColor="#8182f7" />
          <stop offset="1" stopColor="#6264ec" />
        </linearGradient>
      </defs>
      <path
        d="M4.6 24.6C1.4 16.8 7.4 6.6 19.6 3.9 31 1.4 43.1 5.7 45 15.4c1.9 9.9-6.7 17.4-19.8 17.9-9.2.3-17.6-2.2-20.6-8.7z"
        fill="url(#pebble-mark-body)"
      />
      <ellipse cx="17" cy="11" rx="7.5" ry="2.6" transform="rotate(-12 17 11)" fill="#fff" opacity="0.45" />
    </svg>
  );
}
