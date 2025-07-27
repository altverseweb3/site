"use client";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import React, { useState, useEffect } from "react";
import {
  useSetActiveSwapSection,
  useIsWalletTypeConnected,
} from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import Image from "next/image";
import { getTokenGradient } from "@/utils/ui/uiHelpers";
import { chainList } from "@/config/chains";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const [selectedChain, setSelectedChain] = useState<string>(""); // Single chain selection
  const [isMounted, setIsMounted] = useState(false);
  const setActiveSwapSection = useSetActiveSwapSection();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const aaveSupportedChains = chainList.filter((chain) => chain.aaveSupported);

  useEffect(() => {
    setActiveSwapSection("lend");
    setIsMounted(true);
  }, [setActiveSwapSection]);

  const handleChainChange = (chainId: string) => {
    setSelectedChain(chainId);
  };

  // Don't render anything until component is mounted
  if (!isMounted) {
    return (
      <div className="w-full">
        <div className="text-center py-16 md:py-24 px-4 md:px-8">
          <div className="animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-1/2 mx-auto mb-6"></div>
            <div className="h-12 bg-zinc-700 rounded w-1/4 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {isWalletConnected ? (
        <>
          {/* Chain Selection - Single Selection */}
          <div className="mb-6">
            <ToggleGroup
              type="single"
              value={selectedChain}
              onValueChange={handleChainChange}
              variant="outline"
              className="justify-start flex-wrap"
            >
              {aaveSupportedChains.map((chain) => {
                const isSelected = selectedChain === chain.id;
                return (
                  <ToggleGroupItem
                    key={chain.id}
                    value={chain.id}
                    aria-label={`Toggle ${chain.name}`}
                    className="relative h-8 w-8 p-1 overflow-hidden"
                  >
                    <Image
                      src={isSelected ? chain.brandedIcon : chain.icon}
                      alt={chain.name}
                      width={16}
                      height={16}
                      className="object-contain relative z-10"
                    />
                    {isSelected && (
                      <div
                        className={`pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r ${getTokenGradient(
                          chain.chainTokenSymbol,
                        )} opacity-70 blur-[20px] filter`}
                      />
                    )}
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </div>

          <SupplyBorrowMetricsHeaders
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          {activeTab === "supply" ? <SupplyComponent /> : <BorrowComponent />}
          <PoweredByAave />
        </>
      ) : (
        <>
          <div className="text-center py-16 md:py-24 px-4 md:px-8">
            <p className="text-zinc-400 mb-6 px-2 sm:px-8 md:px-16 lg:px-20 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
              please connect an EVM wallet (metamask, etc.) to view and manage
              your positions.
            </p>
            <div className="flex justify-center">
              <WalletConnectButton
                className="w-1/4 text-center rounded-lg"
                size="lg"
                walletType={WalletType.REOWN_EVM}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BorrowLendComponent;
