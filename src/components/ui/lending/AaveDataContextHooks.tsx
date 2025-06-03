// hooks/useAaveData.ts
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AaveMethods } from "@/utils/aaveMethods";
import { useWalletConnection } from "@/utils/walletMethods";
import { toast } from "sonner";

interface Token {
  id: string;
  name: string;
  ticker: string;
  address: string;
  decimals: number;
  chainId: number;
}

interface ChainData {
  id: string;
  name: string;
  chainName: string;
  symbol: string;
  currency: string;
  decimals: number;
  chainId: number;
}

interface BaseAsset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  token: Token;
  chain: ChainData;
  supplyAPY: string;
  canBeCollateral: boolean;
  totalSupplied: string;
  totalSupply: string;
  priceUSD: number;
  priceInUSD: number;
}

interface SuppliedAsset extends BaseAsset {
  currentATokenBalance: number;
  balanceUSD: number;
  formattedBalance: string;
  formattedBalanceUSD: string;
  usageAsCollateralEnabled: boolean;
}

interface BorrowedAsset extends BaseAsset {
  currentStableDebt: string;
  currentVariableDebt: string;
  totalDebt: number;
  debtUSD: number;
  borrowAPY: string;
  variableBorrowAPY: string;
  stableBorrowAPY: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
}

interface AvailableAsset extends BaseAsset {
  borrowAPY: string;
  canBeBorrowed: boolean;
  liquidityRate: string;
  totalSuppliedUSD: number;
}

interface AccountData {
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  netWorthUSD: number;
  [key: string]: unknown; // For other properties from position.accountData
}

interface MarketMetrics {
  totalMarketSize: number;
  totalAvailable: number;
  totalBorrows: number;
  averageSupplyAPY: number;
  averageBorrowAPY: number;
}

interface USDPosition {
  address: string;
  balanceUSD?: number;
  debtUSD?: number;
  priceUSD: number;
}

interface USDPositions {
  suppliedAssetsUSD: USDPosition[];
  borrowedAssetsUSD: USDPosition[];
  totalSuppliedUSD: number;
  totalBorrowedUSD: number;
  netWorthUSD: number;
}

interface RawAsset {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  supplyAPY?: { aaveMethod: string };
  variableBorrowAPY?: { aaveMethod: string };
  stableBorrowAPY?: { aaveMethod: string };
  canBeCollateral?: boolean;
  usageAsCollateralEnabled?: boolean;
  totalSupplied?: string;
}

interface Validation {
  isValid: boolean;
  errorMessage?: string;
}

const CHAIN_CONFIG: Record<number, Omit<ChainData, "chainId">> = {
  1: {
    id: "ethereum",
    name: "Ethereum Mainnet",
    chainName: "Ethereum",
    symbol: "ETH",
    currency: "ETH",
    decimals: 18,
  },
  137: {
    id: "polygon",
    name: "Polygon",
    chainName: "Polygon",
    symbol: "MATIC",
    currency: "MATIC",
    decimals: 18,
  },
  42161: {
    id: "arbitrum",
    name: "Arbitrum",
    chainName: "Arbitrum",
    symbol: "ETH",
    currency: "ETH",
    decimals: 18,
  },
  10: {
    id: "optimism",
    name: "Optimism",
    chainName: "Optimism",
    symbol: "ETH",
    currency: "ETH",
    decimals: 18,
  },
  43114: {
    id: "avalanche",
    name: "Avalanche",
    chainName: "Avalanche",
    symbol: "AVAX",
    currency: "AVAX",
    decimals: 18,
  },
  8453: {
    id: "base",
    name: "Base",
    chainName: "Base",
    symbol: "ETH",
    currency: "ETH",
    decimals: 18,
  },
};

const MULTIPLIERS: Record<string, number> = {
  K: 1000,
  M: 1000000,
  B: 1000000000,
};

export const useAaveData = () => {
  const { evmAccount, evmNetwork, isEvmConnected } = useWalletConnection();

  const lastRefreshTime = useRef<number>(0);
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isManualRefresh = useRef<boolean>(false);

  const walletAddress = evmAccount?.address;
  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : undefined;

  const [suppliedAssets, setSuppliedAssets] = useState<SuppliedAsset[]>([]);
  const [borrowedAssets, setBorrowedAssets] = useState<BorrowedAsset[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([]);
  const [accountData, setAccountData] = useState<AccountData | null>(null);
  const [marketMetrics, setMarketMetrics] = useState<MarketMetrics | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const walletData = useMemo(
    () => ({
      address: walletAddress,
      chainId: currentChainId,
      isConnected: isEvmConnected,
    }),
    [walletAddress, currentChainId, isEvmConnected],
  );

  const chainData = useMemo((): ChainData => {
    const chain = CHAIN_CONFIG[currentChainId ?? 1] || CHAIN_CONFIG[1];
    return { ...chain, chainId: currentChainId ?? 1 };
  }, [currentChainId]);

  const parseNumber = (str: string): number => {
    if (!str || str === "0") return 0;
    const match = str.replace(/[$,\s]/g, "").match(/^([\d.]+)([KMB]?)$/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) {
      const multiplier = MULTIPLIERS[match[2].toUpperCase()];
      if (multiplier) num *= multiplier;
    }
    return num || 0;
  };

  const createToken = useCallback(
    (asset: {
      symbol: string;
      name: string;
      address: string;
      decimals: number;
    }): Token => ({
      id: `${asset.symbol.toLowerCase()}-${currentChainId}`,
      name: asset.name,
      ticker: asset.symbol,
      address: asset.address,
      decimals: asset.decimals,
      chainId: currentChainId ?? 1,
    }),
    [currentChainId],
  );

  const validation = useMemo((): Validation => {
    if (!isEvmConnected || !walletAddress || !currentChainId) {
      return { isValid: false, errorMessage: "Wallet not connected" };
    }
    if (!AaveMethods.isChainSupported(currentChainId)) {
      return {
        isValid: false,
        errorMessage: `Aave not supported on ${AaveMethods.getNetworkName(currentChainId)}`,
      };
    }
    return { isValid: true };
  }, [isEvmConnected, walletAddress, currentChainId]);

  const fetchData = useCallback(
    async (force = false): Promise<void> => {
      const now = Date.now();
      if (!force && now - lastRefreshTime.current < 2000) return;
      if (!validation.isValid) {
        setError(validation.errorMessage || "Invalid validation state");
        return;
      }

      setLoading(true);
      lastRefreshTime.current = now;

      try {
        const [position, usdPositions, metrics] = await Promise.all([
          AaveMethods.fetchCompleteUserPosition(
            walletAddress!,
            currentChainId!,
          ),
          AaveMethods.fetchUserPositionsWithUSD(
            walletAddress!,
            currentChainId!,
          ).catch(() => null as USDPositions | null),
          AaveMethods.getFormattedMarketMetrics(currentChainId!).then((m) => ({
            totalMarketSize: parseNumber(m.totalMarketSize),
            totalAvailable: parseNumber(m.totalAvailable),
            totalBorrows: parseNumber(m.totalBorrows),
            averageSupplyAPY: parseFloat(m.averageSupplyAPY) || 0,
            averageBorrowAPY: parseFloat(m.averageBorrowAPY) || 0,
          })),
        ]);

        console.log("Raw position data:", position.userPositions);
        console.log("USD positions data:", usdPositions);

        const supplied: SuppliedAsset[] = position.userPositions
          .filter((p: RawAsset) => Number(p.currentATokenBalance) > 0)
          .map((asset: RawAsset) => {
            const usd = usdPositions?.suppliedAssetsUSD.find(
              (u) => u.address.toLowerCase() === asset.address.toLowerCase(),
            );
            const userBalance = Number(asset.currentATokenBalance);
            const priceUSD = usd?.priceUSD || 0;

            console.log(`${asset.symbol} processing:`, {
              rawBalance: asset.currentATokenBalance,
              numberBalance: userBalance,
              priceUSD: priceUSD,
              balanceUSD: userBalance * priceUSD,
            });

            return {
              ...asset,
              currentATokenBalance: userBalance,
              balanceUSD: usd?.balanceUSD || userBalance * priceUSD,
              priceUSD: priceUSD,
              priceInUSD: priceUSD,
              formattedBalance: userBalance.toFixed(6),
              formattedBalanceUSD: (userBalance * priceUSD).toFixed(2),
              token: createToken(asset),
              chain: chainData,
              supplyAPY: asset.supplyAPY?.aaveMethod || "0.00",
              totalSupplied: asset.totalSupplied || "0",
              totalSupply: asset.totalSupplied || "0",
              canBeCollateral:
                asset.canBeCollateral !== undefined
                  ? asset.canBeCollateral
                  : true,
              usageAsCollateralEnabled: asset.usageAsCollateralEnabled || false,
            };
          });

        const borrowed: BorrowedAsset[] = position.userPositions
          .filter(
            (p: RawAsset) =>
              Number(p.currentStableDebt) > 0 ||
              Number(p.currentVariableDebt) > 0,
          )
          .map((asset: RawAsset) => {
            const usd = usdPositions?.borrowedAssetsUSD.find(
              (u) => u.address.toLowerCase() === asset.address.toLowerCase(),
            );
            return {
              ...asset,
              debtUSD: usd?.debtUSD || 0,
              priceUSD: usd?.priceUSD || 0,
              priceInUSD: usd?.priceUSD || 0,
              totalDebt:
                Number(asset.currentStableDebt) +
                Number(asset.currentVariableDebt),
              borrowAPY: asset.variableBorrowAPY?.aaveMethod || "0.00",
              variableBorrowAPY: asset.variableBorrowAPY?.aaveMethod || "0.00",
              stableBorrowAPY: asset.stableBorrowAPY?.aaveMethod || "0.00",
              variableBorrowRate: "0",
              stableBorrowRate: "0",
              token: createToken(asset),
              chain: chainData,
              supplyAPY: "0.00",
              canBeCollateral: true,
              totalSupplied: "0",
              totalSupply: "0",
            };
          });

        const available: AvailableAsset[] = [];
        for (const asset of position.availableAssets) {
          if (
            supplied.some((s) => s.address === asset.address) ||
            borrowed.some((b) => b.address === asset.address)
          )
            continue;

          try {
            const config = await AaveMethods.fetchReserveConfigurationData(
              asset.address,
              currentChainId!,
            );
            available.push({
              ...asset,
              supplyAPY: config.supplyAPY || "0.00",
              borrowAPY: AaveMethods.calculateAPY(
                config.variableBorrowRate || 0,
              ),
              canBeCollateral:
                config.canBeCollateral !== undefined
                  ? config.canBeCollateral
                  : true,
              canBeBorrowed: true,
              liquidityRate: config.liquidityRate?.toString() || "0",
              totalSupplied: config.totalSupplied || "0",
              totalSupply: config.totalSupplied || "0",
              totalSuppliedUSD: 0,
              priceUSD: 0,
              priceInUSD: 0,
              token: createToken(asset),
              chain: chainData,
            });
          } catch {
            available.push({
              ...asset,
              supplyAPY: "0.00",
              borrowAPY: "0.00",
              canBeCollateral: true,
              canBeBorrowed: false,
              liquidityRate: "0",
              totalSupplied: "0",
              totalSupply: "0",
              totalSuppliedUSD: 0,
              priceUSD: 0,
              priceInUSD: 0,
              token: createToken(asset),
              chain: chainData,
            });
          }
        }

        setAccountData({
          ...position.accountData,
          totalSuppliedUSD: usdPositions?.totalSuppliedUSD || 0,
          totalBorrowedUSD: usdPositions?.totalBorrowedUSD || 0,
          netWorthUSD: usdPositions?.netWorthUSD || 0,
        });
        setSuppliedAssets(supplied);
        setBorrowedAssets(borrowed);
        setAvailableAssets(available);
        setMarketMetrics(metrics);
        setLastUpdateTime(new Date());
        setError(null);
      } catch (err) {
        const errorMessage = AaveMethods.parseContractError(err);
        setError(errorMessage);
        if (isManualRefresh.current) {
          toast.error("Failed to fetch Aave data", {
            description: errorMessage,
          });
        }
      } finally {
        setLoading(false);
        isManualRefresh.current = false;
      }
    },
    [validation, walletAddress, currentChainId, chainData, createToken],
  );

  const refresh = useCallback(
    async (force = false): Promise<void> => {
      if (!force && Date.now() - lastRefreshTime.current < 2000) {
        toast.info("Please wait before refreshing");
        return;
      }
      isManualRefresh.current = true;
      await fetchData(true);
    },
    [fetchData],
  );

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (validation.isValid) fetchData(true);
    }, 1000);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [walletData, validation.isValid, fetchData]);

  useEffect(() => {
    if (!validation.isValid) return;
    if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    autoRefreshTimer.current = setInterval(() => fetchData(), 30000);
    return () => {
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    };
  }, [validation.isValid, fetchData]);

  useEffect(() => {
    return () => {
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  return {
    suppliedAssets,
    borrowedAssets,
    availableAssets,
    accountData,
    marketMetrics,
    loading,
    error,
    lastUpdateTime,
    refreshData: refresh,
    clearError: () => setError(null),
  };
};

interface FlexibleAccountData {
  totalCollateralBase?: string | number;
  totalDebtBase?: string | number;
  availableBorrowsBase?: string | number;
  currentLiquidationThreshold?: number;
  ltv?: number;
  healthFactor?: string | number;
  totalSuppliedUSD?: number;
  totalBorrowedUSD?: number;
  netWorthUSD?: number;
  [key: string]: unknown;
}

interface FlexibleSuppliedAsset {
  currentATokenBalance?: string | number;
  supplyAPY?:
    | string
    | number
    | {
        aaveMethod?: string | number;
        simple?: string | number;
        [key: string]: unknown;
      };
  symbol?: string;
  name?: string;
  address?: string;
  balanceUSD?: number;
  priceUSD?: number;
  [key: string]: unknown;
}

interface FlexibleBorrowedAsset {
  currentStableDebt?: string | number;
  currentVariableDebt?: string | number;
  borrowAPY?: string | number;
  symbol?: string;
  name?: string;
  address?: string;
  debtUSD?: number;
  totalDebt?: number;
  [key: string]: unknown;
}

interface FlexibleMarketMetrics {
  totalMarketSize?: number;
  totalAvailable?: number;
  totalBorrows?: number;
  averageSupplyAPY?: number;
  averageBorrowAPY?: number;
  [key: string]: unknown;
}

interface TransformedAaveData {
  accountData?: FlexibleAccountData | null;
  marketMetrics?: FlexibleMarketMetrics | null;
  suppliedAssets?: FlexibleSuppliedAsset[];
  borrowedAssets?: FlexibleBorrowedAsset[];
  loading?: boolean;
  error?: string | null;
}

export const useTransformedAaveData = (): TransformedAaveData => {
  const aaveData = useAaveData();

  return useMemo(() => {
    // Transform accountData
    const accountData = aaveData.accountData
      ? {
          totalCollateralBase: String(
            aaveData.accountData.totalCollateralBase || "0",
          ),
          totalDebtBase: String(aaveData.accountData.totalDebtBase || "0"),
          availableBorrowsBase: String(
            aaveData.accountData.availableBorrowsBase || "0",
          ),
          currentLiquidationThreshold: Number(
            aaveData.accountData.currentLiquidationThreshold || 0,
          ),
          ltv: Number(aaveData.accountData.ltv || 0),
          healthFactor: String(aaveData.accountData.healthFactor || "0"),
          totalSuppliedUSD: Number(aaveData.accountData.totalSuppliedUSD || 0),
          totalBorrowedUSD: Number(aaveData.accountData.totalBorrowedUSD || 0),
          netWorthUSD: Number(aaveData.accountData.netWorthUSD || 0),
        }
      : null;

    // Transform marketMetrics
    const marketMetrics = aaveData.marketMetrics
      ? {
          totalMarketSize: Number(aaveData.marketMetrics.totalMarketSize || 0),
          totalAvailable: Number(aaveData.marketMetrics.totalAvailable || 0),
          totalBorrows: Number(aaveData.marketMetrics.totalBorrows || 0),
          averageSupplyAPY: Number(
            aaveData.marketMetrics.averageSupplyAPY || 0,
          ),
          averageBorrowAPY: Number(
            aaveData.marketMetrics.averageBorrowAPY || 0,
          ),
        }
      : null;

    // Transform suppliedAssets
    const suppliedAssets = (aaveData.suppliedAssets || []).map((asset) => ({
      currentATokenBalance: Number(asset.currentATokenBalance || 0),
      supplyAPY: asset.supplyAPY || "0",
      symbol: String(asset.symbol || ""),
      name: String(asset.name || ""),
      address: String(asset.address || ""),
      balanceUSD: Number(asset.balanceUSD || 0),
      priceUSD: Number(asset.priceUSD || 0),
    }));

    // Transform borrowedAssets
    const borrowedAssets = (aaveData.borrowedAssets || []).map((asset) => ({
      currentStableDebt: String(asset.currentStableDebt || "0"),
      currentVariableDebt: String(asset.currentVariableDebt || "0"),
      borrowAPY: String(asset.borrowAPY || "0"),
      symbol: String(asset.symbol || ""),
      name: String(asset.name || ""),
      address: String(asset.address || ""),
      debtUSD: Number(asset.debtUSD || 0),
      totalDebt: Number(asset.totalDebt || 0),
    }));

    return {
      accountData,
      marketMetrics,
      suppliedAssets,
      borrowedAssets,
      loading: aaveData.loading || false,
      error: aaveData.error || null,
    };
  }, [aaveData]);
};
