// src/api/altverse.ts
import {
  Network,
  TokenAddressInfo,
  TokenBalance,
  TokenMetadata,
  TokenPriceResult,
  SolanaTokenBalance,
} from "@/types/web3";

// Unified API Response type
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  statusCode: number;
}

// Core request type that all requests extend from
export interface BaseRequest {
  network: Network;
}

// Endpoint-specific request types
export interface BalancesRequest extends BaseRequest {
  userAddress: string;
  contractAddresses?: string; // Comma-separated list
}

export interface SuiBalancesRequest {
  owner: string;
}

export interface SuiBalancesRequest {
  owner: string;
}

export interface SuiBalanceResult {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: object;
}

export interface AllowanceRequest extends BaseRequest {
  userAddress: string;
  contractAddress: string;
  spenderAddress: string;
}

export interface MetadataRequest extends BaseRequest {
  contractAddress: string;
}

export interface PricesRequest {
  addresses: TokenAddressInfo[];
}

export interface SuiBalancesRequest {
  owner: string;
}

export interface SuiBalanceResult {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: object;
}

// Base interface for all metrics requests
export interface BaseMetricsRequest {
  metricType: "swap" | "entrance" | "earn" | "lending";
}

export interface SwapMetricsRequest extends BaseMetricsRequest {
  metricType: "swap";
  swapperAddress: string; // Required: Address performing the swap
  txHash?: string; // Optional: Transaction hash
  swapType?: string; // Optional: Type of swap ("vanilla", "earn/etherFi", "earn/aave", "earn/pendle", "lend/aave")
  path?: string; // Optional: Specific swap path
  amount?: string; // Optional: Swap amount
  tokenIn?: string; // Optional: Input token address
  tokenOut?: string; // Optional: Output token address
  sourceNetwork?: string; // Optional: Source network name
  destinationNetwork?: string; // Optional: Destination network name
}

export interface EntranceMetricsRequest extends BaseMetricsRequest {
  metricType: "entrance";
  userAddress?: string; // Optional: User address if available
}

export interface EarnMetricsRequest extends BaseMetricsRequest {
  metricType: "earn";
  protocol: string; // Required: Protocol name (e.g., "etherFi", "aave", "pendle")
  action: string; // Required: Action type ("deposit", "withdraw")
  userAddress: string; // Required: User address
  vaultId?: string; // Optional: Vault ID
  asset: string; // Required: Asset symbol
  amount?: string; // Optional: Amount
  chain: string; // Required: Chain name
  txHash?: string; // Optional: Transaction hash
}

export interface LendingMetricsRequest extends BaseMetricsRequest {
  metricType: "lending";
  protocol: string; // Required: Protocol name (e.g., "aave")
  action: string; // Required: Action type ("supply", "borrow", "withdraw", "repay")
  userAddress: string; // Required: User address
  marketId?: string; // Optional: Market ID
  asset: string; // Required: Asset symbol
  amount: string; // Required: Amount
  chain: string; // Required: Chain name
  txHash?: string; // Optional: Transaction hash
}

export type MetricsRequest =
  | SwapMetricsRequest
  | EntranceMetricsRequest
  | EarnMetricsRequest
  | LendingMetricsRequest;

// Endpoint-specific response types
export interface AllowanceResponse {
  allowance: string; // Hex string
}

export interface PricesResponse {
  data: TokenPriceResult[];
}

export interface MetricsResponse {
  success: boolean;
  message: string;
}

export class AltverseAPI {
  private baseUrl: string;

  constructor(
    baseUrl = "https://iwz0cfumv5.execute-api.ap-southeast-2.amazonaws.com/rest",
  ) {
    this.baseUrl = baseUrl;
  }

  /**
   * Simple test endpoint
   */
  public async test(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>("GET", "test");
  }

  /**
   * Fetch token balances for a given address
   */
  public async getBalances(
    request: BalancesRequest,
  ): Promise<ApiResponse<TokenBalance[]>> {
    return this.request<TokenBalance[]>("POST", "balances", request);
  }

  /**
   * Fetch token balances for a given address
   */
  public async getSplBalances(
    request: BalancesRequest,
  ): Promise<ApiResponse<SolanaTokenBalance[]>> {
    return this.request<SolanaTokenBalance[]>("POST", "spl-balances", request);
  }

  /**
   * Check token allowance for a given user/spender pair
   */
  public async getAllowance(
    request: AllowanceRequest,
  ): Promise<ApiResponse<AllowanceResponse>> {
    return this.request<AllowanceResponse>("POST", "allowance", request);
  }

  /**
   * Get metadata for a token contract
   */
  public async getTokenMetadata(
    request: MetadataRequest,
  ): Promise<ApiResponse<TokenMetadata>> {
    return this.request<TokenMetadata>("POST", "metadata", request);
  }

  /**
   * Get token prices for a list of tokens
   */
  public async getTokenPrices(
    request: PricesRequest,
  ): Promise<ApiResponse<PricesResponse>> {
    return this.request<PricesResponse>("POST", "prices", request);
  }

  public async getSuiBalances(
    request: SuiBalancesRequest,
  ): Promise<ApiResponse<SuiBalanceResult[]>> {
    return this.request<SuiBalanceResult[]>(
      "POST",
      "sui/all-balances",
      request,
    );
  }

  /**
   * Record unified metrics
   */
  public async recordMetric(
    request: MetricsRequest,
  ): Promise<ApiResponse<MetricsResponse>> {
    return this.request<MetricsResponse>("POST", "metrics", request);
  }

  /**
   * Unified request method that handles both GET and POST requests
   */
  private async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: BaseRequest | PricesRequest | SuiBalancesRequest | MetricsRequest,
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/${endpoint}`;

      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      };

      if (method === "POST" && body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const statusCode = response.status;

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP error ${statusCode}` };
        }

        return {
          data: null,
          error:
            errorData.error || errorData.message || `HTTP error ${statusCode}`,
          statusCode,
        };
      }

      const responseText = await response.text();

      try {
        const data = responseText ? JSON.parse(responseText) : null;
        return { data, error: null, statusCode };
      } catch (parseError) {
        return {
          data: null,
          error: `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          statusCode,
        };
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        statusCode: 500,
      };
    }
  }
}

// Export a singleton instance
export const altverseAPI = new AltverseAPI();
