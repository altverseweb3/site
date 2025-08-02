// aaveFetch.ts - Essential Aave fetch functionality using wallet provider
import { ethers } from "ethers";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { POOL_DATA_PROVIDER_ABI } from "@/types/aaveV3ABIs";
import { loadTokensForChain } from "@/utils/tokens/tokenMethods";
import { Token } from "@/types/web3";
import { getAaveMarket, chainNames } from "@/config/aave";
import { rayToPercentage } from "@/utils/aave/utils";
import { ERC20_ABI } from "@/types/ERC20ABI";

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

// Rate limiting utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enhanced function that fetches all reserves and returns categorized lists
 */
export async function fetchAllReservesData(
  signer: ethers.Signer,
): Promise<AaveReservesResult> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

  console.log(`Fetching Aave reserves for chain ${chainId} with backoff...`);

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

  const allReserves: AaveReserveData[] = [];
  const BATCH_SIZE = 2;
  const INITIAL_DELAY = 0;
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
              const [configData, reserveData, debtCeiling, reserveCaps] =
                await Promise.all([
                  poolDataProvider.getReserveConfigurationData(
                    token.tokenAddress,
                  ),
                  poolDataProvider.getReserveData(token.tokenAddress),
                  poolDataProvider.getDebtCeiling(token.tokenAddress),
                  poolDataProvider.getReserveCaps(token.tokenAddress),
                ]);

              // Only skip completely inactive or frozen assets
              if (!configData.isActive) {
                return null;
              }

              // Calculate borrow and liquidity data
              const totalBorrowed =
                BigInt(reserveData.totalVariableDebt) +
                BigInt(reserveData.totalStableDebt);
              const availableLiquidity =
                BigInt(reserveData.totalAToken) - totalBorrowed;

              // Check if asset is in isolation mode and collateral settings
              const isIsolationModeAsset = Number(debtCeiling) > 0;
              const canBeCollateral = configData.usageAsCollateralEnabled;

              const supplyAPY = rayToPercentage(
                reserveData.liquidityRate.toString(),
              );
              const variableBorrowAPY = rayToPercentage(
                reserveData.variableBorrowRate.toString(),
              );
              const stableBorrowAPY = rayToPercentage(
                reserveData.stableBorrowRate.toString(),
              );

              const formattedSupply = ethers.formatUnits(
                reserveData.totalAToken,
                Number(configData.decimals),
              );

              // Get token metadata
              let tokenName = token.symbol;
              let tokenSymbol = token.symbol;

              const tokenData = tokenLookup[token.tokenAddress.toLowerCase()];

              if (tokenData) {
                tokenName = tokenData.name;
                tokenSymbol = tokenData.ticker;
              } else {
                try {
                  const tokenContract = new ethers.Contract(
                    token.tokenAddress,
                    ERC20_ABI,
                    provider,
                  );

                  const [contractName, contractSymbol] = await Promise.all([
                    tokenContract.name().catch(() => token.symbol),
                    tokenContract.symbol().catch(() => token.symbol),
                  ]);

                  tokenName = contractName;
                  tokenSymbol = contractSymbol;
                } catch {
                  console.log(
                    `Could not fetch contract data for ${token.symbol}, using fallback.`,
                  );
                }
              }

              const tokenIcon = tokenData?.icon || "unknown.png";
              const decimals = Number(configData.decimals);

              return {
                symbol: tokenSymbol,
                name: tokenName,
                asset: token.tokenAddress,
                decimals: decimals,
                aTokenAddress: reserveData.aTokenAddress || "",

                // Supply data
                currentLiquidityRate: reserveData.liquidityRate.toString(),
                totalSupply: reserveData.totalAToken.toString(),
                formattedSupply: formattedSupply,
                supplyAPY: supplyAPY,
                canBeCollateral: canBeCollateral,

                // Borrow data
                variableBorrowRate: reserveData.variableBorrowRate.toString(),
                stableBorrowRate: reserveData.stableBorrowRate.toString(),
                variableBorrowAPY: variableBorrowAPY,
                stableBorrowAPY: stableBorrowAPY,
                stableBorrowEnabled: configData.stableBorrowRateEnabled,
                borrowingEnabled: configData.borrowingEnabled,
                totalBorrowed: totalBorrowed.toString(),
                formattedTotalBorrowed: ethers.formatUnits(
                  totalBorrowed,
                  decimals,
                ),
                availableLiquidity: availableLiquidity.toString(),
                formattedAvailableLiquidity: ethers.formatUnits(
                  availableLiquidity,
                  decimals,
                ),
                borrowCap: reserveCaps.borrowCap.toString(),
                formattedBorrowCap: ethers.formatUnits(
                  reserveCaps.borrowCap,
                  decimals,
                ),

                // General data
                isActive: configData.isActive,
                isFrozen: configData.isFrozen,
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
            allReserves.push(result);
          }
        }

        break; // Success
      } catch (error) {
        console.log(error);
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
        currentDelay *= 2;
      }
    }

    if (i + BATCH_SIZE < reserveTokens.length) {
      await delay(currentDelay);
    }
  }

  // Process the data into categorized lists
  const supplyAssets = allReserves.filter((reserve) => !reserve.isFrozen);

  const borrowAssets = allReserves.filter(
    (reserve) => !reserve.isFrozen && reserve.borrowingEnabled,
  );

  console.log(`Found ${allReserves.length} total reserves`);
  console.log(`Found ${supplyAssets.length} supply assets`);
  console.log(`Found ${borrowAssets.length} borrow assets`);

  return {
    allReserves,
    supplyAssets,
    borrowAssets,
  };
}

/**
 * Fetch user's supplied positions from Aave
 */
export async function fetchUserPositions(
  signer: ethers.Signer,
  userAddress: string,
  reservesData: AaveReserveData[],
): Promise<UserPosition[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

  console.log(
    `Fetching user positions for ${userAddress} on chain ${chainId}...`,
  );

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  const userPositions: UserPosition[] = [];
  const BATCH_SIZE = 5; // Larger batch for user data as it's typically faster
  const DELAY = 100;

  // Process reserves in batches to check user positions
  for (let i = 0; i < reservesData.length; i += BATCH_SIZE) {
    const batch = reservesData.slice(i, i + BATCH_SIZE);

    try {
      const batchPromises = batch.map(async (reserve) => {
        try {
          // Get user reserve data using the ABI function
          const userReserveData = await poolDataProvider.getUserReserveData(
            reserve.asset,
            userAddress,
          );

          const aTokenBalance = userReserveData.currentATokenBalance.toString();
          const isCollateral = userReserveData.usageAsCollateralEnabled;

          // Check if user has any supplied balance
          if (aTokenBalance !== "0") {
            // Format the balance using the asset's decimals
            const formattedBalance = ethers.formatUnits(
              aTokenBalance,
              reserve.decimals,
            );

            // TODO: Replace this with actual price fetching
            // For now, we'll use a mock price - you should integrate with a price oracle
            const mockPrice = Math.random() * 2 + 0.5; // Mock price between 0.5-2.5
            const balanceUSD = (
              parseFloat(formattedBalance) * mockPrice
            ).toFixed(2);

            return {
              asset: reserve,
              suppliedBalance: formattedBalance,
              suppliedBalanceUSD: balanceUSD,
              isCollateral: isCollateral,
              aTokenBalance: aTokenBalance,
            };
          }

          return null;
        } catch (error) {
          console.log(`Error fetching user data for ${reserve.symbol}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result !== null) {
          userPositions.push(result);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < reservesData.length) {
        await delay(DELAY);
      }
    } catch (error) {
      console.error(`Error processing user positions batch:`, error);
    }
  }

  console.log(`Found ${userPositions.length} user positions`);
  return userPositions;
}

/**
 * Fetch user's borrow positions from Aave
 */
export async function fetchUserBorrowPositions(
  signer: ethers.Signer,
  userAddress: string,
  reservesData: AaveReserveData[],
): Promise<UserBorrowPosition[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

  console.log(
    `Fetching user borrow positions for ${userAddress} on chain ${chainId}...`,
  );

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  const userBorrowPositions: UserBorrowPosition[] = [];
  const BATCH_SIZE = 5;
  const DELAY = 100;

  // Process reserves in batches to check user borrow positions
  for (let i = 0; i < reservesData.length; i += BATCH_SIZE) {
    const batch = reservesData.slice(i, i + BATCH_SIZE);

    try {
      const batchPromises = batch.map(async (reserve) => {
        try {
          // Get user reserve data using the ABI function
          const userReserveData = await poolDataProvider.getUserReserveData(
            reserve.asset,
            userAddress,
          );

          const stableDebt = userReserveData.currentStableDebt.toString();
          const variableDebt = userReserveData.currentVariableDebt.toString();
          const stableBorrowRate = userReserveData.stableBorrowRate.toString();

          // Calculate total debt
          const totalDebtBigInt = BigInt(stableDebt) + BigInt(variableDebt);
          const totalDebt = totalDebtBigInt.toString();

          // Check if user has any borrowed balance
          if (totalDebtBigInt > 0) {
            // Format the debt using the asset's decimals
            const formattedTotalDebt = ethers.formatUnits(
              totalDebt,
              reserve.decimals,
            );

            //For Now Im mocking price I will update this when we integrate the token info
            const mockPrice = 1; // Mock price between 0.5-2.5
            const debtUSD = (
              parseFloat(formattedTotalDebt) * mockPrice
            ).toFixed(2);

            const currentBorrowAPY =
              BigInt(variableDebt) > 0
                ? reserve.variableBorrowAPY
                : reserve.stableBorrowAPY;

            return {
              asset: reserve,
              stableDebt: stableDebt,
              variableDebt: variableDebt,
              totalDebt: totalDebt,
              formattedTotalDebt: formattedTotalDebt,
              totalDebtUSD: debtUSD,
              stableBorrowRate: stableBorrowRate,
              variableBorrowRate: reserve.variableBorrowRate,
              currentBorrowAPY: currentBorrowAPY,
            };
          }

          return null;
        } catch (error) {
          console.log(
            `Error fetching user borrow data for ${reserve.symbol}:`,
            error,
          );
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if (result !== null) {
          userBorrowPositions.push(result);
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < reservesData.length) {
        await delay(DELAY);
      }
    } catch (error) {
      console.error(`Error processing user borrow positions batch:`, error);
    }
  }

  console.log(`Found ${userBorrowPositions.length} user borrow positions`);
  return userBorrowPositions;
}

/**
 * Fetch user's wallet balances for available reserves
 */
export async function fetchUserWalletBalances(
  signer: ethers.Signer,
  userAddress: string,
  reservesData: AaveReserveData[],
): Promise<AaveReserveData[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  console.log(`Fetching wallet balances for ${userAddress}...`);

  const updatedReserves: AaveReserveData[] = [];
  const BATCH_SIZE = 5;
  const DELAY = 100;

  // Process reserves in batches to get wallet balances
  for (let i = 0; i < reservesData.length; i += BATCH_SIZE) {
    const batch = reservesData.slice(i, i + BATCH_SIZE);

    try {
      const batchPromises = batch.map(async (reserve) => {
        try {
          // Get user's wallet balance for this token
          const tokenContract = new ethers.Contract(
            reserve.asset,
            ERC20_ABI,
            provider,
          );

          const walletBalance = await tokenContract.balanceOf(userAddress);
          const formattedBalance = ethers.formatUnits(
            walletBalance,
            reserve.decimals,
          );

          // TODO: Replace with actual price fetching
          const mockPrice = Math.random() * 2 + 0.5;
          const balanceUSD = (parseFloat(formattedBalance) * mockPrice).toFixed(
            2,
          );

          return {
            ...reserve,
            userBalance: walletBalance.toString(),
            userBalanceFormatted: formattedBalance,
            userBalanceUsd: balanceUSD,
          };
        } catch (error) {
          console.log(
            `Error fetching wallet balance for ${reserve.symbol}:`,
            error,
          );
          // Return reserve with zero balance on error
          return {
            ...reserve,
            userBalance: "0",
            userBalanceFormatted: "0.00",
            userBalanceUsd: "0.00",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      updatedReserves.push(...batchResults);

      // Delay between batches
      if (i + BATCH_SIZE < reservesData.length) {
        await delay(DELAY);
      }
    } catch (error) {
      console.error(`Error processing wallet balances batch:`, error);
      // Add reserves with zero balances on batch error
      updatedReserves.push(
        ...batch.map((reserve) => ({
          ...reserve,
          userBalance: "0",
          userBalanceFormatted: "0.00",
          userBalanceUsd: "0.00",
        })),
      );
    }
  }

  console.log(
    `Updated ${updatedReserves.length} reserves with wallet balances`,
  );
  return updatedReserves;
}

/**
 * Updated React hook
 */
export function useAaveFetch() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  return {
    fetchAllReservesData: async () => {
      const signer = await getEvmSigner();
      return fetchAllReservesData(signer);
    },

    fetchUserPositions: async (reservesData: AaveReserveData[]) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserPositions(signer, userAddress, reservesData);
    },

    fetchUserBorrowPositions: async (reservesData: AaveReserveData[]) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserBorrowPositions(signer, userAddress, reservesData);
    },

    fetchUserWalletBalances: async (reservesData: AaveReserveData[]) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserWalletBalances(signer, userAddress, reservesData);
    },

    // Combined fetch that gets reserves and updates them with user data
    fetchAllReservesWithUserData: async () => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // First get all reserves
      const reserves = await fetchAllReservesData(signer);

      // Then update with user wallet balances
      const reservesWithBalances = await fetchUserWalletBalances(
        signer,
        userAddress,
        reserves.allReserves,
      );

      return {
        allReserves: reservesWithBalances,
        supplyAssets: reservesWithBalances.filter(
          (reserve) => !reserve.isFrozen,
        ),
        borrowAssets: reservesWithBalances.filter(
          (reserve) => !reserve.isFrozen && reserve.borrowingEnabled,
        ),
      };
    },
  };
}
