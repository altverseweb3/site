"use client";

import React from "react";
import { useTokenTransfer } from "@/utils/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";

const SwapComponent: React.FC = () => {
  // Use the shared hook for all swap functionality
  const {
    amount,
    handleAmountChange,
    isButtonDisabled,
    activeWallet,
    handleTransfer,
    receiveAmount,
    isLoadingQuote,
    sourceToken,
    destinationToken,
    estimatedTimeSeconds,
  } = useTokenTransfer({
    type: "swap",
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log(
        `Swap succeeded: ${amount} ${sourceToken.ticker} → ${destinationToken?.ticker}`,
      );
    },
  });

  return (
    <TokenTransfer
      amount={amount}
      onAmountChange={handleAmountChange}
      isButtonDisabled={isButtonDisabled}
      hasActiveWallet={!!activeWallet}
      onTransfer={handleTransfer}
      transferType="swap"
      actionIcon="Coins"
      showDestinationTokenSelector={true}
      receiveAmount={receiveAmount}
      isLoadingQuote={isLoadingQuote}
      hasSourceToken={!!sourceToken}
      hasDestinationToken={!!destinationToken}
      estimatedTimeSeconds={estimatedTimeSeconds}
    />
  );
};

export default SwapComponent;
