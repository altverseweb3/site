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
  useAaveChain,
  useSetAaveChain,
} from "@/store/web3Store";
import useWeb3Store from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { chainList, getChainById } from "@/config/chains";
import { isChainSupported } from "@/config/aave";
import { useChainSwitch } from "@/utils/swap/walletMethods";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const setActiveSwapSection = useSetActiveSwapSection();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const aaveChain = useAaveChain();
  const setAaveChain = useSetAaveChain();

  const aaveLendingSupportedChains = chainList.filter((chain) =>
    isChainSupported(chain.chainId),
  );

  const { switchToChain } = useChainSwitch(aaveLendingSupportedChains[0]);

  useEffect(() => {
    setActiveSwapSection("lend");
  }, [setActiveSwapSection]);

  useEffect(() => {
    const isCurrentChainSupported = isChainSupported(aaveChain.chainId);
    if (!isCurrentChainSupported && aaveLendingSupportedChains.length > 0) {
      setAaveChain(aaveLendingSupportedChains[0]);
    }
  }, [aaveChain, aaveLendingSupportedChains, setAaveChain]);

  useEffect(() => {
    const alignWalletWithPersistedChain = async () => {
      if (isWalletConnected && aaveChain) {
        const currentWallet = useWeb3Store
          .getState()
          .getWalletByType(WalletType.REOWN_EVM);

        if (currentWallet && currentWallet.chainId !== aaveChain.chainId) {
          console.log(
            `Wallet on chain ${currentWallet.chainId}, switching to persisted aaveChain ${aaveChain.chainId}`,
          );
          await switchToChain(aaveChain);
        }
      }
    };

    alignWalletWithPersistedChain();
  }, [isWalletConnected, aaveChain, switchToChain]);

  const handleChainChange = async (value: string | string[]) => {
    const newChainId = typeof value === "string" ? value : "";
    if (newChainId !== "") {
      const newChain = getChainById(newChainId);
      if (newChain) {
        setAaveChain(newChain);

        await switchToChain(newChain);
      }
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
                value={aaveChain.id}
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
