"use client";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import ChainPicker from "@/components/ui/ChainPicker";
import React, { useState, useEffect } from "react";
import {
  useSetActiveSwapSection,
  useIsWalletTypeConnected,
} from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { chainList } from "@/config/chains";
import { AaveSDK } from "@/utils/aave/aaveSDK";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const [selectedChain, setSelectedChain] = useState<string>(""); // Single chain selection
  const setActiveSwapSection = useSetActiveSwapSection();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const aaveLendingSupportedChains = chainList.filter((chain) =>
    AaveSDK.isChainSupported(chain.chainId),
  );

  useEffect(() => {
    setActiveSwapSection("lend");
  }, [setActiveSwapSection]);

  const handleChainChange = (value: string | string[]) => {
    const newValue = typeof value === "string" ? value : "";
    if (newValue !== "") {
      setSelectedChain(newValue);
    }
  };

  return (
    <div className="w-full">
      {isWalletConnected ? (
        <>
          <SupplyBorrowMetricsHeaders
            activeTab={activeTab}
            onTabChange={setActiveTab}
            chainPicker={
              <ChainPicker
                type="single"
                value={selectedChain}
                onSelectionChange={handleChainChange}
                chains={aaveLendingSupportedChains}
                size="md"
              />
            }
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
                className="w-full md:w-1/4 text-center rounded-lg !flex !justify-center !items-center"
                size="lg"
                walletType={WalletType.REOWN_EVM}
                showIcon={true}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BorrowLendComponent;
