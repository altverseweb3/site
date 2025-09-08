import type {
  Market,
  Reserve,
  ChainId,
  EvmAddress,
  TimeWindow,
  APYSample,
  MarketReservesRequestOrderBy,
  MarketUserReserveBorrowPosition,
  MarketUserReserveSupplyPosition,
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
  UserTransactionItem,
  UserSupplyTransaction,
  UserBorrowTransaction,
  UserWithdrawTransaction,
  UserRepayTransaction,
  UserUsageAsCollateralTransaction,
  UserLiquidationCallTransaction,
  Signature,
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
  MarketUserReserveBorrowPosition,
  MarketUserReserveSupplyPosition,
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
  UserTransactionItem,
  UserSupplyTransaction,
  UserBorrowTransaction,
  UserWithdrawTransaction,
  UserRepayTransaction,
  UserUsageAsCollateralTransaction,
  UserLiquidationCallTransaction,
  Signature,
};

export interface UserSupplyPosition {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  supply: MarketUserReserveSupplyPosition;
}

export interface UserSupplyData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  supplies: MarketUserReserveSupplyPosition[];
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

export interface UserBorrowData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  borrows: MarketUserReserveBorrowPosition[];
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

export interface UserBorrowData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  borrows: MarketUserReserveBorrowPosition[];
}

export interface UserBorrowPosition {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  borrow: MarketUserReserveBorrowPosition;
}

export interface UnifiedMarketData extends Reserve {
  marketInfo: Market;
  marketName: string;
  supplyData: {
    apy: number;
    totalSupplied: string;
    totalSuppliedUsd: number;
  };
  borrowData: {
    apy: number;
    totalBorrowed: string;
    totalBorrowedUsd: number;
  };
  usdExchangeRate: number;
  isFrozen: boolean;
  isPaused: boolean;
}

export type EModeStatus = "on" | "off" | "mixed";

export interface SupplyArgs {
  /** The market address to supply to */
  market: EvmAddress;
  /** The amount to supply */
  amount: BigDecimal;
  /** The currency address to supply */
  currency: EvmAddress;
  /** The chain ID */
  chainId: ChainId;
  /** Whether to use native token (e.g., ETH instead of WETH) */
  useNative?: boolean;
  /** Address to send aTokens to (if different from sender) */
  onBehalfOf?: EvmAddress;
  /** Optional permit signature for gasless approval */
  permitSig?: {
    deadline: bigint;
    signature: Signature;
  };
}

/**
 * Result of a supply operation
 */
export interface SupplyResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for supply operations
 */
export interface SupplyState {
  loading: boolean;
  error: string | null;
}
