"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import BrandedButton from "@/components/ui/BrandedButton";
import Image from "next/image";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { UnifiedReserveData } from "@/types/aave";
import { Shield, ShieldOff } from "lucide-react";
import AssetDetailsModal from "@/components/ui/lending/AssetDetails/AssetDetailsModal";
import ToggleCollateralModal from "@/components/ui/lending/ActionModals/ToggleCollateralModal";
import * as Tooltip from "@radix-ui/react-tooltip";
import { TokenTransferState } from "@/types/web3";

interface UserSupplyCardProps {
  unifiedReserve: UnifiedReserveData;
  userAddress: string | undefined;

  onWithdraw: (market: UnifiedReserveData, max: boolean) => void;
  onCollateralToggle: (market: UnifiedReserveData) => void;
  tokenTransferState: TokenTransferState;
  isCollateralLoading?: boolean;
}

const UserSupplyCard: React.FC<UserSupplyCardProps> = ({
  unifiedReserve,
  userAddress,

  onWithdraw,
  onCollateralToggle,
  tokenTransferState,
  isCollateralLoading = false,
}) => {
  const [supply] = unifiedReserve.userSupplyPositions;
  const balanceUsd = parseFloat(supply.balance.usd) || 0;
  const apy = parseFloat(supply.apy.value) || 0;

  // State for collateral toggle modal
  const [isCollateralModalOpen, setIsCollateralModalOpen] = useState(false);

  const handleCollateralToggle = () => {
    // Open the collateral toggle modal
    setIsCollateralModalOpen(true);
  };

  const handleModalCollateralToggle = () => {
    onCollateralToggle(unifiedReserve);
    setIsCollateralModalOpen(false);
  };

  return (
    <Card className="text-white border border-[#27272A] bg-[#18181B] rounded-lg shadow-none hover:bg-[#1C1C1F] transition-colors">
      <CardHeader className="flex flex-row items-start p-4 pb-2 space-y-0">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 flex-shrink-0">
          <Image
            src={supply.currency.imageUrl}
            alt={supply.currency.symbol}
            width={32}
            height={32}
            className="object-contain"
            onError={(e) => {
              e.currentTarget.src = "/images/tokens/default.svg";
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-[#FAFAFA] leading-none">
              {supply.currency.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    {supply.isCollateral ? (
                      <Shield className="w-4 h-4 text-green-600" />
                    ) : (
                      <ShieldOff className="w-4 h-4 text-[#A1A1AA]" />
                    )}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-[#18181B] border border-[#27272A] text-white text-xs px-2 py-1 rounded shadow-lg"
                      sideOffset={5}
                    >
                      {supply.isCollateral
                        ? "enabled as collateral"
                        : "not enabled as collateral"}
                      <Tooltip.Arrow className="fill-[#27272A]" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
            </div>
          </div>
          <CardDescription className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-1">
            <Image
              src={supply.market.icon}
              alt={supply.market.name}
              width={16}
              height={16}
              className="object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/images/markets/default.svg";
              }}
            />
            {supply.market.name}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Supplied Balance */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">supplied</div>
          <div className="text-right">
            <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
              {formatCurrency(balanceUsd)}
            </div>
          </div>
        </div>

        {/* Supply APY */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">APY</div>
          <div className="text-green-500 text-sm font-semibold font-mono">
            {formatPercentage(apy * 100)}
          </div>
        </div>

        {/* Ticker */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">ticker</div>
          <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
            {supply.currency.symbol}
          </div>
        </div>

        {/* Collateral Status */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">collateral</div>
          <div className="flex items-center gap-1">
            <Switch
              checked={supply.isCollateral}
              onCheckedChange={handleCollateralToggle}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-[#3F3F46]"
              disabled={isCollateralLoading}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 p-4 pt-0">
        <AssetDetailsModal
          reserve={unifiedReserve}
          userAddress={userAddress}
          onWithdraw={onWithdraw}
          tokenTransferState={tokenTransferState}
        >
          <BrandedButton
            buttonText="details"
            className="w-full text-xs py-2 h-8"
            disabled={false}
          />
        </AssetDetailsModal>
      </CardFooter>

      {/* Collateral Toggle Modal */}
      <ToggleCollateralModal
        isOpen={isCollateralModalOpen}
        onClose={() => setIsCollateralModalOpen(false)}
        reserve={unifiedReserve}
        userAddress={userAddress}
        onToggleCollateral={handleModalCollateralToggle}
        isLoading={isCollateralLoading}
      />
    </Card>
  );
};

export default UserSupplyCard;
