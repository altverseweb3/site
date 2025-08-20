import type {
  Market,
  Reserve,
  ChainId,
  EvmAddress,
  TimeWindow,
  APYSample,
  MarketReservesRequestOrderBy,
  BigDecimal,
  Currency,
  TokenAmount,
  Chain,
  EmodeMarketCategory,
  MarketUserState,
  EmodeReserveInfo,
  ReserveSupplyInfo,
  ReserveBorrowInfo,
  ReserveIsolationModeConfig,
  ReserveUserState,
  ReserveIncentive,
  MeritSupplyIncentive,
  MeritBorrowIncentive,
  MeritBorrowAndSupplyIncentiveCondition,
  AaveSupplyIncentive,
  AaveBorrowIncentive,
  PercentValue,
  MarketInfo,
  MarketUserReserveSupplyPosition,
  MarketUserReserveBorrowPosition,
} from "@aave/react";

/**
 * Re-exporting core types from the Aave SDK.
 * This creates a single source of truth for Aave-related types within our application,
 * making it easier to manage and update if the SDK changes.
 */
export type {
  Market,
  Reserve,
  ChainId,
  EvmAddress,
  TimeWindow,
  APYSample,
  MarketReservesRequestOrderBy,
  BigDecimal,
  Currency,
  TokenAmount,
  Chain,
  EmodeMarketCategory,
  MarketUserState,
  EmodeReserveInfo,
  ReserveSupplyInfo,
  ReserveBorrowInfo,
  ReserveIsolationModeConfig,
  ReserveUserState,
  ReserveIncentive,
  MeritSupplyIncentive,
  MeritBorrowIncentive,
  MeritBorrowAndSupplyIncentiveCondition,
  AaveSupplyIncentive,
  AaveBorrowIncentive,
  PercentValue,
  MarketInfo,
  MarketUserReserveSupplyPosition,
  MarketUserReserveBorrowPosition,
};

/**
 * Props for fetching data for multiple Aave markets.
 */
export interface AaveMarketsDataProps {
  chainIds: ChainId[];
  user?: EvmAddress;
  suppliesOrderBy?: MarketReservesRequestOrderBy;
  borrowsOrderBy?: MarketReservesRequestOrderBy;
}

/**
 * Props for fetching data for a single Aave market.
 */
export interface AaveSingleMarketDataProps {
  address: EvmAddress;
  chainId: ChainId;
  user?: EvmAddress;
  suppliesOrderBy?: MarketReservesRequestOrderBy;
  borrowsOrderBy?: MarketReservesRequestOrderBy;
}

/**
 * Props for fetching APY history for a reserve.
 */
export interface AaveAPYHistoryDataProps {
  chainId: ChainId;
  underlyingToken: EvmAddress;
  market: EvmAddress;
  window: TimeWindow;
}

/**
 * Extended market information with computed values
 */
export interface EnhancedMarket extends Market {
  utilizationRate?: number;
  formattedMarketSize?: string;
  formattedLiquidity?: string;
}

/**
 * Extended reserve information with computed values
 */
export interface EnhancedReserve extends Reserve {
  utilizationRate?: number;
  formattedSupplyAPY?: string;
  formattedBorrowAPY?: string;
  totalSuppliedFormatted?: string;
  totalBorrowedFormatted?: string;
}

/**
 * Health factor status for user positions
 */
export type HealthFactorStatus = "safe" | "warning" | "danger";

/**
 * Enhanced user state with formatted values
 */
export interface EnhancedUserState {
  netWorth: string;
  healthFactor?: {
    value: string;
    status: HealthFactorStatus;
  };
  totalCollateral?: string;
  totalBorrowed?: string;
  availableBorrow?: string;
}

/**
 * Common loading state interface
 */
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
  retry?: () => void;
}

/**
 * Market data response with enhanced loading state
 */
export interface AaveMarketsResponse extends LoadingState {
  markets?: Market[];
}

/**
 * Emode market category with enhanced loading state
 */
export interface AaveEmodeMarketCategoryResponse extends LoadingState {
  category?: EmodeMarketCategory;
}

/**
 * Market user state response with enhanced loading state
 */
export interface AaveMarketUserStateResponse extends LoadingState {
  userState?: MarketUserState;
}

/**
 * Single market data response with enhanced loading state
 */
export interface AaveSingleMarketResponse extends LoadingState {
  market?: Market;
}

/**
 * APY history response with enhanced loading state
 */
export interface AaveAPYHistoryResponse extends LoadingState {
  history?: APYSample[];
}
