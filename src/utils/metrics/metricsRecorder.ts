// src/utils/metrics/metricsRecorder.ts
import {
  altverseAPI,
  SwapPayload,
  LendingPayload,
  EarnPayload,
  MetricsResponse,
  ApiResponse,
} from "@/api/altverse";

/**
 * Record swap metrics
 */
export async function recordSwap(
  payload: SwapPayload,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    eventType: "swap",
    payload,
  });
}

/**
 * Record entrance metrics (dApp entry clicks)
 */
export async function recordEntrance(): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    eventType: "entrance",
  });
}

/**
 * Record earn metrics (deposits, withdrawals)
 */
export async function recordEarn(
  payload: EarnPayload,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    eventType: "earn",
    payload,
  });
}

/**
 * Record lending metrics (supply, borrow, withdraw, repay)
 */
export async function recordLending(
  payload: LendingPayload,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    eventType: "lending",
    payload,
  });
}

// Re-export types for convenience
export type { SwapPayload, LendingPayload, EarnPayload, MetricsResponse };
