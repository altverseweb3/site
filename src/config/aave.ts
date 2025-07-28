import * as markets from "@bgd-labs/aave-address-book";

export const chainNames: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  43114: "avalanche",
  8453: "base",
  100: "gnosis",
  56: "bsc",
};

export type SupportedChainId =
  | 1
  | 137
  | 42161
  | 10
  | 43114
  | 8453
  | 100
  | 56
  | 11155111;

export interface ChainConfig {
  poolAddress: string;
  dataProviderAddress: string;
  uiDataProviderAddress?: string;
  addressesProviderAddress: string;
  wethGatewayAddress?: string;
}

// Helper function to get the correct market based on chain ID
export function getAaveMarket(chainId: number) {
  switch (chainId) {
    case 1:
      return markets.AaveV3Ethereum;
    case 137:
      return markets.AaveV3Polygon;
    case 42161:
      return markets.AaveV3Arbitrum;
    case 10:
      return markets.AaveV3Optimism;
    case 43114:
      return markets.AaveV3Avalanche;
    case 8453:
      return markets.AaveV3Base;
    case 100:
      return markets.AaveV3Gnosis;
    case 56:
      return markets.AaveV3BNB;
    case 11155111:
      return markets.AaveV3Sepolia;
    default:
      throw new Error(`Aave V3 not supported on chain ${chainId}`);
  }
}
