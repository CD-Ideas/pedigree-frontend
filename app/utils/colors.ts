/**
 * Shared dog title color function.
 * Returns a color based on the dog's registered name/title.
 *
 * Color mapping:
 *   GR CH  → #60a5fa (blue)
 *   CH     → #fc8181 (red)
 *   ROM    → #22d3ee (cyan)
 *   POR    → #a78bfa (purple)
 *   5XW+   → #c084fc (violet)
 *   4XW    → #f472b6 (pink)
 *   3XW    → #d4a855 (gold)
 *   2XW    → #fb923c (orange)
 *   1XW    → #2dd4bf (teal)
 *   No title → #ffffff (white)
 */
export function getDogColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#60a5fa";
  if (/(?:^|\s|\()CH\b/.test(n)) return "#fc8181";
  if (/\bROM\b/.test(n)) return "#22d3ee";
  if (/\bPOR\b/.test(n)) return "#a78bfa";
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num >= 5) return "#c084fc";
    if (num === 4) return "#f472b6";
    if (num === 3) return "#d4a855";
    if (num === 2) return "#fb923c";
    if (num === 1) return "#2dd4bf";
  }
  return "#ffffff";
}
