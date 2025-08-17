// aaveFetch.ts - Essential Aave fetch functionality using wallet provider
import { ethers } from "ethers";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { POOL_DATA_PROVIDER_ABI, POOL_ABI } from "@/types/aaveV3ABIs";
import { Token, Chain } from "@/types/web3";
import {
  getAaveMarket,
  SupportedChainId,
  ChainConfig,
  isChainSupported,
} from "@/config/aave";
import { rayToPercentage } from "@/utils/aave/utils";
import { ERC20_ABI } from "@/types/ERC20ABI";
import { useCallback } from "react";
import {
  AaveReserveData,
  AaveReservesResult,
  ExtendedAssetDetails,
  ReserveMetrics,
  UserBorrowPosition,
  UserPosition,
  UserAccountData,
} from "@/types/aave";

// Rate limiting utility
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Enhanced function that fetches all reserves and returns categorized lists
 */
export async function fetchAllReservesData(
  signer: ethers.Signer,
  aaveChain: Chain,
  chainTokens: Token[],
): Promise<AaveReservesResult> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const market = getAaveMarket(aaveChain.chainId);

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  const reserveTokens = await poolDataProvider.getAllReservesTokens();

  const allReserves: AaveReserveData[] = [];
  const BATCH_SIZE = 1;
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

              let ltvBps = 0;
              let liquidationThresholdBps = 0;
              let liquidationBonusBps = 0;

              try {
                const market = getAaveMarket(aaveChain.chainId);
                if (market?.POOL) {
                  const poolContract = new ethers.Contract(
                    market.POOL,
                    POOL_ABI,
                    provider,
                  );

                  const configBitmask = await poolContract.getConfiguration(
                    token.tokenAddress,
                  );

                  ltvBps = Number(configBitmask & BigInt(0xffff));
                  liquidationThresholdBps = Number(
                    (configBitmask >> BigInt(16)) & BigInt(0xffff),
                  );
                  liquidationBonusBps = Number(
                    (configBitmask >> BigInt(32)) & BigInt(0xffff),
                  );
                }
              } catch {
                ltvBps = Number(configData.ltv || 0);
                liquidationThresholdBps = Number(
                  configData.liquidationThreshold || 0,
                );
                liquidationBonusBps = Number(configData.liquidationBonus || 0);
              }

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

              // lookup token, otherwise create Token object from scratch
              let tokenData = chainTokens.find(
                (t) =>
                  t.address.toLowerCase() === token.tokenAddress.toLowerCase(),
              );
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
                  console.error(
                    `Could not fetch contract data for ${token.symbol}, using fallback.`,
                  );
                }
              }

              const decimals = Number(configData.decimals);

              if (!tokenData) {
                tokenData = {
                  id: token.tokenAddress,
                  address: token.tokenAddress,
                  name: tokenName,
                  ticker: tokenSymbol,
                  icon: "unknown.png",
                  decimals: decimals,
                  chainId: aaveChain.chainId,
                  stringChainId: aaveChain.id,
                };
              }

              return {
                symbol: tokenSymbol,
                name: tokenName,
                asset: tokenData,
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
                supplyCap: reserveCaps.supplyCap.toString(),
                formattedSupplyCap: ethers.formatUnits(
                  reserveCaps.supplyCap,
                  decimals,
                ),

                // General data
                isActive: configData.isActive,
                isFrozen: configData.isFrozen,
                isIsolationModeAsset: isIsolationModeAsset,
                debtCeiling: Number(debtCeiling),
                userBalance: "0",
                userBalanceUsd: "0.00",
                tokenIcon: "unknown.png",
                chainId: aaveChain.chainId,

                ltv: (ltvBps / 100).toFixed(2) + "%",
                liquidationThreshold:
                  (liquidationThresholdBps / 100).toFixed(2) + "%",
                liquidationPenalty:
                  ((liquidationBonusBps - 10000) / 100).toFixed(2) + "%",
              };
            } catch {
              return null;
            }
          },
        );

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === "fulfilled" && result.value !== null) {
            allReserves.push(result.value);
          }
        }

        break;
      } catch {
        retries++;
        if (retries >= MAX_RETRIES) {
          break;
        }
        await delay(currentDelay);
        currentDelay *= 2;
      }
    }

    if (i + BATCH_SIZE < reserveTokens.length) {
      await delay(200);
    }
  }

  // Process the data into categorized lists
  const supplyAssets = allReserves.filter((reserve) => !reserve.isFrozen);

  const borrowAssets = allReserves.filter(
    (reserve) => !reserve.isFrozen && reserve.borrowingEnabled,
  );

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
  oraclePrices?: Record<string, number>,
): Promise<UserPosition[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

  const poolDataProvider = new ethers.Contract(
    market.AAVE_PROTOCOL_DATA_PROVIDER,
    POOL_DATA_PROVIDER_ABI,
    provider,
  );

  const userPositions: UserPosition[] = [];
  const BATCH_SIZE = 5;
  const DELAY = 100;

  // Process reserves in batches to check user positions
  for (let i = 0; i < reservesData.length; i += BATCH_SIZE) {
    const batch = reservesData.slice(i, i + BATCH_SIZE);

    try {
      const batchPromises = batch.map(async (reserve) => {
        try {
          // Get user reserve data using the ABI function
          const userReserveData = await poolDataProvider.getUserReserveData(
            reserve.asset.address,
            userAddress,
          );

          const aTokenBalance = userReserveData.currentATokenBalance.toString();
          const isCollateral = userReserveData.usageAsCollateralEnabled;

          // Check if user has any supplied balance
          if (aTokenBalance !== "0") {
            // Format the balance using the asset's decimals
            const formattedBalance = ethers.formatUnits(
              aTokenBalance,
              reserve.asset.decimals,
            );

            // Use oracle price if available
            const oraclePrice =
              oraclePrices?.[reserve.asset.address.toLowerCase()];
            const balanceUSD = oraclePrice
              ? (parseFloat(formattedBalance) * oraclePrice).toFixed(2)
              : "0.00";

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
          console.error(
            `Error fetching user data for ${reserve.asset.ticker}:`,
            error,
          );
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

  return userPositions;
}

/**
 * Fetch user's borrow positions from Aave
 */
export async function fetchUserBorrowPositions(
  signer: ethers.Signer,
  userAddress: string,
  reservesData: AaveReserveData[],
  oraclePrices?: Record<string, number>,
): Promise<UserBorrowPosition[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  const market = getAaveMarket(chainId);

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
            reserve.asset.address,
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
              reserve.asset.decimals,
            );

            // Use oracle price if available
            const oraclePrice =
              oraclePrices?.[reserve.asset.address.toLowerCase()];
            const debtUSD = oraclePrice
              ? (parseFloat(formattedTotalDebt) * oraclePrice).toFixed(2)
              : "0.00";

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
          console.error(
            `Error fetching user borrow data for ${reserve.asset.ticker}:`,
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

  return userBorrowPositions;
}

/**
 * Fetch user's wallet balances for available reserves
 */
export async function fetchUserWalletBalances(
  signer: ethers.Signer,
  userAddress: string,
  reservesData: AaveReserveData[],
  oraclePrices?: Record<string, number>,
): Promise<AaveReserveData[]> {
  const provider = signer.provider;
  if (!provider) {
    throw new Error("Signer must have a provider");
  }

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
            reserve.asset.address,
            ERC20_ABI,
            provider,
          );

          const walletBalance = await tokenContract.balanceOf(userAddress);

          const formattedBalance = ethers.formatUnits(
            walletBalance,
            reserve.asset.decimals,
          );

          // Use oracle price if available
          const oraclePrice =
            oraclePrices?.[reserve.asset.address.toLowerCase()];
          const balanceUSD = oraclePrice
            ? parseFloat(
                (parseFloat(formattedBalance) * oraclePrice).toPrecision(4),
              ).toString()
            : "0.00";

          return {
            ...reserve,
            asset: {
              ...reserve.asset,
              userBalance: formattedBalance,
              userBalanceUsd: balanceUSD,
            },
          };
        } catch {
          return {
            ...reserve,
            asset: {
              ...reserve.asset,
              userBalance: "0",
              userBalanceUsd: "0.00",
            },
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
          asset: {
            ...reserve.asset,
            userBalance: "0",
            userBalanceUsd: "0.00",
          },
        })),
      );
    }
  }

  return updatedReserves;
}

export const getReserveMetrics = (
  currentAsset: AaveReserveData,
): ReserveMetrics => {
  const reserveSize = currentAsset.formattedSupply || "0";
  const availableLiquidity = currentAsset.formattedAvailableLiquidity || "0";
  const totalBorrowed = currentAsset.formattedTotalBorrowed || "0";

  const totalSupplyNum = parseFloat(reserveSize);
  const totalBorrowedNum = parseFloat(totalBorrowed);
  const availableLiquidityNum = parseFloat(availableLiquidity);

  let borrowedPercentage = 0;
  let availablePercentage = 0;

  if (totalSupplyNum > 0) {
    borrowedPercentage = (totalBorrowedNum / totalSupplyNum) * 100;
    availablePercentage = (availableLiquidityNum / totalSupplyNum) * 100;
  }

  let supplyCapUtilization = 0;
  let borrowCapUtilization = 0;
  let supplyCapFormatted = "Unlimited";
  let borrowCapFormatted = "No cap";

  if (currentAsset.supplyCap && currentAsset.supplyCap !== "0") {
    try {
      const supplyCapInTokens = parseFloat(currentAsset.supplyCap);

      if (supplyCapInTokens > 0) {
        supplyCapUtilization = (totalSupplyNum / supplyCapInTokens) * 100;
        if (supplyCapInTokens >= 1000000) {
          supplyCapFormatted = (supplyCapInTokens / 1000000).toFixed(1) + "M";
        } else if (supplyCapInTokens >= 1000) {
          supplyCapFormatted = (supplyCapInTokens / 1000).toFixed(1) + "K";
        } else {
          supplyCapFormatted = supplyCapInTokens.toFixed(0);
        }
      }
    } catch (error) {
      console.warn("Error calculating supply cap:", error);
    }
  }

  if (currentAsset.borrowCap && currentAsset.borrowCap !== "0") {
    try {
      const borrowCapInTokens = parseFloat(currentAsset.borrowCap);

      if (borrowCapInTokens > 0) {
        borrowCapUtilization = (totalBorrowedNum / borrowCapInTokens) * 100;
        if (borrowCapInTokens >= 1000000) {
          borrowCapFormatted = (borrowCapInTokens / 1000000).toFixed(1) + "M";
        } else if (borrowCapInTokens >= 1000) {
          borrowCapFormatted = (borrowCapInTokens / 1000).toFixed(1) + "K";
        } else {
          borrowCapFormatted = borrowCapInTokens.toFixed(0);
        }
      }
    } catch (error) {
      console.warn("Error calculating borrow cap:", error);
    }
  }

  return {
    reserveSize,
    availableLiquidity,
    totalBorrowed,
    borrowedPercentage: Number(borrowedPercentage.toFixed(2)),
    availablePercentage: Number(availablePercentage.toFixed(2)),
    supplyCapUtilization: Number(supplyCapUtilization.toFixed(2)),
    borrowCapUtilization: Number(borrowCapUtilization.toFixed(2)),
    supplyCapFormatted,
    borrowCapFormatted,
  };
};

export const calculateUtilizationRate = (
  currentAsset: AaveReserveData,
): string => {
  if (!currentAsset.totalSupply || !currentAsset.totalBorrowed) return "0.00";

  try {
    const totalSupplyBigInt = BigInt(currentAsset.totalSupply);
    const totalBorrowedBigInt = BigInt(currentAsset.totalBorrowed);

    if (totalSupplyBigInt === BigInt(0)) return "0.00";

    const utilizationBasisPoints =
      (totalBorrowedBigInt * BigInt(10000)) / totalSupplyBigInt;
    const utilizationPercentage = Number(utilizationBasisPoints) / 100;

    return utilizationPercentage.toFixed(2);
  } catch (error) {
    console.warn("Error calculating utilization rate:", error);
    const totalSupply = parseFloat(currentAsset.formattedSupply || "0");
    const totalBorrowed = parseFloat(
      currentAsset.formattedTotalBorrowed || "0",
    );
    if (totalSupply === 0) return "0.00";
    return ((totalBorrowed / totalSupply) * 100).toFixed(2);
  }
};

export const fetchExtendedAssetDetails = async (
  currentAsset: AaveReserveData,
  chainId: number,
  provider?: ethers.Provider,
  oraclePrices?: Record<string, number>,
): Promise<ExtendedAssetDetails> => {
  let oraclePrice = 1;

  // Use centralized oracle prices if available
  if (oraclePrices) {
    const cachedPrice = oraclePrices[currentAsset.asset.address.toLowerCase()];
    if (cachedPrice !== undefined) {
      oraclePrice = cachedPrice;
      // Successfully using cached price
    } else {
      console.warn(
        `No cached price found for ${currentAsset.asset.ticker}, using fallback`,
      );
    }
  }

  if (provider) {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const market = getAaveMarket(chainId);

    if (!market?.AAVE_PROTOCOL_DATA_PROVIDER) {
      throw new Error(`Aave market not found for chain ${chainId}`);
    }

    const poolDataProvider = new ethers.Contract(
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      POOL_DATA_PROVIDER_ABI,
      provider,
    );

    const [configData, tokenAddresses, reserveCaps] = await Promise.all([
      poolDataProvider.getReserveConfigurationData(currentAsset.asset.address),
      poolDataProvider.getReserveTokensAddresses(currentAsset.asset.address),
      poolDataProvider.getReserveCaps(currentAsset.asset.address),
    ]);

    const ltvBps = Number(configData.ltv);
    const liquidationThresholdBps = Number(configData.liquidationThreshold);
    const liquidationBonusBps = Number(configData.liquidationBonus);

    return {
      ltv: (ltvBps / 100).toFixed(2) + "%",
      liquidationThreshold: (liquidationThresholdBps / 100).toFixed(2) + "%",
      liquidationPenalty:
        ((liquidationBonusBps - 10000) / 100).toFixed(2) + "%",
      stableDebtTokenAddress: tokenAddresses.stableDebtTokenAddress,
      variableDebtTokenAddress: tokenAddresses.variableDebtTokenAddress,
      supplyCap:
        reserveCaps.supplyCap.toString() === "0"
          ? "Unlimited"
          : reserveCaps.supplyCap.toString(),
      oraclePrice: oraclePrice,
      currentPrice: oraclePrice,
    };
  }

  return {
    ltv: "80.00%",
    liquidationThreshold: "85.00%",
    liquidationPenalty: "5.00%",
    oraclePrice: oraclePrice,
    currentPrice: oraclePrice,
  };
};

/**
 * Get the Pool contract address for a chain
 */
export function getPoolAddress(chainId: SupportedChainId): string {
  const market = getAaveMarket(chainId);
  return market.POOL;
}

/**
 * Get the Protocol Data Provider address for a chain
 */
export function getDataProviderAddress(chainId: SupportedChainId): string {
  const market = getAaveMarket(chainId);
  return market.AAVE_PROTOCOL_DATA_PROVIDER;
}

/**
 * Get the UI Data Provider address for a chain (if available)
 */
export function getUiDataProviderAddress(
  chainId: SupportedChainId,
): string | undefined {
  const market = getAaveMarket(chainId);
  return market.UI_POOL_DATA_PROVIDER;
}

/**
 * Get the Pool Addresses Provider address for a chain
 */
export function getAddressesProviderAddress(chainId: SupportedChainId): string {
  const market = getAaveMarket(chainId);
  return market.POOL_ADDRESSES_PROVIDER;
}

/**
 * Get the WETH Gateway address for a chain (if available)
 */
export function getWethGatewayAddress(
  chainId: SupportedChainId,
): string | undefined {
  const market = getAaveMarket(chainId);
  return market.WETH_GATEWAY;
}

/**
 * Get the complete chain configuration
 */
export function getChainConfig(chainId: SupportedChainId): ChainConfig {
  const market = getAaveMarket(chainId);

  return {
    poolAddress: market.POOL,
    dataProviderAddress: market.AAVE_PROTOCOL_DATA_PROVIDER,
    uiDataProviderAddress: market.UI_POOL_DATA_PROVIDER,
    addressesProviderAddress: market.POOL_ADDRESSES_PROVIDER,
    wethGatewayAddress: market.WETH_GATEWAY,
  };
}

/**
 * Check if the chain supports a specific feature
 */
export function hasWethGateway(chainId: SupportedChainId): boolean {
  try {
    const wethGateway = getWethGatewayAddress(chainId);
    return !!wethGateway;
  } catch {
    return false;
  }
}

/**
 * Check if the chain has UI data provider
 */
export function hasUiDataProvider(chainId: SupportedChainId): boolean {
  try {
    const uiDataProvider = getUiDataProviderAddress(chainId);
    return !!uiDataProvider;
  } catch {
    return false;
  }
}

export async function checkBalance(
  tokenAddress: string,
  userAddress: string,
  amount: string,
  tokenDecimals: number,
  provider: ethers.Provider,
): Promise<boolean> {
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider,
    );

    const balance = await tokenContract.balanceOf(userAddress);
    const amountWei = ethers.parseUnits(amount, tokenDecimals);

    return balance >= amountWei;
  } catch (error) {
    console.error("Error checking balance:", error);
    return false;
  }
}

export async function getAllowance(
  tokenAddress: string,
  userAddress: string,
  chainId: SupportedChainId,
  tokenDecimals: number,
  signer: ethers.Signer,
): Promise<string> {
  try {
    const poolAddress = getPoolAddress(chainId);

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

    const allowance = await tokenContract.allowance(userAddress, poolAddress);
    return ethers.formatUnits(allowance, tokenDecimals);
  } catch (error) {
    console.error("Error getting allowance:", error);
    return "0";
  }
}

/**
 * Get user account data (health factor, total collateral, etc.)
 */
export async function getUserAccountData(
  userAddress: string,
  chainId: SupportedChainId,
  provider: ethers.Provider,
): Promise<UserAccountData | null> {
  try {
    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

    const accountData = await poolContract.getUserAccountData(userAddress);

    return {
      totalCollateralBase: accountData.totalCollateralBase.toString(),
      totalDebtBase: accountData.totalDebtBase.toString(),
      availableBorrowsBase: accountData.availableBorrowsBase.toString(),
      currentLiquidationThreshold:
        Number(accountData.currentLiquidationThreshold) / 10000, // Convert from basis points
      ltv: Number(accountData.ltv) / 10000, // Convert from basis points
      healthFactor: ethers.formatUnits(accountData.healthFactor, 18),
    };
  } catch (error) {
    console.error("Error getting user account data:", error);
    return null;
  }
}

export async function canDisableCollateral(
  tokenAddress: string,
  userAddress: string,
  chainId: SupportedChainId,
  provider: ethers.Provider,
): Promise<{ canDisable: boolean; reason?: string }> {
  try {
    // Get current account data
    const accountData = await getUserAccountData(
      userAddress,
      chainId,
      provider,
    );
    if (!accountData) {
      return { canDisable: false, reason: "Unable to fetch account data" };
    }

    const currentHealthFactor = parseFloat(accountData.healthFactor);

    // If no debt, can always disable collateral
    if (parseFloat(accountData.totalDebtBase) === 0) {
      return { canDisable: true };
    }

    // If health factor is very low, probably can't disable
    if (currentHealthFactor < 1.2) {
      return {
        canDisable: false,
        reason: "Health factor too low - disabling would risk liquidation",
      };
    }

    // For more precise checking, you could simulate the transaction
    // or calculate the exact impact of removing this collateral
    return { canDisable: true };
  } catch (error) {
    console.error("Error checking collateral disable safety:", error);
    return {
      canDisable: false,
      reason: "Unable to verify safety of disabling collateral",
    };
  }
}

export function useAaveFetch() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  const fetchExtendedAssetDetailsMemoized = useCallback(
    async (currentAsset: AaveReserveData, chainId: number) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return fetchExtendedAssetDetails(currentAsset, chainId, provider);
    },
    [getEvmSigner],
  );

  const getReserveMetricsMemoized = useCallback(
    (currentAsset: AaveReserveData) => {
      return getReserveMetrics(currentAsset);
    },
    [],
  );

  const calculateUtilizationRateMemoized = useCallback(
    (currentAsset: AaveReserveData) => {
      return calculateUtilizationRate(currentAsset);
    },
    [],
  );

  const checkUserBalance = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      amount: string,
      tokenDecimals: number,
    ) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return checkBalance(
        tokenAddress,
        userAddress,
        amount,
        tokenDecimals,
        provider,
      );
    },
    [getEvmSigner],
  );

  const getUserAllowance = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      chainId: SupportedChainId,
      tokenDecimals: number,
    ) => {
      const signer = await getEvmSigner();
      return getAllowance(
        tokenAddress,
        userAddress,
        chainId,
        tokenDecimals,
        signer,
      );
    },
    [getEvmSigner],
  );

  const getAccountData = useCallback(
    async (userAddress: string, chainId: SupportedChainId) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return getUserAccountData(userAddress, chainId, provider);
    },
    [getEvmSigner],
  );

  const checkCollateralSafety = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      chainId: SupportedChainId,
    ) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return canDisableCollateral(tokenAddress, userAddress, chainId, provider);
    },
    [getEvmSigner],
  );

  return {
    fetchAllReservesData: async (aaveChain: Chain, chainTokens: Token[]) => {
      const signer = await getEvmSigner();
      return fetchAllReservesData(signer, aaveChain, chainTokens);
    },

    fetchUserPositions: async (
      reservesData: AaveReserveData[],
      oraclePrices?: Record<string, number>,
    ) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserPositions(
        signer,
        userAddress,
        reservesData,
        oraclePrices,
      );
    },

    fetchUserBorrowPositions: async (
      reservesData: AaveReserveData[],
      oraclePrices?: Record<string, number>,
    ) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserBorrowPositions(
        signer,
        userAddress,
        reservesData,
        oraclePrices,
      );
    },

    fetchUserWalletBalances: async (
      reservesData: AaveReserveData[],
      oraclePrices?: Record<string, number>,
    ) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      return fetchUserWalletBalances(
        signer,
        userAddress,
        reservesData,
        oraclePrices,
      );
    },

    fetchExtendedAssetDetails: fetchExtendedAssetDetailsMemoized,

    // Combined fetch that gets reserves and updates them with user data
    fetchAllReservesWithUserData: async (
      aaveChain: Chain,
      chainTokens: Token[],
    ) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();

      // First get all reserves
      const reserves = await fetchAllReservesData(
        signer,
        aaveChain,
        chainTokens,
      );

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

    // Utility functions
    getReserveMetrics: getReserveMetricsMemoized,
    calculateUtilizationRate: calculateUtilizationRateMemoized,

    // User account and balance functions
    checkUserBalance,
    getUserAllowance,
    getAccountData,
    checkCollateralSafety,

    // SDK utility functions
    getPoolAddress: (chainId: SupportedChainId) => getPoolAddress(chainId),
    getDataProviderAddress: (chainId: SupportedChainId) =>
      getDataProviderAddress(chainId),
    getUiDataProviderAddress: (chainId: SupportedChainId) =>
      getUiDataProviderAddress(chainId),
    getAddressesProviderAddress: (chainId: SupportedChainId) =>
      getAddressesProviderAddress(chainId),
    getWethGatewayAddress: (chainId: SupportedChainId) =>
      getWethGatewayAddress(chainId),
    getChainConfig: (chainId: SupportedChainId) => getChainConfig(chainId),
    hasWethGateway: (chainId: SupportedChainId) => hasWethGateway(chainId),
    hasUiDataProvider: (chainId: SupportedChainId) =>
      hasUiDataProvider(chainId),
  };
}
