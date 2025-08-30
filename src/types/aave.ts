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

export type EModeStatus = "on" | "off" | "mixed";
