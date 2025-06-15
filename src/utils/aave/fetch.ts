// aaveFetch.ts - Essential Aave fetch functionality using wallet provider
import { ethers } from "ethers";
import { useWalletProviderAndSigner } from "@/utils/reownEthersUtils";
import * as markets from "@bgd-labs/aave-address-book";
import { POOL_DATA_PROVIDER_ABI, ERC20_ABI } from "@/types/aaveAbis";

// Types
export interface AaveReserveData {
  symbol: string;
  name: string;
  asset: string;
  decimals: number;
  aTokenAddress: string;
  currentLiquidityRate: string;
  totalSupply: string;
  formattedSupply: string;
  isActive: boolean;
  supplyAPY: string;
  canBeCollateral: boolean;
  userBalance?: string;
  userBalanceFormatted?: string;
  userBalanceUsd?: string;
}

// Helper function to get the correct market based on chain ID
function getAaveMarket(chainId: number) {
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

// Utility function to convert rates from ray format to percentage
function rayToPercentage(rayValue: string): string {
  const RAY = Math.pow(10, 27);
  const SECONDS_PER_YEAR = 31536000;
  const rayValueInDecimals = Number(rayValue) / RAY;
  const aaveAPY =
    (Math.pow(1 + rayValueInDecimals / SECONDS_PER_YEAR, SECONDS_PER_YEAR) -
      1) *
    100;
  return Number(aaveAPY).toFixed(2);
}

/**
 * Fetch all reserves data using wallet provider (similar to etherFi approach)
 */
export async function fetchAllReservesData(
  signer: ethers.Signer,
): Promise<AaveReserveData[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

  console.log(`Fetching Aave reserves for chain ${chainId}...`);

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  // Get all reserve tokens
  const reserveTokens = await poolDataProvider.getAllReservesTokens();
  console.log(`Found ${reserveTokens.length} reserve tokens`);

  const reservesData: AaveReserveData[] = [];

  // Process all tokens in parallel
  const promises = reserveTokens.map(
    async (token: { tokenAddress: string; symbol: string }) => {
      try {
        // Get token contract
        const tokenContract = new ethers.Contract(
          token.tokenAddress,
          ERC20_ABI,
          provider,
        );

        // Get all data in parallel
        const [name, symbol, configData, reserveData, tokenAddresses] =
          await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            poolDataProvider.getReserveConfigurationData(token.tokenAddress),
            poolDataProvider.getReserveData(token.tokenAddress),
            poolDataProvider.getReserveTokensAddresses(token.tokenAddress),
          ]);

        // Only include active and non-frozen reserves
        if (!configData.isActive || configData.isFrozen) {
          return null;
        }

        const supplyAPY = rayToPercentage(reserveData.liquidityRate.toString());
        const formattedSupply = ethers.formatUnits(
          reserveData.totalAToken,
          Number(configData.decimals),
        );

        return {
          symbol: symbol,
          name: name,
          asset: token.tokenAddress,
          decimals: Number(configData.decimals),
          aTokenAddress: tokenAddresses.aTokenAddress,
          currentLiquidityRate: reserveData.liquidityRate.toString(),
          totalSupply: reserveData.totalAToken.toString(),
          formattedSupply: formattedSupply,
          isActive: configData.isActive,
          supplyAPY: supplyAPY,
          canBeCollateral: configData.usageAsCollateralEnabled,
          userBalance: "0",
          userBalanceFormatted: "0.00",
          userBalanceUsd: "0.00",
        };
      } catch (error) {
        console.log(
          `Skipping ${token.symbol}:`,
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    },
  );

  const results = await Promise.all(promises);

  // Filter out null results
  for (const result of results) {
    if (result !== null) {
      reservesData.push(result);
    }
  }

  console.log(`Found ${reservesData.length} active reserves`);
  return reservesData;
}

/**
 * Get user's token balance for a specific asset
 */
export async function getUserTokenBalance(
  tokenAddress: string,
  signer: ethers.Signer,
): Promise<{
  balance: bigint;
  formatted: string;
  decimals: number;
}> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const userAddress = await signer.getAddress();
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  const [balance, decimals] = await Promise.all([
    tokenContract.balanceOf(userAddress),
    tokenContract.decimals(),
  ]);

  return {
    balance,
    formatted: ethers.formatUnits(balance, decimals),
    decimals: Number(decimals),
  };
}

/**
 * React hook for Aave fetch functions with wallet integration
 */
export function useAaveFetch() {
  const { getEvmSigner } = useWalletProviderAndSigner();

  return {
    fetchAllReservesData: async () => {
      const signer = await getEvmSigner();
      return fetchAllReservesData(signer);
    },
  };
}
