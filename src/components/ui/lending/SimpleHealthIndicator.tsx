"use client";

import { AlertTriangle } from "lucide-react";
import { getHealthFactorColor } from "@/utils/aave/utils";
import { cn } from "@/lib/utils";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import { UserPosition, UserBorrowPosition } from "@/types/aave";

interface SimpleHealthIndicatorProps {
  // EXACT same arrays as metrics header uses
  userSupplyPositionsUSD: UserPosition[];
  userBorrowPositionsUSD: UserBorrowPosition[];

  // Transaction simulation
  transactionAmountUSD?: number;
  transactionType?: "supply" | "withdraw" | "borrow" | "repay";
  transactionAssetAddress?: string;
}

// Simple calculation using current health factor and transaction impact
const calculateNewHealthFactor = (
  currentHealthFactor: number,
  currentCollateralUSD: number,
  currentDebtUSD: number,
  transactionAmountUSD: number,
  transactionType: string,
  liquidationThreshold: number,
): number => {
  let newDebtUSD = currentDebtUSD;

  switch (transactionType) {
    case "borrow":
      newDebtUSD += transactionAmountUSD;
      break;
    case "repay":
      newDebtUSD = Math.max(0, newDebtUSD - transactionAmountUSD);
      break;
    default:
      return currentHealthFactor; // For supply/withdraw, keep current
  }

  if (newDebtUSD === 0) return Infinity;

  // Handle the case where current HF is Infinity (no current debt)
  if (currentHealthFactor === Infinity && currentDebtUSD === 0) {
    if (transactionType === "borrow") {
      // Calculate weighted collateral using liquidation threshold
      const liquidationThresholdDecimal =
        liquidationThreshold > 1
          ? liquidationThreshold / 100
          : liquidationThreshold;
      const weightedCollateral =
        currentCollateralUSD * liquidationThresholdDecimal;
      return weightedCollateral / newDebtUSD;
    }
    return Infinity;
  }

  // HF = weighted_collateral / debt
  // So weighted_collateral = HF * debt
  const weightedCollateral = currentHealthFactor * currentDebtUSD;
  return weightedCollateral / newDebtUSD;
};

export const SimpleHealthIndicator: React.FC<SimpleHealthIndicatorProps> = ({
  userSupplyPositionsUSD,
  userBorrowPositionsUSD,
  transactionAmountUSD = 0,
  transactionType,
}) => {
  // Calculate metrics EXACTLY like metrics header does
  const userMetrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  const currentHealthFactor = userMetrics.healthFactor || Infinity;
  const currentTotalCollateralUSD = userMetrics.totalCollateralUSD;
  const currentTotalDebtUSD = userMetrics.totalDebtUSD;
  const currentLTV = userMetrics.currentLTV;
  const liquidationThreshold = userMetrics.liquidationThreshold;

  // Calculate new values if there's a transaction
  const hasTransaction = transactionAmountUSD > 0 && transactionType;

  const newHealthFactor = hasTransaction
    ? calculateNewHealthFactor(
        currentHealthFactor,
        currentTotalCollateralUSD,
        currentTotalDebtUSD,
        transactionAmountUSD,
        transactionType!,
        liquidationThreshold,
      )
    : currentHealthFactor;

  // Simple LTV calculation for borrow/repay
  let newLTV = currentLTV;
  if (
    hasTransaction &&
    (transactionType === "borrow" || transactionType === "repay")
  ) {
    let newDebtUSD = currentTotalDebtUSD;
    if (transactionType === "borrow") {
      newDebtUSD += transactionAmountUSD;
    } else {
      newDebtUSD = Math.max(0, newDebtUSD - transactionAmountUSD);
    }
    newLTV =
      currentTotalCollateralUSD > 0
        ? (newDebtUSD / currentTotalCollateralUSD) * 100
        : 0;
  }

  // Risk assessment - block only below 1.12, allow exactly 1.12
  const isLiquidationRisk = newHealthFactor < 1.0;
  const isHighRisk = newHealthFactor < 1.12;

  // LTV color (same pattern as RiskDetailsModal)
  const getLTVColor = (ltv: number) => {
    if (ltv < liquidationThreshold * 0.7) return "text-green-500";
    if (ltv < liquidationThreshold * 0.9) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-3">
      {/* Health Factor and LTV Panels */}
      <div className="flex items-center justify-center gap-4">
        {/* Current Health Factor Panel */}
        <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
          <div className="text-xs text-[#A1A1AA] mb-1">Health Factor</div>
          <div
            className={cn(
              "text-lg font-semibold font-mono",
              getHealthFactorColor(currentHealthFactor),
            )}
          >
            {currentHealthFactor === Infinity
              ? "∞"
              : currentHealthFactor.toFixed(2)}
          </div>
        </div>

        {/* Arrow */}
        {hasTransaction && <div className="text-[#71717A]">→</div>}

        {/* New Health Factor Panel (only if transaction) */}
        {hasTransaction && (
          <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
            <div className="text-xs text-[#A1A1AA] mb-1">New Health Factor</div>
            <div
              className={cn(
                "text-lg font-semibold font-mono",
                getHealthFactorColor(newHealthFactor),
              )}
            >
              {newHealthFactor === Infinity ? "∞" : newHealthFactor.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* LTV Panels */}
      <div className="flex items-center justify-center gap-4">
        {/* Current LTV Panel */}
        <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
          <div className="text-xs text-[#A1A1AA] mb-1">Current LTV</div>
          <div
            className={cn(
              "text-lg font-semibold font-mono",
              getLTVColor(currentLTV),
            )}
          >
            {currentLTV.toFixed(2)}%
          </div>
        </div>

        {/* Arrow */}
        {hasTransaction && <div className="text-[#71717A]">→</div>}

        {/* New LTV Panel (only if transaction) */}
        {hasTransaction && (
          <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
            <div className="text-xs text-[#A1A1AA] mb-1">New LTV</div>
            <div
              className={cn(
                "text-lg font-semibold font-mono",
                getLTVColor(newLTV),
              )}
            >
              {newLTV.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Summary Box Underneath */}
      {(hasTransaction &&
        Math.abs(newHealthFactor - currentHealthFactor) > 0.01) ||
      isLiquidationRisk ||
      (isHighRisk && !isLiquidationRisk) ? (
        <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#232326]">
          {hasTransaction &&
            Math.abs(newHealthFactor - currentHealthFactor) > 0.01 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#A1A1AA]">After Transaction</span>
                <span
                  className={cn(
                    "font-mono",
                    getHealthFactorColor(newHealthFactor),
                  )}
                >
                  {newHealthFactor === Infinity
                    ? "∞"
                    : newHealthFactor.toFixed(2)}
                </span>
              </div>
            )}

          {/* Risk Warning in Summary */}
          {isLiquidationRisk && (
            <>
              {hasTransaction &&
                Math.abs(newHealthFactor - currentHealthFactor) > 0.01 && (
                  <div className="h-px bg-[#232326] my-2" />
                )}
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Liquidation Risk - Transaction Blocked
                </span>
              </div>
            </>
          )}

          {isHighRisk && !isLiquidationRisk && (
            <>
              {hasTransaction &&
                Math.abs(newHealthFactor - currentHealthFactor) > 0.01 && (
                  <div className="h-px bg-[#232326] my-2" />
                )}
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">High Risk Warning</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SimpleHealthIndicator;
