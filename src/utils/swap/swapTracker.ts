import { SwapTrackingOptions, SwapStatus } from "@/types/web3";

const MAYAN_API_BASE = "https://explorer-api.mayan.finance/v3";

export class SwapTracker {
  private pollInterval: number;
  private maxRetries: number;
  private retryCount: number = 0;
  private isPolling: boolean = false;
  private timeoutId: NodeJS.Timeout | null = null;

  constructor(
    private swapId: string,
    private options: SwapTrackingOptions = {},
  ) {
    this.pollInterval = options.pollInterval || 2000;
    this.maxRetries = options.maxRetries || 900; // 25 minutes with 2s interval
  }

  async fetchSwapStatus(): Promise<SwapStatus> {
    const response = await fetch(`${MAYAN_API_BASE}/swap/trx/${this.swapId}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch swap status: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Map the API response to our simplified status
    const status: SwapStatus = {
      id: data.id,
      status: this.mapClientStatus(data.clientStatus),
      clientStatus: data.clientStatus,
      trader: data.trader,
      sourceChain: data.sourceChain,
      destChain: data.destChain,
      fromTokenSymbol: data.fromTokenSymbol,
      toTokenSymbol: data.toTokenSymbol,
      fromAmount: data.fromAmount,
      toAmount: data.toAmount,
      steps: data.steps || [],
      completedAt: data.completedAt,
      txs: data.txs || [],
    };

    return status;
  }

  private mapClientStatus(clientStatus: string): SwapStatus["status"] {
    switch (clientStatus) {
      case "COMPLETED":
        return "COMPLETED";
      case "REFUNDED":
        return "REFUNDED";
      case "FAILED":
        return "FAILED";
      default:
        return "IN_PROGRESS";
    }
  }

  async startTracking(): Promise<SwapStatus> {
    return new Promise((resolve, reject) => {
      this.isPolling = true;
      this.retryCount = 0;

      const poll = async () => {
        try {
          const status = await this.fetchSwapStatus();

          // Call status update callback
          this.options.onStatusUpdate?.(status);

          // Check if swap is complete
          if (status.status === "COMPLETED") {
            this.stopPolling();
            this.options.onComplete?.(status);
            resolve(status);
            return;
          }

          // Check if swap failed or was refunded
          if (status.status === "FAILED" || status.status === "REFUNDED") {
            this.stopPolling();
            const error = new Error(
              `Swap ${status.status.toLowerCase()}: ${this.swapId}`,
            );
            this.options.onError?.(error);
            reject(error);
            return;
          }

          // Continue polling if still in progress
          this.retryCount++;
          if (this.retryCount >= this.maxRetries) {
            this.stopPolling();
            const error = new Error(
              `Swap tracking timeout after ${this.maxRetries} attempts`,
            );
            this.options.onError?.(error);
            reject(error);
            return;
          }

          if (this.isPolling) {
            this.timeoutId = setTimeout(poll, this.pollInterval);
          }
        } catch (error) {
          this.retryCount++;
          if (this.retryCount >= this.maxRetries) {
            this.stopPolling();
            this.options.onError?.(error as Error);
            reject(error);
            return;
          }

          // Retry after interval on error
          if (this.isPolling) {
            this.timeoutId = setTimeout(poll, this.pollInterval);
          }
        }
      };

      // Start polling immediately
      poll();
    });
  }

  stopPolling(): void {
    this.isPolling = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  getProgress(): { completed: number; total: number; currentStep?: string } {
    return {
      completed: this.retryCount,
      total: this.maxRetries,
      currentStep: "Tracking swap progress...",
    };
  }
}
