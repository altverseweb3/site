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
    sourceChain,
    destinationChain,
    handleTransfer,
  } = useTokenTransfer({
    type: "bridge",
    onSuccess: (amount, sourceToken) => {
      console.log(
        `Bridge succeeded: ${amount} ${sourceToken.ticker} from ${sourceChain.name} to ${destinationChain.name}`,
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
    />
  );
};

export default BridgeComponent;
