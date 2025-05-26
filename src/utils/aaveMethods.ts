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

// ABIs (your original ones)
const AAVE_POOL_DATA_PROVIDER_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserAccountData",
    outputs: [
      {
        internalType: "uint256",
        name: "totalCollateralETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalDebtETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "availableBorrowsETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentLiquidationThreshold",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "ltv",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "healthFactor",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "asset",
        type: "address",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserReserveData",
    outputs: [
      {
        internalType: "uint256",
        name: "currentATokenBalance",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentStableDebt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentVariableDebt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "principalStableDebt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "scaledVariableDebt",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "stableBorrowRate",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "liquidityRate",
        type: "uint256",
      },
      {
        internalType: "uint40",
        name: "stableRateLastUpdated",
        type: "uint40",
      },
      {
        internalType: "bool",
        name: "usageAsCollateralEnabled",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const POOL_ABI = [
  {
    inputs: [],
    name: "getReservesList",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserAccountData",
    outputs: [
      {
        internalType: "uint256",
        name: "totalCollateralETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalDebtETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "availableBorrowsETH",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "currentLiquidationThreshold",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "ltv",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "healthFactor",
        type: "uint256",
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
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * AaveMethods - Back to your original working version
 */
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

  private static readonly NETWORK_NAMES: Record<number, string> = {
    1: "Ethereum Mainnet",
    10: "Optimism",
    56: "BNB Chain",
    137: "Polygon",
    42161: "Arbitrum",
    43114: "Avalanche",
    8453: "Base",
    11155111: "Sepolia",
  };

  private static readonly FALLBACK_DATA_PROVIDERS: Record<number, string> = {
    1: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
    137: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
    43114: "0x65285E9dfab318f57051ab2b139ccCf232945451",
  };

  static getAaveMarket(chainId: number): AaveMarket | null {
    const marketKey = this.CHAIN_TO_MARKET[chainId];
    if (!marketKey || !markets[marketKey as keyof typeof markets]) {
      return null;
    }
    return markets[marketKey as keyof typeof markets] as AaveMarket;
  }

  static isChainSupported(chainId: number): boolean {
    return this.getAaveMarket(chainId) !== null;
  }

  static getNetworkName(chainId: number): string {
    return this.NETWORK_NAMES[chainId] || `Unknown Network (${chainId})`;
  }

  private static getProvider(): ethers.BrowserProvider {
    if (!window.ethereum) {
      throw new Error("No wallet provider found");
    }
    // Type assertion to tell TypeScript that window.ethereum is compatible with ethers
    return new ethers.BrowserProvider(
      window.ethereum as ethers.Eip1193Provider,
    );
  }

  private static getDataProviders(
    market: AaveMarket,
    chainId: number,
  ): string[] {
    const providers = [
      market.UI_POOL_DATA_PROVIDER,
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      this.FALLBACK_DATA_PROVIDERS[chainId],
    ].filter(Boolean);

    return providers as string[];
  }

  private static calculateAPY(liquidityRate: ethers.BigNumberish): {
    simple: string;
    compounded: string;
    aaveMethod: string;
  } | null {
    try {
      const simpleAPY = (
        Number(ethers.formatUnits(liquidityRate, 27)) * 100
      ).toFixed(2);
      const valueInDecimal = Number(ethers.formatUnits(liquidityRate, 27));
      const compoundedAPY = (Math.pow(1 + valueInDecimal, 365) - 1) * 100;
      const RAY = Math.pow(10, 27);
      const SECONDS_PER_YEAR = 31536000;
      const rayValueInDecimals = Number(liquidityRate.toString()) / RAY;
      const aaveAPY =
        (Math.pow(1 + rayValueInDecimals / SECONDS_PER_YEAR, SECONDS_PER_YEAR) -
          1) *
        100;

      return {
        simple: simpleAPY,
        compounded: compoundedAPY.toFixed(2),
        aaveMethod: aaveAPY.toFixed(2),
      };
    } catch {
      return null;
    }
  }

  // YOUR ORIGINAL METHOD - just remove the limit
  static async fetchAvailableAssets(chainId: number): Promise<AssetInfo[]> {
    const market = this.getAaveMarket(chainId);
    if (!market || !market.POOL) {
      throw new Error(`Aave V3 not supported on chain ${chainId}`);
    }

    const provider = this.getProvider();
    const poolContract = new ethers.Contract(market.POOL, POOL_ABI, provider);

    try {
      const reservesList = await poolContract.getReservesList();

      if (!reservesList || reservesList.length === 0) {
        return [];
      }

      // Fetch ALL reserves - no limit
      const assetsInfo = await Promise.all(
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

      return assetsInfo;
    } catch (err) {
      throw new Error(
        `Failed to fetch available assets: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // YOUR ORIGINAL METHOD
  static async fetchUserAccountData(
    userAddress: string,
    chainId: number,
  ): Promise<UserAccountData> {
    const market = this.getAaveMarket(chainId);
    if (!market || !market.POOL) {
      throw new Error(`Aave V3 not supported on chain ${chainId}`);
    }

    const provider = this.getProvider();
    const dataProviders = this.getDataProviders(market, chainId);

    if (dataProviders.length === 0) {
      throw new Error(
        "Could not find any Aave Protocol Data Provider address for this network",
      );
    }

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
      try {
        const poolContract = new ethers.Contract(
          market.POOL,
          POOL_ABI,
          provider,
        );
        userData = await poolContract.getUserAccountData(userAddress);
        usedProvider = "Pool Contract";
      } catch {
        throw new Error(
          "Could not fetch user data with any available provider",
        );
      }
    }

    // Type assertion for the userData object
    const typedUserData = userData as {
      totalCollateralETH?: ethers.BigNumberish;
      totalCollateralBase?: ethers.BigNumberish;
      totalDebtETH?: ethers.BigNumberish;
      totalDebtBase?: ethers.BigNumberish;
      availableBorrowsETH?: ethers.BigNumberish;
      availableBorrowsBase?: ethers.BigNumberish;
      currentLiquidationThreshold?: ethers.BigNumberish;
      ltv?: ethers.BigNumberish;
      healthFactor?: ethers.BigNumberish;
    };

    return {
      totalCollateralBase: ethers.formatUnits(
        typedUserData.totalCollateralETH ||
          typedUserData.totalCollateralBase ||
          "0",
        8,
      ),
      totalDebtBase: ethers.formatUnits(
        typedUserData.totalDebtETH || typedUserData.totalDebtBase || "0",
        8,
      ),
      availableBorrowsBase: ethers.formatUnits(
        typedUserData.availableBorrowsETH ||
          typedUserData.availableBorrowsBase ||
          "0",
        8,
      ),
      currentLiquidationThreshold:
        Number(typedUserData.currentLiquidationThreshold || "0") / 100,
      ltv: Number(typedUserData.ltv || "0") / 100,
      healthFactor: ethers.formatUnits(typedUserData.healthFactor || "1", 18),
      usedProvider: usedProvider || undefined,
    };
  }

  // YOUR ORIGINAL METHOD
  static async fetchUserReserveData(
    userAddress: string,
    assetAddress: string,
    assetInfo: AssetInfo,
    chainId: number,
  ): Promise<UserReserveData> {
    const market = this.getAaveMarket(chainId);
    if (!market) {
      throw new Error(`Aave V3 not supported on chain ${chainId}`);
    }

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

    if (!userReserveData) {
      throw new Error(
        "Could not fetch reserve data with any available provider",
      );
    }

    // Type assertion for the userReserveData object
    const typedReserveData = userReserveData as {
      currentATokenBalance: ethers.BigNumberish;
      currentStableDebt: ethers.BigNumberish;
      currentVariableDebt: ethers.BigNumberish;
      liquidityRate: ethers.BigNumberish;
      usageAsCollateralEnabled: boolean;
    };

    const supplyAPY = this.calculateAPY(typedReserveData.liquidityRate);

    return {
      symbol: assetInfo.symbol,
      name: assetInfo.name,
      currentATokenBalance: ethers.formatUnits(
        typedReserveData.currentATokenBalance,
        assetInfo.decimals,
      ),
      currentStableDebt: ethers.formatUnits(
        typedReserveData.currentStableDebt,
        assetInfo.decimals,
      ),
      currentVariableDebt: ethers.formatUnits(
        typedReserveData.currentVariableDebt,
        assetInfo.decimals,
      ),
      liquidityRate: typedReserveData.liquidityRate,
      liquidityRateFormatted: ethers.formatUnits(
        typedReserveData.liquidityRate,
        27,
      ),
      usageAsCollateralEnabled: typedReserveData.usageAsCollateralEnabled,
      supplyAPY,
    };
  }

  // YOUR ORIGINAL METHOD - just remove limits
  static async fetchCompleteUserPosition(
    userAddress: string,
    chainId: number,
  ): Promise<CompleteUserPosition> {
    try {
      const accountData = await this.fetchUserAccountData(userAddress, chainId);
      const availableAssets = await this.fetchAvailableAssets(chainId); // No limit now

      const reserveDataPromises = availableAssets.map(async (asset) => {
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
      });

      const userPositions = (await Promise.all(reserveDataPromises)).filter(
        Boolean,
      ) as (AssetInfo & UserReserveData)[];

      return {
        accountData,
        userPositions,
        availableAssets,
      };
    } catch (err) {
      throw new Error(
        `Failed to fetch complete user position: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  }

  // Add the correct ABI for getting reserve data (not user-specific)
  private static readonly RESERVE_DATA_ABI = [
    {
      inputs: [{ internalType: "address", name: "asset", type: "address" }],
      name: "getReserveData",
      outputs: [
        {
          internalType: "uint256",
          name: "availableLiquidity",
          type: "uint256",
        },
        { internalType: "uint256", name: "totalStableDebt", type: "uint256" },
        { internalType: "uint256", name: "totalVariableDebt", type: "uint256" },
        { internalType: "uint256", name: "liquidityRate", type: "uint256" },
        {
          internalType: "uint256",
          name: "variableBorrowRate",
          type: "uint256",
        },
        { internalType: "uint256", name: "stableBorrowRate", type: "uint256" },
        {
          internalType: "uint256",
          name: "averageStableBorrowRate",
          type: "uint256",
        },
        { internalType: "uint256", name: "liquidityIndex", type: "uint256" },
        {
          internalType: "uint256",
          name: "variableBorrowIndex",
          type: "uint256",
        },
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
        {
          internalType: "bool",
          name: "usageAsCollateralEnabled",
          type: "bool",
        },
        { internalType: "bool", name: "borrowingEnabled", type: "bool" },
        { internalType: "bool", name: "stableBorrowRateEnabled", type: "bool" },
        { internalType: "bool", name: "isActive", type: "bool" },
        { internalType: "bool", name: "isFrozen", type: "bool" },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ internalType: "address", name: "asset", type: "address" }],
      name: "getReserveTokensAddresses",
      outputs: [
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
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  // Simple method to get reserve configuration using the correct contract method
  static async fetchReserveConfigurationData(
    assetAddress: string,
    chainId: number,
  ): Promise<{
    supplyAPY: string;
    canBeCollateral: boolean;
    liquidityRate: ethers.BigNumberish;
  }> {
    const market = this.getAaveMarket(chainId);
    if (!market) {
      return {
        supplyAPY: "0.00",
        canBeCollateral: false,
        liquidityRate: "0",
      };
    }

    const provider = this.getProvider();
    const dataProviders = this.getDataProviders(market, chainId);

    // Try to get reserve data using the correct methods
    for (const providerAddress of dataProviders) {
      try {
        const contract = new ethers.Contract(
          providerAddress,
          this.RESERVE_DATA_ABI,
          provider,
        );

        // Get reserve data and configuration data
        const [reserveData, configData] = await Promise.all([
          contract.getReserveData(assetAddress),
          contract.getReserveConfigurationData(assetAddress),
        ]);

        // Type assertions for the contract responses
        const typedReserveData = reserveData as {
          liquidityRate: ethers.BigNumberish;
        };
        const typedConfigData = configData as {
          usageAsCollateralEnabled: boolean;
        };

        const supplyAPY = this.calculateAPY(typedReserveData.liquidityRate);

        return {
          supplyAPY: supplyAPY?.aaveMethod || "0.00",
          canBeCollateral: Boolean(typedConfigData.usageAsCollateralEnabled),
          liquidityRate: typedReserveData.liquidityRate,
        };
      } catch (err) {
        console.warn(
          `Failed to get reserve config with provider ${providerAddress}:`,
          err,
        );
        continue;
      }
    }

    // If all providers fail, return conservative defaults
    return {
      supplyAPY: "0.00",
      canBeCollateral: false,
      liquidityRate: "0",
    };
  }

  // Utility methods
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
}
