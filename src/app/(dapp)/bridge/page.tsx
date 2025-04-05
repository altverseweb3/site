"use client";

import React from "react";
import { useTokenTransfer } from "@/utils/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";

const BridgeComponent: React.FC = () => {
  const {
    amount,
    handleAmountChange,
    isButtonDisabled,
    activeWallet,
    handleTransfer,
    receiveAmount,
    isLoadingQuote,
    sourceToken,
    estimatedTimeSeconds,
  } = useTokenTransfer({
    type: "bridge",
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log(
        `Bridge succeeded: ${amount} ${sourceToken.ticker} → ${destinationToken?.ticker}`,
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
      transferType="bridge"
      actionIcon="Cable"
      showDestinationTokenSelector={false}
      receiveAmount={receiveAmount}
      isLoadingQuote={isLoadingQuote}
      hasSourceToken={!!sourceToken}
      hasDestinationToken={true}
      estimatedTimeSeconds={estimatedTimeSeconds}
    />
  );
};

export default BridgeComponent;
