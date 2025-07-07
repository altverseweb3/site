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

export function getTokenGradient(token: string): string {
  const gradients: { [key: string]: string } = {
    "1INCH": "from-cyan-400 via-blue-500 to-indigo-600",
    AAVE: "from-purple-400 via-purple-500 to-indigo-600",
    ADA: "from-blue-400 via-blue-500 to-indigo-600",
    ALT: "from-amber-400 via-amber-500 to-yellow-600",
    ANKR: "from-blue-400 via-indigo-500 to-purple-600",
    APT: "from-blue-400 via-indigo-500 to-violet-600",
    ATOM: "from-purple-400 via-indigo-500 to-blue-600",
    AVAX: "from-red-400 via-red-500 to-rose-600",
    AXS: "from-blue-400 via-indigo-500 to-purple-600",
    BAND: "from-blue-400 via-indigo-500 to-purple-600",
    BAT: "from-orange-400 via-red-500 to-rose-600",
    BEAM: "from-green-400 via-emerald-500 to-teal-600",
    BNB: "from-yellow-400 via-yellow-500 to-amber-600",
    BTC: "from-orange-400 via-orange-500 to-amber-600",
    CAKE: "from-yellow-400 via-amber-500 to-orange-600",
    CELO: "from-lime-400 via-lime-500 to-green-600",
    CFX: "from-blue-400 via-indigo-500 to-violet-600",
    CKB: "from-green-400 via-emerald-500 to-teal-600",
    COMP: "from-green-400 via-emerald-500 to-teal-600",
    CRV: "from-red-400 via-rose-500 to-pink-600",
    DASH: "from-blue-400 via-indigo-500 to-purple-600",
    DOT: "from-pink-400 via-rose-500 to-red-600",
    EGLD: "from-blue-400 via-indigo-500 to-violet-600",
    ENJ: "from-indigo-400 via-blue-500 to-cyan-600",
    ETH: "from-slate-400 via-slate-500 to-gray-600",
    FIL: "from-green-400 via-emerald-500 to-teal-600",
    FLOW: "from-green-400 via-teal-500 to-cyan-600",
    S: "from-gray-400 via-gray-500 to-gray-600",
    GLM: "from-blue-400 via-indigo-500 to-purple-600",
    GRT: "from-purple-400 via-violet-500 to-indigo-600",
    ICP: "from-yellow-400 via-amber-500 to-orange-600",
    ICX: "from-blue-400 via-indigo-500 to-violet-600",
    KAVA: "from-orange-400 via-red-500 to-rose-600",
    KDA: "from-purple-400 via-indigo-500 to-blue-600",
    LINK: "from-blue-400 via-blue-500 to-indigo-600",
    LRC: "from-blue-400 via-indigo-500 to-purple-600",
    MANA: "from-red-400 via-rose-500 to-pink-600",
    MINA: "from-teal-400 via-cyan-500 to-blue-600",
    MKR: "from-teal-400 via-cyan-500 to-blue-600",
    NEAR: "from-black via-gray-800 to-gray-600",
    NEO: "from-green-400 via-emerald-500 to-teal-600",
    ONE: "from-blue-400 via-indigo-500 to-purple-600",
    ONT: "from-blue-400 via-indigo-500 to-violet-600",
    OP: "from-red-400 via-rose-500 to-pink-600",
    QTUM: "from-blue-400 via-indigo-500 to-purple-600",
    REEF: "from-purple-400 via-indigo-500 to-blue-600",
    REN: "from-blue-300 via-blue-400 to-indigo-500",
    ROSE: "from-blue-400 via-blue-500 to-indigo-600",
    RUNE: "from-green-400 via-emerald-500 to-teal-600",
    SAND: "from-blue-400 via-blue-500 to-indigo-600",
    SOL: "from-purple-400 via-indigo-500 to-blue-600",
    SOLID: "from-gray-400 via-gray-500 to-gray-600",
    SRM: "from-blue-400 via-indigo-500 to-violet-600",
    STORJ: "from-blue-400 via-indigo-500 to-purple-600",
    STRAX: "from-cyan-400 via-blue-500 to-cyan-600",
    STX: "from-purple-400 via-indigo-500 to-blue-600",
    SUI: "from-blue-400 via-indigo-500 to-violet-600",
    SUSHI: "from-blue-400 via-indigo-500 to-purple-600",
    THETA: "from-green-400 via-emerald-500 to-teal-600",
    TRX: "from-red-400 via-rose-500 to-pink-600",
    UNI: "from-pink-400 via-pink-500 to-rose-600",
    USDC: "from-blue-400 via-blue-500 to-indigo-600",
    USDT: "from-green-400 via-emerald-500 to-teal-600",
    WAVES: "from-blue-400 via-indigo-500 to-purple-600",
    XMR: "from-orange-400 via-red-500 to-rose-600",
    YFI: "from-blue-400 via-indigo-500 to-purple-600",
    ZEC: "from-yellow-400 via-amber-500 to-orange-600",
    ZIL: "from-teal-400 via-cyan-500 to-blue-600",
  };

  return gradients[token];
}
