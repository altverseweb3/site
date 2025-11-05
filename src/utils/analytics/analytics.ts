"use client";

// ============================================================================
// Color Constants for Analytics Charts
// ============================================================================

/**
 * Primary area chart colors - optimized for visual appeal
 * These are the main colors used in Activity.tsx and should be used across all area charts
 */
export const AREA_CHART_COLORS = {
  primary: "hsl(30 80% 55%)", // Warm orange - primary brand color
  secondary: "hsl(40 85% 60%)", // Golden yellow - secondary accent
} as const;

/**
 * Bar chart colors - consistent orange theme
 */
export const BAR_CHART_COLORS = {
  default: "hsl(30 80% 55%)", // Default bar color (matches primary area color)
  breakdown: [
    "hsl(30 80% 55%)", // Swaps - primary orange
    "hsl(40 90% 60%)", // Lending - golden
    "hsl(20 80% 50%)", // Earn - darker orange
  ],
} as const;

/**
 * Generates an array of visually distinct colors
 * Uses HSL color space to ensure good contrast and visual separation
 *
 * Algorithm:
 * - For small counts (d5): Uses predefined high-contrast colors
 * - For medium counts (6-20): Uses evenly spaced hues with slight lightness variation
 * - For large counts (21-50): Adds more lightness and saturation variation
 * - For very large counts (51-100): Maximizes variation across all HSL parameters
 *
 * @param count Number of colors needed (up to 100)
 * @returns Array of HSL color strings
 */
export function generateChartColors(count: number): string[] {
  const colors: string[] = [];

  if (count <= 0) return colors;

  // For very small sets, use predefined high-contrast colors
  if (count <= 5) {
    const baseColors = [
      "hsl(30 80% 55%)", // Orange (brand primary)
      "hsl(210 80% 55%)", // Blue
      "hsl(150 60% 45%)", // Green
      "hsl(340 75% 55%)", // Pink/Red
      "hsl(270 60% 55%)", // Purple
    ];
    return baseColors.slice(0, count);
  }

  // For medium sets (6-20), use evenly spaced hues with slight lightness variation
  if (count <= 20) {
    const hueStep = 360 / count;
    for (let i = 0; i < count; i++) {
      const hue = (i * hueStep) % 360;
      const lightness = 50 + (i % 3) * 5; // Vary lightness: 50%, 55%, 60%
      const saturation = 65 + (i % 2) * 10; // Vary saturation: 65%, 75%
      colors.push(`hsl(${Math.round(hue)} ${saturation}% ${lightness}%)`);
    }
    return colors;
  }

  // For larger sets (21-50), add more variation
  if (count <= 50) {
    const hueStep = 360 / Math.ceil(count / 2);
    for (let i = 0; i < count; i++) {
      const hue = (i * hueStep) % 360;
      const lightness = 45 + (i % 4) * 5; // Vary lightness: 45%, 50%, 55%, 60%
      const saturation = 60 + (i % 3) * 10; // Vary saturation: 60%, 70%, 80%
      colors.push(`hsl(${Math.round(hue)} ${saturation}% ${lightness}%)`);
    }
    return colors;
  }

  // For very large sets (51-100), maximize variation
  const hueStep = 360 / Math.ceil(count / 3);
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep + (i % 3) * 120) % 360; // Add offset for more variety
    const lightness = 40 + (i % 5) * 5; // Vary lightness: 40%, 45%, 50%, 55%, 60%
    const saturation = 55 + (i % 4) * 8; // Vary saturation: 55%, 63%, 71%, 79%
    colors.push(`hsl(${Math.round(hue)} ${saturation}% ${lightness}%)`);
  }

  return colors;
}

/**
 * Gets a color for a specific index in any chart type
 * This ensures consistent colors for the same index across different charts
 *
 * @param index The index of the item (0-based)
 * @param totalCount Total number of items (for optimization)
 * @returns HSL color string
 */
export function getChartColor(index: number, totalCount: number = 10): string {
  const colors = generateChartColors(totalCount);
  return colors[index % colors.length];
}

/**
 * Generates colors specifically for area charts with multiple series
 * Uses the primary/secondary colors first, then generates additional colors
 *
 * @param count Number of series/areas needed
 * @returns Array of HSL color strings
 */
export function getAreaChartColors(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return [AREA_CHART_COLORS.primary];
  if (count === 2)
    return [AREA_CHART_COLORS.primary, AREA_CHART_COLORS.secondary];

  // For more than 2, start with primary/secondary then generate more
  const colors = [AREA_CHART_COLORS.primary, AREA_CHART_COLORS.secondary];
  const additionalColors = generateChartColors(count - 2);
  return [...colors, ...additionalColors];
}

/**
 * Generates colors specifically for bar charts with multiple series
 * Uses the predefined breakdown colors first, then generates additional colors
 *
 * @param count Number of series/bars needed
 * @returns Array of HSL color strings
 */
export function getBarChartColors(count: number): string[] {
  if (count <= 0) return [];
  if (count === 1) return [BAR_CHART_COLORS.default];
  if (count <= BAR_CHART_COLORS.breakdown.length) {
    return BAR_CHART_COLORS.breakdown.slice(0, count);
  }

  // For more than 3, use breakdown colors then generate more
  const additionalColors = generateChartColors(
    count - BAR_CHART_COLORS.breakdown.length,
  );
  return [...BAR_CHART_COLORS.breakdown, ...additionalColors];
}

/**
 * Generates colors specifically for donut/pie charts
 * Optimized for circular visualization where adjacent colors should be distinct
 *
 * @param count Number of segments needed
 * @returns Array of HSL color strings
 */
export function getDonutChartColors(count: number): string[] {
  return generateChartColors(count);
}
