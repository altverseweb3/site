// hooks/useAaveData.ts
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { AaveMethods } from "@/utils/aaveMethods";
import { useWalletConnection } from "@/utils/walletMethods";
import { toast } from "sonner";
import { Token, Chain } from "@/types/web3";

interface SuppliedAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  liquidityRate: unknown;
  liquidityRateFormatted: string;
  usageAsCollateralEnabled: boolean;
  supplyAPY?: { simple: string; compounded: string; aaveMethod: string } | null;
  balanceUSD?: number;
  priceUSD?: number;
  token: Token;
  chain: Chain;
}

interface BorrowedAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  currentStableDebt: string;
  currentVariableDebt: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
  borrowAPY?: string;
  debtUSD?: number;
  priceUSD?: number;
  token: Token;
  chain: Chain;
}

interface AvailableAsset {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  supplyAPY?: string;
  borrowAPY?: string;
  canBeCollateral?: boolean;
  canBeBorrowed?: boolean;
  liquidityRate?: string;
  priceUSD?: number;
  token: Token;
  chain: Chain;
}

interface AccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
  usedProvider?: string;
  totalSuppliedUSD?: number;
  totalBorrowedUSD?: number;
  netWorthUSD?: number;
}

interface MarketMetrics {
  totalMarketSize: number;
  totalAvailable: number;
  totalBorrows: number;
  averageSupplyAPY: number;
  averageBorrowAPY: number;
}

interface AaveDataState {
  suppliedAssets: SuppliedAsset[];
  borrowedAssets: BorrowedAsset[];
  availableAssets: AvailableAsset[];
  accountData: AccountData | null;
  marketMetrics: MarketMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdateTime: Date | null;
  refreshData: (force?: boolean) => Promise<void>;
  clearError: () => void;
}

const REFRESH_CONFIG = {
  AUTO_REFRESH_INTERVAL: 30000,
  MIN_MANUAL_REFRESH_INTERVAL: 2000,
  DEBOUNCE_DELAY: 1000,
};

export const useAaveData = (): AaveDataState => {
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
  const [loading, setLoading] = useState(false);
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

  const chainData = useMemo(() => {
    const chains: Record<number, Partial<Chain>> = {
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
    const chain = chains[currentChainId!] || chains[1];
    return { ...chain, chainId: currentChainId! } as Chain;
  }, [currentChainId]);

  const createTokenFromAsset = useCallback(
    (asset: {
      symbol: string;
      name: string;
      address: string;
      decimals: number;
    }): Token =>
      ({
        id: `${asset.symbol.toLowerCase()}-${currentChainId}`,
        name: asset.name,
        ticker: asset.symbol,
        icon: "unknown.png",
        address: asset.address,
        decimals: asset.decimals,
        chainId: currentChainId!,
        native: asset.symbol.toUpperCase() === "ETH" && currentChainId === 1,
      }) as Token,
    [currentChainId],
  );

  const validation = useMemo(() => {
    if (!isEvmConnected)
      return { isValid: false, errorMessage: "Please connect your EVM wallet" };
    if (!walletAddress)
      return { isValid: false, errorMessage: "No wallet address found" };
    if (!currentChainId)
      return { isValid: false, errorMessage: "Unable to detect network" };
    if (!AaveMethods.isChainSupported(currentChainId)) {
      return {
        isValid: false,
        errorMessage: `Aave V3 not supported on ${AaveMethods.getNetworkName(currentChainId)}`,
      };
    }
    return { isValid: true };
  }, [isEvmConnected, walletAddress, currentChainId]);

  const fetchMarketMetrics = useCallback(
    async (chainId: number): Promise<MarketMetrics> => {
      const formattedMetrics =
        await AaveMethods.getFormattedMarketMetricsUSD(chainId);

      const parseNumber = (str: string): number => {
        if (!str || str === "0") return 0;
        const cleaned = str.replace(/[$,\s]/g, "");
        const match = cleaned.match(/^([\d.]+)([KMB]?)$/i);
        if (!match) return 0;
        let num = parseFloat(match[1]);
        if (isNaN(num)) return 0;
        switch (match[2].toUpperCase()) {
          case "K":
            num *= 1000;
            break;
          case "M":
            num *= 1000000;
            break;
          case "B":
            num *= 1000000000;
            break;
        }
        return num;
      };

      return {
        totalMarketSize: parseNumber(formattedMetrics.totalMarketSize),
        totalAvailable: parseNumber(formattedMetrics.totalAvailable),
        totalBorrows: parseNumber(formattedMetrics.totalBorrows),
        averageSupplyAPY: parseFloat(formattedMetrics.averageSupplyAPY) || 0,
        averageBorrowAPY: parseFloat(formattedMetrics.averageBorrowAPY) || 0,
      };
    },
    [],
  );

  const fetchAaveData = useCallback(
    async (forceRefresh = false) => {
      const now = Date.now();
      if (
        !forceRefresh &&
        now - lastRefreshTime.current <
          REFRESH_CONFIG.MIN_MANUAL_REFRESH_INTERVAL
      )
        return;
      if (!validation.isValid) {
        setError(validation.errorMessage || "Validation failed");
        return;
      }

      setLoading(true);
      lastRefreshTime.current = now;

      try {
        const completePosition = await AaveMethods.fetchCompleteUserPosition(
          walletAddress!,
          currentChainId!,
        );

        let userPositionsUSD = null;
        try {
          userPositionsUSD = await AaveMethods.fetchUserPositionsWithUSD(
            walletAddress!,
            currentChainId!,
          );
        } catch (error) {
          console.warn("Failed to fetch USD positions:", error);
        }

        const supplied = completePosition.userPositions
          .filter((position) => Number(position.currentATokenBalance) > 0)
          .map((asset) => {
            const usdData = userPositionsUSD?.suppliedAssetsUSD.find(
              (usd) =>
                usd.address.toLowerCase() === asset.address.toLowerCase(),
            );
            return {
              ...asset,
              balanceUSD: usdData?.balanceUSD || 0,
              priceUSD: usdData?.priceUSD || 0,
              token: createTokenFromAsset(asset),
              chain: chainData,
            };
          });

        const borrowed = completePosition.userPositions
          .filter(
            (position) =>
              Number(position.currentStableDebt) > 0 ||
              Number(position.currentVariableDebt) > 0,
          )
          .map((asset) => {
            const usdData = userPositionsUSD?.borrowedAssetsUSD.find(
              (usd) =>
                usd.address.toLowerCase() === asset.address.toLowerCase(),
            );
            return {
              ...asset,
              debtUSD: usdData?.debtUSD || 0,
              priceUSD: usdData?.priceUSD || 0,
              borrowAPY: "0.00",
              variableBorrowRate: "0.00",
              stableBorrowRate: "0.00",
              token: createTokenFromAsset(asset),
              chain: chainData,
            };
          });

        const availableAssetsWithData = [];
        for (const asset of completePosition.availableAssets) {
          const isInUse =
            supplied.some((s) => s.address === asset.address) ||
            borrowed.some((b) => b.address === asset.address);
          if (isInUse || (asset.symbol === "GHO" && currentChainId === 1))
            continue;

          try {
            const configData = await AaveMethods.fetchReserveConfigurationData(
              asset.address,
              currentChainId!,
            );
            availableAssetsWithData.push({
              ...asset,
              supplyAPY: configData.supplyAPY,
              borrowAPY: "0.00",
              canBeCollateral: configData.canBeCollateral,
              canBeBorrowed: true,
              liquidityRate: configData.liquidityRate.toString(),
              priceUSD: 0,
              token: createTokenFromAsset(asset),
              chain: chainData,
            });
          } catch {
            availableAssetsWithData.push({
              ...asset,
              supplyAPY: "0.00",
              borrowAPY: "0.00",
              canBeCollateral: false,
              canBeBorrowed: false,
              liquidityRate: "0",
              priceUSD: 0,
              token: createTokenFromAsset(asset),
              chain: chainData,
            });
          }
        }

        const metrics = await fetchMarketMetrics(currentChainId!);

        const enhancedAccountData = {
          ...completePosition.accountData,
          totalSuppliedUSD: userPositionsUSD?.totalSuppliedUSD || 0,
          totalBorrowedUSD: userPositionsUSD?.totalBorrowedUSD || 0,
          netWorthUSD: userPositionsUSD?.netWorthUSD || 0,
        };

        setAccountData(enhancedAccountData);
        setSuppliedAssets(supplied);
        setBorrowedAssets(borrowed);
        setAvailableAssets(availableAssetsWithData);
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
    [
      validation,
      walletAddress,
      currentChainId,
      chainData,
      createTokenFromAsset,
      fetchMarketMetrics,
    ],
  );

  const handleManualRefresh = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (
        !force &&
        now - lastRefreshTime.current <
          REFRESH_CONFIG.MIN_MANUAL_REFRESH_INTERVAL
      ) {
        toast.info("Please wait before refreshing again");
        return;
      }
      isManualRefresh.current = true;
      await fetchAaveData(true);
    },
    [fetchAaveData],
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (validation.isValid) fetchAaveData(true);
    }, REFRESH_CONFIG.DEBOUNCE_DELAY);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [walletData, validation.isValid, fetchAaveData]);

  useEffect(() => {
    if (!validation.isValid) return;
    if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    autoRefreshTimer.current = setInterval(
      () => fetchAaveData(),
      REFRESH_CONFIG.AUTO_REFRESH_INTERVAL,
    );
    return () => {
      if (autoRefreshTimer.current) clearInterval(autoRefreshTimer.current);
    };
  }, [validation.isValid, fetchAaveData]);

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
    refreshData: handleManualRefresh,
    clearError,
  };
};
