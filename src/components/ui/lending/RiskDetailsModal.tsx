"use client";

import { useState, FC, ReactNode } from "react";
import { UserAccountData } from "@/utils/aave/interact";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/utils";
import { X, AlertTriangle, Shield, TrendingUp } from "lucide-react";

interface RiskDetailsModalProps {
  children: ReactNode;
  userAccountData?: UserAccountData | null;
}

const RiskDetailsModal: FC<RiskDetailsModalProps> = ({
  children,
  userAccountData,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Use provided account data or fallback to placeholder
  const accountData = userAccountData || {
    totalCollateralBase: "0",
    totalDebtBase: "0",
    availableBorrowsBase: "0",
    currentLiquidationThreshold: 0.85,
    ltv: 0.0,
    healthFactor: "∞",
  };

  const getHealthFactorColor = (healthFactor: string) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 2) return "text-green-500";
    if (hf >= 1.5) return "text-amber-500";
    if (hf >= 1.1) return "text-orange-500";
    return "text-red-500";
  };

  const getHealthFactorStatus = (healthFactor: string) => {
    const hf = parseFloat(healthFactor);
    if (hf >= 2)
      return { status: "Safe", icon: Shield, color: "text-green-500" };
    if (hf >= 1.5)
      return { status: "Moderate", icon: TrendingUp, color: "text-amber-500" };
    if (hf >= 1.1)
      return { status: "Risky", icon: AlertTriangle, color: "text-orange-500" };
    return { status: "Danger", icon: AlertTriangle, color: "text-red-500" };
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl bg-[#0F0F0F] border-[#232326] text-white">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-[#232326]">
          <DialogTitle className="text-xl font-semibold text-white">
            Risk Details
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-[#1A1A1A]"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Health Factor Section */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Health Factor
              </h3>
              {(() => {
                const {
                  status,
                  icon: Icon,
                  color,
                } = getHealthFactorStatus(accountData.healthFactor);
                return (
                  <div className={cn("flex items-center gap-2", color)}>
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                );
              })()}
            </div>

            <div
              className={cn(
                "text-4xl font-bold mb-2",
                getHealthFactorColor(accountData.healthFactor),
              )}
            >
              {accountData.healthFactor === "∞"
                ? "∞"
                : parseFloat(accountData.healthFactor).toFixed(2)}
            </div>

            <div className="text-sm text-zinc-400 mb-4">
              {accountData.healthFactor === "∞" ||
              parseFloat(accountData.healthFactor) > 1
                ? "Your position is safe. Health factor above 1 means you won&rsquo;t be liquidated."
                : "DANGER: Your position may be liquidated. Health factor below 1 means liquidation risk."}
            </div>

            <div className="bg-[#0F0F0F] rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-2">
                Liquidation threshold
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">
                  Current:{" "}
                  {(accountData.currentLiquidationThreshold * 100).toFixed(1)}%
                </span>
                <ProgressBar
                  value={accountData.currentLiquidationThreshold * 100}
                  color={
                    accountData.healthFactor === "∞" ||
                    parseFloat(accountData.healthFactor) >= 1.5
                      ? "green"
                      : "red"
                  }
                  size="sm"
                  className="w-32"
                />
              </div>
            </div>
          </div>

          {/* Current LTV Section */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Current LTV
            </h3>

            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-3xl font-bold text-blue-500 mb-1">
                  {(accountData.ltv * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-zinc-400">Loan-to-Value ratio</div>
              </div>
              <div className="flex items-center gap-3">
                <ProgressBar
                  value={accountData.ltv * 100}
                  color="blue"
                  size="lg"
                  className="w-24"
                />
              </div>
            </div>

            <div className="text-sm text-zinc-400">
              This represents how much you&rsquo;ve borrowed relative to your
              collateral value.
            </div>
          </div>

          {/* Position Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Collateral
              </h3>
              <div className="text-2xl font-bold text-green-500 mb-2">
                {formatCurrency(accountData.totalCollateralBase)}
              </div>
              <div className="text-sm text-zinc-400">
                Total collateral value
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Debt</h3>
              <div className="text-2xl font-bold text-red-500 mb-2">
                {formatCurrency(accountData.totalDebtBase)}
              </div>
              <div className="text-sm text-zinc-400">Total borrowed amount</div>
            </div>
          </div>

          {/* Available to Borrow */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Available to Borrow
            </h3>
            <div className="text-2xl font-bold text-blue-500 mb-2">
              {formatCurrency(accountData.availableBorrowsBase)}
            </div>
            <div className="text-sm text-zinc-400">
              Amount you can still borrow based on your current collateral
            </div>
          </div>

          {/* Risk Information */}
          <div className="bg-[#1A1A1A] rounded-xl border border-[#232326] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Risk Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Liquidation Risk</div>
                  <div className="text-zinc-400">
                    If your health factor drops below 1.0, your position may be
                    liquidated to protect lenders.
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Safety Buffer</div>
                  <div className="text-zinc-400">
                    Maintain a health factor above 1.5 to have a safety buffer
                    against market volatility.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiskDetailsModal;
