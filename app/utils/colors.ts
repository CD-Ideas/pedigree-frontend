/**
 * Shared dog title color function (PG getDogColorDark).
 * Returns a color based on the dog's registered name/title.
 *
 * Color mapping:
 *   GR CH  → #1d5bbf (dark blue)
 *   CH     → #c02828 (dark red)
 *   ROM    → #0d7468 (dark teal)
 *   POR    → #6d30b0 (dark purple)
 *   5XW+   → #6d30b0 (dark purple)
 *   4XW    → #b03878 (dark pink)
 *   3XW    → #8a6518 (dark gold)
 *   2XW    → #b45a0a (dark orange)
 *   1XW    → #0d7468 (dark teal)
 *   No title → #3a3a3a (dark gray)
 */
export function getDogColor(name: string): string {
  const n = (name || "").toUpperCase();
  if (/\bGR\s*CH\b/.test(n)) return "#1d5bbf";
  if (/(?:^|\s|\()CH\b/.test(n)) return "#c02828";
  if (/\bROM\b/.test(n)) return "#0d7468";
  if (/\bPOR\b/.test(n)) return "#6d30b0";
  const xw = n.match(/\b(\d+)X[WL]\b/);
  if (xw) {
    const num = parseInt(xw[1]);
    if (num >= 5) return "#6d30b0";
    if (num === 4) return "#b03878";
    if (num === 3) return "#8a6518";
    if (num === 2) return "#b45a0a";
    if (num === 1) return "#0d7468";
  }
  return "#3a3a3a";
}
