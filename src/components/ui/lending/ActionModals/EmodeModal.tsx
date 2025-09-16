"use client";

import { useState, useEffect } from "react";
import { Check, X, ExternalLink, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { useEmodeOperations } from "@/hooks/lending/useEmodeOperations";
import { UnifiedReserveData, UserBorrowData } from "@/types/aave";
import Image from "next/image";
import { formatPercentage } from "@/utils/formatters";

interface EmodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  unifiedReserves: UnifiedReserveData[];
  marketBorrowData: Record<string, UserBorrowData>;
  userAddress: string;
  refetchMarkets?: () => void;
}

export default function EmodeModal({
  isOpen,
  onClose,
  unifiedReserves,
  marketBorrowData,
  userAddress,
  refetchMarkets,
}: EmodeModalProps) {
  const [selectedMarketKey, setSelectedMarketKey] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  // Use the new emode operations hook
  const {
    handleEmodeToggle,
    isLoading: isProcessing,
    error: emodeError,
    hasIncompatiblePositions,
    getMarketsWithEmode,
    getCategoryOptions,
  } = useEmodeOperations({
    userAddress,
    unifiedReserves,
    marketBorrowData,
    refetchMarkets,
  });

  // Get markets with eMode categories using the hook
  const marketsWithEmode = getMarketsWithEmode();

  const selectedMarketData = marketsWithEmode.find(
    (option) => option.key === selectedMarketKey,
  );

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedMarketKey("");
      setSelectedCategoryId(null);
    }
  }, [isOpen]);

  // Reset category selection when market changes
  useEffect(() => {
    setSelectedCategoryId(null);
  }, [selectedMarketKey]);

  // Select first market by default when modal opens and markets are available
  useEffect(() => {
    if (isOpen && marketsWithEmode.length > 0 && !selectedMarketKey) {
      setSelectedMarketKey(marketsWithEmode[0].key);
    }
  }, [isOpen, marketsWithEmode, selectedMarketKey]);

  // Get current emode category and category options using the hook
  const currentEmodeCategory =
    selectedMarketData?.unifiedReserve?.emodeCategory?.id;
  const categoryOptions = getCategoryOptions(selectedMarketData);

  const selectedCategory = categoryOptions.find(
    (option) => option.category.id === selectedCategoryId,
  );

  // Handle emode toggle - call the hook's function
  const handleEmodeToggleWrapper = async () => {
    if (!selectedMarketData || !selectedCategory) return;

    await handleEmodeToggle(
      selectedMarketData,
      selectedCategory,
      selectedCategoryId,
    );

    // Close modal on success (hook handles error toasts)
    onClose();
  };

  // Check if user has incompatible positions using the hook
  const incompatiblePositions =
    selectedMarketData && selectedCategory
      ? hasIncompatiblePositions(selectedMarketData, selectedCategory)
      : false;

  const getButtonText = () => {
    if (isProcessing) return "processing...";
    if (selectedCategory?.isCurrentlyEnabled) return "disable e-mode";

    // Check if e-mode is enabled on a different category
    if (
      currentEmodeCategory !== undefined &&
      selectedCategoryId !== currentEmodeCategory
    ) {
      return "switch e-mode";
    }

    return "enable e-mode";
  };

  const isButtonDisabled =
    isProcessing ||
    !selectedMarketData ||
    selectedCategoryId === null ||
    incompatiblePositions;

  // Don't render if no markets with eMode
  if (marketsWithEmode.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-0.5rem)] max-w-[500px] bg-[#18181B] border-[#27272A] max-h-[95vh] overflow-y-auto sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="pb-1 sm:pb-2 text-left">
          <DialogTitle className="text-[#FAFAFA] text-base sm:text-lg font-semibold">
            efficiency mode (e-mode)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-5">
          {/* Information Paragraph */}
          <div>
            <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed">
              efficiency mode optimizes borrowing power for price-correlated
              assets. enabling e-mode provides lower collateral requirements and
              higher borrowing capacity for assets in the same category;
              however, borrowing is restricted to assets within the selected
              category.{" "}
              <a
                href="https://aave.com/help/borrowing/e-mode"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline inline-flex items-center gap-1"
              >
                learn more
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Chain/Market Selection */}
          <div className="space-y-1.5">
            <label className="text-xs sm:text-sm text-[#A1A1AA]">
              select chain/market:
            </label>
            <Select
              value={selectedMarketKey}
              onValueChange={setSelectedMarketKey}
            >
              <SelectTrigger className="w-full p-2 sm:p-3 bg-[#1F1F23] border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]/50 text-sm sm:text-base focus:ring-1 focus:ring-sky-500 focus:ring-offset-0">
                <SelectValue placeholder="select market">
                  {selectedMarketData ? (
                    <div className="flex items-center gap-2">
                      <Image
                        src={
                          selectedMarketData.unifiedReserve.marketInfo.chain
                            .icon
                        }
                        alt={
                          selectedMarketData.unifiedReserve.marketInfo.chain
                            .name
                        }
                        width={22}
                        height={22}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/images/tokens/default.svg";
                        }}
                      />
                      <span>{selectedMarketData.label}</span>
                    </div>
                  ) : (
                    "Select market"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#1F1F23] border-[#27272A]">
                {marketsWithEmode.map((option) => (
                  <SelectItem
                    key={option.key}
                    value={option.key}
                    className="text-[#A1A1AA] hover:bg-[#27272A]/50 focus:bg-[#27272A]/50 focus:text-[#FAFAFA] text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={option.unifiedReserve.marketInfo.chain.icon}
                        alt={option.unifiedReserve.marketInfo.chain.name}
                        width={22}
                        height={22}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/images/tokens/default.svg";
                        }}
                      />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Currently Selected Category Display */}
          {selectedMarketData && currentEmodeCategory !== undefined && (
            <div className="flex items-center gap-1 text-xs sm:text-sm">
              <span className="text-[#A1A1AA]">
                currently enabled category:
              </span>
              <span className="text-[#FAFAFA] font-medium">
                {selectedMarketData.categories
                  .find((cat) => cat.id === currentEmodeCategory)
                  ?.label.toLowerCase()}
              </span>
            </div>
          )}

          {/* Asset Category Selection */}
          {selectedMarketData && (
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm text-[#A1A1AA]">
                select asset category:
              </label>
              <Select
                value={selectedCategoryId?.toString() || ""}
                onValueChange={(value) => setSelectedCategoryId(Number(value))}
              >
                <SelectTrigger className="w-full h-auto bg-[#1F1F23] border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]/50 text-sm sm:text-base focus:ring-1 focus:ring-sky-500 focus:ring-offset-0">
                  <SelectValue placeholder="select category">
                    {selectedCategory ? (
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {selectedCategory.category.label.toLowerCase()}
                        </span>
                        <span className="text-xs text-[#A1A1AA] font-bold">
                          max LTV:{" "}
                          <span className="font-mono">
                            {formatPercentage(
                              parseFloat(
                                selectedCategory.category.maxLTV.value,
                              ) * 100,
                            )}
                          </span>
                        </span>
                      </div>
                    ) : (
                      "select category"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#1F1F23] border-[#27272A]">
                  {categoryOptions.map((option) => (
                    <SelectItem
                      key={option.category.id}
                      value={option.category.id.toString()}
                      className="text-[#A1A1AA] hover:bg-[#27272A]/50 focus:bg-[#27272A]/50 focus:text-[#FAFAFA] text-sm sm:text-base"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {option.category.label.toLowerCase()}
                        </span>
                        <span className="text-xs text-[#A1A1AA] font-bold">
                          max LTV:{" "}
                          {formatPercentage(
                            parseFloat(option.category.maxLTV.value) * 100,
                          )}{" "}
                          | liquidation threshold:{" "}
                          <span className="font-mono">
                            {formatPercentage(
                              parseFloat(
                                option.category.liquidationThreshold.value,
                              ) * 100,
                            )}
                          </span>
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assets Table */}
          {selectedCategory && (
            <div className="bg-[#1F1F23] border border-[#27272A] rounded-lg p-3 sm:p-4 space-y-3">
              <h3 className="text-[#FAFAFA] font-medium text-sm sm:text-base">
                assets in {selectedCategory.category.label.toLowerCase()}{" "}
                category
              </h3>

              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-3 gap-4 text-xs text-[#A1A1AA] font-medium border-b border-[#27272A] pb-2">
                  <span>asset</span>
                  <span className="text-center">collateralizable</span>
                  <span className="text-center">borrowable</span>
                </div>

                {/* Table Rows */}
                {selectedCategory.category.reserves.map((reserve, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 gap-4 items-center py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Image
                        src={reserve.underlyingToken.imageUrl}
                        alt={reserve.underlyingToken.symbol}
                        width={24}
                        height={24}
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.src = "/images/tokens/default.svg";
                        }}
                      />
                      <span className="text-[#FAFAFA] text-sm font-medium">
                        {reserve.underlyingToken.symbol}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      {reserve.canBeCollateral ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </div>

                    <div className="flex justify-center">
                      {reserve.canBeBorrowed ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Incompatible Positions Warning */}
          {incompatiblePositions && (
            <div className="flex items-center space-x-1 text-red-500">
              <Info className="w-5 h-5" />
              <span className="text-xs pl-1 sm:pl-0">
                please close all positions that are not borrowable in this
                e-mode category to enable e-mode
              </span>
            </div>
          )}

          {/* Error Display */}
          {emodeError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{emodeError}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <BrandedButton
              onClick={handleEmodeToggleWrapper}
              disabled={isButtonDisabled}
              buttonText={getButtonText()}
              className="w-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
