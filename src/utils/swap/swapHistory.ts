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
  jitterFactor: number;
}

export class MayanSwapService {
  private readonly referrerAddresses = {
    EVM: REFERRER_EVM,
    SOL: REFERRER_SOL,
    SUI: REFERRER_SUI,
  };

  private readonly retryConfig: RetryConfig = {
    maxRetries: 8,
    baseDelayMs: 10000, // Start with 10 seconds
    maxDelayMs: 60000, // 60 seconds max delay
    jitterFactor: 0.2, // 20% jitter
  };

  /**
   * Sleep for a specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Since we can't detect 429s specifically, we assume network errors might be rate limits
   */
  private calculateDelay(attempt: number): number {
    // Exponential backoff: baseDelay * 2^(attempt-1)
    const exponentialDelay =
      this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);

    // Add jitter to prevent thundering herd (±jitterFactor of the delay)
    const jitterRange = exponentialDelay * this.retryConfig.jitterFactor;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange; // Random between -jitterRange and +jitterRange

    const finalDelay = exponentialDelay + jitter;
    return Math.min(Math.max(finalDelay, 1000), this.retryConfig.maxDelayMs); // At least 1 second, at most maxDelayMs
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
  ): Promise<SwapQueryResult> {
    const url = `${MAYAN_API_BASE}/swaps?referrerAddress=${referrerAddress}&trader=${traderAddress}`;

    try {
      console.log(
        `[Attempt ${attempt}] Fetching swaps for referrer: ${referrerAddress}, trader: ${traderAddress}`,
      );

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SwapResponse = await response.json();

      if (attempt > 1) {
        console.log(`✓ Successfully fetched after ${attempt} attempts`);
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

      // If this might be a rate limit and we haven't exceeded max retries, try again
      if (isPotentialRateLimit && attempt < this.retryConfig.maxRetries) {
        const delayMs = this.calculateDelay(attempt);
        console.log(
          `Potential rate limit detected (${errorMessage}). Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/${this.retryConfig.maxRetries})`,
        );

        await this.sleep(delayMs);
        return this.querySwapsWithRetry(
          referrerAddress,
          traderAddress,
          attempt + 1,
        );
      }

      // For non-rate-limit errors or if we've exhausted retries
      if (isPotentialRateLimit && attempt >= this.retryConfig.maxRetries) {
        console.error(
          `Potential rate limit - max retries (${this.retryConfig.maxRetries}) reached for ${referrerAddress} -> ${traderAddress}`,
        );
      } else {
        console.error(
          `Non-retryable error for ${referrerAddress} -> ${traderAddress}:`,
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
  ): Promise<SwapQueryResult> {
    return this.querySwapsWithRetry(referrerAddress, traderAddress);
  }

  /**
   * Process requests in batches with delays to reduce rate limiting
   */
  private async processBatched<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 3,
    delayBetweenBatches: number = 2000,
    delayBetweenRequests: number = 500,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} (${batch.length} items)`,
      );

      // Process items in batch with delays between each request
      const batchResults: R[] = [];
      for (let j = 0; j < batch.length; j++) {
        const result = await processor(batch[j]);
        batchResults.push(result);

        // Add delay between requests within the batch (except for the last item)
        if (j < batch.length - 1) {
          await this.sleep(delayBetweenRequests);
        }
      }

      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
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

    // Process referrers sequentially with delays to minimize rate limiting
    const results = await this.processBatched(
      referrerAddresses,
      (referrerAddress) => this.querySwaps(referrerAddress, traderAddress),
      1, // Process one referrer at a time
      1000, // 1 second delay between referrers
      0, // No delay within batch since batch size is 1
    );

    // Log summary
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

    // Collect all wallet addresses
    if (userWallets.evm) {
      walletAddresses.push(userWallets.evm);
    }
    if (userWallets.solana) {
      walletAddresses.push(userWallets.solana);
    }
    if (userWallets.sui) {
      walletAddresses.push(userWallets.sui);
    }

    // Create query items for each combination of referrer and wallet
    const queryItems: { referrerAddress: string; walletAddress: string }[] = [];
    for (const referrerAddress of Object.values(this.referrerAddresses)) {
      for (const walletAddress of walletAddresses) {
        queryItems.push({ referrerAddress, walletAddress });
      }
    }

    console.log(
      `Starting ${queryItems.length} queries in conservative batches to avoid rate limiting...`,
    );
    const startTime = Date.now();

    // Process very conservatively to avoid rate limits
    const results = await this.processBatched(
      queryItems,
      ({ referrerAddress, walletAddress }) =>
        this.querySwaps(referrerAddress, walletAddress),
      2, // Process only 2 requests at a time
      3000, // 3 second delay between batches
      1500, // 1.5 second delay between requests in batch
    );

    const endTime = Date.now();
    console.log(`Completed all queries in ${endTime - startTime}ms`);

    // Calculate summary statistics
    const totalSwaps = results.reduce(
      (sum, result) => sum + result.response.data.length,
      0,
    );
    const successfulQueries = results.filter((result) => !result.error).length;
    const errors = results.filter((result) => result.error);

    // Count swaps by chain (approximate based on referrer)
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
}
