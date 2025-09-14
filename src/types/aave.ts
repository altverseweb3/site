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
  HealthFactorPreviewRequest,
  HealthFactorPreviewResponse,
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
  HealthFactorPreviewRequest,
  HealthFactorPreviewResponse,
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

/**
 * Arguments for borrow operations
 */
export interface BorrowArgs {
  /** The market address to borrow from */
  market: EvmAddress;
  /** The amount to borrow */
  amount: BigDecimal;
  /** The currency address to borrow */
  currency: EvmAddress;
  /** The chain ID */
  chainId: ChainId;
  /** Whether to use native token (e.g., ETH instead of WETH) */
  useNative?: boolean;
  /** Address to send borrowed tokens to (if different from sender) */
  onBehalfOf?: EvmAddress;
}

/**
 * Result of a borrow operation
 */
export interface BorrowResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for borrow operations
 */
export interface BorrowState {
  loading: boolean;
  error: string | null;
}

/**
 * Arguments for repay operations
 */
export interface RepayArgs {
  /** The market address to repay to */
  market: EvmAddress;
  /** The amount to repay (use max uint256 for full repayment) */
  amount: BigDecimal;
  /** The currency address to repay */
  currency: EvmAddress;
  /** The chain ID */
  chainId: ChainId;
  /** Whether to use native token (e.g., ETH instead of WETH) */
  useNative?: boolean;
  /** Address to repay on behalf of (if different from sender) */
  onBehalfOf?: EvmAddress;
  /** Optional permit signature for gasless approval */
  permitSig?: {
    deadline: bigint;
    signature: Signature;
  };
  max: boolean;
}

/**
 * Result of a repay operation
 */
export interface RepayResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for repay operations
 */
export interface RepayState {
  loading: boolean;
  error: string | null;
}

/**
 * Arguments for withdraw operations
 */
export interface WithdrawArgs {
  /** The market address to withdraw from */
  market: EvmAddress;
  /** The amount to withdraw (use max uint256 for full withdrawal) */
  amount: BigDecimal;
  /** The currency address to withdraw */
  currency: EvmAddress;
  /** The chain ID */
  chainId: ChainId;
  /** Whether to use native token (e.g., ETH instead of WETH) */
  useNative?: boolean;
  /** Address to send withdrawn tokens to (if different from sender) */
  to?: EvmAddress;
  /** Whether this is a max withdrawal */
  max: boolean;
}

/**
 * Result of a withdraw operation
 */
export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for withdraw operations
 */
export interface WithdrawState {
  loading: boolean;
  error: string | null;
}

/**
 * Arguments for e-mode operations
 */
export interface EmodeArgs {
  /** The market address */
  market: EvmAddress;
  /** The user address */
  user: EvmAddress;
  /** The e-mode category ID (null to disable e-mode) */
  categoryId: number | null;
  /** The chain ID */
  chainId: ChainId;
}

/**
 * Result of an e-mode operation
 */
export interface EmodeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for e-mode operations
 */
export interface EmodeState {
  loading: boolean;
  error: string | null;
}

/**
 * Arguments for collateral toggle operations
 */
export interface CollateralArgs {
  /** The market address */
  market: EvmAddress;
  /** The underlying token address to toggle collateral for */
  underlyingToken: EvmAddress;
  /** The user address */
  user: EvmAddress;
  /** The chain ID */
  chainId: ChainId;
}

/**
 * Result of a collateral toggle operation
 */
export interface CollateralResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

/**
 * Loading state for collateral operations
 */
export interface CollateralState {
  loading: boolean;
  error: string | null;
}

export type HealthFactorPreviewOperation =
  | "borrow"
  | "supply"
  | "repay"
  | "withdraw";
export type HealthFactorRiskLevel = "ok" | "warning" | "danger";
