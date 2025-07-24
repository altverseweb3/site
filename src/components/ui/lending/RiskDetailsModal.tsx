"use client";

import { useState, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  StyledDialogClose,
} from "@/components/ui/StyledDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";

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

  const getHealthFactorColor = (hf: number) => {
    if (hf === Infinity) return "text-green-500";
    if (hf >= 2) return "text-green-500";
    if (hf >= 1.5) return "text-yellow-500";
    if (hf >= 1.1) return "text-orange-500";
    return "text-red-500";
  };

  const getLTVColor = (
    ltv: number,
    liquidationThresh: number,
  ): "green" | "amber" | "yellow" | "red" => {
    if (liquidationThresh === 0) return "green";
    const usage = ltv / liquidationThresh;
    if (usage < 0.6) return "green"; // Safe zone
    if (usage < 0.8) return "amber"; // Getting close
    if (usage < 0.95) return "yellow"; // Danger zone
    return "red"; // Critical - near liquidation
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md bg-[#0F0F0F] border-[#232326] text-white">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-white">
              Risk details
            </DialogTitle>
            <StyledDialogClose />
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Safety Description */}
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-4">
              Safety of your deposited collateral against the borrowed assets
              and its underlying value.
            </p>
          </div>

          {/* Health Factor Chart */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Health Factor</span>
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
              Liquidation at &lt; 1.00
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
                No debt - liquidation not possible
              </div>
            )}

            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-1">1.00</div>
              <div className="text-sm text-zinc-400">Liquidation threshold</div>
            </div>
          </div>

          {/* Current LTV Chart */}
          <div className="bg-[#1A1A1A] rounded-lg border border-[#232326] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Current LTV</span>
              <span className="text-lg font-semibold text-white">
                {ltvPercentage.toFixed(2)}%
              </span>
            </div>

            <div className="text-xs text-zinc-500 mb-2">
              Max LTV: {maxLTVPercentage.toFixed(1)}% | Liquidation:{" "}
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
                  {maxLTVPercentage.toFixed(0)}% Max
                </span>
                <span className="text-red-400">
                  {liquidationThresholdPercentage.toFixed(0)}% Liq
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
              If the health factor goes below 1, the liquidation of your
              collateral might be triggered.
            </p>
          </div>

          {/* Position Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">
                $
                {totalCollateralUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-zinc-400">Collateral</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-red-500 mb-1">
                $
                {totalDebtUSD.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-zinc-400">Debt</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiskDetailsModal;
