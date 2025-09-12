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
import { useUserEMode, evmAddress } from "@aave/react";
import { useSendTransaction } from "@aave/react/ethers";
import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import { Market, EmodeMarketCategory, UserBorrowData } from "@/types/aave";
import { getChainByChainId } from "@/config/chains";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import Image from "next/image";
import { formatPercentage } from "@/utils/formatters";
import { Signer } from "ethers";
import { toast } from "sonner";

interface EmodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMarkets: Market[];
  userAddress?: string;
  refetchMarkets?: () => void;
  marketBorrowData: Record<string, UserBorrowData>;
}

interface MarketOption {
  key: string;
  label: string;
  market: Market;
  categories: EmodeMarketCategory[];
}

interface CategoryOption {
  category: EmodeMarketCategory;
  isCurrentlyEnabled: boolean;
}

export default function EmodeModal({
  isOpen,
  onClose,
  activeMarkets,
  userAddress,
  refetchMarkets,
  marketBorrowData,
}: EmodeModalProps) {
  const [selectedMarketKey, setSelectedMarketKey] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Get ethers provider and signer
  const { getEvmSigner } = useReownWalletProviderAndSigner();
  const [signer, setSigner] = useState<Signer>();

  // Get signer asynchronously
  useEffect(() => {
    const getSigner = async () => {
      try {
        const evmSigner = await getEvmSigner();
        setSigner(evmSigner);
      } catch (error) {
        console.error("Failed to get EVM signer:", error);
      }
    };

    getSigner();
  }, [getEvmSigner]);

  // Aave SDK hooks
  const [setEmode, settingEmode] = useUserEMode();
  const [sendTransaction, sending] = useSendTransaction(signer as Signer);

  // Chain switching hook (initialized with Ethereum as default)
  const { switchToChain, isLoading: isChainSwitching } = useChainSwitch(
    getChainByChainId(1), // Ethereum as default
  );

  // Combined loading state
  const isProcessing =
    settingEmode.loading || sending.loading || isChainSwitching;

  // Filter markets that have eMode categories
  const marketsWithEmode: MarketOption[] = activeMarkets
    .filter(
      (market) => market.eModeCategories && market.eModeCategories.length > 0,
    )
    .map((market) => ({
      key: `${market.chain.chainId}-${market.address}`,
      label: `${market.chain.name} - ${market.name}`,
      market,
      categories: market.eModeCategories || [],
    }));

  const selectedMarketData = marketsWithEmode.find(
    (option) => option.key === selectedMarketKey,
  );

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedMarketKey("");
      setSelectedCategoryId(null);
      setTransactionError(null);
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

  // Check if e-mode is currently enabled on any category in the selected market
  const currentEmodeCategory = selectedMarketData?.market.borrowReserves?.find(
    (reserve) => reserve.userState?.emode?.categoryId !== undefined,
  )?.userState?.emode?.categoryId;

  // Get category options for selected market
  const categoryOptions: CategoryOption[] = selectedMarketData
    ? selectedMarketData.categories.map((category) => {
        // Check if this specific category is currently enabled by looking at borrow reserves
        let isCurrentlyEnabled = false;

        if (selectedMarketData.market.borrowReserves) {
          // Check if any borrow reserve has this category enabled in userState.emode
          isCurrentlyEnabled = selectedMarketData.market.borrowReserves.some(
            (reserve) => {
              return reserve.userState?.emode?.categoryId === category.id;
            },
          );
        }

        return {
          category,
          isCurrentlyEnabled,
        };
      })
    : [];

  const selectedCategory = categoryOptions.find(
    (option) => option.category.id === selectedCategoryId,
  );

  const handleEmodeToggle = async () => {
    if (!selectedMarketData || !userAddress) return;

    // Clear any previous errors
    setTransactionError(null);

    try {
      // Get the required chain for the selected market
      const requiredChain = getChainByChainId(
        selectedMarketData.market.chain.chainId,
      );

      // Switch to the required chain
      const switchSuccess = await switchToChain(requiredChain);

      if (!switchSuccess) {
        toast.error(`failed to switch to ${requiredChain.name}`);
        setTransactionError(
          "failed to switch to the required network. please try again.",
        );
        return;
      }

      const categoryIdToSet = selectedCategory?.isCurrentlyEnabled
        ? null
        : selectedCategoryId;

      const result = await setEmode({
        market: selectedMarketData.market.address,
        user: evmAddress(userAddress),
        categoryId: categoryIdToSet,
        chainId: selectedMarketData.market.chain.chainId,
      }).andThen(sendTransaction);

      if (result.isErr()) {
        console.error("e-mode operation failed:", result.error);
        setTransactionError("Transaction failed. Please try again.");
      } else {
        console.log("e-mode operation successful with hash:", result.value);
        toast.success("e-mode operation completed successfully");
        // Refetch markets data to reflect the updated state
        if (refetchMarkets) {
          refetchMarkets();
        }
        // Close modal on success
        onClose();
      }
    } catch (error) {
      console.error("e-mode operation error:", error);
      setTransactionError("An unexpected error occurred. Please try again.");
    }
  };

  // Check if user has incompatible open borrow positions for e-mode
  const hasIncompatiblePositions = () => {
    if (!selectedMarketData || !selectedCategory) return false;

    // Get borrowable assets in the selected e-mode category
    const borrowableAssetsInCategory = new Set(
      selectedCategory.category.reserves
        .filter((reserve) => reserve.canBeBorrowed)
        .map((reserve) => reserve.underlyingToken.address.toLowerCase()),
    );

    // Get the market key for the selected market
    const marketKey = selectedMarketData.key;
    const userBorrowsForMarket = marketBorrowData[marketKey];

    if (!userBorrowsForMarket || !userBorrowsForMarket.borrows) {
      return false;
    }

    // Check each borrow position in the selected market
    return userBorrowsForMarket.borrows.some((borrowPosition) => {
      // Check if user has debt (borrowed amount > 0)
      const hasDebt = parseFloat(borrowPosition.debt.amount.value) > 0;

      if (!hasDebt) return false;

      // Check if this borrowed asset is NOT borrowable in the selected e-mode category
      const isIncompatible = !borrowableAssetsInCategory.has(
        borrowPosition.currency.address.toLowerCase(),
      );

      return isIncompatible;
    });
  };

  const incompatiblePositions = hasIncompatiblePositions();

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
                        src={selectedMarketData.market.chain.icon}
                        alt={selectedMarketData.market.chain.name}
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
                        src={option.market.chain.icon}
                        alt={option.market.chain.name}
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
          {transactionError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{transactionError}</p>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <BrandedButton
              onClick={handleEmodeToggle}
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
