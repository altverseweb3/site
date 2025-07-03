// src/components/TokenInitializer.tsx
"use client";

import { useEffect, useState } from "react";
import { useIdleTimer } from "react-idle-timer";
import useWeb3Store from "@/store/web3Store";
import { getPricesAndBalances } from "@/utils/tokens/tokenApiMethods";

/**
 * Component that initializes token data on dApp startup.
 * Includes idle detection to pause polling when user is inactive.
 */
const TokenInitializer: React.FC = () => {
  // Use separate selectors to avoid object reference changes
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const connectedWallets = useWeb3Store((state) => state.connectedWallets);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );
  const destinationToken = useWeb3Store((state) => state.destinationToken);
  const sourceToken = useWeb3Store((state) => state.sourceToken);

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
          console.log("Fetching token data - user is active");
          getPricesAndBalances();
        } else {
          console.log("Skipping token data fetch - user is idle");
        }
      };

      // Initial fetch when dependencies change (regardless of idle state)
      getPricesAndBalances();

      // Set up interval to run every 10 seconds
      const intervalId = setInterval(fetchData, 10000); // 10 seconds

      // Clean up interval when component unmounts or dependencies change
      return () => clearInterval(intervalId);
    }
  }, [
    sourceChain,
    destinationChain,
    tokenCount,
    requiredWallet,
    connectedWallets,
    isIdle,
    destinationToken,
    sourceToken,
  ]);

  return null;
};

export default TokenInitializer;
