// utils/aaveMethods.ts
import { ethers } from "ethers";
import * as markets from "@bgd-labs/aave-address-book";

// Type definitions
interface AaveMarket {
  POOL: string;
  UI_POOL_DATA_PROVIDER?: string;
  AAVE_PROTOCOL_DATA_PROVIDER?: string;
}

interface TokenInfo {
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
  canBeCollateral: boolean;
  supplyAPY: { aaveMethod: string };
  variableBorrowAPY: { aaveMethod: string };
  stableBorrowAPY: { aaveMethod: string };
  totalSupplied: string;
}

// This interface extends TokenInfo with UserReserveData for backward compatibility
interface UserPosition extends TokenInfo, UserReserveData {}

interface CompleteUserPosition {
  accountData: UserAccountData;
  userPositions: UserPosition[];
  availableAssets: TokenInfo[];
}

interface USDAsset {
  address: string;
  balanceUSD?: number;
  debtUSD?: number;
  priceUSD: number;
  totalDebt?: number;
}

interface UserPositionsWithUSD {
  suppliedAssetsUSD: USDAsset[];
  borrowedAssetsUSD: USDAsset[];
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  netWorthUSD: number;
}

interface ReserveConfigData {
  supplyAPY: string;
  canBeCollateral: boolean;
  liquidityRate: ethers.BigNumberish;
  variableBorrowRate?: ethers.BigNumberish;
  stableBorrowRate?: ethers.BigNumberish;
  totalSupplied: string;
}

interface MarketMetrics {
  totalMarketSize: string;
  totalAvailable: string;
  totalBorrows: string;
  averageSupplyAPY: string;
  averageBorrowAPY: string;
}

interface ContractUserAccountData {
  totalCollateralETH: ethers.BigNumberish;
  totalDebtETH: ethers.BigNumberish;
  availableBorrowsETH: ethers.BigNumberish;
  currentLiquidationThreshold: ethers.BigNumberish;
  ltv: ethers.BigNumberish;
  healthFactor: ethers.BigNumberish;
}

interface ContractUserReserveData {
  currentATokenBalance: ethers.BigNumberish;
  currentStableDebt: ethers.BigNumberish;
  currentVariableDebt: ethers.BigNumberish;
  principalStableDebt: ethers.BigNumberish;
  scaledVariableDebt: ethers.BigNumberish;
  stableBorrowRate: ethers.BigNumberish;
  liquidityRate: ethers.BigNumberish;
  stableRateLastUpdated: ethers.BigNumberish;
  usageAsCollateralEnabled: boolean;
}

interface ContractReserveData {
  configuration: { data: ethers.BigNumberish };
  liquidityIndex: ethers.BigNumberish;
  currentLiquidityRate: ethers.BigNumberish;
  variableBorrowIndex: ethers.BigNumberish;
  currentVariableBorrowRate: ethers.BigNumberish;
  currentStableBorrowRate: ethers.BigNumberish;
  lastUpdateTimestamp: ethers.BigNumberish;
  id: ethers.BigNumberish;
  aTokenAddress: string;
  stableDebtTokenAddress: string;
  variableDebtTokenAddress: string;
  interestRateStrategyAddress: string;
  accruedToTreasury: ethers.BigNumberish;
  unbacked: ethers.BigNumberish;
  isolationModeTotalDebt: ethers.BigNumberish;
}

interface ContractReserveConfigData {
  decimals: ethers.BigNumberish;
  ltv: ethers.BigNumberish;
  liquidationThreshold: ethers.BigNumberish;
  liquidationBonus: ethers.BigNumberish;
  reserveFactor: ethers.BigNumberish;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
}

interface EthereumRequestParams {
  method: string;
  params?: unknown[] | Record<string, unknown>;
}

interface WindowEthereum {
  request: (request: EthereumRequestParams) => Promise<unknown>;
  on?: (eventName: string, callback: (...args: unknown[]) => void) => void;
  removeListener?: (
    eventName: string,
    callback: (...args: unknown[]) => void,
  ) => void;
  isMetaMask?: boolean;
  isConnected?: () => boolean;
  selectedAddress?: string | null;
  chainId?: string;
}

// Type guard to check if ethereum provider is valid
function isValidEthereumProvider(
  ethereum: unknown,
): ethereum is WindowEthereum {
  return (
    ethereum !== null &&
    ethereum !== undefined &&
    typeof ethereum === "object" &&
    "request" in ethereum &&
    typeof (ethereum as WindowEthereum).request === "function"
  );
}

// Constants
const CHAINS: Record<number, keyof typeof markets> = {
  1: "AaveV3Ethereum",
  10: "AaveV3Optimism",
  56: "AaveV3BNB",
  137: "AaveV3Polygon",
  42161: "AaveV3Arbitrum",
  43114: "AaveV3Avalanche",
  8453: "AaveV3Base",
  11155111: "AaveV3Sepolia",
};

const PROVIDERS: Record<number, string> = {
  1: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
  137: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
  43114: "0x65285E9dfab318f57051ab2b139ccCf232945451",
};

const FALLBACK_PRICES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  DAI: 1,
  WETH: 2400,
  ETH: 2400,
  WBTC: 43000,
  BTC: 43000,
  MATIC: 0.8,
  WMATIC: 0.8,
  AVAX: 25,
  WAVAX: 25,
};

const NETWORK_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  56: "BNB Chain",
  137: "Polygon",
  42161: "Arbitrum",
  43114: "Avalanche",
  8453: "Base",
  11155111: "Sepolia",
};

// ABIs
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
] as const;

const DATA_PROVIDER_ABI = [
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
] as const;

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
] as const;

export class AaveMethods {
  static getAaveMarket(chainId: number): AaveMarket | null {
    const key = CHAINS[chainId];
    const market = key && markets[key] ? (markets[key] as AaveMarket) : null;
    return market;
  }

  static isChainSupported(chainId: number): boolean {
    return !!this.getAaveMarket(chainId);
  }

  static getProvider(): ethers.BrowserProvider {
    if (!window.ethereum || !isValidEthereumProvider(window.ethereum)) {
      throw new Error("No wallet found");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }

  static calculateAPY(rate: ethers.BigNumberish): string {
    if (!rate || rate.toString() === "0") return "0.00";
    try {
      const RAY = Math.pow(10, 27);
      const SECONDS_PER_YEAR = 31536000;
      const decimal = Number(rate.toString()) / RAY;
      const apy =
        (Math.pow(1 + decimal / SECONDS_PER_YEAR, SECONDS_PER_YEAR) - 1) * 100;
      return Math.max(0, apy).toFixed(2);
    } catch {
      return "0.00";
    }
  }

  static async getTokenPrice(symbol?: string): Promise<number> {
    return FALLBACK_PRICES[symbol?.toUpperCase() ?? ""] || 1;
  }

  static async fetchAvailableAssets(chainId: number): Promise<TokenInfo[]> {
    const market = this.getAaveMarket(chainId);
    if (!market?.POOL) throw new Error(`Chain ${chainId} not supported`);

    const provider = this.getProvider();
    const pool = new ethers.Contract(market.POOL, POOL_ABI, provider);
    const reserves = (await pool.getReservesList()) as string[];

    return Promise.all(
      reserves.map(async (address): Promise<TokenInfo> => {
        try {
          const token = new ethers.Contract(address, ERC20_ABI, provider);
          const [symbol, name, decimals] = await Promise.all([
            token.symbol() as Promise<string>,
            token.name() as Promise<string>,
            token.decimals() as Promise<number>,
          ]);
          return { address, symbol, name, decimals: Number(decimals) };
        } catch {
          return { address, symbol: "Unknown", name: "Unknown", decimals: 18 };
        }
      }),
    );
  }

  static async fetchUserAccountData(
    userAddress: string,
    chainId: number,
  ): Promise<UserAccountData> {
    const market = this.getAaveMarket(chainId);
    if (!market?.POOL) throw new Error(`Chain ${chainId} not supported`);

    const provider = this.getProvider();
    const providers = [
      market.UI_POOL_DATA_PROVIDER,
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      PROVIDERS[chainId],
    ].filter((addr): addr is string => typeof addr === "string");

    for (const addr of providers) {
      try {
        const contract = new ethers.Contract(addr, DATA_PROVIDER_ABI, provider);
        const data = (await contract.getUserAccountData(
          userAddress,
        )) as ContractUserAccountData;
        return {
          totalCollateralBase: ethers.formatUnits(
            data.totalCollateralETH || "0",
            8,
          ),
          totalDebtBase: ethers.formatUnits(data.totalDebtETH || "0", 8),
          availableBorrowsBase: ethers.formatUnits(
            data.availableBorrowsETH || "0",
            8,
          ),
          currentLiquidationThreshold:
            Number(data.currentLiquidationThreshold || "0") / 100,
          ltv: Number(data.ltv || "0") / 100,
          healthFactor: ethers.formatUnits(data.healthFactor || "1", 18),
        };
      } catch {
        continue;
      }
    }

    const pool = new ethers.Contract(market.POOL, POOL_ABI, provider);
    const data = (await pool.getUserAccountData(
      userAddress,
    )) as ContractUserAccountData;
    return {
      totalCollateralBase: ethers.formatUnits(
        data.totalCollateralETH || "0",
        8,
      ),
      totalDebtBase: ethers.formatUnits(data.totalDebtETH || "0", 8),
      availableBorrowsBase: ethers.formatUnits(
        data.availableBorrowsETH || "0",
        8,
      ),
      currentLiquidationThreshold:
        Number(data.currentLiquidationThreshold || "0") / 100,
      ltv: Number(data.ltv || "0") / 100,
      healthFactor: ethers.formatUnits(data.healthFactor || "1", 18),
    };
  }

  static async fetchUserReserveData(
    userAddress: string,
    assetAddress: string,
    asset: TokenInfo,
    chainId: number,
  ): Promise<UserReserveData> {
    const market = this.getAaveMarket(chainId);
    if (!market) throw new Error(`Chain ${chainId} not supported`);

    const provider = this.getProvider();
    const providers = [
      market.UI_POOL_DATA_PROVIDER,
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      PROVIDERS[chainId],
    ].filter((addr): addr is string => typeof addr === "string");

    let userData: ContractUserReserveData | null = null;

    // Try data providers with timeout
    for (const addr of providers) {
      try {
        const contract = new ethers.Contract(addr, DATA_PROVIDER_ABI, provider);
        const userDataPromise = contract.getUserReserveData(
          assetAddress,
          userAddress,
        );
        userData = (await Promise.race([
          userDataPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 5000),
          ),
        ])) as ContractUserReserveData;
        break;
      } catch (error) {
        console.warn(
          `Data provider ${addr} failed for ${asset.symbol}:`,
          (error as Error).message,
        );
        continue;
      }
    }

    if (!userData)
      throw new Error(`Failed to fetch user reserve data for ${asset.symbol}`);

    let rates: Partial<ReserveConfigData> = {};

    try {
      const pool = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const reserveDataPromise = pool.getReserveData(assetAddress);
      const reserveData = (await Promise.race([
        reserveDataPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Pool timeout")), 5000),
        ),
      ])) as ContractReserveData;

      // Get total supplied amount
      const aToken = new ethers.Contract(
        reserveData.aTokenAddress,
        ERC20_ABI,
        provider,
      );
      const totalSupplyPromise = aToken.totalSupply();
      const totalSupply = (await Promise.race([
        totalSupplyPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TotalSupply timeout")), 3000),
        ),
      ])) as ethers.BigNumberish;

      // Check collateral status using LTV method
      const configBits = BigInt(reserveData.configuration.data.toString());
      const LTV_MASK = BigInt(0xffff);
      const ltv = Number(configBits & LTV_MASK);
      const canBeCollateral = ltv > 0;

      rates = {
        liquidityRate: reserveData.currentLiquidityRate,
        variableBorrowRate: reserveData.currentVariableBorrowRate,
        stableBorrowRate: reserveData.currentStableBorrowRate,
        totalSupplied: ethers.formatUnits(totalSupply, asset.decimals),
        canBeCollateral,
      };
    } catch (error) {
      console.warn(
        `Failed to get reserve data for ${asset.symbol}:`,
        (error as Error).message,
      );
      rates = {
        liquidityRate: userData.liquidityRate || "0",
        variableBorrowRate: "0",
        stableBorrowRate: userData.stableBorrowRate || "0",
        totalSupplied: "0",
        canBeCollateral: false,
      };
    }

    // Format user's balance properly
    const userATokenBalance = ethers.formatUnits(
      userData.currentATokenBalance,
      asset.decimals,
    );
    const userStableDebt = ethers.formatUnits(
      userData.currentStableDebt,
      asset.decimals,
    );
    const userVariableDebt = ethers.formatUnits(
      userData.currentVariableDebt,
      asset.decimals,
    );

    return {
      symbol: asset.symbol,
      name: asset.name,
      currentATokenBalance: userATokenBalance,
      currentStableDebt: userStableDebt,
      currentVariableDebt: userVariableDebt,
      liquidityRate: rates.liquidityRate || "0",
      liquidityRateFormatted: ethers.formatUnits(
        rates.liquidityRate || "0",
        27,
      ),
      usageAsCollateralEnabled: userData.usageAsCollateralEnabled,
      canBeCollateral: rates.canBeCollateral ?? false,
      supplyAPY: { aaveMethod: this.calculateAPY(rates.liquidityRate || "0") },
      variableBorrowAPY: {
        aaveMethod: this.calculateAPY(rates.variableBorrowRate || "0"),
      },
      stableBorrowAPY: {
        aaveMethod: this.calculateAPY(rates.stableBorrowRate || "0"),
      },
      totalSupplied: rates.totalSupplied || "0",
    };
  }

  static async fetchCompleteUserPosition(
    userAddress: string,
    chainId: number,
  ): Promise<CompleteUserPosition> {
    const [accountData, availableAssets] = await Promise.all([
      this.fetchUserAccountData(userAddress, chainId),
      this.fetchAvailableAssets(chainId),
    ]);

    const BATCH_SIZE = 2;
    const userPositions: UserPosition[] = [];

    for (let i = 0; i < availableAssets.length; i += BATCH_SIZE) {
      const batch = availableAssets.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (asset): Promise<UserPosition | null> => {
          try {
            const reserve = await this.fetchUserReserveData(
              userAddress,
              asset.address,
              asset,
              chainId,
            );
            const hasPosition =
              Number(reserve.currentATokenBalance) > 0 ||
              Number(reserve.currentStableDebt) > 0 ||
              Number(reserve.currentVariableDebt) > 0;
            return hasPosition ? { ...asset, ...reserve } : null;
          } catch (error) {
            console.warn(
              `Failed to fetch reserve data for ${asset.symbol}:`,
              error,
            );
            return null;
          }
        }),
      );

      // Add successful results to userPositions
      batchResults.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          userPositions.push(result.value);
        }
      });

      // Delay between batches to avoid overwhelming RPC
      if (i + BATCH_SIZE < availableAssets.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return { accountData, userPositions, availableAssets };
  }

  static async fetchUserPositionsWithUSD(
    userAddress: string,
    chainId: number,
  ): Promise<UserPositionsWithUSD> {
    try {
      const { userPositions } = await this.fetchCompleteUserPosition(
        userAddress,
        chainId,
      );
      const suppliedAssetsUSD: USDAsset[] = [];
      const borrowedAssetsUSD: USDAsset[] = [];
      let totalSuppliedUSD = 0;
      let totalBorrowedUSD = 0;

      for (const position of userPositions) {
        const price = await this.getTokenPrice(position.symbol);
        const supplied = Number(position.currentATokenBalance);
        const borrowed =
          Number(position.currentStableDebt) +
          Number(position.currentVariableDebt);

        if (supplied > 0) {
          const balanceUSD = supplied * price;
          suppliedAssetsUSD.push({
            address: position.address,
            balanceUSD,
            priceUSD: price,
          });
          totalSuppliedUSD += balanceUSD;
        }

        if (borrowed > 0) {
          const debtUSD = borrowed * price;
          borrowedAssetsUSD.push({
            address: position.address,
            debtUSD,
            priceUSD: price,
            totalDebt: borrowed,
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

  static async fetchReserveConfigurationData(
    assetAddress: string,
    chainId: number,
  ): Promise<ReserveConfigData> {
    const market = this.getAaveMarket(chainId);
    if (!market) {
      return {
        supplyAPY: "0.00",
        canBeCollateral: false,
        liquidityRate: "0",
        totalSupplied: "0",
      };
    }

    try {
      const provider = this.getProvider();
      const dataProviders = [
        market.UI_POOL_DATA_PROVIDER,
        market.AAVE_PROTOCOL_DATA_PROVIDER,
        PROVIDERS[chainId],
      ].filter((addr): addr is string => typeof addr === "string");

      let canBeCollateral = false;
      let configData: ContractReserveConfigData | null = null;

      // Try data provider method first
      for (const providerAddr of dataProviders) {
        try {
          const dataProviderContract = new ethers.Contract(
            providerAddr,
            DATA_PROVIDER_ABI,
            provider,
          );
          configData = (await dataProviderContract.getReserveConfigurationData(
            assetAddress,
          )) as ContractReserveConfigData;
          canBeCollateral = configData.usageAsCollateralEnabled;
          break;
        } catch (error) {
          console.warn(
            `Data provider ${providerAddr} failed:`,
            (error as Error).message,
          );
          continue;
        }
      }

      // Fallback to pool contract
      const pool = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const data = (await pool.getReserveData(
        assetAddress,
      )) as ContractReserveData;

      // If we couldn't get config from data provider, try to read the bits manually
      if (!configData) {
        const configBits = BigInt(data.configuration.data.toString());
        const ltv = Number(configBits & BigInt(0xffff));
        const COLLATERAL_ENABLED_MASK = BigInt(1) << BigInt(56);
        const collateralEnabledFromBits =
          (configBits & COLLATERAL_ENABLED_MASK) !== BigInt(0);
        canBeCollateral = ltv > 0 && collateralEnabledFromBits;
      }

      // Get total supplied amount
      const aToken = new ethers.Contract(
        data.aTokenAddress,
        ERC20_ABI,
        provider,
      );
      const token = new ethers.Contract(assetAddress, ERC20_ABI, provider);
      const [totalSupply, decimals] = await Promise.all([
        aToken.totalSupply() as Promise<ethers.BigNumberish>,
        token.decimals() as Promise<number>,
      ]);

      const totalSuppliedFormatted = ethers.formatUnits(totalSupply, decimals);

      return {
        supplyAPY: this.calculateAPY(data.currentLiquidityRate),
        canBeCollateral,
        liquidityRate: data.currentLiquidityRate,
        variableBorrowRate: data.currentVariableBorrowRate,
        stableBorrowRate: data.currentStableBorrowRate,
        totalSupplied: totalSuppliedFormatted,
      };
    } catch (error) {
      console.error(
        `Failed to fetch reserve config for ${assetAddress}:`,
        error,
      );
      return {
        supplyAPY: "0.00",
        canBeCollateral: false,
        liquidityRate: "0",
        totalSupplied: "0",
      };
    }
  }

  static async getFormattedMarketMetrics(
    chainId: number,
  ): Promise<MarketMetrics> {
    try {
      const market = this.getAaveMarket(chainId);
      if (!market?.POOL) throw new Error(`Chain ${chainId} not supported`);

      const provider = this.getProvider();
      const pool = new ethers.Contract(market.POOL, POOL_ABI, provider);
      const reserves = (await pool.getReservesList()) as string[];

      if (!reserves.length) {
        return {
          totalMarketSize: "0",
          totalAvailable: "0",
          totalBorrows: "0",
          averageSupplyAPY: "0.00",
          averageBorrowAPY: "0.00",
        };
      }

      const sample = await Promise.allSettled(
        reserves.slice(0, 3).map(async (address) => {
          try {
            const token = new ethers.Contract(address, ERC20_ABI, provider);
            const [symbol, decimals] = await Promise.all([
              token.symbol() as Promise<string>,
              token.decimals() as Promise<number>,
            ]);
            if (symbol === "UNKNOWN") return null;

            const data = (await pool.getReserveData(
              address,
            )) as ContractReserveData;
            const aToken = new ethers.Contract(
              data.aTokenAddress,
              ERC20_ABI,
              provider,
            );
            const [totalSupply, available] = await Promise.all([
              aToken.totalSupply() as Promise<ethers.BigNumberish>,
              token.balanceOf(
                data.aTokenAddress,
              ) as Promise<ethers.BigNumberish>,
            ]);

            const price = await this.getTokenPrice(symbol);
            const total = Number(ethers.formatUnits(totalSupply, decimals));
            const avail = Number(ethers.formatUnits(available, decimals));

            return {
              totalUSD: total * price,
              availableUSD: avail * price,
              borrowsUSD: (total - avail) * price,
              supplyAPY: Number(this.calculateAPY(data.currentLiquidityRate)),
              borrowAPY: Number(
                this.calculateAPY(data.currentVariableBorrowRate),
              ),
            };
          } catch {
            return null;
          }
        }),
      );

      const valid = sample
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (!valid.length) {
        return {
          totalMarketSize: "0",
          totalAvailable: "0",
          totalBorrows: "0",
          averageSupplyAPY: "0.00",
          averageBorrowAPY: "0.00",
        };
      }

      const scale = reserves.length / Math.min(3, reserves.length);
      const totals = valid.reduce(
        (acc, r) => ({
          market: acc.market + r.totalUSD,
          available: acc.available + r.availableUSD,
          borrows: acc.borrows + r.borrowsUSD,
          supplyAPY: acc.supplyAPY + r.supplyAPY * r.totalUSD,
          borrowAPY: acc.borrowAPY + r.borrowAPY * r.borrowsUSD,
          supplyWeight: acc.supplyWeight + r.totalUSD,
          borrowWeight: acc.borrowWeight + r.borrowsUSD,
        }),
        {
          market: 0,
          available: 0,
          borrows: 0,
          supplyAPY: 0,
          borrowAPY: 0,
          supplyWeight: 0,
          borrowWeight: 0,
        },
      );

      return {
        totalMarketSize: this.formatNumber(totals.market * scale),
        totalAvailable: this.formatNumber(totals.available * scale),
        totalBorrows: this.formatNumber(totals.borrows * scale),
        averageSupplyAPY: (totals.supplyWeight
          ? totals.supplyAPY / totals.supplyWeight
          : 0
        ).toFixed(2),
        averageBorrowAPY: (totals.borrowWeight
          ? totals.borrowAPY / totals.borrowWeight
          : 0
        ).toFixed(2),
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

  // Utility methods
  static formatNumber(num: number, decimals = 2): string {
    if (!num) return "0";
    const abs = Math.abs(num);
    if (abs >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
    if (abs >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
    if (abs >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  }

  static formatCurrency(
    value: string | number,
    currency = "$",
    decimals = 2,
  ): string {
    const num = Number(value);
    if (isNaN(num)) return `${currency}0.00`;
    if (Math.abs(num) >= 1000)
      return `${currency}${this.formatNumber(num, decimals)}`;
    return `${currency}${num.toFixed(decimals)}`;
  }

  static getHealthFactorColor(hf: string | number): string {
    const n = Number(hf);
    if (isNaN(n)) return "text-gray-400";
    if (n >= 2) return "text-green-400";
    if (n >= 1.5) return "text-yellow-400";
    if (n >= 1.1) return "text-orange-400";
    return "text-red-400";
  }

  static parseContractError(error: unknown): string {
    const errorObj = error as Error;
    const msg = errorObj?.message || errorObj?.toString() || "Unknown error";
    if (msg.includes("user rejected")) return "Transaction rejected";
    if (msg.includes("insufficient funds")) return "Insufficient funds";
    if (msg.includes("execution reverted")) return "Transaction failed";
    return msg.split(".")[0].slice(0, 100);
  }

  static getNetworkName(chainId: number): string {
    return NETWORK_NAMES[chainId] || `Chain ${chainId}`;
  }
}
