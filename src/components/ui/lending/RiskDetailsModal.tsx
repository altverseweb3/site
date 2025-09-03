"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Slider } from "@/components/ui/Slider";
import { ChainId } from "@/types/aave";
import { formatHealthFactor } from "@/utils/formatters";

interface MarketRiskData {
  healthFactor: string | null;
  ltv: string | null;
  currentLiquidationThreshold: string | null;
  chainId: ChainId;
  chainName: string;
  marketName: string;
}

interface RiskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketRiskData: Record<string, MarketRiskData>;
  borrowMarketData: Record<
    string,
    {
      debt: string;
      collateral: string;
      currentLtv: string | null;
    }
  >;
}

interface DropdownOption {
  key: string;
  label: string;
  data: MarketRiskData;
}

export default function RiskDetailsModal({
  isOpen,
  onClose,
  marketRiskData,
  borrowMarketData,
}: RiskDetailsModalProps) {
  // Create dropdown options from market risk data
  const dropdownOptions: DropdownOption[] = React.useMemo(() => {
    return Object.entries(marketRiskData)
      .filter(([, data]) => data.healthFactor !== null) // Only include markets with borrow positions
      .map(([key, data]) => ({
        key,
        label: `${data.chainName} - ${data.marketName}`, // Display chain name and market name
        data,
      }));
  }, [marketRiskData]);

  const [selectedMarketKey, setSelectedMarketKey] = useState<string>(
    dropdownOptions[0]?.key || "",
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedMarketData = marketRiskData[selectedMarketKey];

  if (!selectedMarketData || dropdownOptions.length === 0) {
    return null;
  }

  const healthFactorValue = selectedMarketData.healthFactor
    ? parseFloat(selectedMarketData.healthFactor)
    : 0;

  // Get the current LTV usage from borrowMarketData (calculated as debt/collateral * 100)
  const currentLtvData = borrowMarketData[selectedMarketKey];
  const currentLtvValue = currentLtvData?.currentLtv
    ? parseFloat(currentLtvData.currentLtv)
    : 0;

  // Get the maximum LTV from market data (protocol limit)
  const maxLtvValue = selectedMarketData.ltv
    ? parseFloat(selectedMarketData.ltv)
    : 0;

  const liquidationThreshold = selectedMarketData.currentLiquidationThreshold
    ? parseFloat(selectedMarketData.currentLiquidationThreshold)
    : 0;

  // Cap health factor display at 5 for slider
  const displayHealthFactor = Math.min(healthFactorValue, 5);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-[500px] bg-[#18181B] border-[#27272A] max-h-[95vh] overflow-y-auto mx-1 sm:mx-4 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="text-[#FAFAFA] text-base sm:text-lg font-semibold">
            liquidation risk details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Market Selection Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm text-[#A1A1AA]">
              select chain/market
            </label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between p-2 sm:p-3 bg-[#1F1F23] border border-[#27272A] rounded-lg text-[#FAFAFA] hover:bg-[#27272A]/50 transition-colors text-sm sm:text-base"
              >
                <span className="truncate pr-2">
                  {dropdownOptions.find((opt) => opt.key === selectedMarketKey)
                    ?.label || selectedMarketKey}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#A1A1AA] transition-transform flex-shrink-0 ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#1F1F23] border border-[#27272A] rounded-lg shadow-lg overflow-hidden">
                  {dropdownOptions.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSelectedMarketKey(option.key);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 sm:p-3 hover:bg-[#27272A]/50 transition-colors text-sm sm:text-base ${
                        selectedMarketKey === option.key
                          ? "bg-[#27272A]/50 text-[#FAFAFA]"
                          : "text-[#A1A1AA]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Information Paragraph */}
          <div>
            <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed">
              your health factor and loan to value determine the assurance of
              your collateral. to avoid liquidations you can supply more
              collateral or repay borrow positions.{" "}
              <a
                href="https://aave.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1"
              >
                learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Health Factor Card */}
          <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
            <h3 className="text-[#FAFAFA] font-medium text-sm sm:text-base">
              health factor
            </h3>
            <p className="text-[#A1A1AA] text-xs sm:text-sm">
              safety of your deposited collateral against the borrowed assets
              and its underlying value.
            </p>

            {/* Health Factor Slider */}
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex-1 min-w-0">
                  <Slider
                    value={[displayHealthFactor]}
                    min={0}
                    max={5}
                    step={0.01}
                    disabled
                    className="w-full
                      [&_.bg-primary]:bg-sky-500
                      [&_.bg-primary\\/20]:bg-[#27272A]
                      [&_[role=slider]]:border-[#3F3F46]
                      [&_[role=slider]]:bg-sky-500
                      [&_[role=slider]]:pointer-events-none
                    "
                  />
                </div>
                <div className="text-right text-[#FAFAFA] text-xs sm:text-sm font-mono w-12 sm:w-[60px] flex-shrink-0">
                  {formatHealthFactor(selectedMarketData.healthFactor).value}
                </div>
              </div>

              {/* Slider Labels */}
              <div className="relative text-xs text-[#A1A1AA] px-1 pb-1.5">
                <div className="absolute left-0">0</div>
                <div className="absolute" style={{ left: "20%" }}>
                  1.00
                </div>
                <div className="absolute right-0" style={{ right: "18%" }}>
                  5+
                </div>
              </div>

              <p className="text-[#A1A1AA] text-xs sm:text-sm">
                if the health factor goes below 1.00, the liquidation of your
                collateral might be triggered.
              </p>
            </div>
          </div>

          {/* Current LTV Card */}
          <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-2.5 sm:p-4 space-y-2.5 sm:space-y-3">
            <h3 className="text-[#FAFAFA] font-medium text-xs sm:text-base">
              current LTV
            </h3>
            <p className="text-[#A1A1AA] text-xs">
              your current loan to value based on your collateral supplied.
            </p>

            {/* LTV Slider */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-1 min-w-0">
                  <Slider
                    value={[currentLtvValue]}
                    min={0}
                    max={100}
                    step={0.01}
                    disabled
                    className="w-full
                      [&_.bg-primary]:bg-amber-500
                      [&_.bg-primary\\/20]:bg-[#27272A]
                      [&_[role=slider]]:border-[#3F3F46]
                      [&_[role=slider]]:bg-amber-500
                      [&_[role=slider]]:pointer-events-none
                    "
                  />
                </div>
                <div className="text-right text-[#FAFAFA] text-xs font-mono w-10 sm:w-[60px] flex-shrink-0">
                  {currentLtvValue.toFixed(2)}%
                </div>
              </div>

              {/* Liquidation Threshold Label */}
              <div className="flex justify-center pb-1.5">
                <span className="text-xs text-[#A1A1AA]">
                  liquidation threshold: {liquidationThreshold.toFixed(2)}%
                </span>
              </div>

              <p className="text-[#A1A1AA] text-xs">
                if your loan to value goes above the liquidation threshold your
                collateral supplied may be liquidated. you can borrow up to a
                maximum LTV of{" "}
                <span className="text-amber-500">
                  {maxLtvValue.toFixed(2)}%
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
