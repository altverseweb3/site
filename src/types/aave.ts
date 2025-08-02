import { SupportedChainId } from "@/config/aave";
import { ethers } from "ethers";

export interface ReserveData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  supplyAPY: number;
  variableBorrowAPY: number;
  stableBorrowAPY: number;
  totalSupplied: string;
  totalSuppliedUSD: string;
  availableLiquidity: string;
  utilizationRate: number;
  canBeCollateral: boolean;
  maxLTV: number;
  liquidationThreshold: number;
  liquidationPenalty: number;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  oraclePrice: number;
}

// Enhanced interface that includes both supply and borrow data
export interface AaveReserveData {
  symbol: string;
  name: string;
  asset: string;
  decimals: number;
  aTokenAddress: string;

  // Supply data
  currentLiquidityRate: string;
  totalSupply: string;
  formattedSupply: string;
  supplyAPY: string;
  canBeCollateral: boolean;

  // Borrow data
  variableBorrowRate: string;
  stableBorrowRate: string;
  variableBorrowAPY: string;
  stableBorrowAPY: string;
  stableBorrowEnabled: boolean;
  borrowingEnabled: boolean;
  totalBorrowed: string;
  formattedTotalBorrowed: string;
  availableLiquidity: string;
  formattedAvailableLiquidity: string;
  borrowCap: string;
  formattedBorrowCap: string;

  // General data
  isActive: boolean;
  isFrozen: boolean;
  isIsolationModeAsset?: boolean;
  debtCeiling?: number;
  userBalance?: string;
  userBalanceFormatted?: string;
  userBalanceUsd?: string;
  tokenIcon?: string;
  chainId?: number;
}

export interface AaveReservesResult {
  allReserves: AaveReserveData[];
  supplyAssets: AaveReserveData[];
  borrowAssets: AaveReserveData[];
}

export interface ReserveMetrics {
  reserveSize: string;
  availableLiquidity: string;
  totalBorrowed: string;
  borrowedPercentage: number;
  availablePercentage: number;
  supplyCapUtilization: number;
  borrowCapUtilization: number;
  supplyCapFormatted: string;
  borrowCapFormatted: string;
}

export enum RateMode {
  Stable = 1,
  Variable = 2,
}

export interface UserPosition {
  asset: AaveReserveData;
  suppliedBalance: string;
  suppliedBalanceUSD: string;
  isCollateral: boolean;
  aTokenBalance: string;
}

export interface UserBorrowPosition {
  asset: AaveReserveData;
  stableDebt: string;
  variableDebt: string;
  totalDebt: string;
  formattedTotalDebt: string;
  totalDebtUSD: string;
  stableBorrowRate: string;
  variableBorrowRate: string;
  currentBorrowAPY: string;
}

export interface UserAccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
}

export interface UserReserveData {
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  principalStableDebt: string;
  scaledVariableDebt: string;
  stableBorrowRate: string;
  liquidityRate: string;
  stableRateLastUpdated: number;
  usageAsCollateralEnabled: boolean;
}

export interface SupplyParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface SupplyResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface CollateralParams {
  tokenAddress: string;
  useAsCollateral: boolean;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface CollateralResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WithdrawParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface BorrowParams {
  tokenAddress: string;
  amount: string;
  rateMode: RateMode;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface BorrowResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface RepayParams {
  tokenAddress: string;
  amount: string;
  rateMode: RateMode;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface RepayResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface ExtendedAssetDetails {
  ltv?: string;
  liquidationThreshold?: string;
  liquidationPenalty?: string;
  stableDebtTokenAddress?: string;
  variableDebtTokenAddress?: string;
  oraclePrice?: number;
  currentPrice?: number;
  priceChange24h?: number;
  supplyCap?: string;
}
