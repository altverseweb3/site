"use client";

import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { getHealthFactorColor, getLTVColor } from "@/utils/aave/utils";
import { cn } from "@/lib/utils";

interface HealthFactorIndicatorProps {
  // Current position data
  currentHealthFactor: number;
  currentTotalCollateralUSD: number;
  currentTotalDebtUSD: number;

  // Transaction details
  transactionAmountUSD?: number;
  transactionType?: "supply" | "withdraw" | "borrow" | "repay";
  assetLiquidationThreshold?: number; // For the specific asset being transacted
  isCollateralAsset?: boolean; // Whether the asset affects collateral calculations

  // Display options
  showLTV?: boolean;
  showMaxBorrow?: boolean;
  compact?: boolean;
}

// Calculate LTV (Loan to Value ratio)
const calculateLTV = (
  totalDebtUSD: number,
  totalCollateralUSD: number,
): number => {
  if (totalCollateralUSD === 0) return 0;
  return (totalDebtUSD / totalCollateralUSD) * 100;
};

// Calculate new position after transaction
const calculateNewPosition = (
  currentCollateralUSD: number,
  currentDebtUSD: number,
  transactionAmountUSD: number,
  transactionType: string,
  liquidationThreshold: number,
  isCollateralAsset: boolean,
) => {
  let newCollateralUSD = currentCollateralUSD;
  let newDebtUSD = currentDebtUSD;

  switch (transactionType) {
    case "supply":
      if (isCollateralAsset) {
        newCollateralUSD += transactionAmountUSD;
      }
      break;
    case "withdraw":
      if (isCollateralAsset) {
        newCollateralUSD = Math.max(0, newCollateralUSD - transactionAmountUSD);
      }
      break;
    case "borrow":
      newDebtUSD += transactionAmountUSD;
      break;
    case "repay":
      newDebtUSD = Math.max(0, newDebtUSD - transactionAmountUSD);
      break;
  }

  // Calculate new health factor
  const newHealthFactor =
    newDebtUSD === 0
      ? 999
      : (newCollateralUSD * liquidationThreshold) / newDebtUSD;

  // Calculate new LTV
  const newLTV = calculateLTV(newDebtUSD, newCollateralUSD);

  return {
    newHealthFactor,
    newLTV,
    newCollateralUSD,
    newDebtUSD,
  };
};

// Calculate maximum borrowable amount based on health factor
const calculateMaxBorrowUSD = (
  currentCollateralUSD: number,
  currentDebtUSD: number,
  liquidationThreshold: number,
  targetHealthFactor: number = 1.5, // Conservative target
): number => {
  if (currentCollateralUSD === 0) return 0;

  // Max debt = (collateral * LT) / target_hf
  const maxDebtUSD =
    (currentCollateralUSD * liquidationThreshold) / targetHealthFactor;
  const maxBorrowUSD = Math.max(0, maxDebtUSD - currentDebtUSD);

  return maxBorrowUSD;
};

export const HealthFactorIndicator: React.FC<HealthFactorIndicatorProps> = ({
  currentHealthFactor,
  currentTotalCollateralUSD,
  currentTotalDebtUSD,
  transactionAmountUSD = 0,
  transactionType,
  assetLiquidationThreshold = 0.85,
  isCollateralAsset = true,
  showLTV = true,
  showMaxBorrow = false,
  compact = false,
}) => {
  // Calculate current LTV
  const currentLTV = calculateLTV(
    currentTotalDebtUSD,
    currentTotalCollateralUSD,
  );

  // Calculate new position if there's a transaction
  const hasTransaction = transactionAmountUSD > 0 && transactionType;
  const newPosition = hasTransaction
    ? calculateNewPosition(
        currentTotalCollateralUSD,
        currentTotalDebtUSD,
        transactionAmountUSD,
        transactionType!,
        assetLiquidationThreshold,
        isCollateralAsset,
      )
    : null;

  // Calculate max borrowable amount
  const maxBorrowUSD = showMaxBorrow
    ? calculateMaxBorrowUSD(
        currentTotalCollateralUSD,
        currentTotalDebtUSD,
        assetLiquidationThreshold,
      )
    : 0;

  // Determine risk level
  const isHighRisk =
    newPosition?.newHealthFactor && newPosition.newHealthFactor < 1.2;
  const isLiquidationRisk =
    newPosition?.newHealthFactor && newPosition.newHealthFactor < 1.1;

  // Health factor changes
  const healthFactorChange = newPosition
    ? newPosition.newHealthFactor - currentHealthFactor
    : 0;
  const ltvChange = newPosition ? newPosition.newLTV - currentLTV : 0;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg border border-[#232326]">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-[#A1A1AA]">Health Factor</div>
            <div
              className={cn(
                "text-sm font-medium",
                getHealthFactorColor(currentHealthFactor),
              )}
            >
              {currentHealthFactor.toFixed(2)}
            </div>
          </div>

          {showLTV && (
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA]">LTV</div>
              <div
                className={cn(
                  "text-sm font-medium",
                  getLTVColor(currentLTV, 85) === "green"
                    ? "text-green-500"
                    : getLTVColor(currentLTV, 85) === "yellow"
                      ? "text-yellow-500"
                      : getLTVColor(currentLTV, 85) === "amber"
                        ? "text-orange-500"
                        : "text-red-500",
                )}
              >
                {currentLTV.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {hasTransaction && newPosition && (
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-[#A1A1AA]" />
            <div className="text-center">
              <div
                className={cn(
                  "text-sm font-medium",
                  getHealthFactorColor(newPosition.newHealthFactor),
                )}
              >
                {newPosition.newHealthFactor.toFixed(2)}
              </div>
              {showLTV && (
                <div
                  className={cn(
                    "text-xs",
                    getLTVColor(newPosition.newLTV, 85) === "green"
                      ? "text-green-500"
                      : getLTVColor(newPosition.newLTV, 85) === "yellow"
                        ? "text-yellow-500"
                        : getLTVColor(newPosition.newLTV, 85) === "amber"
                          ? "text-orange-500"
                          : "text-red-500",
                  )}
                >
                  {newPosition.newLTV.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        )}

        {isLiquidationRisk && (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-[#1A1A1A] rounded-lg border border-[#232326]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[#FAFAFA]">Position Health</h3>
        {isLiquidationRisk && (
          <div className="flex items-center gap-1 text-red-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs">High Risk</span>
          </div>
        )}
      </div>

      {/* Current Position */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-[#A1A1AA] mb-1">Health Factor</div>
          <div
            className={cn(
              "text-lg font-semibold",
              getHealthFactorColor(currentHealthFactor),
            )}
          >
            {currentHealthFactor === 999 ? "∞" : currentHealthFactor.toFixed(2)}
          </div>
          {hasTransaction && healthFactorChange !== 0 && (
            <div className="flex items-center gap-1 mt-1">
              {healthFactorChange > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs",
                  healthFactorChange > 0 ? "text-green-500" : "text-red-500",
                )}
              >
                {healthFactorChange > 0 ? "+" : ""}
                {healthFactorChange.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {showLTV && (
          <div>
            <div className="text-xs text-[#A1A1AA] mb-1">Loan-to-Value</div>
            <div
              className={cn(
                "text-lg font-semibold",
                getLTVColor(currentLTV, 85) === "green"
                  ? "text-green-500"
                  : getLTVColor(currentLTV, 85) === "yellow"
                    ? "text-yellow-500"
                    : getLTVColor(currentLTV, 85) === "amber"
                      ? "text-orange-500"
                      : "text-red-500",
              )}
            >
              {currentLTV.toFixed(1)}%
            </div>
            {hasTransaction && ltvChange !== 0 && (
              <div className="flex items-center gap-1 mt-1">
                {ltvChange > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                )}
                <span
                  className={cn(
                    "text-xs",
                    ltvChange > 0 ? "text-red-500" : "text-green-500",
                  )}
                >
                  {ltvChange > 0 ? "+" : ""}
                  {ltvChange.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Impact */}
      {hasTransaction && newPosition && (
        <div className="pt-3 border-t border-[#232326]">
          <div className="text-xs text-[#A1A1AA] mb-2">After Transaction</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-[#71717A]">New Health Factor</div>
              <div
                className={cn(
                  "text-sm font-medium",
                  getHealthFactorColor(newPosition.newHealthFactor),
                )}
              >
                {newPosition.newHealthFactor === 999
                  ? "∞"
                  : newPosition.newHealthFactor.toFixed(2)}
              </div>
            </div>

            {showLTV && (
              <div>
                <div className="text-xs text-[#71717A]">New LTV</div>
                <div
                  className={cn(
                    "text-sm font-medium",
                    getLTVColor(newPosition.newLTV, 85) === "green"
                      ? "text-green-500"
                      : getLTVColor(newPosition.newLTV, 85) === "yellow"
                        ? "text-yellow-500"
                        : getLTVColor(newPosition.newLTV, 85) === "amber"
                          ? "text-orange-500"
                          : "text-red-500",
                  )}
                >
                  {newPosition.newLTV.toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Max Borrowable */}
      {showMaxBorrow && maxBorrowUSD > 0 && (
        <div className="pt-3 border-t border-[#232326]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#A1A1AA]">Max Safe Borrow</div>
            <div className="text-sm text-[#FAFAFA] font-medium">
              $
              {maxBorrowUSD.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="text-xs text-[#71717A] mt-1">
            at 1.5x health factor target
          </div>
        </div>
      )}

      {/* Risk Warnings */}
      {isLiquidationRisk && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">
              Liquidation Risk
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            this transaction would put your position at high risk of liquidation
            (HF &lt; 1.1)
          </p>
        </div>
      )}

      {isHighRisk && !isLiquidationRisk && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">
              High Risk
            </span>
          </div>
          <p className="text-xs text-[#A1A1AA] mt-1">
            this transaction would reduce your health factor below 1.2,
            increasing liquidation risk
          </p>
        </div>
      )}
    </div>
  );
};

export default HealthFactorIndicator;
