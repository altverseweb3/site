"use client";
import React, { useEffect, useState } from "react";
import { useTokenTransfer } from "@/utils/swap/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";
import { toast } from "sonner";
import {
  useSourceToken,
  useDestinationToken,
  useSourceChain,
  useDestinationChain,
  useTransactionDetails,
  useSetActiveSwapSection,
} from "@/store/web3Store";
import {
  useConnectedRequiredWallet,
  useDestinationWallet,
} from "@/hooks/dynamic/useUserWallets";

const SwapComponent: React.FC = () => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const setActiveSwapSection = useSetActiveSwapSection();
  const destinationWallet = useDestinationWallet();
  const transactionDetails = useTransactionDetails();
  const isConnectedRequiredWallet = useConnectedRequiredWallet();
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);

  // Use the shared hook with tracking enabled
  const {
    amount,
    handleAmountChange,
    isButtonDisabled,
    handleTransfer,
    receiveAmount,
    isLoadingQuote,
    estimatedTimeSeconds,
    totalFeeUsd,
    protocolFeeUsd,
    relayerFeeUsd,
    swapAmounts,
  } = useTokenTransfer({
    type: "vanilla",
    sourceChain: useSourceChain(),
    destinationChain: useDestinationChain(),
    sourceToken: sourceToken,
    destinationToken: destinationToken,
    transactionDetails: transactionDetails,
    enableTracking: true,
    onSuccess: () => {},
    onSwapInitiated: () => {},
  });

  useEffect(() => {
    setActiveSwapSection("swap");
  }, [setActiveSwapSection]);

  const handleSwapClick = async (): Promise<string | void> => {
    if (!destinationWallet && !transactionDetails.receiveAddress) {
      setShowTransactionDetails(true);
      toast.info(
        "Please connect your destination wallet, or enter a destination address to proceed with the swap.",
      );
      return;
    }
    return await handleTransfer();
  };

  const handleToggleTransactionDetails = () => {
    setShowTransactionDetails((prev) => !prev);
  };

  return (
    <TokenTransfer
      amount={amount}
      onAmountChange={handleAmountChange}
      isButtonDisabled={isButtonDisabled}
      hasActiveWallet={!!isConnectedRequiredWallet}
      onTransfer={handleSwapClick}
      swapAmounts={swapAmounts}
      transferType="swap"
      actionIcon="Coins"
      showDestinationTokenSelector={true}
      receiveAmount={receiveAmount}
      isLoadingQuote={isLoadingQuote}
      hasSourceToken={!!sourceToken}
      hasDestinationToken={!!destinationToken}
      estimatedTimeSeconds={estimatedTimeSeconds}
      showTransactionDetails={showTransactionDetails}
      onToggleTransactionDetails={handleToggleTransactionDetails}
      protocolFeeUsd={protocolFeeUsd ?? undefined}
      relayerFeeUsd={relayerFeeUsd ?? undefined}
      totalFeeUsd={totalFeeUsd ?? undefined}
    />
  );
};

export default SwapComponent;
