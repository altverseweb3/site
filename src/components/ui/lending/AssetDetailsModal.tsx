"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import Image from "next/image";
import { UnifiedMarketData } from "@/types/aave";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import UserInfoTab from "@/components/ui/lending/assetDetails/UserInfoTab";
import EModeInfoTab from "@/components/ui/lending/assetDetails/EmodeInfoTab";
import SupplyInfoTab from "@/components/ui/lending/assetDetails/SupplyInfoTab";
import BorrowInfoTab from "@/components/ui/lending/assetDetails/BorrowInfoTab";

interface AssetDetailsModalProps {
  market: UnifiedMarketData;
  children: React.ReactNode;
  onSupply: (market: UnifiedMarketData) => void;
  onBorrow: (market: UnifiedMarketData) => void;
}

type TabType = "user" | "supply" | "borrow" | "emode" | "asset";

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  market,
  children,
  onSupply,
  onBorrow,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("user");

  // we will eventually do something with the onSupply and onBorrow functions
  console.log(onSupply, onBorrow); // just log them for now to silence linting warnings

  // Calculate APYs with incentives
  const {
    finalSupplyAPY,
    hasSupplyBonuses,
    hasMixedIncentives: supplyMixed,
  } = calculateApyWithIncentives(market.supplyData.apy, 0, market.incentives);

  const {
    finalBorrowAPY,
    hasBorrowBonuses,
    hasMixedIncentives: borrowMixed,
  } = calculateApyWithIncentives(0, market.borrowData.apy, market.incentives);

  const handleTabChange = (value: TabType) => {
    if (value) setActiveTab(value);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#18181B] border border-[#27272A] text-white">
        <DialogHeader className="border-b border-[#27272A] pb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
              <Image
                src={market.underlyingToken.imageUrl}
                alt={market.underlyingToken.symbol}
                width={48}
                height={48}
                className="object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/images/tokens/default.svg";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-[#FAFAFA] flex items-center gap-2">
                {market.underlyingToken.name}
                <span className="text-[#A1A1AA] text-sm font-normal">
                  ({market.underlyingToken.symbol})
                </span>
              </DialogTitle>
              <div className="text-[#A1A1AA] text-sm flex items-center gap-2 mt-1">
                <Image
                  src={market.marketInfo.icon}
                  alt={market.marketName}
                  width={16}
                  height={16}
                  className="object-contain rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = "/images/markets/default.svg";
                  }}
                />
                {market.marketName}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Navigation */}
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={handleTabChange}
            className="justify-start"
          >
            <ToggleGroupItem
              value="user"
              className="data-[state=on]:bg-amber-500/25 data-[state=on]:text-amber-300 data-[state=on]:border-[#61410B]"
            >
              your info
            </ToggleGroupItem>

            {/* Mobile: Single asset info tab (hidden on desktop) */}
            <ToggleGroupItem
              value="asset"
              className="md:hidden data-[state=on]:bg-sky-500/25 data-[state=on]:text-sky-300 data-[state=on]:border-sky-800"
            >
              asset info
            </ToggleGroupItem>

            {/* Desktop: Individual tabs (hidden on mobile) */}
            <ToggleGroupItem
              value="supply"
              className="hidden md:flex data-[state=on]:bg-green-500/25 data-[state=on]:text-green-300 data-[state=on]:border-green-800"
            >
              supply info
            </ToggleGroupItem>
            <ToggleGroupItem
              value="borrow"
              className="hidden md:flex data-[state=on]:bg-red-500/25 data-[state=on]:text-red-300 data-[state=on]:border-red-800"
            >
              borrow info
            </ToggleGroupItem>
            <ToggleGroupItem
              value="emode"
              className="hidden md:flex data-[state=on]:bg-purple-500/25 data-[state=on]:text-purple-300 data-[state=on]:border-purple-800"
            >
              e-mode info
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {/* User Info - Always available */}
            {activeTab === "user" && <UserInfoTab market={market} />}

            {/* Mobile: Combined asset info (only shows on mobile screens) */}
            {activeTab === "asset" && (
              <div className="md:hidden space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {/* Supply Info Section */}
                <div className="bg-[#1F1F23] rounded-lg p-4 border border-[#27272A]">
                  <h3 className="text-green-300 font-medium mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    supply Information
                  </h3>
                  <SupplyInfoTab
                    market={market}
                    finalAPY={finalSupplyAPY}
                    hasSupplyBonuses={hasSupplyBonuses}
                    hasMixedIncentives={supplyMixed}
                  />
                </div>

                {/* Borrow Info Section */}
                <div className="bg-[#1F1F23] rounded-lg p-4 border border-[#27272A]">
                  <h3 className="text-red-300 font-medium mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    borrow information
                  </h3>
                  <BorrowInfoTab
                    market={market}
                    finalAPY={finalBorrowAPY}
                    hasBorrowBonuses={hasBorrowBonuses}
                    hasMixedIncentives={borrowMixed}
                  />
                </div>

                {/* E-Mode Info Section */}
                <div className="bg-[#1F1F23] rounded-lg p-4 border border-[#27272A]">
                  <h3 className="text-purple-300 font-medium mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    e-mode information
                  </h3>
                  <EModeInfoTab market={market} />
                </div>
              </div>
            )}

            {/* Desktop: Individual tabs (only show on desktop) */}
            {activeTab === "supply" && (
              <div className="hidden md:block">
                <SupplyInfoTab
                  market={market}
                  finalAPY={finalSupplyAPY}
                  hasSupplyBonuses={hasSupplyBonuses}
                  hasMixedIncentives={supplyMixed}
                />
              </div>
            )}
            {activeTab === "borrow" && (
              <div className="hidden md:block">
                <BorrowInfoTab
                  market={market}
                  finalAPY={finalBorrowAPY}
                  hasBorrowBonuses={hasBorrowBonuses}
                  hasMixedIncentives={borrowMixed}
                />
              </div>
            )}
            {activeTab === "emode" && (
              <div className="hidden md:block">
                <EModeInfoTab market={market} />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssetDetailsModal;
