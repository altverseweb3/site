"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/Switch";

interface DashboardContentProps {
  userAddress?: string;
}

export default function DashboardContent({}: DashboardContentProps) {
  const [isSupplyMode, setIsSupplyMode] = useState(true);
  const [showAvailable, setShowAvailable] = useState(true);

  const globalData = {
    netWorth: "$12,345.67",
    netAPY: "3.45%",
    healthFactor: "2.34",
  };

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
            <h3 className="text-sm font-medium text-white">Global Overview</h3>
            <button className="px-2 py-1 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white">
              Risk Details
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">Net Worth</div>
              <div className="text-sm font-semibold text-white">
                {globalData.netWorth}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">Net APY</div>
              <div className="text-sm font-semibold text-green-400">
                {globalData.netAPY}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">Health Factor</div>
              <div className="text-sm font-semibold text-white">
                {globalData.healthFactor}
              </div>
            </div>
          </div>
        </div>

        {/* Supply/Borrow Overview */}
        <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-white">
              {isSupplyMode ? "Supply Overview" : "Borrow Overview"}
            </h3>
            <button
              className={`px-2 py-1 bg-[#27272A] hover:bg-[#3F3F46] border border-[#3F3F46] rounded text-xs text-white ${isSupplyMode ? "invisible" : "visible"}`}
            >
              E-Mode
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-xs text-[#A1A1AA] mb-1">Balance</div>
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
                {isSupplyMode ? "Collateral" : "Borrow Power"}
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

      {/* Switches Above Positions */}
      <div className="flex gap-4 mb-4 pl-0.5">
        <div className="flex items-center space-x-2">
          <span
            className={`text-xs ${!isSupplyMode ? "text-[#A1A1AA]" : "text-white"}`}
          >
            Supply
          </span>
          <Switch
            checked={!isSupplyMode}
            onCheckedChange={(checked) => setIsSupplyMode(!checked)}
          />
          <span
            className={`text-xs ${isSupplyMode ? "text-[#A1A1AA]" : "text-white"}`}
          >
            Borrow
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-xs ${!showAvailable ? "text-[#A1A1AA]" : "text-white"}`}
          >
            Available
          </span>
          <Switch
            checked={!showAvailable}
            onCheckedChange={(checked) => setShowAvailable(!checked)}
          />
          <span
            className={`text-xs ${showAvailable ? "text-[#A1A1AA]" : "text-white"}`}
          >
            {isSupplyMode ? "Supplied" : "Borrowed"}
          </span>
        </div>
      </div>

      {/* Positions Content */}
      <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-4">
        <div className="text-center py-8">
          <div className="text-[#A1A1AA] text-sm">
            {showAvailable
              ? `Available ${isSupplyMode ? "supply" : "borrow"} positions will be displayed here`
              : `Your ${isSupplyMode ? "supplied" : "borrowed"} positions will be displayed here`}
          </div>
        </div>
      </div>
    </div>
  );
}
