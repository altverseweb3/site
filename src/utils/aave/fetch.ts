// aaveFetch.ts - Essential Aave fetch functionality using wallet provider
import { ethers } from "ethers";
import { useWalletProviderAndSigner } from "@/utils/reownEthersUtils";
import * as markets from "@bgd-labs/aave-address-book";
import { POOL_DATA_PROVIDER_ABI, ERC20_ABI } from "@/types/aaveAbis";
import { loadTokensForChain } from "@/utils/tokenMethods";
import { Token } from "@/types/web3";

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
  isIsolationModeAsset?: boolean;
  debtCeiling?: number;
  userBalance?: string;
  userBalanceFormatted?: string;
  userBalanceUsd?: string;
  tokenIcon?: string; // Just the icon filename
  chainId?: number; // For image path
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

// Rate limiting utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Alternative: Fetch with exponential backoff for better error handling
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

  console.log(`Fetching Aave reserves for chain ${chainId} with backoff...`);

  // Get chain name for token lookup
  const chainNames: Record<number, string> = {
    1: "ethereum",
    137: "polygon",
    42161: "arbitrum",
    10: "optimism",
    43114: "avalanche",
    8453: "base",
    100: "gnosis",
    56: "bsc",
  };
  const chainName = chainNames[chainId] || "ethereum";

  // Load tokens for this chain once
  const chainTokens = await loadTokensForChain(chainName);
  const tokenLookup: Record<string, Token> = {};
  chainTokens.forEach((token) => {
    tokenLookup[token.address.toLowerCase()] = token;
  });

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  const reserveTokens = await poolDataProvider.getAllReservesTokens();
  console.log(`Found ${reserveTokens.length} reserve tokens`);

  const reservesData: AaveReserveData[] = [];
  const BATCH_SIZE = 2; // Even smaller batches
  const INITIAL_DELAY = 100;
  const MAX_RETRIES = 3;

  for (let i = 0; i < reserveTokens.length; i += BATCH_SIZE) {
    const batch = reserveTokens.slice(i, i + BATCH_SIZE);
    let retries = 0;
    let currentDelay = INITIAL_DELAY;

    while (retries < MAX_RETRIES) {
      try {
        const batchPromises = batch.map(
          async (token: { tokenAddress: string; symbol: string }) => {
            try {
              const [configData, reserveData, debtCeiling] = await Promise.all([
                poolDataProvider.getReserveConfigurationData(
                  token.tokenAddress,
                ),
                poolDataProvider.getReserveData(token.tokenAddress),
                poolDataProvider.getDebtCeiling(token.tokenAddress),
              ]);

              if (!configData.isActive || configData.isFrozen) {
                return null;
              }

              // Check if asset is in isolation mode and collateral settings
              const isIsolationModeAsset = Number(debtCeiling) > 0;
              const canBeCollateral = configData.usageAsCollateralEnabled;

              const supplyAPY = rayToPercentage(
                reserveData.liquidityRate.toString(),
              );
              const formattedSupply = ethers.formatUnits(
                reserveData.totalAToken,
                Number(configData.decimals),
              );

              // Try to get token contract data for actual name and symbol
              let tokenName = token.symbol;
              let tokenSymbol = token.symbol;

              // Look up token data first (this has the proper names)
              const tokenData = tokenLookup[token.tokenAddress.toLowerCase()];

              if (tokenData) {
                // Use token database name and symbol (properly formatted)
                tokenName = tokenData.name; // e.g. "USD Coin" instead of "USDC"
                tokenSymbol = tokenData.ticker; // e.g. "USDC"
              } else {
                // Fallback to contract data if not in token database
                try {
                  const tokenContract = new ethers.Contract(
                    token.tokenAddress,
                    ERC20_ABI,
                    provider,
                  );

                  // Try to get name and symbol from contract
                  const [contractName, contractSymbol] = await Promise.all([
                    tokenContract.name().catch(() => token.symbol),
                    tokenContract.symbol().catch(() => token.symbol),
                  ]);

                  tokenName = contractName;
                  tokenSymbol = contractSymbol;
                } catch (error) {
                  // Final fallback to reserve token data
                  console.log(
                    `Could not fetch contract data for ${token.symbol}, using fallback.`,
                    error,
                  );
                }
              }

              const tokenIcon = tokenData?.icon || "unknown.png";

              return {
                symbol: tokenSymbol, // From token database or contract
                name: tokenName, // From token database or contract
                asset: token.tokenAddress,
                decimals: Number(configData.decimals),
                aTokenAddress: reserveData.aTokenAddress || "",
                currentLiquidityRate: reserveData.liquidityRate.toString(),
                totalSupply: reserveData.totalAToken.toString(),
                formattedSupply: formattedSupply,
                isActive: configData.isActive,
                supplyAPY: supplyAPY,
                canBeCollateral: canBeCollateral,
                isIsolationModeAsset: isIsolationModeAsset,
                debtCeiling: Number(debtCeiling),
                userBalance: "0",
                userBalanceFormatted: "0.00",
                userBalanceUsd: "0.00",
                tokenIcon: tokenIcon,
                chainId: chainId,
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

        const batchResults = await Promise.all(batchPromises);

        for (const result of batchResults) {
          if (result !== null) {
            reservesData.push(result);
          }
        }

        // Success - break out of retry loop
        break;
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.error(
            `Failed to process batch after ${MAX_RETRIES} retries:`,
            error,
          );
          break;
        }

        console.log(
          `Batch failed, retrying in ${currentDelay}ms... (attempt ${retries}/${MAX_RETRIES})`,
        );
        await delay(currentDelay);
        currentDelay *= 2; // Exponential backoff
      }
    }

    // Always delay between batches
    if (i + BATCH_SIZE < reserveTokens.length) {
      await delay(currentDelay);
    }
  }

  console.log(`Found ${reservesData.length} active reserves`);
  return reservesData;
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
