import * as markets from "@bgd-labs/aave-address-book";

const CHAIN_CONFIG = {
  1: { name: "ethereum", market: markets.AaveV3Ethereum },
  137: { name: "polygon", market: markets.AaveV3Polygon },
  42161: { name: "arbitrum", market: markets.AaveV3Arbitrum },
  10: { name: "optimism", market: markets.AaveV3Optimism },
  43114: { name: "avalanche", market: markets.AaveV3Avalanche },
  8453: { name: "base", market: markets.AaveV3Base },
  100: { name: "gnosis", market: markets.AaveV3Gnosis },
  56: { name: "bsc", market: markets.AaveV3BNB },
  11155111: { name: "sepolia", market: markets.AaveV3Sepolia },
} as const;

export type SupportedChainId = keyof typeof CHAIN_CONFIG;

export const chainNames: Record<SupportedChainId, string> = Object.fromEntries(
  Object.entries(CHAIN_CONFIG).map(([id, config]) => [Number(id), config.name]),
) as Record<SupportedChainId, string>;

export interface ChainConfig {
  poolAddress: string;
  dataProviderAddress: string;
  uiDataProviderAddress?: string;
  addressesProviderAddress: string;
  wethGatewayAddress?: string;
}

export function getAaveMarket(chainId: number) {
  const config = CHAIN_CONFIG[chainId as SupportedChainId];
  if (!config) {
    throw new Error(`Aave V3 not supported on chain ${chainId}`);
  }
  return config.market;
}

export function isChainSupported(chainId: number): chainId is SupportedChainId {
  return chainId in CHAIN_CONFIG;
}

export function getChainName(
  chainId: number,
  fallback: string = "ethereum",
): string {
  return CHAIN_CONFIG[chainId as SupportedChainId]?.name || fallback;
}
