"use client";
import React from "react";
import { useTokenTransfer } from "@/utils/swap/walletMethods";
import { TokenTransfer } from "@/components/ui/TokenTransfer";
import {
  useSourceToken,
  useDestinationToken,
  useSourceChain,
  useDestinationChain,
  useTransactionDetails,
  useGetWalletBySourceChain,
} from "@/store/web3Store";

const SwapComponent: React.FC = () => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

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
    type: "swap",
    sourceChain: useSourceChain(),
    destinationChain: useDestinationChain(),
    sourceToken: sourceToken,
    destinationToken: destinationToken,
    transactionDetails: useTransactionDetails(), // Use the shared transaction details
    enableTracking: true, // Enable automatic tracking
    onSuccess: (amount, sourceToken, destinationToken) => {
      // This now fires when the swap actually completes (after tracking)
      console.log(
        `Swap completed: ${amount} ${sourceToken.ticker} → ${destinationToken?.ticker}`,
      );
      // Any additional success logic can go here
    },
    onSwapInitiated: (swapId: string) => {
      // Optional: Log when swap transaction is submitted
      console.log("Swap initiated with ID:", swapId);
    },
  });

  return (
    <TokenTransfer
      amount={amount}
      onAmountChange={handleAmountChange}
      isButtonDisabled={isButtonDisabled}
      hasActiveWallet={!!useGetWalletBySourceChain()}
      onTransfer={handleTransfer}
      swapAmounts={swapAmounts}
      transferType="swap"
      actionIcon="Coins"
      showDestinationTokenSelector={true}
      receiveAmount={receiveAmount}
      isLoadingQuote={isLoadingQuote}
      hasSourceToken={!!sourceToken}
      hasDestinationToken={!!destinationToken}
      estimatedTimeSeconds={estimatedTimeSeconds}
      protocolFeeUsd={protocolFeeUsd ?? undefined}
      relayerFeeUsd={relayerFeeUsd ?? undefined}
      totalFeeUsd={totalFeeUsd ?? undefined}
    />
  );
};

export default SwapComponent;
