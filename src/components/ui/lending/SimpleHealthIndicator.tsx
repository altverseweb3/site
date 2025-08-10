
"use client";

import { AlertTriangle } from "lucide-react";
import {
  getHealthFactorColor,
  calculateNewHealthFactor,
} from "@/utils/aave/utils";
import { cn } from "@/lib/utils";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import { UserPosition, UserBorrowPosition } from "@/types/aave";

interface SimpleHealthIndicatorProps {
  userSupplyPositionsUSD: UserPosition[];
  userBorrowPositionsUSD: UserBorrowPosition[];
  transactionAmountUSD?: number;
  transactionType?: "supply" | "withdraw" | "borrow" | "repay";
  transactionAssetAddress?: string;
}

export const SimpleHealthIndicator: React.FC<SimpleHealthIndicatorProps> = ({
  userSupplyPositionsUSD,
  userBorrowPositionsUSD,
  transactionAmountUSD = 0,
  transactionType,
}) => {
  const userMetrics = calculateUserMetrics(
    userSupplyPositionsUSD,
    userBorrowPositionsUSD,
  );

  const currentHealthFactor = userMetrics.healthFactor || Infinity;
  const currentTotalCollateralUSD = userMetrics.totalCollateralUSD;
  const currentTotalDebtUSD = userMetrics.totalDebtUSD;
  const currentLTV = userMetrics.currentLTV;
  const liquidationThreshold = userMetrics.liquidationThreshold;

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

  const isLiquidationRisk = newHealthFactor < 1.0;
  const isHighRisk = newHealthFactor < 1.12;

  const getLTVColor = (ltv: number) => {
    if (ltv < liquidationThreshold * 0.7) return "text-green-500";
    if (ltv < liquidationThreshold * 0.9) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
          <div className="text-xs text-[#A1A1AA] mb-1">health factor</div>
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

        {hasTransaction && <div className="text-[#71717A]">→</div>}

        {hasTransaction && (
          <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
            <div className="text-xs text-[#A1A1AA] mb-1">new health factor</div>
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

      <div className="flex items-center justify-center gap-4">
        <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
          <div className="text-xs text-[#A1A1AA] mb-1">current LTV</div>
          <div
            className={cn(
              "text-lg font-semibold font-mono",
              getLTVColor(currentLTV),
            )}
          >
            {currentLTV.toFixed(2)}%
          </div>
        </div>

        {hasTransaction && <div className="text-[#71717A]">→</div>}

        {hasTransaction && (
          <div className="flex-1 p-3 bg-[#1A1A1A] rounded-lg border border-[#232326] text-center">
            <div className="text-xs text-[#A1A1AA] mb-1">new LTV</div>
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

      {(hasTransaction &&
        Math.abs(newHealthFactor - currentHealthFactor) > 0.01) ||
      isLiquidationRisk ||
      (isHighRisk && !isLiquidationRisk) ? (
        <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#232326]">
          {hasTransaction &&
            Math.abs(newHealthFactor - currentHealthFactor) > 0.01 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#A1A1AA]">after transaction</span>
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

          {isLiquidationRisk && (
            <>
              {hasTransaction &&
                Math.abs(newHealthFactor - currentHealthFactor) > 0.01 && (
                  <div className="h-px bg-[#232326] my-2" />
                )}
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  liquidation risk - transaction blocked
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
                <span className="text-sm font-medium">high risk warning</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default SimpleHealthIndicator;
