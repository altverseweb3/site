// src/utils/swapRecorder.ts
import {
  altverseAPI,
  SwapMetricsRequest,
  SwapMetricsResponse,
  ApiResponse,
} from "@/api/altverse";

/**
 * Simple utility for recording swap metrics
 */
export async function recordSwap(
  request: SwapMetricsRequest,
): Promise<ApiResponse<SwapMetricsResponse>> {
  return altverseAPI.recordSwap(request);
}

// Re-export types for convenience
export type { SwapMetricsRequest, SwapMetricsResponse };
