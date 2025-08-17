"use client";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import ChainPicker from "@/components/ui/ChainPicker";
import React, { useState, useEffect, useCallback } from "react";
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
import { useAaveDataLoader } from "@/utils/aave/dataLoader";
import { calculateUserMetrics } from "@/utils/aave/metricsCalculations";
import {
  UserPosition,
  UserBorrowPosition,
  AaveReserveData,
} from "@/types/aave";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const [oraclePrices, setOraclePrices] = useState<Record<string, number>>({});
  const [userSupplyPositions, setUserSupplyPositions] = useState<
    UserPosition[]
  >([]);
  const [userBorrowPositions, setUserBorrowPositions] = useState<
    UserBorrowPosition[]
  >([]);
  const [allReserves, setAllReserves] = useState<AaveReserveData[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const setActiveSwapSection = useSetActiveSwapSection();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const aaveChain = useAaveChain();
  const setAaveChain = useSetAaveChain();
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const chainTokens = getTokensForChain(aaveChain.chainId);

  const { loadAaveData } = useAaveDataLoader();
  const [loading, setLoading] = useState(false);
  const [lastChainId, setLastChainId] = useState<number | null>(null);

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
          await switchToChain(aaveChain);
        }
      }
    };

    alignWalletWithPersistedChain();
  }, [isWalletConnected, aaveChain, switchToChain]);

  const loadAaveDataCallback = useCallback(async () => {
    if (loading) {
      return;
    }

    if (lastChainId === aaveChain.chainId && allReserves.length > 0) {
      return;
    }

    try {
      setLoading(true);
      setIsLoadingPositions(true);
      const result = await loadAaveData({
        aaveChain,
        chainTokens,
        hasConnectedWallet: isWalletConnected,
        loading,
        lastChainId,
        allReservesLength: allReserves.length,
      });

      if (result) {
        setLastChainId(aaveChain.chainId);
        setAllReserves(result.allReserves);
        setOraclePrices(result.oraclePrices);
        setUserSupplyPositions(result.userSupplyPositions);
        setUserBorrowPositions(result.userBorrowPositions);
      }
    } catch (err) {
      console.error("Error loading Aave data:", err);
      setUserSupplyPositions([]);
      setUserBorrowPositions([]);
      setAllReserves([]);
      setOraclePrices({});
    } finally {
      setLoading(false);
      setIsLoadingPositions(false);
    }
  }, [
    loading,
    lastChainId,
    allReserves.length,
    loadAaveData,
    aaveChain,
    chainTokens,
    isWalletConnected,
  ]);

  useEffect(() => {
    loadAaveDataCallback();
  }, [loadAaveDataCallback]);

  useEffect(() => {
    if (lastChainId !== null && lastChainId !== aaveChain.chainId) {
      setUserSupplyPositions([]);
      setUserBorrowPositions([]);
      setAllReserves([]);
      setOraclePrices({});
    }
  }, [aaveChain.chainId, lastChainId]);

  // Manual refresh function for refresh buttons
  const loadAaveUserData = useCallback(async () => {
    setIsLoadingPositions(true);
    await loadAaveDataCallback();
  }, [loadAaveDataCallback]);

  // Calculate user metrics from positions
  const userMetrics = isWalletConnected
    ? calculateUserMetrics(userSupplyPositions, userBorrowPositions)
    : {
        netWorth: 0,
        netAPY: null,
        healthFactor: null,
        totalCollateralUSD: 0,
        totalDebtUSD: 0,
        currentLTV: 0,
        maxLTV: 0,
        liquidationThreshold: 0,
      };

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
            userSupplyPositions={userSupplyPositions}
            userBorrowPositions={userBorrowPositions}
            allReserves={allReserves}
            oraclePrices={oraclePrices}
            isLoading={isLoadingPositions}
          />
          {activeTab === "supply" ? (
            <SupplyComponent
              oraclePrices={oraclePrices}
              userSupplyPositions={userSupplyPositions}
              userBorrowPositions={userBorrowPositions}
              allReserves={allReserves}
              isLoading={isLoadingPositions}
              onRefresh={loadAaveUserData}
            />
          ) : (
            <BorrowComponent
              oraclePrices={oraclePrices}
              healthFactor={userMetrics.healthFactor || 0}
              totalCollateralUSD={userMetrics.totalCollateralUSD}
              totalDebtUSD={userMetrics.totalDebtUSD}
              currentLTV={userMetrics.currentLTV}
              liquidationThreshold={userMetrics.liquidationThreshold}
              userSupplyPositions={userSupplyPositions}
              userBorrowPositions={userBorrowPositions}
              allReserves={allReserves}
              isLoadingPositions={isLoadingPositions}
              onRefresh={loadAaveUserData}
            />
          )}
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
