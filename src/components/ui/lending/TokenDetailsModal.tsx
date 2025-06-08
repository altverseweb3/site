"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { TokenImage } from "@/components/ui/TokenImage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useWalletConnection } from "@/utils/walletMethods";
import { getTokenByAddress } from "@/utils/tokenMethods";
import { AaveDataProvider, SupportedChainId } from "@/utils/aave";
import { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import {
  Info,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface TokenDetailsModalProps {
  children: React.ReactNode;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals?: number;
}

interface DetailedReserveData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;

  reserveSize: string;
  availableLiquidity: string;
  utilizationRate: number;
  oraclePrice: number;

  totalSupplied: string;
  totalSuppliedUSD: string;
  supplyAPY: number;

  totalBorrowed: string;
  totalBorrowedUSD: string;
  variableBorrowAPY: number;
  stableBorrowAPY: number;

  canBeCollateral: boolean;
  maxLTV: number;
  liquidationThreshold: number;
  liquidationPenalty: number;

  optimalUtilizationRate: number;
  baseVariableBorrowRate: number;
  variableRateSlope1: number;
  variableRateSlope2: number;

  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;

  eModeCategoryId: number;
  eModeCategory?: EModeCategory;
}

interface EModeCategory {
  id: number;
  ltv: number;
  liquidationThreshold: number;
  liquidationBonus: number;
  priceSource: string;
  label: string;
  assets: string[];
}

export const TokenDetailsModal: React.FC<TokenDetailsModalProps> = ({
  children,
  tokenAddress,
  tokenSymbol,
  tokenName,
  decimals = 18,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reserveData, setReserveData] = useState<DetailedReserveData | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [fetchedToken, setFetchedToken] = useState<Token | null>(null);

  const { evmNetwork } = useWalletConnection();

  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : 1;

  // Fetch token data for proper display
  useEffect(() => {
    const fetchTokenData = async () => {
      if (!tokenAddress || !currentChainId) return;

      try {
        const token = await getTokenByAddress(tokenAddress, currentChainId);
        if (token) {
          setFetchedToken(token);
        } else {
          setFetchedToken({
            id: `fallback-${currentChainId}-${tokenAddress}`,
            name: tokenName,
            ticker: tokenSymbol,
            icon: tokenSymbol.toLowerCase() + ".png",
            address: tokenAddress,
            decimals: decimals,
            chainId: currentChainId,
            native:
              tokenSymbol === "ETH" ||
              tokenSymbol === "MATIC" ||
              tokenSymbol === "AVAX" ||
              tokenSymbol === "BNB",
          });
        }
      } catch {
        setFetchedToken({
          id: `error-${currentChainId}-${tokenAddress}`,
          name: tokenName,
          ticker: tokenSymbol,
          icon: tokenSymbol.toLowerCase() + ".png",
          address: tokenAddress,
          decimals: decimals,
          chainId: currentChainId,
          native:
            tokenSymbol === "ETH" ||
            tokenSymbol === "MATIC" ||
            tokenSymbol === "AVAX" ||
            tokenSymbol === "BNB",
        });
      }
    };

    fetchTokenData();
  }, [tokenAddress, currentChainId, tokenName, tokenSymbol, decimals]);

  const fetchReserveData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use AaveDataProvider to get reserve data
      const reserves = await AaveDataProvider.getAvailableReserves(
        currentChainId as SupportedChainId,
      );
      const data = reserves.find(
        (reserve) =>
          reserve.address.toLowerCase() === tokenAddress.toLowerCase(),
      );
      if (data) {
        // Map ReserveData to DetailedReserveData format
        const detailedData: DetailedReserveData = {
          symbol: data.symbol,
          name: data.name,
          address: data.address,
          decimals: data.decimals,
          reserveSize: data.totalSupplied, // Add missing property
          availableLiquidity: data.availableLiquidity, // Add missing property
          utilizationRate: data.utilizationRate, // Add missing property
          oraclePrice: data.oraclePrice, // Add missing property
          totalSupplied: data.totalSupplied,
          totalSuppliedUSD: data.totalSuppliedUSD,
          supplyAPY: data.supplyAPY,
          totalBorrowed: (
            parseFloat(data.totalSupplied) - parseFloat(data.availableLiquidity)
          ).toFixed(2),
          totalBorrowedUSD: (
            (parseFloat(data.totalSupplied) -
              parseFloat(data.availableLiquidity)) *
            data.oraclePrice
          ).toFixed(2),
          variableBorrowAPY: data.variableBorrowAPY,
          stableBorrowAPY: data.stableBorrowAPY,
          canBeCollateral: data.canBeCollateral,
          maxLTV: data.maxLTV,
          liquidationThreshold: data.liquidationThreshold,
          liquidationPenalty: data.liquidationPenalty,
          optimalUtilizationRate: data.utilizationRate || 80, // Use real data or default
          baseVariableBorrowRate: 0, // Default value
          variableRateSlope1: 4, // Default value
          variableRateSlope2: 60, // Default value
          isActive: data.isActive,
          isFrozen: data.isFrozen,
          borrowingEnabled: data.borrowingEnabled,
          stableBorrowRateEnabled: data.stableBorrowRateEnabled,
          eModeCategoryId: 0, // Default value
        };

        setReserveData(detailedData);
      } else {
        throw new Error("No reserve data found");
      }
    } catch {
      setError("Failed to load token details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, currentChainId]);

  // Fetch detailed reserve data when modal opens
  useEffect(() => {
    if (isOpen && !reserveData && !isLoading) {
      fetchReserveData();
    }
  }, [isOpen, reserveData, isLoading, fetchReserveData]);

  const createTokenObject = (): Token => {
    return {
      id: fetchedToken?.id || `${currentChainId}-${tokenAddress}`,
      name: fetchedToken?.name || tokenName,
      ticker: fetchedToken?.ticker || tokenSymbol,
      address: tokenAddress,
      decimals: fetchedToken?.decimals || decimals,
      icon: (fetchedToken?.ticker || tokenSymbol).toLowerCase() + ".png",
      native:
        (fetchedToken?.ticker || tokenSymbol) === "ETH" ||
        (fetchedToken?.ticker || tokenSymbol) === "MATIC" ||
        (fetchedToken?.ticker || tokenSymbol) === "AVAX" ||
        (fetchedToken?.ticker || tokenSymbol) === "BNB",
      chainId: currentChainId,
    };
  };

  const createChainObject = (): Chain => {
    return getChainByChainId(currentChainId);
  };

  const token: Token = createTokenObject();
  const chain: Chain = createChainObject();

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getUtilizationColor = (rate: number): string => {
    if (rate < 50) return "text-green-400";
    if (rate < 80) return "text-yellow-400";
    return "text-red-400";
  };

  // Helper function to parse formatted numbers (e.g., "43.44M" -> 43440000)
  const parseFormattedNumber = (str: string): number => {
    if (!str || str === "0") return 0;

    const cleanStr = str.replace(/[$,\s]/g, "");
    const match = cleanStr.match(/^([\d.]+)([KMB]?)$/i);
    if (!match) return 0;

    let num = parseFloat(match[1]);
    if (match[2]) {
      const multipliers = { K: 1000, M: 1000000, B: 1000000000 };
      const multiplier =
        multipliers[match[2].toUpperCase() as keyof typeof multipliers];
      if (multiplier) num *= multiplier;
    }

    return num || 0;
  };

  // Helper function to format USD amounts
  const formatUSDAmount = (amount: number): string => {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderLoadingState = () => (
    <div className="space-y-4">
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center py-8">
      <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <p className="text-red-400 mb-4">{error}</p>
      <button
        onClick={fetchReserveData}
        className="px-4 py-2 bg-amber-500 text-black rounded hover:bg-amber-400"
      >
        Retry
      </button>
    </div>
  );

  const renderContent = () => {
    if (isLoading) return renderLoadingState();
    if (error) return renderErrorState();
    if (!reserveData) return null;

    return (
      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Header with token info */}
        <div className="flex items-center space-x-4 p-4 bg-[#1a1a1a] rounded-lg">
          <TokenImage token={token} chain={chain} size="lg" />
          <div>
            <h3 className="text-xl font-semibold text-white">
              {reserveData.name}
            </h3>
            <p className="text-gray-400">{reserveData.symbol}</p>
            <p className="text-lg font-medium text-amber-500">
              ${reserveData.oraclePrice.toFixed(4)}
            </p>
          </div>
        </div>

        {/* Reserve Overview */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Reserve Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Market Size</p>
                <p className="text-white font-medium">
                  {reserveData.reserveSize}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Available Liquidity</p>
                <p className="text-white font-medium">
                  {reserveData.availableLiquidity}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Utilization Rate</p>
                <p
                  className={`font-medium ${getUtilizationColor(reserveData.utilizationRate)}`}
                >
                  {formatPercentage(reserveData.utilizationRate)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Oracle Price</p>
                <p className="text-white font-medium">
                  ${reserveData.oraclePrice.toFixed(4)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supply Information */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
              Supply Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Supplied</p>
                <p className="text-white font-medium">
                  {reserveData.totalSupplied}
                </p>
                <p className="text-gray-500 text-xs">
                  {reserveData.totalSuppliedUSD}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Supply APY</p>
                <p className="text-green-400 font-medium">
                  {formatPercentage(reserveData.supplyAPY)}
                </p>
              </div>
            </div>
            <div className="border-t border-gray-600 pt-3">
              <p className="text-gray-400 text-sm mb-2">
                Maximum Available to Supply
              </p>
              <p className="text-white font-medium">
                {reserveData.availableLiquidity} {reserveData.symbol}
              </p>
              <p className="text-gray-500 text-xs">
                {formatUSDAmount(
                  parseFormattedNumber(reserveData.availableLiquidity) *
                    reserveData.oraclePrice,
                )}
              </p>
              <p className="text-amber-400 text-xs mt-1">
                {(
                  (parseFormattedNumber(reserveData.availableLiquidity) /
                    parseFormattedNumber(reserveData.totalSupplied)) *
                  100
                ).toFixed(1)}
                % of total supplied
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Borrow Information */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-red-400" />
              Borrow Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Total Borrowed</p>
                <p className="text-white font-medium">
                  {reserveData.totalBorrowed}
                </p>
                <p className="text-gray-500 text-xs">
                  {reserveData.totalBorrowedUSD}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Variable Borrow APY</p>
                <p className="text-red-400 font-medium">
                  {formatPercentage(reserveData.variableBorrowAPY)}
                </p>
              </div>
            </div>
            {reserveData.stableBorrowRateEnabled && (
              <div>
                <p className="text-gray-400 text-sm">Stable Borrow APY</p>
                <p className="text-orange-400 font-medium">
                  {formatPercentage(reserveData.stableBorrowAPY)}
                </p>
              </div>
            )}
            <div className="border-t border-gray-600 pt-3">
              <p className="text-gray-400 text-sm mb-2">
                Maximum Available to Borrow
              </p>
              <p className="text-white font-medium">
                {reserveData.availableLiquidity} {reserveData.symbol}
              </p>
              <p className="text-gray-500 text-xs">
                {formatUSDAmount(
                  parseFormattedNumber(reserveData.availableLiquidity) *
                    reserveData.oraclePrice,
                )}
              </p>
              <p className="text-amber-400 text-xs mt-1">
                {(
                  (parseFormattedNumber(reserveData.availableLiquidity) /
                    parseFormattedNumber(reserveData.totalSupplied)) *
                  100
                ).toFixed(1)}
                % of total supplied
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${reserveData.borrowingEnabled ? "bg-green-400" : "bg-red-400"}`}
                ></div>
                <span className="text-gray-400">
                  Borrowing{" "}
                  {reserveData.borrowingEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collateral Information */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-400" />
              Collateral Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-4 mb-4">
              <div
                className={`w-3 h-3 rounded-full ${reserveData.canBeCollateral ? "bg-green-400" : "bg-red-400"}`}
              ></div>
              <span className="text-white">
                {reserveData.canBeCollateral
                  ? "Can be used as collateral"
                  : "Cannot be used as collateral"}
              </span>
            </div>

            {reserveData.canBeCollateral && (
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Max LTV</p>
                    <p className="text-white font-medium">
                      {formatPercentage(reserveData.maxLTV)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">
                      Liquidation Threshold
                    </p>
                    <p className="text-orange-400 font-medium">
                      {formatPercentage(reserveData.liquidationThreshold)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Liquidation Penalty</p>
                    <p className="text-red-400 font-medium">
                      {formatPercentage(reserveData.liquidationPenalty)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interest Rate Model */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Interest Rate Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Optimal Utilization</p>
                <p className="text-white font-medium">
                  {formatPercentage(reserveData.optimalUtilizationRate)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Base Variable Rate</p>
                <p className="text-white font-medium">
                  {formatPercentage(reserveData.baseVariableBorrowRate)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Variable Slope 1</p>
                <p className="text-white font-medium">
                  {formatPercentage(reserveData.variableRateSlope1)}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Variable Slope 2</p>
                <p className="text-white font-medium">
                  {formatPercentage(reserveData.variableRateSlope2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Asset Status */}
        <Card className="bg-[#1a1a1a] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Asset Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${reserveData.isActive ? "bg-green-400" : "bg-red-400"}`}
                ></div>
                <span className="text-gray-400">
                  {reserveData.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${!reserveData.isFrozen ? "bg-green-400" : "bg-red-400"}`}
                ></div>
                <span className="text-gray-400">
                  {reserveData.isFrozen ? "Frozen" : "Not Frozen"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* E-Mode Information */}
        {reserveData.eModeCategoryId > 0 && (
          <Card className="bg-[#1a1a1a] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-400" />
                E-Mode Information (Efficiency Mode)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
                  <span className="text-purple-300 font-medium">
                    {reserveData.eModeCategory?.label ||
                      `Category ${reserveData.eModeCategoryId}`}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  This asset is part of E-Mode category{" "}
                  {reserveData.eModeCategoryId}, enabling higher capital
                  efficiency when borrowing correlated assets.
                </p>
              </div>

              {reserveData.eModeCategory && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">E-Mode Max LTV</p>
                      <p className="text-purple-400 font-medium">
                        {formatPercentage(reserveData.eModeCategory.ltv)}
                      </p>
                      <p className="text-xs text-gray-500">
                        vs {formatPercentage(reserveData.maxLTV)} normal
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">
                        E-Mode Liquidation Threshold
                      </p>
                      <p className="text-purple-400 font-medium">
                        {formatPercentage(
                          reserveData.eModeCategory.liquidationThreshold,
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        vs {formatPercentage(reserveData.liquidationThreshold)}{" "}
                        normal
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">
                        E-Mode Liquidation Penalty
                      </p>
                      <p className="text-purple-400 font-medium">
                        {formatPercentage(
                          reserveData.eModeCategory.liquidationBonus,
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        vs {formatPercentage(reserveData.liquidationPenalty)}{" "}
                        normal
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-600 pt-3">
                    <p className="text-gray-400 text-sm mb-2">
                      Benefits of E-Mode
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                        Higher LTV: Borrow up to{" "}
                        {formatPercentage(reserveData.eModeCategory.ltv)}{" "}
                        instead of {formatPercentage(reserveData.maxLTV)}
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
                        Higher Liquidation Threshold:{" "}
                        {formatPercentage(
                          reserveData.eModeCategory.liquidationThreshold,
                        )}{" "}
                        vs {formatPercentage(reserveData.liquidationThreshold)}
                      </li>
                      <li className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-400 mr-2"></div>
                        Only works with correlated assets in the same E-Mode
                        category
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {!reserveData.eModeCategory && (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">
                    E-Mode category data not available
                  </p>
                  <p className="text-xs text-gray-500">
                    Category ID: {reserveData.eModeCategoryId}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-[#0a0a0a] border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Token Details - {tokenSymbol}
          </DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};
