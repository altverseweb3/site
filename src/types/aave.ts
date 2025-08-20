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
};
