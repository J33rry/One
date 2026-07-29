"use client";

import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import clsx from "clsx";

type ThemeChoice = "system" | "light" | "dark";

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

/**
 * Theme switcher. Persists an explicit choice to localStorage and reflects it
 * via <html data-theme>. "System" clears the override so prefers-color-scheme
 * takes over. Pairs with the no-FOUC init script in app/layout.tsx.
 */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  // Read the persisted choice after mount. Doing this in an effect (rather than
  // a lazy initializer) is deliberate: it keeps the server and first client
  // render identical ("system") so there's no hydration mismatch.
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync of persisted theme after mount
    setChoice(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  const apply = (next: ThemeChoice) => {
    setChoice(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex gap-1 rounded-lg border border-border bg-surface-2 p-1"
    >
      {OPTIONS.map((o) => {
        const active = choice === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => apply(o.value)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
              active
                ? "bg-surface text-fg shadow-sm border border-border"
                : "text-muted hover:text-fg"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
