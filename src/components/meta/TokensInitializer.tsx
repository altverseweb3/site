// src/components/TokenInitializer.tsx
"use client";

import { useEffect, useState } from "react";
import { useIdleTimer } from "react-idle-timer";
import useWeb3Store, {
  useSourceChain,
  useDestinationChain,
  useSourceToken,
  useDestinationToken,
} from "@/store/web3Store";
import { getPricesAndBalances } from "@/utils/tokens/tokenApiMethods";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";

/**
 * Component that initializes token data on dApp startup.
 * Includes idle detection to pause polling when user is inactive.
 */
const TokenInitializer: React.FC = () => {
  // Use separate selectors to avoid object reference changes
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();
  const destinationTokenId = useDestinationToken()?.id;
  const sourceTokenId = useSourceToken()?.id;
  const sourceWallet = useWalletByType(sourceChain.walletType);
  const destinationWallet = useWalletByType(destinationChain.walletType);

  // Track whether the user is active or idle
  const [isIdle, setIsIdle] = useState(false);

  // Set up idle timer with 2 minute timeout
  useIdleTimer({
    timeout: 1000 * 60 * 2,
    onIdle: () => setIsIdle(true),
    onActive: () => setIsIdle(false),
    debounce: 500,
  });

  useEffect(() => {
    // Fetch prices and balances for the active wallet
    if (sourceChain && destinationChain && tokenCount) {
      // Function to fetch data
      const fetchData = () => {
        if (!isIdle) {
          getPricesAndBalances(
            sourceChain,
            destinationChain,
            sourceWallet?.address,
            destinationWallet?.address,
          );
        }
      };

      // Initial fetch when dependencies change (regardless of idle state)
      getPricesAndBalances(
        sourceChain,
        destinationChain,
        sourceWallet?.address,
        destinationWallet?.address,
      );

      // Set up interval to run every 10 seconds
      const intervalId = setInterval(fetchData, 10000); // 10 seconds

      // Clean up interval when component unmounts or dependencies change
      return () => clearInterval(intervalId);
    }
  }, [
    sourceChain,
    destinationChain,
    tokenCount,
    isIdle,
    destinationTokenId,
    sourceTokenId,
    sourceWallet,
    destinationWallet,
  ]);

  return null;
};

export default TokenInitializer;
