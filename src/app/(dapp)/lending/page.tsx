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

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const setActiveSwapSection = useSetActiveSwapSection();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  useEffect(() => {
    setActiveSwapSection("lend");
  }, [setActiveSwapSection]);

  return (
    <div className="w-full">
      {isWalletConnected ? (
        <>
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
