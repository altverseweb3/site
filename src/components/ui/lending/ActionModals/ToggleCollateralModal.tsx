"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { formatCurrency } from "@/utils/formatters";
import { EnhancedUserSupplyPosition } from "@/types/aave";
import { getChainByChainId } from "@/config/chains";
import { Shield, ShieldOff } from "lucide-react";
import Image from "next/image";
import SubscriptNumber from "@/components/ui/SubscriptNumber";
import HealthFactorRiskDisplay from "@/components/ui/lending/AssetDetails/HealthFactorRiskDisplay";

interface ToggleCollateralModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: EnhancedUserSupplyPosition;
  onToggleCollateral: () => void;
  isLoading?: boolean;
  userAddress?: string;
}

const ToggleCollateralModal: React.FC<ToggleCollateralModalProps> = ({
  isOpen,
  onClose,
  position,
  onToggleCollateral,
  isLoading = false,
  userAddress,
}) => {
  const { supply, marketName } = position;
  const balanceAmount = supply.balance.amount.value;
  const balanceUsd = parseFloat(supply.balance.usd) || 0;
  const isCurrentlyCollateral = supply.isCollateral;
  const canBeCollateral = supply.canBeCollateral;

  const marketChain = getChainByChainId(
    position.unifiedMarket.market.chain.chainId,
  );

  // Convert currency to token format
  const sourceToken = {
    id: supply.currency.name,
    ticker: supply.currency.symbol,
    chainId: position.unifiedMarket.market.chain.chainId,
    stringChainId: marketChain.id,
    decimals: supply.currency.decimals,
    address: supply.currency.address,
    symbol: supply.currency.symbol,
    name: supply.currency.name || supply.currency.symbol,
    imageUrl: supply.currency.imageUrl,
    icon: supply.currency.imageUrl,
  };

  const handleToggle = async () => {
    onToggleCollateral();
  };

  // Don't render modal if asset can't be used as collateral
  if (!canBeCollateral) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#18181B] border border-[#27272A] text-white">
        <DialogHeader className="border-b border-[#27272A] pb-4">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {isCurrentlyCollateral ? (
              <>
                <ShieldOff className="w-5 h-5 text-red-500" />
                disable collateral
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 text-green-400" />
                enable collateral
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Asset Information */}
          <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Image
                  src={supply.currency.imageUrl || "/images/tokens/default.svg"}
                  alt={supply.currency.symbol}
                  width={32}
                  height={32}
                  className="rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "/images/tokens/default.svg";
                  }}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                  <Image
                    src={
                      supply.market.chain.icon || "/images/chains/default.svg"
                    }
                    alt={marketName}
                    width={12}
                    height={12}
                    className="rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/images/chains/default.svg";
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  {supply.currency.symbol}
                </div>
                <div className="text-xs text-[#A1A1AA]">{marketName}</div>
              </div>
            </div>

            {/* Supply Balance */}
            <div className="space-y-2">
              <div className="text-sm text-[#A1A1AA]">supply balance</div>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="text-lg font-mono font-semibold text-white">
                    <SubscriptNumber value={balanceAmount} />{" "}
                    <span className="text-base">{supply.currency.symbol}</span>
                  </div>
                  <div className="text-sm text-[#71717A] font-mono">
                    {formatCurrency(balanceUsd)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Factor Risk Display */}
          <HealthFactorRiskDisplay
            amount={balanceAmount}
            sourceToken={sourceToken}
            userAddress={userAddress}
            market={position.unifiedMarket}
            operation={isCurrentlyCollateral ? "withdraw" : "supply"}
            className="mt-4"
          />

          {/* Action Explanation */}
          <div className="text-xs text-[#A1A1AA] text-center px-2">
            {isCurrentlyCollateral
              ? "This asset is currently being used as collateral for your borrows."
              : "This asset is not currently being used as collateral."}
          </div>

          {/* Toggle Button */}
          <BrandedButton
            onClick={handleToggle}
            disabled={isLoading}
            className={`w-full py-3 font-medium transition-all duration-200 ${
              isCurrentlyCollateral
                ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 border-red-700/50 hover:border-red-600"
                : "bg-green-500/20 hover:bg-green-500/30 text-green-300 hover:text-green-200 border-green-700/50 hover:border-green-600"
            }`}
            buttonText={
              isLoading
                ? "processing..."
                : isCurrentlyCollateral
                  ? "disable collateral"
                  : "enable collateral"
            }
            iconName="Coins"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToggleCollateralModal;
