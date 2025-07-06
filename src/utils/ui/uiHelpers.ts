/**
 * UI Helper functions for common interface operations
 */

/**
 * Converts a hex color to CSS filter values for SVG coloring
 * This is useful for dynamically coloring SVG icons using CSS filters
 *
 * @param hexColor - Hex color string (with or without #)
 * @returns CSS filter string that approximates the target color
 *
 * @example
 * ```ts
 * const filter = getColorFilter("#ff0000"); // Red
 * // Returns: "brightness(0) saturate(100%) invert(1) hue-rotate(0deg) saturate(100%) brightness(50%)"
 * ```
 */
export function getColorFilter(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert hex to RGB values (0-1 range)
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Convert to HSL-like values for CSS filters (approximate)
  const hue = Math.round(
    (Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180) / Math.PI,
  );
  const saturation = Math.round((Math.max(r, g, b) - Math.min(r, g, b)) * 100);
  const brightness = Math.round(((r + g + b) / 3) * 100);

  return `brightness(0) saturate(100%) invert(1) hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`;
}

export function formatCurrency(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1e15) return `$${(value / 1e15).toFixed(2)}Q`;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
