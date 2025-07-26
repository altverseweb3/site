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
          <div className="flex justify-center mt-8">
            <div className="w-1/4 text-center">
              <h2 className="text-lg font-semibold mb-4">
                connect your wallet
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                to supply or borrow assets, please connect your wallet.
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <WalletConnectButton
              className="w-1/4 text-center"
              size="lg"
              walletType={WalletType.REOWN_EVM}
            />
          </div>
        </>
      )}
    </div>
  );
};
export default BorrowLendComponent;
