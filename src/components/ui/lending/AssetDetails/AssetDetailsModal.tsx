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
import { UnifiedReserveData } from "@/types/aave";
import { calculateApyWithIncentives } from "@/utils/lending/incentives";
import UserInfoTab from "@/components/ui/lending/AssetDetails/UserInfoTab";
import EModeInfoTab from "@/components/ui/lending/AssetDetails/EmodeInfoTab";
import SupplyInfoTab from "@/components/ui/lending/AssetDetails/SupplyInfoTab";
import BorrowInfoTab from "@/components/ui/lending/AssetDetails/BorrowInfoTab";
import BrandedButton from "@/components/ui/BrandedButton";
import { TokenTransferState } from "@/types/web3";
import SupplyAssetModal from "@/components/ui/lending/ActionModals/SupplyAssetModal";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import { getLendingToken } from "@/utils/lending/tokens";
import BorrowAssetModal from "@/components/ui/lending/ActionModals/BorrowAssetModal";

interface AssetDetailsModalProps {
  reserve: UnifiedReserveData;
  userAddress: string | undefined;
  children: React.ReactNode;
  tokenTransferState: TokenTransferState;
  refetchMarkets: () => void;
}

type TabType = "user" | "supply" | "borrow" | "emode" | "asset";

const AssetDetailsModal: React.FC<AssetDetailsModalProps> = ({
  reserve,
  userAddress,
  children,
  tokenTransferState,
  refetchMarkets,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("user");

  // Calculate APYs with incentives
  const {
    finalSupplyAPY,
    hasSupplyBonuses,
    hasMixedIncentives: supplyMixed,
  } = calculateApyWithIncentives(reserve.supplyData.apy, 0, reserve.incentives);

  const {
    finalBorrowAPY,
    hasBorrowBonuses,
    hasMixedIncentives: borrowMixed,
  } = calculateApyWithIncentives(0, reserve.borrowData.apy, reserve.incentives);

  const handleTabChange = (value: TabType) => {
    if (value) setActiveTab(value);
  };

  const tokensByCompositeKey = useWeb3Store(
    (state) => state.tokensByCompositeKey,
  );
  const lendingToken = getLendingToken(reserve, tokensByCompositeKey);
  const lendingChain = getChainByChainId(lendingToken.chainId);

  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const setDestinationToken = useWeb3Store(
    (state) => state.setDestinationToken,
  );
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setDestinationChain = useWeb3Store(
    (state) => state.setDestinationChain,
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0">
          <div className="flex items-start gap-4">
            {/* Asset info - buttons removed from header */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                <Image
                  src={reserve.underlyingToken.imageUrl}
                  alt={reserve.underlyingToken.symbol}
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
                  {reserve.underlyingToken.name}
                  <span className="text-[#A1A1AA] text-sm font-normal">
                    ({reserve.underlyingToken.symbol})
                  </span>
                </DialogTitle>
                <div className="text-[#A1A1AA] text-sm flex items-center gap-2 mt-1">
                  <Image
                    src={reserve.marketInfo.icon}
                    alt={reserve.marketName}
                    width={16}
                    height={16}
                    className="object-contain rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/images/markets/default.svg";
                    }}
                  />
                  {reserve.marketName}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Main content area with flex-1 to fill space */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-1">
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
            <div className="min-h-[300px]">
              {/* User Info - Always available */}
              {activeTab === "user" && (
                <UserInfoTab
                  market={reserve}
                  userAddress={userAddress}
                  tokenTransferState={tokenTransferState}
                  refetchMarkets={refetchMarkets}
                />
              )}

              {/* Mobile: Combined asset info (only shows on mobile screens) */}
              {activeTab === "asset" && (
                <div className="md:hidden space-y-6 max-h-[400px] overflow-y-auto pr-2">
                  {/* Supply Info Section */}
                  <div className="bg-[#1F1F23] rounded-lg p-4 border border-[#27272A]">
                    <h3 className="text-green-300 font-medium mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      supply Information
                    </h3>
                    <SupplyInfoTab
                      market={reserve}
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
                      market={reserve}
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
                    <EModeInfoTab market={reserve} />
                  </div>
                </div>
              )}

              {/* Desktop: Individual tabs (only show on desktop) */}
              {activeTab === "supply" && (
                <div className="hidden md:block">
                  <SupplyInfoTab
                    market={reserve}
                    finalAPY={finalSupplyAPY}
                    hasSupplyBonuses={hasSupplyBonuses}
                    hasMixedIncentives={supplyMixed}
                  />
                </div>
              )}
              {activeTab === "borrow" && (
                <div className="hidden md:block">
                  <BorrowInfoTab
                    market={reserve}
                    finalAPY={finalBorrowAPY}
                    hasBorrowBonuses={hasBorrowBonuses}
                    hasMixedIncentives={borrowMixed}
                  />
                </div>
              )}
              {activeTab === "emode" && (
                <div className="hidden md:block">
                  <EModeInfoTab market={reserve} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer with CTA buttons */}
        {userAddress && (
          <div className="bg-[#18181B] flex-shrink-0 px-1">
            <div className="flex gap-3 w-full">
              <SupplyAssetModal
                market={reserve}
                userAddress={userAddress}
                tokenTransferState={tokenTransferState}
                healthFactor={
                  reserve.marketInfo.userState?.healthFactor?.toString() || null
                }
                refetchMarkets={refetchMarkets}
              >
                <BrandedButton
                  iconName="TrendingUp"
                  buttonText="supply"
                  onClick={() => {
                    setSourceChain(lendingChain);
                    setDestinationChain(lendingChain);
                    setSourceToken(lendingToken);
                    setDestinationToken(lendingToken);
                  }}
                  className="flex-1 justify-center bg-green-500/20 hover:bg-green-500/30 hover:text-green-200 text-green-300 border-green-700/50 hover:border-green-600 transition-all duration-200 py-3 font-medium"
                  iconClassName="h-4 w-4"
                />
              </SupplyAssetModal>
              <BorrowAssetModal
                market={reserve}
                userAddress={userAddress}
                tokenTransferState={tokenTransferState}
                healthFactor={
                  reserve.marketInfo.userState?.healthFactor?.toString() || null
                }
                refetchMarkets={refetchMarkets}
              >
                <BrandedButton
                  iconName="TrendingDown"
                  buttonText="borrow"
                  onClick={() => {
                    setSourceChain(lendingChain);
                    setDestinationChain(lendingChain);
                    setSourceToken(lendingToken);
                    setDestinationToken(lendingToken);
                  }}
                  className="flex-1 justify-center bg-red-500/20 hover:bg-red-500/30 hover:text-red-400 text-red-400 border-red-500/50 hover:border-red-500 transition-all duration-200 font-medium"
                  iconClassName="h-4 w-4"
                />
              </BorrowAssetModal>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssetDetailsModal;
