// src/components/TokenInitializer.tsx
"use client";

import { useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import { getPricesAndBalancesForActiveWallet } from "@/utils/tokenApiMethods";

/**
 * Component that initializes token data on dApp startup.
 */
const TokenInitializer: React.FC = () => {
  // Use separate selectors to avoid object reference changes
  const loadTokens = useWeb3Store((state) => state.loadTokens);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const activeWallet = useWeb3Store((state) => state.activeWallet);

  useEffect(() => {
    // Only load tokens if we don't already have them
    if (!tokensLoading && tokenCount === 0) {
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount]);

  useEffect(() => {
    // Fetch prices and balances for the active wallet
    if (sourceChain && destinationChain && tokenCount && activeWallet) {
      getPricesAndBalancesForActiveWallet();
    }
  }, [sourceChain, destinationChain, tokenCount, activeWallet]);

  return null;
};

export default TokenInitializer;
