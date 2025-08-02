"use client";

import { useState, ReactNode } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

  const healthFactor =
    propHealthFactor === null || propHealthFactor === Infinity
      ? Infinity
      : propHealthFactor;

  const ltvPercentage = currentLTV;
  const maxLTVPercentage = maxLTV;
  const liquidationThresholdPercentage = liquidationThreshold;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
                  "text-lg font-semibold",
                  getHealthFactorColor(healthFactor),
                )}
              >
                {healthFactor === Infinity ? "∞" : healthFactor.toFixed(2)}
              </span>
            </div>

            <div className="text-xs text-zinc-500 mb-2">
              liquidation at &lt; 1.00
            </div>

            {healthFactor !== Infinity && (
              <div className="relative mb-4">
                <ProgressBar
                  value={Math.min(healthFactor * 50, 100)} // Scale for visual representation
                  color={
                    healthFactor >= 1.5
                      ? "green"
                      : healthFactor >= 1.1
                        ? "yellow"
                        : "red"
                  }
                  size="md"
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                  <span>0</span>
                  <span>1.0</span>
                  <span>2.0+</span>
                </div>
              </div>
            )}

            {healthFactor === Infinity && (
              <div className="text-xs text-zinc-400 mb-4">
                no debt - liquidation not possible
              </div>
            )}

            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-1">1.00</div>
              <div className="text-sm text-zinc-400">liquidation threshold</div>
            </div>
          </div>

          {/* Current LTV Chart */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">current ltv</span>
              <span className="text-lg font-semibold text-white">
                {ltvPercentage.toFixed(2)}%
              </span>
            </div>

            <div className="text-xs text-zinc-500 mb-2">
              max ltv: {maxLTVPercentage.toFixed(1)}% | liquidation:{" "}
              {liquidationThresholdPercentage.toFixed(1)}%
            </div>

            <div className="relative mb-4">
              <ProgressBar
                value={
                  liquidationThresholdPercentage > 0
                    ? (ltvPercentage / liquidationThresholdPercentage) * 100
                    : 0
                }
                color={getLTVColor(
                  ltvPercentage,
                  liquidationThresholdPercentage,
                )}
                size="md"
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-zinc-500">
                <span>0%</span>
                <span className="text-amber-400">
                  {maxLTVPercentage.toFixed(0)}% max
                </span>
                <span className="text-red-400">
                  {liquidationThresholdPercentage.toFixed(0)}% liq
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-1">
                {liquidationThresholdPercentage > 0
                  ? (
                      (ltvPercentage / liquidationThresholdPercentage) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
              <div className="text-sm text-zinc-400">
                to liquidation threshold
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <p className="text-sm text-zinc-400 text-center">
              if the health factor goes below 1, the liquidation of your
              collateral might be triggered.
            </p>
          </div>

          {/* Position Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">
                {formatCurrency(totalCollateralUSD)}
              </div>
              <div className="text-sm text-zinc-400">collateral</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">
                {formatCurrency(totalDebtUSD)}
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
