/** "#rrggbb" or "rgb(...)" -> 0-1 RGB, for handing CSS colours to the water shader. */
export function toRgb(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith("#")) {
    const n = parseInt(c.length === 4 ? [...c.slice(1)].map((h) => h + h).join("") : c.slice(1, 7), 16);
    return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const parts = c.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255];
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

/** Calls `onChange` when the app theme or the OS colour scheme changes. Returns a cleanup. */
export function followTheme(onChange: () => void) {
  // The app sets data-theme; "system" follows the OS.
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", onChange);
  };
}
