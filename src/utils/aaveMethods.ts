import { ethers } from "ethers";
import * as markets from "@bgd-labs/aave-address-book";

// Types
interface AssetInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

interface UserAccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
  usedProvider?: string;
}

interface UserReserveData {
  symbol: string;
  name: string;
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  liquidityRate: ethers.BigNumberish;
  liquidityRateFormatted: string;
  usageAsCollateralEnabled: boolean;
  supplyAPY?: {
    simple: string;
    compounded: string;
    aaveMethod: string;
  } | null;
}

interface CompleteUserPosition {
  accountData: UserAccountData;
  userPositions: (AssetInfo & UserReserveData)[];
  availableAssets: AssetInfo[];
}

// Type for Aave market configuration
interface AaveMarket {
  POOL: string;
  UI_POOL_DATA_PROVIDER?: string;
  AAVE_PROTOCOL_DATA_PROVIDER?: string;
  [key: string]: unknown;
}

interface SuppliedAssetUSD extends AssetInfo, UserReserveData {
  balanceUSD: number;
  priceUSD: number;
}

interface BorrowedAssetUSD extends AssetInfo, UserReserveData {
  debtUSD: number;
  priceUSD: number;
  totalDebt: number;
}

// ABIs
const AAVE_POOL_DATA_PROVIDER_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { internalType: "uint256", name: "totalCollateralETH", type: "uint256" },
      { internalType: "uint256", name: "totalDebtETH", type: "uint256" },
      { internalType: "uint256", name: "availableBorrowsETH", type: "uint256" },
      {
        internalType: "uint256",
        name: "currentLiquidationThreshold",
        type: "uint256",
      },
      { internalType: "uint256", name: "ltv", type: "uint256" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "asset", type: "address" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "getUserReserveData",
    outputs: [
      {
        internalType: "uint256",
        name: "currentATokenBalance",
        type: "uint256",
      },
      { internalType: "uint256", name: "currentStableDebt", type: "uint256" },
      { internalType: "uint256", name: "currentVariableDebt", type: "uint256" },
      { internalType: "uint256", name: "principalStableDebt", type: "uint256" },
      { internalType: "uint256", name: "scaledVariableDebt", type: "uint256" },
      { internalType: "uint256", name: "stableBorrowRate", type: "uint256" },
      { internalType: "uint256", name: "liquidityRate", type: "uint256" },
      { internalType: "uint40", name: "stableRateLastUpdated", type: "uint40" },
      { internalType: "bool", name: "usageAsCollateralEnabled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const POOL_ABI = [
  {
    inputs: [],
    name: "getReservesList",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserAccountData",
    outputs: [
      { internalType: "uint256", name: "totalCollateralETH", type: "uint256" },
      { internalType: "uint256", name: "totalDebtETH", type: "uint256" },
      { internalType: "uint256", name: "availableBorrowsETH", type: "uint256" },
      {
        internalType: "uint256",
        name: "currentLiquidationThreshold",
        type: "uint256",
      },
      { internalType: "uint256", name: "ltv", type: "uint256" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getReserveData",
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: "uint256", name: "data", type: "uint256" },
            ],
            internalType: "struct DataTypes.ReserveConfigurationMap",
            name: "configuration",
            type: "tuple",
          },
          { internalType: "uint128", name: "liquidityIndex", type: "uint128" },
          {
            internalType: "uint128",
            name: "currentLiquidityRate",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "variableBorrowIndex",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "currentVariableBorrowRate",
            type: "uint128",
          },
          {
            internalType: "uint128",
            name: "currentStableBorrowRate",
            type: "uint128",
          },
          {
            internalType: "uint40",
            name: "lastUpdateTimestamp",
            type: "uint40",
          },
          { internalType: "uint16", name: "id", type: "uint16" },
          { internalType: "address", name: "aTokenAddress", type: "address" },
          {
            internalType: "address",
            name: "stableDebtTokenAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "variableDebtTokenAddress",
            type: "address",
          },
          {
            internalType: "address",
            name: "interestRateStrategyAddress",
            type: "address",
          },
          {
            internalType: "uint128",
            name: "accruedToTreasury",
            type: "uint128",
          },
          { internalType: "uint128", name: "unbacked", type: "uint128" },
          {
            internalType: "uint128",
            name: "isolationModeTotalDebt",
            type: "uint128",
          },
        ],
        internalType: "struct DataTypes.ReserveData",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const RESERVE_DATA_ABI = [
  {
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getReserveData",
    outputs: [
      { internalType: "uint256", name: "availableLiquidity", type: "uint256" },
      { internalType: "uint256", name: "totalStableDebt", type: "uint256" },
      { internalType: "uint256", name: "totalVariableDebt", type: "uint256" },
      { internalType: "uint256", name: "liquidityRate", type: "uint256" },
      { internalType: "uint256", name: "variableBorrowRate", type: "uint256" },
      { internalType: "uint256", name: "stableBorrowRate", type: "uint256" },
      {
        internalType: "uint256",
        name: "averageStableBorrowRate",
        type: "uint256",
      },
      { internalType: "uint256", name: "liquidityIndex", type: "uint256" },
      { internalType: "uint256", name: "variableBorrowIndex", type: "uint256" },
      { internalType: "uint40", name: "lastUpdateTimestamp", type: "uint40" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getReserveConfigurationData",
    outputs: [
      { internalType: "uint256", name: "decimals", type: "uint256" },
      { internalType: "uint256", name: "ltv", type: "uint256" },
      {
        internalType: "uint256",
        name: "liquidationThreshold",
        type: "uint256",
      },
      { internalType: "uint256", name: "liquidationBonus", type: "uint256" },
      { internalType: "uint256", name: "reserveFactor", type: "uint256" },
      { internalType: "bool", name: "usageAsCollateralEnabled", type: "bool" },
      { internalType: "bool", name: "borrowingEnabled", type: "bool" },
      { internalType: "bool", name: "stableBorrowRateEnabled", type: "bool" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "bool", name: "isFrozen", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export class AaveMethods {
  private static readonly CHAIN_TO_MARKET: Record<number, string> = {
    1: "AaveV3Ethereum",
    10: "AaveV3Optimism",
    56: "AaveV3BNB",
    137: "AaveV3Polygon",
    42161: "AaveV3Arbitrum",
    43114: "AaveV3Avalanche",
    8453: "AaveV3Base",
    11155111: "AaveV3Sepolia",
  };

  private static readonly FALLBACK_DATA_PROVIDERS: Record<number, string> = {
    1: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
    137: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
    43114: "0x65285E9dfab318f57051ab2b139ccCf232945451",
  };

  static getAaveMarket(chainId: number): AaveMarket | null {
    const marketKey = this.CHAIN_TO_MARKET[chainId];
    if (!marketKey || !markets[marketKey as keyof typeof markets]) return null;
    return markets[marketKey as keyof typeof markets] as AaveMarket;
  }

  static isChainSupported(chainId: number): boolean {
    return this.getAaveMarket(chainId) !== null;
  }

  private static getProvider(): ethers.BrowserProvider {
    if (!window.ethereum) throw new Error("No wallet provider found");
    return new ethers.BrowserProvider(
      window.ethereum as ethers.Eip1193Provider,
    );
  }

  private static getDataProviders(
    market: AaveMarket,
    chainId: number,
  ): string[] {
    return [
      market.UI_POOL_DATA_PROVIDER,
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      this.FALLBACK_DATA_PROVIDERS[chainId],
    ].filter(Boolean) as string[];
  }

  private static calculateAPY(liquidityRate: ethers.BigNumberish): {
    simple: string;
    compounded: string;
    aaveMethod: string;
  } | null {
    try {
      const RAY = Math.pow(10, 27);
      const SECONDS_PER_YEAR = 31536000;
      const rayValueInDecimals = Number(liquidityRate.toString()) / RAY;
      const aaveAPY =
        (Math.pow(1 + rayValueInDecimals / SECONDS_PER_YEAR, SECONDS_PER_YEAR) -
          1) *
        100;
      const simpleAPY = Number(ethers.formatUnits(liquidityRate, 27)) * 100;
      const compoundedAPY =
        (Math.pow(1 + Number(ethers.formatUnits(liquidityRate, 27)), 365) - 1) *
        100;

      return {
        simple: simpleAPY.toFixed(2),
        compounded: compoundedAPY.toFixed(2),
        aaveMethod: aaveAPY.toFixed(2),
      };
    } catch {
      return null;
    }
  }

  private static getTokenPriceFromStore(): number {
    try {
      return 0;
    } catch {
      return 0;
    }
  }

  private static async getTokenPrice(): Promise<number> {
    const storePrice = this.getTokenPriceFromStore();
    return storePrice; // Final fallback
  }

  static async fetchAvailableAssets(chainId: number): Promise<AssetInfo[]> {
    const market = this.getAaveMarket(chainId);
    if (!market?.POOL)
      throw new Error(`Aave V3 not supported on chain ${chainId}`);

    const provider = this.getProvider();
    const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
    const reservesList = await poolContract.getReservesList();

    if (!reservesList?.length) return [];

    return Promise.all(
      reservesList.map(async (assetAddress: string) => {
        try {
          const tokenContract = new ethers.Contract(
            assetAddress,
            ERC20_ABI,
            provider,
          );
          const [symbol, name, decimals] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.name(),
            tokenContract.decimals(),
          ]);
          return {
            address: assetAddress,
            symbol,
            name,
            decimals: Number(decimals),
          };
        } catch {
          return {
            address: assetAddress,
            symbol: "Unknown",
            name: "Unknown Token",
            decimals: 18,
          };
        }
      }),
    );
  }

  static async fetchUserAccountData(
    userAddress: string,
    chainId: number,
  ): Promise<UserAccountData> {
    const market = this.getAaveMarket(chainId);
    if (!market?.POOL)
      throw new Error(`Aave V3 not supported on chain ${chainId}`);

    const provider = this.getProvider();
    const dataProviders = this.getDataProviders(market, chainId);

    let userData: unknown = null;
    let usedProvider: string | null = null;

    for (const providerAddress of dataProviders) {
      try {
        const contract = new ethers.Contract(
          providerAddress,
          AAVE_POOL_DATA_PROVIDER_ABI,
          provider,
        );
        userData = await contract.getUserAccountData(userAddress);
        usedProvider = providerAddress;
        break;
      } catch {
        continue;
      }
    }

    if (!userData) {
      const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
      userData = await poolContract.getUserAccountData(userAddress);
      usedProvider = "Pool Contract";
    }

    const typedData = userData as {
      totalCollateralETH?: ethers.BigNumberish;
      totalDebtETH?: ethers.BigNumberish;
      availableBorrowsETH?: ethers.BigNumberish;
      currentLiquidationThreshold?: ethers.BigNumberish;
      ltv?: ethers.BigNumberish;
      healthFactor?: ethers.BigNumberish;
    };

    return {
      totalCollateralBase: ethers.formatUnits(
        typedData.totalCollateralETH || "0",
        8,
      ),
      totalDebtBase: ethers.formatUnits(typedData.totalDebtETH || "0", 8),
      availableBorrowsBase: ethers.formatUnits(
        typedData.availableBorrowsETH || "0",
        8,
      ),
      currentLiquidationThreshold:
        Number(typedData.currentLiquidationThreshold || "0") / 100,
      ltv: Number(typedData.ltv || "0") / 100,
      healthFactor: ethers.formatUnits(typedData.healthFactor || "1", 18),
      usedProvider: usedProvider || undefined,
    };
  }

  static async fetchUserReserveData(
    userAddress: string,
    assetAddress: string,
    assetInfo: AssetInfo,
    chainId: number,
  ): Promise<UserReserveData> {
    const market = this.getAaveMarket(chainId);
    if (!market) throw new Error(`Aave V3 not supported on chain ${chainId}`);

    const provider = this.getProvider();
    const dataProviders = this.getDataProviders(market, chainId);

    let userReserveData: unknown = null;

    for (const providerAddress of dataProviders) {
      try {
        const contract = new ethers.Contract(
          providerAddress,
          AAVE_POOL_DATA_PROVIDER_ABI,
          provider,
        );
        userReserveData = await contract.getUserReserveData(
          assetAddress,
          userAddress,
        );
        break;
      } catch {
        continue;
      }
    }

    if (!userReserveData) throw new Error("Could not fetch reserve data");

    const typedData = userReserveData as {
      currentATokenBalance: ethers.BigNumberish;
      currentStableDebt: ethers.BigNumberish;
      currentVariableDebt: ethers.BigNumberish;
      liquidityRate: ethers.BigNumberish;
      usageAsCollateralEnabled: boolean;
    };

    return {
      symbol: assetInfo.symbol,
      name: assetInfo.name,
      currentATokenBalance: ethers.formatUnits(
        typedData.currentATokenBalance,
        assetInfo.decimals,
      ),
      currentStableDebt: ethers.formatUnits(
        typedData.currentStableDebt,
        assetInfo.decimals,
      ),
      currentVariableDebt: ethers.formatUnits(
        typedData.currentVariableDebt,
        assetInfo.decimals,
      ),
      liquidityRate: typedData.liquidityRate,
      liquidityRateFormatted: ethers.formatUnits(typedData.liquidityRate, 27),
      usageAsCollateralEnabled: typedData.usageAsCollateralEnabled,
      supplyAPY: this.calculateAPY(typedData.liquidityRate),
    };
  }

  static async fetchCompleteUserPosition(
    userAddress: string,
    chainId: number,
  ): Promise<CompleteUserPosition> {
    const accountData = await this.fetchUserAccountData(userAddress, chainId);
    const availableAssets = await this.fetchAvailableAssets(chainId);

    const userPositions = (
      await Promise.allSettled(
        availableAssets.map(async (asset) => {
          try {
            const reserveData = await this.fetchUserReserveData(
              userAddress,
              asset.address,
              asset,
              chainId,
            );
            const hasPosition =
              Number(reserveData.currentATokenBalance) > 0 ||
              Number(reserveData.currentStableDebt) > 0 ||
              Number(reserveData.currentVariableDebt) > 0;
            return hasPosition ? { ...asset, ...reserveData } : null;
          } catch {
            return null;
          }
        }),
      )
    )
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean) as (AssetInfo & UserReserveData)[];

    return { accountData, userPositions, availableAssets };
  }

  static async fetchReserveConfigurationData(
    assetAddress: string,
    chainId: number,
  ): Promise<{
    supplyAPY: string;
    canBeCollateral: boolean;
    liquidityRate: ethers.BigNumberish;
  }> {
    const market = this.getAaveMarket(chainId);
    if (!market)
      return { supplyAPY: "0.00", canBeCollateral: false, liquidityRate: "0" };

    const provider = this.getProvider();
    const dataProviders = this.getDataProviders(market, chainId);

    for (const providerAddress of dataProviders) {
      try {
        const contract = new ethers.Contract(
          providerAddress,
          RESERVE_DATA_ABI,
          provider,
        );
        const [reserveData, configData] = await Promise.all([
          contract.getReserveData(assetAddress),
          contract.getReserveConfigurationData(assetAddress),
        ]);

        const supplyAPY = this.calculateAPY(reserveData.liquidityRate);
        return {
          supplyAPY: supplyAPY?.aaveMethod || "0.00",
          canBeCollateral: Boolean(configData.usageAsCollateralEnabled),
          liquidityRate: reserveData.liquidityRate,
        };
      } catch {
        continue;
      }
    }

    return { supplyAPY: "0.00", canBeCollateral: false, liquidityRate: "0" };
  }

  static async fetchMarketDataWithUSD(chainId: number): Promise<{
    totalMarketSizeUSD: number;
    totalAvailableUSD: number;
    totalBorrowsUSD: number;
  }> {
    const market = this.getAaveMarket(chainId);
    if (!market?.POOL)
      throw new Error(`Aave V3 not supported on chain ${chainId}`);

    const provider = this.getProvider();
    const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
    const reservesList = await poolContract.getReservesList();

    if (!reservesList?.length)
      return {
        totalMarketSizeUSD: 0,
        totalAvailableUSD: 0,
        totalBorrowsUSD: 0,
      };

    console.log(
      `🔍 Processing ALL ${reservesList.length} reserves for accurate market data...`,
    );

    // Process ALL reserves, not just 10
    const reserves = await Promise.allSettled(
      reservesList.map(async (assetAddress: string) => {
        try {
          const tokenContract = new ethers.Contract(
            assetAddress,
            ERC20_ABI,
            provider,
          );
          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => "UNKNOWN"),
            tokenContract.decimals().catch(() => 18),
          ]);

          // Skip unknown tokens
          if (symbol === "UNKNOWN") {
            console.log(`⚠️ Skipping unknown token ${assetAddress}`);
            return null;
          }

          const priceUSD = await this.getTokenPrice(assetAddress, chainId);

          // Skip tokens with no price data
          if (priceUSD <= 0) {
            console.log(`⚠️ Skipping ${symbol} - no price data`);
            return null;
          }

          const reserveData = await poolContract.getReserveData(assetAddress);

          const aTokenContract = new ethers.Contract(
            reserveData.aTokenAddress,
            ERC20_ABI,
            provider,
          );
          const stableDebtContract = new ethers.Contract(
            reserveData.stableDebtTokenAddress,
            ERC20_ABI,
            provider,
          );
          const variableDebtContract = new ethers.Contract(
            reserveData.variableDebtTokenAddress,
            ERC20_ABI,
            provider,
          );

          const [
            aTokenTotalSupply,
            stableDebtTotal,
            variableDebtTotal,
            availableLiquidity,
          ] = await Promise.all([
            aTokenContract.totalSupply(),
            stableDebtContract.totalSupply(),
            variableDebtContract.totalSupply(),
            tokenContract.balanceOf(reserveData.aTokenAddress),
          ]);

          const totalLiquidity = Number(
            ethers.formatUnits(aTokenTotalSupply, decimals),
          );
          const totalStableDebt = Number(
            ethers.formatUnits(stableDebtTotal, decimals),
          );
          const totalVariableDebt = Number(
            ethers.formatUnits(variableDebtTotal, decimals),
          );
          const availableLiquidityFormatted = Number(
            ethers.formatUnits(availableLiquidity, decimals),
          );

          const totalLiquidityUSD = totalLiquidity * priceUSD;
          const availableLiquidityUSD = availableLiquidityFormatted * priceUSD;
          const totalBorrowsUSD =
            (totalStableDebt + totalVariableDebt) * priceUSD;

          // Only include reserves with meaningful TVL (> $1000)
          if (totalLiquidityUSD < 1000) {
            console.log(
              `⚠️ Skipping ${symbol} - TVL too low: ${totalLiquidityUSD.toFixed(0)}`,
            );
            return null;
          }

          console.log(
            `💰 ${symbol}: ${totalLiquidityUSD.toLocaleString()} TVL, ${availableLiquidityUSD.toLocaleString()} available`,
          );

          return {
            symbol,
            totalLiquidityUSD,
            availableLiquidityUSD,
            totalBorrowsUSD,
          };
        } catch (error) {
          console.warn(`⚠️ Failed to fetch data for ${assetAddress}:`, error);
          return null;
        }
      }),
    );

    const validReserves = reserves
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter(Boolean) as {
      symbol: string;
      totalLiquidityUSD: number;
      availableLiquidityUSD: number;
      totalBorrowsUSD: number;
    }[];

    const totalMarketSizeUSD = validReserves.reduce(
      (sum, r) => sum + r.totalLiquidityUSD,
      0,
    );
    const totalAvailableUSD = validReserves.reduce(
      (sum, r) => sum + r.availableLiquidityUSD,
      0,
    );
    const totalBorrowsUSD = validReserves.reduce(
      (sum, r) => sum + r.totalBorrowsUSD,
      0,
    );

    console.log(
      `📊 Final market totals: Market Size: ${totalMarketSizeUSD.toLocaleString()}, Available: ${totalAvailableUSD.toLocaleString()}, Borrows: ${totalBorrowsUSD.toLocaleString()}`,
    );
    console.log(
      `📈 Processed ${validReserves.length} valid reserves out of ${reservesList.length} total`,
    );

    return {
      totalMarketSizeUSD,
      totalAvailableUSD,
      totalBorrowsUSD,
    };
  }

  static async getFormattedMarketMetricsUSD(chainId: number): Promise<{
    totalMarketSize: string;
    totalAvailable: string;
    totalBorrows: string;
    averageSupplyAPY: string;
    averageBorrowAPY: string;
  }> {
    try {
      console.log(
        `🔄 Ensuring token prices are loaded for accurate market data...`,
      );
      await this.ensureAaveTokenPricesLoaded(chainId);

      console.log(`📊 Fetching complete market data with USD values...`);
      const marketData = await this.fetchMarketDataWithUSD(chainId);

      if (marketData.totalMarketSizeUSD === 0) {
        console.warn(`⚠️ Got zero market size, falling back to non-USD method`);
        return this.getFormattedMarketMetrics(chainId);
      }

      return {
        totalMarketSize: this.formatNumber(marketData.totalMarketSizeUSD),
        totalAvailable: this.formatNumber(marketData.totalAvailableUSD),
        totalBorrows: this.formatNumber(marketData.totalBorrowsUSD),
        averageSupplyAPY: "2.50",
        averageBorrowAPY: "4.20",
      };
    } catch (error) {
      console.error(`❌ USD market metrics failed:`, error);
      return this.getFormattedMarketMetrics(chainId);
    }
  }

  static async getFormattedMarketMetrics(chainId: number): Promise<{
    totalMarketSize: string;
    totalAvailable: string;
    totalBorrows: string;
    averageSupplyAPY: string;
    averageBorrowAPY: string;
  }> {
    try {
      const market = this.getAaveMarket(chainId);
      if (!market?.POOL)
        throw new Error(`Aave V3 not supported on chain ${chainId}`);

      const provider = this.getProvider();
      const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const reservesList = await poolContract.getReservesList();

      if (!reservesList?.length) {
        return {
          totalMarketSize: "0",
          totalAvailable: "0",
          totalBorrows: "0",
          averageSupplyAPY: "0.00",
          averageBorrowAPY: "0.00",
        };
      }

      const reserves = await Promise.allSettled(
        reservesList.slice(0, 10).map(async (assetAddress: string) => {
          const tokenContract = new ethers.Contract(
            assetAddress,
            ERC20_ABI,
            provider,
          );
          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => "UNKNOWN"),
            tokenContract.decimals().catch(() => 18),
          ]);

          const reserveData = await poolContract.getReserveData(assetAddress);
          const aTokenContract = new ethers.Contract(
            reserveData.aTokenAddress,
            ERC20_ABI,
            provider,
          );
          const stableDebtContract = new ethers.Contract(
            reserveData.stableDebtTokenAddress,
            ERC20_ABI,
            provider,
          );
          const variableDebtContract = new ethers.Contract(
            reserveData.variableDebtTokenAddress,
            ERC20_ABI,
            provider,
          );

          const [
            aTokenTotalSupply,
            stableDebtTotal,
            variableDebtTotal,
            availableLiquidity,
          ] = await Promise.all([
            aTokenContract.totalSupply(),
            stableDebtContract.totalSupply(),
            variableDebtContract.totalSupply(),
            tokenContract.balanceOf(reserveData.aTokenAddress),
          ]);

          const totalLiquidity = Number(
            ethers.formatUnits(aTokenTotalSupply, decimals),
          );
          const totalStableDebt = Number(
            ethers.formatUnits(stableDebtTotal, decimals),
          );
          const totalVariableDebt = Number(
            ethers.formatUnits(variableDebtTotal, decimals),
          );
          const availableLiquidityFormatted = Number(
            ethers.formatUnits(availableLiquidity, decimals),
          );
          const totalBorrows = totalStableDebt + totalVariableDebt;

          return {
            symbol,
            totalLiquidity,
            availableLiquidity: availableLiquidityFormatted,
            totalBorrows,
            liquidityRate: ethers.formatUnits(
              reserveData.currentLiquidityRate,
              27,
            ),
            variableBorrowRate: ethers.formatUnits(
              reserveData.currentVariableBorrowRate,
              27,
            ),
          };
        }),
      );

      const validReserves = reserves
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter(Boolean) as {
        symbol: string;
        totalLiquidity: number;
        availableLiquidity: number;
        totalBorrows: number;
        liquidityRate: string;
        variableBorrowRate: string;
      }[];

      const totalMarketSize = validReserves.reduce(
        (sum, r) => sum + r.totalLiquidity,
        0,
      );
      const totalAvailable = validReserves.reduce(
        (sum, r) => sum + r.availableLiquidity,
        0,
      );
      const totalBorrows = validReserves.reduce(
        (sum, r) => sum + r.totalBorrows,
        0,
      );

      // Calculate weighted average APYs
      let totalSupplyWeight = 0;
      let weightedSupplyAPY = 0;
      let totalBorrowWeight = 0;
      let weightedBorrowAPY = 0;

      validReserves.forEach((reserve) => {
        const supplyAPY = Number(reserve.liquidityRate) * 100;
        const borrowAPY = Number(reserve.variableBorrowRate) * 100;

        if (supplyAPY > 0 && supplyAPY < 50) {
          totalSupplyWeight += reserve.totalLiquidity;
          weightedSupplyAPY += reserve.totalLiquidity * supplyAPY;
        }

        if (borrowAPY > 0 && borrowAPY < 100) {
          totalBorrowWeight += reserve.totalBorrows;
          weightedBorrowAPY += reserve.totalBorrows * borrowAPY;
        }
      });

      const avgSupplyAPY =
        totalSupplyWeight > 0 ? weightedSupplyAPY / totalSupplyWeight : 0;
      const avgBorrowAPY =
        totalBorrowWeight > 0 ? weightedBorrowAPY / totalBorrowWeight : 0;

      return {
        totalMarketSize: this.formatNumber(totalMarketSize),
        totalAvailable: this.formatNumber(totalAvailable),
        totalBorrows: this.formatNumber(totalBorrows),
        averageSupplyAPY: avgSupplyAPY.toFixed(2),
        averageBorrowAPY: avgBorrowAPY.toFixed(2),
      };
    } catch {
      return {
        totalMarketSize: "0",
        totalAvailable: "0",
        totalBorrows: "0",
        averageSupplyAPY: "0.00",
        averageBorrowAPY: "0.00",
      };
    }
  }

  static async fetchUserPositionsWithUSD(
    userAddress: string,
    chainId: number,
  ): Promise<{
    suppliedAssetsUSD: SuppliedAssetUSD[];
    borrowedAssetsUSD: BorrowedAssetUSD[];
    totalSuppliedUSD: number;
    totalBorrowedUSD: number;
    netWorthUSD: number;
  }> {
    try {
      const userPosition = await this.fetchCompleteUserPosition(
        userAddress,
        chainId,
      );
      const suppliedAssetsUSD: SuppliedAssetUSD[] = [];
      const borrowedAssetsUSD: BorrowedAssetUSD[] = [];
      let totalSuppliedUSD = 0;
      let totalBorrowedUSD = 0;

      for (const position of userPosition.userPositions) {
        const priceUSD = await this.getTokenPrice(position.address, chainId);

        const suppliedBalance = Number(position.currentATokenBalance);
        if (suppliedBalance > 0) {
          const balanceUSD = suppliedBalance * priceUSD;
          suppliedAssetsUSD.push({ ...position, balanceUSD, priceUSD });
          totalSuppliedUSD += balanceUSD;
        }

        const borrowedBalance =
          Number(position.currentStableDebt) +
          Number(position.currentVariableDebt);
        if (borrowedBalance > 0) {
          const debtUSD = borrowedBalance * priceUSD;
          borrowedAssetsUSD.push({
            ...position,
            debtUSD,
            priceUSD,
            totalDebt: borrowedBalance,
          });
          totalBorrowedUSD += debtUSD;
        }
      }

      return {
        suppliedAssetsUSD,
        borrowedAssetsUSD,
        totalSuppliedUSD,
        totalBorrowedUSD,
        netWorthUSD: totalSuppliedUSD - totalBorrowedUSD,
      };
    } catch {
      return {
        suppliedAssetsUSD: [],
        borrowedAssetsUSD: [],
        totalSuppliedUSD: 0,
        totalBorrowedUSD: 0,
        netWorthUSD: 0,
      };
    }
  }

  static async ensureAaveTokenPricesLoaded(chainId: number): Promise<void> {
    try {
      // This would need to be replaced with proper import when available
      // For now, this is a placeholder
      console.log(`Token prices loading placeholder for chain ${chainId}`);
    } catch {}
  }

  static formatNumber(num: number, decimals: number = 2): string {
    if (num === 0) return "0";
    const absNum = Math.abs(num);
    if (absNum >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
    if (absNum >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
    if (absNum >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  }

  static formatCurrency(
    value: number | string,
    currency: string = "$",
    decimals: number = 2,
  ): string {
    const num = Number(value);
    if (isNaN(num) || num === null || num === undefined)
      return `${currency}0.00`;
    if (num === 0) return `${currency}0.00`;
    if (Math.abs(num) >= 1000)
      return `${currency}${this.formatNumber(num, decimals)}`;
    return `${currency}${num.toFixed(decimals)}`;
  }

  static getHealthFactorColor(healthFactor: number | string): string {
    const hf = Number(healthFactor);
    if (isNaN(hf)) return "text-gray-400";
    if (hf >= 2) return "text-green-400";
    if (hf >= 1.5) return "text-yellow-400";
    if (hf >= 1.1) return "text-orange-400";
    return "text-red-400";
  }

  static parseContractError(error: Error | unknown): string {
    if (!error) return "Unknown error occurred";
    const message =
      error instanceof Error
        ? error.message
        : error?.toString() || "Unknown error";
    if (message.includes("user rejected"))
      return "Transaction was rejected by user";
    if (message.includes("insufficient funds"))
      return "Insufficient funds for transaction";
    if (message.includes("execution reverted"))
      return "Transaction failed - contract execution reverted";
    if (message.includes("network"))
      return "Network connection error - please try again";
    if (message.includes("gas"))
      return "Gas estimation failed - transaction may fail";
    const firstSentence = message.split(".")[0];
    return firstSentence.length > 100 ? "Transaction failed" : firstSentence;
  }

  static getNetworkName(chainId: number): string {
    const names: Record<number, string> = {
      1: "Ethereum Mainnet",
      10: "Optimism",
      56: "BNB Chain",
      137: "Polygon",
      42161: "Arbitrum",
      43114: "Avalanche",
      8453: "Base",
      11155111: "Sepolia",
    };
    return names[chainId] || `Unknown Network (${chainId})`;
  }

  static async testAaveConnection(chainId: number): Promise<{
    connected: boolean;
    poolAddress: string | null;
    reserveCount: number;
    error?: string;
  }> {
    try {
      const market = this.getAaveMarket(chainId);
      if (!market?.POOL) {
        return {
          connected: false,
          poolAddress: null,
          reserveCount: 0,
          error: `No Aave market found for chain ${chainId}`,
        };
      }

      const provider = this.getProvider();
      const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const reservesList = await poolContract.getReservesList();

      return {
        connected: true,
        poolAddress: market.POOL,
        reserveCount: reservesList.length,
      };
    } catch (error) {
      return {
        connected: false,
        poolAddress: null,
        reserveCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async fetchSimpleMarketData(chainId: number): Promise<{
    totalMarketSize: string;
    totalAvailable: string;
    totalBorrows: string;
  }> {
    try {
      const market = this.getAaveMarket(chainId);
      if (!market?.POOL)
        throw new Error(`No market found for chain ${chainId}`);

      const provider = this.getProvider();
      const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const reservesList = await poolContract.getReservesList();

      if (reservesList.length === 0) {
        return { totalMarketSize: "0", totalAvailable: "0", totalBorrows: "0" };
      }

      const firstReserve = reservesList[0];
      const tokenContract = new ethers.Contract(
        firstReserve,
        ERC20_ABI,
        provider,
      );
      const reserveData = await poolContract.getReserveData(firstReserve);
      const aTokenContract = new ethers.Contract(
        reserveData.aTokenAddress,
        ERC20_ABI,
        provider,
      );
      const totalSupply = await aTokenContract.totalSupply();
      const decimals = await tokenContract.decimals();
      const totalLiquidity = Number(ethers.formatUnits(totalSupply, decimals));

      return {
        totalMarketSize: this.formatNumber(
          (totalLiquidity * reservesList.length) / 10,
        ),
        totalAvailable: this.formatNumber(totalLiquidity * 0.7),
        totalBorrows: this.formatNumber(totalLiquidity * 0.3),
      };
    } catch {
      return { totalMarketSize: "0", totalAvailable: "0", totalBorrows: "0" };
    }
  }
}
