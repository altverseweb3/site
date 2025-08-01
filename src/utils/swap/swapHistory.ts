import {
  REFERRER_EVM,
  REFERRER_SOL,
  REFERRER_SUI,
  MAYAN_API_BASE,
} from "@/config/mayan";
import type {
  SwapResponse,
  SwapQueryResult,
  UserWallets,
  ChainType,
} from "@/types/web3";

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  indexSpacingMs: number;
}

export class MayanSwapService {
  private readonly referrerAddresses = {
    EVM: REFERRER_EVM,
    SOL: REFERRER_SOL,
    SUI: REFERRER_SUI,
  };

  private readonly retryConfig: RetryConfig = {
    maxRetries: 8,
    baseDelayMs: 10000,
    maxDelayMs: 60000,
    indexSpacingMs: 500,
  };

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff and index-based spacing
   * Uses deterministic spacing to prevent clustering of retry attempts
   */
  private calculateDelay(attempt: number, callIndex: number = 0): number {
    const exponentialDelay =
      this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);

    const indexDelay = callIndex * this.retryConfig.indexSpacingMs;
    const finalDelay = exponentialDelay + indexDelay;

    return Math.min(Math.max(finalDelay, 1000), this.retryConfig.maxDelayMs);
  }

  /**
   * Check if an error might be a rate limit (TypeError from fetch usually indicates network/CORS issues)
   */
  private isPotentialRateLimit(error: unknown): boolean {
    return (
      error instanceof TypeError ||
      (error instanceof Error &&
        (error.message.includes("NetworkError") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("CORS") ||
          error.message.includes("network")))
    );
  }

  /**
   * Query swaps with retry logic for potential rate limits
   */
  private async querySwapsWithRetry(
    referrerAddress: string,
    traderAddress: string,
    attempt: number = 1,
    callIndex: number = 0,
  ): Promise<SwapQueryResult> {
    const url = `${MAYAN_API_BASE}/swaps?referrerAddress=${referrerAddress}&trader=${traderAddress}`;

    try {
      console.log(
        `[Attempt ${attempt}, Call ${callIndex}] Fetching swaps for referrer: ${referrerAddress}, trader: ${traderAddress}`,
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SwapResponse = await response.json();

      if (attempt > 1) {
        console.log(
          `✓ Successfully fetched after ${attempt} attempts (Call ${callIndex})`,
        );
      }

      return {
        referrerAddress,
        traderAddress,
        response: data,
        rawResponse: response,
      };
    } catch (error) {
      const isPotentialRateLimit = this.isPotentialRateLimit(error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (isPotentialRateLimit && attempt < this.retryConfig.maxRetries) {
        const delayMs = this.calculateDelay(attempt, callIndex);

        console.log(
          `Potential rate limit detected (${errorMessage}). Retrying in ${Math.round(delayMs / 1000)}s with indexed spacing (Call ${callIndex}, attempt ${attempt}/${this.retryConfig.maxRetries})`,
        );

        await this.sleep(delayMs);
        return this.querySwapsWithRetry(
          referrerAddress,
          traderAddress,
          attempt + 1,
          callIndex,
        );
      }

      if (isPotentialRateLimit && attempt >= this.retryConfig.maxRetries) {
        console.error(
          `Potential rate limit - max retries (${this.retryConfig.maxRetries}) reached for ${referrerAddress} -> ${traderAddress} (Call ${callIndex})`,
        );
      } else {
        console.error(
          `Non-retryable error for ${referrerAddress} -> ${traderAddress} (Call ${callIndex}):`,
          errorMessage,
        );
      }

      return {
        referrerAddress,
        traderAddress,
        response: { data: [], metadata: { count: 0, volume: 0 } },
        error: isPotentialRateLimit
          ? `Potential rate limit after ${attempt} attempts: ${errorMessage}`
          : errorMessage,
      };
    }
  }

  /**
   * Query swaps for a specific referrer and trader combination (legacy method for backward compatibility)
   */
  private async querySwaps(
    referrerAddress: string,
    traderAddress: string,
    callIndex: number = 0,
  ): Promise<SwapQueryResult> {
    return this.querySwapsWithRetry(
      referrerAddress,
      traderAddress,
      1,
      callIndex,
    );
  }

  /**
   * Process requests in batches with delays to reduce rate limiting
   */
  private async processBatched<T, R>(
    items: T[],
    processor: (item: T, globalIndex: number) => Promise<R>,
    batchSize: number = 3,
    delayBetweenBatches: number = 2000,
    delayBetweenRequests: number = 500,
  ): Promise<R[]> {
    const results: R[] = [];
    let globalIndex = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`,
      );

      const batchResults: R[] = [];
      for (let j = 0; j < batch.length; j++) {
        const result = await processor(batch[j], globalIndex);
        batchResults.push(result);
        globalIndex++;

        if (j < batch.length - 1) {
          await this.sleep(delayBetweenRequests);
        }
      }

      results.push(...batchResults);

      if (i + batchSize < items.length) {
        console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
        await this.sleep(delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * Get all swaps for a single trader across all referrer addresses
   */
  async getSwapsForTrader(traderAddress: string): Promise<SwapQueryResult[]> {
    const referrerAddresses = Object.values(this.referrerAddresses);

    const results = await this.processBatched(
      referrerAddresses,
      (referrerAddress, callIndex) =>
        this.querySwaps(referrerAddress, traderAddress, callIndex),
      1,
      1000,
      0,
    );

    const totalSwaps = results.reduce(
      (sum, result) => sum + result.response.data.length,
      0,
    );
    const errors = results.filter((result) => result.error);

    console.log(`Completed queries for trader ${traderAddress}:`);
    console.log(`- Total swaps found: ${totalSwaps}`);
    console.log(
      `- Successful queries: ${results.length - errors.length}/${results.length}`,
    );

    if (errors.length > 0) {
      console.log(
        `- Errors:`,
        errors.map((e) => `${e.referrerAddress}: ${e.error}`),
      );
    }

    return results;
  }

  /**
   * Get all swaps for multiple user wallets across all referrer addresses
   */
  async getSwapsForUserWallets(userWallets: UserWallets): Promise<{
    results: SwapQueryResult[];
    summary: {
      totalQueries: number;
      successfulQueries: number;
      totalSwaps: number;
      swapsByChain: Record<ChainType, number>;
    };
  }> {
    const walletAddresses: string[] = [];

    if (userWallets.evm) {
      walletAddresses.push(userWallets.evm);
    }
    if (userWallets.solana) {
      walletAddresses.push(userWallets.solana);
    }
    if (userWallets.sui) {
      walletAddresses.push(userWallets.sui);
    }

    const queryItems: { referrerAddress: string; walletAddress: string }[] = [];
    for (const referrerAddress of Object.values(this.referrerAddresses)) {
      for (const walletAddress of walletAddresses) {
        queryItems.push({ referrerAddress, walletAddress });
      }
    }

    console.log(
      `Starting ${queryItems.length} queries with indexed retry strategy...`,
    );
    const startTime = Date.now();

    const results = await this.processBatched(
      queryItems,
      ({ referrerAddress, walletAddress }, callIndex) =>
        this.querySwaps(referrerAddress, walletAddress, callIndex),
      2,
      3000,
      1500,
    );

    const endTime = Date.now();
    console.log(`Completed all queries in ${endTime - startTime}ms`);

    const totalSwaps = results.reduce(
      (sum, result) => sum + result.response.data.length,
      0,
    );
    const successfulQueries = results.filter((result) => !result.error).length;
    const errors = results.filter((result) => result.error);

    const swapsByChain: Record<ChainType, number> = {
      EVM: 0,
      SOL: 0,
      SUI: 0,
    };

    results.forEach((result) => {
      if (result.referrerAddress === this.referrerAddresses.EVM) {
        swapsByChain.EVM += result.response.data.length;
      } else if (result.referrerAddress === this.referrerAddresses.SOL) {
        swapsByChain.SOL += result.response.data.length;
      } else if (result.referrerAddress === this.referrerAddresses.SUI) {
        swapsByChain.SUI += result.response.data.length;
      }
    });

    // Log detailed results
    console.log("\n=== SWAP HISTORY RESULTS ===");
    console.log(`Total queries: ${queryItems.length}`);
    console.log(
      `Successful queries: ${successfulQueries}/${queryItems.length}`,
    );
    console.log(`Total swaps found: ${totalSwaps}`);
    console.log("Swaps by chain:", swapsByChain);

    if (errors.length > 0) {
      console.log("\nErrors encountered:");
      errors.forEach((error) => {
        console.log(
          `  ${error.referrerAddress} -> ${error.traderAddress}: ${error.error}`,
        );
      });
    }

    // Log individual results
    console.log("\nDetailed results:");
    results.forEach((result) => {
      const chainType =
        Object.entries(this.referrerAddresses).find(
          ([, address]) => address === result.referrerAddress,
        )?.[0] || "UNKNOWN";

      console.log(
        `  ${chainType} referrer -> ${result.traderAddress.slice(0, 8)}...: ${result.response.data.length} swaps`,
      );

      if (result.response.data.length > 0) {
        console.log(
          `    Latest swap: ${result.response.data[0].fromTokenSymbol} -> ${result.response.data[0].toTokenSymbol} (${result.response.data[0].initiatedAt})`,
        );
      }
    });

    return {
      results,
      summary: {
        totalQueries: queryItems.length,
        successfulQueries,
        totalSwaps,
        swapsByChain,
      },
    };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.retryConfig, config);
    console.log("Updated retry config:", this.retryConfig);
  }

  /**
   * Update the spacing between indexed retry attempts
   */
  updateIndexSpacing(spacingMs: number): void {
    this.updateRetryConfig({ indexSpacingMs: spacingMs });
  }
}
