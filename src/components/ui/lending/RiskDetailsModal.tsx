"use client";

import { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { getHealthFactorColor, getLTVColor } from "@/utils/aave/utils";
import { formatCurrency } from "@/utils/formatters";

export interface RiskDetailsModalProps {
  children: ReactNode;
  healthFactor: number | null;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  currentLTV: number;
  maxLTV: number;
  liquidationThreshold: number;
}

const RiskDetailsModal = ({
  children,
  healthFactor: propHealthFactor,
  totalCollateralUSD,
  totalDebtUSD,
  currentLTV,
  maxLTV,
  liquidationThreshold,
}: RiskDetailsModalProps) => {
  const healthFactor =
    propHealthFactor === null || propHealthFactor === Infinity
      ? Infinity
      : propHealthFactor;

  const ltvPercentage = currentLTV;
  const maxLTVPercentage = maxLTV;
  const liquidationThresholdPercentage = liquidationThreshold;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md bg-[#18181B] border-[#27272A] text-white rounded-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold">
            risk details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Safety Description */}
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-4">
              safety of your deposited collateral against the borrowed assets
              and its underlying value.
            </p>
          </div>

          {/* Health Factor Chart */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">health factor</span>
              <span
                className={cn(
                  "text-lg font-semibold font-mono",
                  getHealthFactorColor(healthFactor),
                )}
              >
                {healthFactor === Infinity ? "∞" : healthFactor.toFixed(2)}
              </span>
            </div>

            <div className="text-xs text-zinc-500 mb-2">
              liquidation at <span className="text-red-500">&lt; 1.00</span>
            </div>

            {healthFactor !== Infinity && (
              <div className="relative mb-6">
                {/* Background track */}
                <div className="w-full h-2 bg-gray-700 rounded-full" />
                {/* User position bar */}
                <div
                  className="absolute top-0 h-2 bg-green-500 rounded-full"
                  style={{
                    width: `${Math.min(Math.max((healthFactor / 10) * 100, 0), 100)}%`,
                  }}
                />
                {/* Liquidation threshold indicator at 1.0 */}
                <div
                  className="absolute top-0 w-0.5 h-2 bg-red-500 rounded-full"
                  style={{ left: "10%", transform: "translateX(-50%)" }}
                />
                <div className="flex justify-between items-center mt-6 text-xs relative">
                  <span className="absolute left-0 text-red-800">0</span>
                  <span
                    className="absolute text-red-500"
                    style={{ left: "10%", transform: "translateX(-50%)" }}
                  >
                    1.0
                  </span>
                  <span className="absolute right-0 text-green-500">
                    {Math.min(healthFactor * 2, 10).toFixed(1)}
                  </span>
                </div>
              </div>
            )}

            {healthFactor === Infinity && (
              <div className="text-xs text-zinc-400 mb-4">
                no debt - liquidation not possible
              </div>
            )}

            <div className="text-center">
              <div
                className={cn(
                  "text-lg font-semibold mb-1 font-mono",
                  getHealthFactorColor(healthFactor),
                )}
              >
                {healthFactor === Infinity ? "∞" : healthFactor.toFixed(2)}
              </div>
              <div className="text-sm text-zinc-400">health factor</div>
              <div className="text-xs text-zinc-500 mt-1">
                liquidation at <span className="text-red-500">&lt; 1.00</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 text-center mt-3">
              if the health factor goes below 1, the liquidation of your
              collateral might be triggered.
            </div>
          </div>

          {/* Current LTV Chart */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">current ltv</span>
              <span
                className={cn(
                  "text-lg font-semibold font-mono",
                  ltvPercentage < maxLTVPercentage
                    ? "text-green-500"
                    : ltvPercentage < liquidationThresholdPercentage
                      ? "text-amber-500"
                      : "text-red-500",
                )}
              >
                {ltvPercentage.toFixed(2)}%
              </span>
            </div>

            <div className="text-xs text-zinc-500 mb-2 font-mono">
              max ltv:{" "}
              <span className="text-amber-500">
                {maxLTVPercentage.toFixed(1)}%
              </span>{" "}
              | liquidation:{" "}
              <span className="text-red-500">
                {liquidationThresholdPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="relative mb-6">
              {/* Background track */}
              <div className="w-full h-2 bg-gray-700 rounded-full" />
              {/* User position bar */}
              <div
                className="absolute top-0 h-2 bg-green-500 rounded-full"
                style={{ width: `${ltvPercentage}%` }}
              />
              {/* Max LTV indicator line */}
              <div
                className="absolute top-0 w-0.5 h-2 bg-amber-500 rounded-full"
                style={{
                  left: `${maxLTVPercentage}%`,
                  transform: "translateX(-50%)",
                }}
              />
              {/* Liquidation threshold indicator line */}
              <div
                className="absolute top-0 w-0.5 h-2 bg-red-500 rounded-full"
                style={{
                  left: `${liquidationThresholdPercentage}%`,
                  transform: "translateX(-50%)",
                }}
              />
              <div className="flex justify-between items-center mt-6 text-xs relative">
                <span className="absolute left-0 text-green-500">0%</span>
                <span
                  className="text-amber-500 font-mono absolute"
                  style={{
                    left: `${maxLTVPercentage}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {maxLTVPercentage.toFixed(0)}%
                </span>
                <span
                  className="text-red-500 font-mono absolute"
                  style={{
                    left: `${liquidationThresholdPercentage}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {liquidationThresholdPercentage.toFixed(0)}%
                </span>
                <span className="absolute right-0 text-red-800">100%</span>
              </div>
            </div>

            <div className="text-center">
              <div
                className={cn(
                  "text-lg font-semibold mb-1 font-mono",
                  ltvPercentage < maxLTVPercentage
                    ? "text-green-500"
                    : ltvPercentage < liquidationThresholdPercentage
                      ? "text-amber-500"
                      : "text-red-500",
                )}
              >
                {ltvPercentage.toFixed(2)}%
              </div>
              <div className="text-sm text-zinc-400">current loan to value</div>
              <div className="text-xs text-zinc-500 mt-1">
                max: {maxLTVPercentage.toFixed(0)}% | liquidation:{" "}
                {liquidationThresholdPercentage.toFixed(0)}%
              </div>
            </div>

            <div className="text-xs text-zinc-400 text-center mt-3">
              If your loan to value goes above the liquidation threshold your
              collateral supplied may be liquidated.
            </div>
          </div>

          {/* Position Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1 font-mono">
                {formatCurrency(totalCollateralUSD)}
              </div>
              <div className="text-sm text-zinc-400">collateral</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 mb-1 font-mono">
                {totalDebtUSD > 0 && totalDebtUSD < 0.01
                  ? "<$0.01"
                  : formatCurrency(totalDebtUSD)}
              </div>
              <div className="text-sm text-zinc-400">debt</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiskDetailsModal;
