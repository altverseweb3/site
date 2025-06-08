// Aave Configuration and Constants
import * as markets from "@bgd-labs/aave-address-book";

export const SUPPORTED_CHAINS = {
  1: "AaveV3Ethereum",
  10: "AaveV3Optimism",
  56: "AaveV3BNB",
  137: "AaveV3Polygon",
  42161: "AaveV3Arbitrum",
  43114: "AaveV3Avalanche",
  8453: "AaveV3Base",
  11155111: "AaveV3Sepolia",
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

export class AaveConfig {
  static isChainSupported(chainId: number): chainId is SupportedChainId {
    return chainId in SUPPORTED_CHAINS;
  }

  static getAaveMarket(chainId: SupportedChainId) {
    const marketKey = SUPPORTED_CHAINS[chainId];
    return markets[marketKey] || null;
  }

  static getPoolAddress(chainId: SupportedChainId): string | null {
    const market = this.getAaveMarket(chainId);
    return market?.POOL || null;
  }

  static getDataProviderAddress(chainId: SupportedChainId): string | null {
    const market = this.getAaveMarket(chainId);
    return market?.AAVE_PROTOCOL_DATA_PROVIDER || null;
  }

  static getUiDataProviderAddress(chainId: SupportedChainId): string | null {
    const market = this.getAaveMarket(chainId);
    return market?.UI_POOL_DATA_PROVIDER || null;
  }

  static getAddressesProviderAddress(chainId: SupportedChainId): string | null {
    const market = this.getAaveMarket(chainId);
    return market?.POOL_ADDRESSES_PROVIDER || null;
  }
}

// Network names for display
export const NETWORK_NAMES: Record<SupportedChainId, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  42161: "Arbitrum",
  43114: "Avalanche",
  8453: "Base",
  11155111: "Sepolia",
};
