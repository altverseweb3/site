"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Info } from "lucide-react";
import { evmAddress } from "@aave/react";
import { Chain } from "@/types/web3";
import { AaveMarket } from "@/types/aave";
import { AggregatedMarketUserState } from "./AggregatedMarketUserState";

interface DashboardContentProps {
  userAddress?: string;
  selectedChains: Chain[];
  activeMarkets: AaveMarket[];
}

export default function DashboardContent({
  userAddress,
  activeMarkets,
}: DashboardContentProps) {
  if (!userAddress) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">wallet not connected</div>
      </div>
    );
  }

  return (
    <AggregatedMarketUserState
      activeMarkets={activeMarkets}
      userWalletAddress={evmAddress(userAddress)}
    >
      {({ globalData, loading, error }) => (
        <DashboardContentInner
          globalData={globalData}
          loading={loading}
          error={error}
        />
      )}
    </AggregatedMarketUserState>
  );
}

interface DashboardContentInnerProps {
  globalData: {
    netWorth: string;
    netAPY: string;
  };
  loading: boolean;
  error: boolean;
}

function DashboardContentInner({
  globalData,
  loading,
  error,
}: DashboardContentInnerProps) {
  const [isSupplyMode, setIsSupplyMode] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);
  const [showZeroBalance, setShowZeroBalance] = useState(false);

  // Show loading state if any market is still loading
  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">loading dashboard data...</div>
      </div>
    );
  }

  // Show error state if any market has error
  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400">error loading dashboard data</div>
      </div>
    );
  }

  const supplyData = {
    balance: "$8,234.56",
    apy: "4.2%",
    collateral: "$7,890.12",
  };

  const borrowData = {
    balance: "$3,456.78",
    apy: "2.8%",
    borrowPowerUsed: "42%",
  };

  return (
    <div className="p-4">
      {/* Side-by-side Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Global Overview */}
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">
              global overview (all selected chains)
            </h3>
            <button className="px-2 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white">
              risk details
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net worth</div>
              <div className="text-sm font-semibold text-white">
                {globalData.netWorth}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">net APY</div>
              <div className="text-sm font-semibold text-green-400">
                {globalData.netAPY}
              </div>
            </div>
          </div>
        </div>

        {/* Supply/Borrow Overview */}
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">
              {isSupplyMode
                ? "supply overview (all selected chains)"
                : "borrow overview (all selected chains)"}
            </h3>
            <button
              className={`px-2 py-0.5 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white ${isSupplyMode ? "invisible" : "visible"}`}
            >
              e-mode
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">balance</div>
              <div className="text-sm font-semibold text-white">
                {isSupplyMode ? supplyData.balance : borrowData.balance}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">APY</div>
              <div
                className={`text-sm font-semibold ${isSupplyMode ? "text-green-400" : "text-red-400"}`}
              >
                {isSupplyMode ? supplyData.apy : borrowData.apy}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">
                {isSupplyMode ? "collateral" : "borrow power"}
              </div>
              <div
                className={`text-sm font-semibold ${isSupplyMode ? "text-white" : "text-orange-400"}`}
              >
                {isSupplyMode
                  ? supplyData.collateral
                  : borrowData.borrowPowerUsed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle Group Above Positions */}
      <div className="space-y-2 mb-4 ml-0.5">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex gap-4">
            <ToggleGroup
              type="single"
              value={isSupplyMode ? "supply" : "borrow"}
              onValueChange={(value) => setIsSupplyMode(value === "supply")}
            >
              <ToggleGroupItem
                value="supply"
                className="data-[state=on]:bg-amber-500/25 data-[state=on]:text-amber-300 data-[state=on]:border-[#61410B]"
              >
                supply
              </ToggleGroupItem>
              <ToggleGroupItem
                value="borrow"
                className="data-[state=on]:bg-amber-500/25 data-[state=on]:text-amber-300 data-[state=on]:border-[#61410B]"
              >
                borrow
              </ToggleGroupItem>
            </ToggleGroup>

            <ToggleGroup
              type="single"
              value={
                showAvailable
                  ? "available"
                  : isSupplyMode
                    ? "supplied"
                    : "borrowed"
              }
              onValueChange={(value) => setShowAvailable(value === "available")}
            >
              <ToggleGroupItem
                value="available"
                className="data-[state=on]:bg-sky-500/25 data-[state=on]:text-sky-300 data-[state=on]:border-sky-800"
              >
                available
              </ToggleGroupItem>
              <ToggleGroupItem
                value={isSupplyMode ? "supplied" : "borrowed"}
                className="data-[state=on]:bg-sky-500/25 data-[state=on]:text-sky-300 data-[state=on]:border-sky-800"
              >
                open
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Conditional Content */}
          <div className="flex items-center">
            {isSupplyMode ? (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZeroBalance}
                  onChange={(e) => setShowZeroBalance(e.target.checked)}
                  className="w-4 h-4 bg-[#27272A] border border-[#3F3F46] rounded text-amber-500"
                />
                <span className="text-xs text-[#A1A1AA]">
                  show assets with 0 balance
                </span>
              </label>
            ) : (
              <div className="flex items-center space-x-1 text-sky-500">
                <Info className="w-5 h-5" />
                <span className="text-xs pl-1 sm:pl-0">
                  to borrow you need to supply assets to be used as collateral
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Positions Content */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <div className="text-center py-8">
          <div className="text-[#A1A1AA] text-sm">
            {showAvailable
              ? `available ${isSupplyMode ? "supply" : "borrow"} positions will be displayed here`
              : `your ${isSupplyMode ? "supplied" : "borrowed"} positions will be displayed here`}
          </div>
        </div>
      </div>
    </div>
  );
}
