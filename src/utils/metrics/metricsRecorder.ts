// src/utils/metrics/metricsRecorder.ts
import {
  altverseAPI,
  SwapMetricsRequest,
  EntranceMetricsRequest,
  EarnMetricsRequest,
  LendingMetricsRequest,
  MetricsResponse,
  ApiResponse,
} from "@/api/altverse";

/**
 * Record swap metrics
 */
export async function recordSwap(
  params: Omit<SwapMetricsRequest, "metricType">,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    metricType: "swap",
    ...params,
  });
}

/**
 * Record entrance metrics (dApp entry clicks)
 */
export async function recordEntrance(
  params?: Omit<EntranceMetricsRequest, "metricType">,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    metricType: "entrance",
    ...params,
  });
}

/**
 * Record earn metrics (deposits, withdrawals)
 */
export async function recordEarn(
  params: Omit<EarnMetricsRequest, "metricType">,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    metricType: "earn",
    ...params,
  });
}

/**
 * Record lending metrics (supply, borrow, withdraw, repay)
 */
export async function recordLending(
  params: Omit<LendingMetricsRequest, "metricType">,
): Promise<ApiResponse<MetricsResponse>> {
  return altverseAPI.recordMetric({
    metricType: "lending",
    ...params,
  });
}

// Re-export types for convenience
export type {
  SwapMetricsRequest,
  EntranceMetricsRequest,
  EarnMetricsRequest,
  LendingMetricsRequest,
  MetricsResponse,
};
