import { WalletInfo, WalletType, Token, Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { getMayanQuote } from "@/utils/mayanSwapMethods";
import { Quote } from "@mayanfinance/swap-sdk";

export async function connectMetamask(): Promise<WalletInfo | null> {
  if (!window.ethereum) {
    throw new Error("Metamask not installed");
  }

  try {
    const accounts = await window.ethereum.request<string[]>({
      method: "eth_requestAccounts",
    });

    const chainId = await window.ethereum.request<string>({
      method: "eth_chainId",
    });

    if (!accounts || accounts.length === 0 || !accounts[0]) {
      throw new Error("No accounts found");
    }

    const address = accounts[0];

    if (!chainId) {
      throw new Error("No chainId found");
    }

    const walletInfo: WalletInfo = {
      type: WalletType.METAMASK,
      name: "MetaMask",
      address,
      chainId: parseInt(chainId, 16),
    };

    // Update the store immediately on connection
    const store = useWeb3Store.getState();
    store.addWallet(walletInfo);

    // Set up account change listener
    window.ethereum.on("accountsChanged", (accounts: unknown) => {
      const store = useWeb3Store.getState();
      const newAccounts = accounts as string[];
      if (!newAccounts || newAccounts.length === 0) {
        // MetaMask was locked or disconnected
        store.removeWallet(WalletType.METAMASK);
      } else {
        // Account was switched
        store.updateWalletAddress(WalletType.METAMASK, newAccounts[0]);
      }
    });

    // Set up chain change listener
    window.ethereum.on("chainChanged", (chainId: unknown) => {
      const store = useWeb3Store.getState();
      store.updateWalletChainId(
        WalletType.METAMASK,
        parseInt(chainId as string, 16),
      );
    });

    // Set up disconnect listener
    window.ethereum.on("disconnect", () => {
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    });

    return walletInfo;
  } catch (error) {
    console.error("Error connecting to MetaMask:", error);
    return null;
  }
}

export async function disconnectMetamask(): Promise<void> {
  try {
    if (window.ethereum) {
      // Remove all event listeners
      window.ethereum.removeAllListeners("accountsChanged");
      window.ethereum.removeAllListeners("chainChanged");
      window.ethereum.removeAllListeners("disconnect");

      // Update the store
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.METAMASK);
    }
  } catch (error) {
    console.error("Error disconnecting from MetaMask:", error);
    throw error;
  }
}

// used to display truncated wallet address
export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Ensures the user's wallet is connected to the correct chain
 * Prompts the user to switch if necessary
 *
 * @param targetChain The chain we want to ensure is selected in the wallet
 * @returns Promise resolving to true if the chain is correct, or false if there was an error
 */
export async function ensureCorrectChain(targetChain: Chain): Promise<boolean> {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;

  if (!activeWallet) {
    console.error("No wallet connected");
    return false;
  }

  // Check if we're already on the correct chain
  if (activeWallet.chainId === targetChain.chainId) {
    return true;
  }

  // We need to switch chains
  console.log(
    `Switching from chain ${activeWallet.chainId} to ${targetChain.chainId}`,
  );

  // Handle different wallet types
  if (activeWallet.type === WalletType.METAMASK) {
    return switchMetamaskChain(targetChain);
  }

  // Add support for other wallet types here as needed

  // Default fallback - we don't know how to switch this wallet type
  console.error(
    `Unsupported wallet type for chain switching: ${activeWallet.type}`,
  );
  return false;
}

/**
 * Prompts the user to switch chains in MetaMask
 *
 * @param targetChain The chain to switch to
 * @returns Promise resolving to true if successful, false otherwise
 */
async function switchMetamaskChain(targetChain: Chain): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask not installed");
    return false;
  }

  try {
    const chainIdHex = `0x${targetChain.chainId.toString(16)}`;

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });

    return true;
  } catch (error: unknown) {
    // Type guard to check if error is an object with a code property
    if (typeof error === "object" && error !== null && "code" in error) {
      const ethError = error as { code: number };

      // Error code 4902 means the chain isn't added to MetaMask yet
      if (ethError.code === 4902) {
        return addChainToMetamask(targetChain);
      }
    }

    console.error("Error switching chain:", error);
    return false;
  }
}

/**
 * Adds a new chain to MetaMask if it doesn't exist
 *
 * @param chain The chain to add to MetaMask
 * @returns Promise resolving to true if successful, false otherwise
 */
async function addChainToMetamask(chain: Chain): Promise<boolean> {
  if (!window.ethereum) {
    console.error("MetaMask not installed");
    return false;
  }

  try {
    // Format chain parameters for MetaMask
    const params = {
      chainId: `0x${chain.chainId.toString(16)}`,
      chainName: chain.chainName,
      nativeCurrency: {
        name: chain.currency,
        symbol: chain.symbol,
        decimals: chain.decimals,
      },
      rpcUrls: [chain.rpcUrl],
      blockExplorerUrls: [chain.explorerUrl],
    };

    // Request to add the chain
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [params],
    });

    return true;
  } catch (error) {
    console.error("Error adding chain to MetaMask:", error);
    return false;
  }
}

/**
 * Convenience function to ensure the user's wallet is on the source chain
 * before performing a swap or bridge transaction
 *
 * @returns Promise resolving to true if the wallet is on the source chain
 */
export async function ensureSourceChain(): Promise<boolean> {
  const store = useWeb3Store.getState();
  return ensureCorrectChain(store.sourceChain);
}

interface ChainSwitchState {
  isLoading: boolean;
  error: string | null;
  /**
   * Ensure the user's wallet is connected to the source chain
   * @returns true if the wallet is connected to the source chain after the function call
   */
  switchToSourceChain: () => Promise<boolean>;
  /**
   * Ensure the user's wallet is connected to a specific chain
   * @param chain The chain to connect to
   * @returns true if the wallet is connected to the specified chain after the function call
   */
  switchToChain: (chain: Chain) => Promise<boolean>;
}

/**
 * Hook for managing chain switching functionality in the UI
 * Uses state for tracking loading/error status and handles chain switching logic
 */
export function useChainSwitch(): ChainSwitchState {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWallet = useWeb3Store((state) => state.activeWallet);

  /**
   * Switch to a specific chain
   * @param chain The chain to switch to
   */
  const switchToChain = async (chain: Chain): Promise<boolean> => {
    setError(null);

    // Check if wallet is connected
    if (!activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    try {
      setIsLoading(true);

      // Import dynamically to avoid server-side rendering issues
      const { ensureCorrectChain } = await import("@/utils/walletMethods");
      const success = await ensureCorrectChain(chain);

      if (!success) {
        const errorMsg = `Failed to switch to ${chain.name} network. Please try manually switching in your wallet.`;
        setError(errorMsg);
      }

      return success;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      const errorMsg = `Error switching chains: ${message}`;
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Switch to the source chain specified in the store
   */
  const switchToSourceChain = async (): Promise<boolean> => {
    setError(null);

    if (!activeWallet) {
      const errorMsg = "No wallet connected. Please connect your wallet first.";
      setError(errorMsg);
      return false;
    }

    // Get current chain ID directly from MetaMask
    if (window.ethereum) {
      try {
        const chainIdHex = await window.ethereum.request<string>({
          method: "eth_chainId",
        });
        const currentChainId = parseInt(chainIdHex as string, 16);
        const sourceChain = useWeb3Store.getState().sourceChain;

        console.log("Hook - Current MetaMask chainId:", currentChainId);
        console.log("Hook - Source chain ID:", sourceChain.chainId);

        // If already on the correct chain, no need to switch
        if (currentChainId === sourceChain.chainId) {
          return true;
        }

        // Ensure store is synced with current MetaMask state
        if (activeWallet.chainId !== currentChainId) {
          useWeb3Store
            .getState()
            .updateWalletChainId(activeWallet.type, currentChainId);
        }
      } catch (err) {
        console.error("Error checking MetaMask chain:", err);
      }
    }

    try {
      setIsLoading(true);
      const success = await ensureSourceChain();

      if (!success) {
        const sourceChain = useWeb3Store.getState().sourceChain;
        const errorMsg = `Failed to switch to ${sourceChain.name} network. Please try manually switching in your wallet.`;
        setError(errorMsg);
      }

      return success;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      const errorMsg = `Error switching to source chain: ${message}`;
      setError(errorMsg);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    switchToSourceChain,
    switchToChain,
  };
}

interface TokenTransferOptions {
  // Transfer type - affects UI text and functionality
  type: "swap" | "bridge";
  onSuccess?: (
    amount: string,
    sourceToken: Token,
    destinationToken: Token | null,
  ) => void;
  onError?: (error: Error) => void;
}

interface TokenTransferState {
  // Input state
  amount: string;
  setAmount: (amount: string) => void;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  isProcessing: boolean;

  isValid: boolean;
  isButtonDisabled: boolean;

  activeWallet: WalletInfo | null;
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken: Token | null;
  destinationToken: Token | null;
  quoteData: Quote[] | null;
  receiveAmount: string;
  isLoadingQuote: boolean;

  // Add estimated time in seconds from the quote
  estimatedTimeSeconds: number | null;

  handleTransfer: () => Promise<void>;
}

/**
 * Shared hook for token transfer functionality (swap or bridge)
 * Handles state management, validation, and transfer actions
 */
export function useTokenTransfer(
  options: TokenTransferOptions,
): TokenTransferState {
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quoteData, setQuoteData] = useState<Quote[] | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<string>("");
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState<
    number | null
  >(null);

  // Get relevant state from the web3 store
  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const sourceToken = useWeb3Store((state) => state.sourceToken);
  const destinationToken = useWeb3Store((state) => state.destinationToken);
  // Get the transaction details for slippage
  const transactionDetails = useWeb3Store((state) => state.transactionDetails);

  const latestRequestIdRef = useRef<number>(0);

  // Convert slippage from string (e.g., "3.00%") to basis points (e.g., 300) or "auto"
  const getSlippageBps = useCallback((): "auto" | number => {
    if (!transactionDetails.slippage) return "auto"; // Default to 'auto'

    if (transactionDetails.slippage === "auto") {
      return "auto";
    }

    // Remove "%" and convert to number
    const slippagePercent = parseFloat(
      transactionDetails.slippage.replace("%", ""),
    );

    // Convert percentage to basis points (1% = 100 bps)
    return Math.round(slippagePercent * 100);
  }, [transactionDetails.slippage]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAmount(e.target.value);
  };

  const isValidForSwap = Boolean(
    sourceToken && destinationToken && amount && parseFloat(amount) > 0,
  );
  const isValidForBridge = Boolean(
    sourceToken && amount && parseFloat(amount) > 0,
  );

  const isValid: boolean =
    options.type === "swap" ? isValidForSwap : isValidForBridge;

  const isButtonDisabled: boolean = !isValid || isProcessing || isLoadingQuote;

  // Update this useEffect to include slippage in the dependency array
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const fetchQuote = async () => {
      // Reset if no valid amount
      if (!amount || parseFloat(amount) <= 0) {
        setQuoteData(null);
        setReceiveAmount("");
        return;
      }

      // For swap: Check if we have both source and destination tokens
      if (options.type === "swap" && (!sourceToken || !destinationToken)) {
        setQuoteData(null);
        setReceiveAmount("");
        return;
      }

      // For bridge: Check if we have source token
      if (options.type === "bridge" && !sourceToken) {
        setQuoteData(null);
        setReceiveAmount("");
        return;
      }

      setIsLoadingQuote(true);

      // Generate a unique ID for this request
      const currentRequestId = ++latestRequestIdRef.current;

      try {
        let quotes: Quote[] = [];

        // Get current slippage in basis points
        const slippageBps = getSlippageBps();

        if (options.type === "swap" && sourceToken && destinationToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain,
            destinationChain,
            slippageBps,
          });
        } else if (options.type === "bridge" && sourceToken) {
          quotes = await getMayanBridgeQuote({
            amount,
            sourceToken,
            sourceChain,
            destinationChain,
            slippageBps,
          });
        }

        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          console.log(`Ignoring stale response for amount: ${amount}`);
          return; // Ignore stale responses
        }

        setQuoteData(quotes);

        if (quotes && quotes.length > 0) {
          const minAmountOut = quotes[0].minAmountOut;

          // Extract ETA seconds from the first quote if available
          if (quotes[0].etaSeconds !== undefined) {
            setEstimatedTimeSeconds(quotes[0].etaSeconds);
            console.log(`Estimated time: ${quotes[0].etaSeconds} seconds`);
          } else {
            setEstimatedTimeSeconds(null);
          }

          // For bridging, we use the source token's decimals
          const token =
            options.type === "swap" ? destinationToken! : sourceToken!;
          const decimals = token.decimals || 6;

          const formattedAmount = parseFloat(minAmountOut.toString()).toFixed(
            Math.min(decimals, 6),
          );

          setReceiveAmount(formattedAmount);

          console.log(`${options.type.toUpperCase()} Quote Updated:`, {
            requestId: currentRequestId,
            amount: amount,
            slippageBps: slippageBps,
            raw: minAmountOut,
            formatted: formattedAmount,
            etaSeconds: quotes[0].etaSeconds,
          });
        } else {
          setReceiveAmount("");
          setEstimatedTimeSeconds(null);
        }
      } catch (error: unknown) {
        // Error handling code unchanged...
        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          return; // Ignore errors from stale requests
        }

        let errorMessage = "Unknown error occurred";
        console.log("Raw error:", error);
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          errorMessage = error.message;
          console.log("Using error.message:", errorMessage);

          if ("code" in error && typeof error.code === "number") {
            console.log("Error code:", error.code);
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.log("Using Error.message:", errorMessage);
        } else if (typeof error === "string") {
          errorMessage = error;
          console.log("Using string error:", errorMessage);
        }

        toast.error(`Error: ${errorMessage}`);
        setQuoteData(null);
        setReceiveAmount("");
        setEstimatedTimeSeconds(null);
      } finally {
        // Only update loading state if this is the latest request
        if (currentRequestId === latestRequestIdRef.current) {
          setIsLoadingQuote(false);
        }
      }
    };

    if (amount && parseFloat(amount) > 0) {
      // Reset the loading state when starting a new request
      setIsLoadingQuote(true);

      // Add a small debounce to avoid excessive API calls
      timeoutId = setTimeout(fetchQuote, 300);
    } else {
      setQuoteData(null);
      setReceiveAmount("");
      setIsLoadingQuote(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    amount,
    sourceToken,
    destinationToken,
    sourceChain,
    destinationChain,
    options.type,
    transactionDetails.slippage, // Add slippage to the dependency array
    getSlippageBps,
  ]);

  const handleTransfer = async (): Promise<void> => {
    if (!isValid) {
      toast.warning(`Invalid ${options.type} parameters`, {
        description:
          options.type === "swap"
            ? "Please select tokens and enter a valid amount"
            : "Please select a token and enter a valid amount",
      });
      return;
    }

    try {
      setIsProcessing(true);

      const actionVerb = options.type === "swap" ? "Swapping" : "Bridging";
      const destination =
        options.type === "swap"
          ? destinationToken?.ticker
          : destinationChain.name;

      const toastId = toast.loading(
        `${actionVerb} ${amount} ${sourceToken!.ticker}...`,
        {
          description: `From ${sourceChain.name} to ${destination}`,
        },
      );

      console.log(
        `Initiating ${options.type} of ${amount} ${sourceToken!.ticker} to ${destination}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 500)); // TODO: implement the actual swap/bridge

      toast.success(
        `${options.type === "swap" ? "Swap" : "Bridge"} completed successfully`,
        {
          id: toastId,
          description: `Transferred ${amount} ${sourceToken!.ticker} to ${destination}`,
        },
      );

      if (options.onSuccess) {
        options.onSuccess(amount, sourceToken!, destinationToken);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Please try again";

      toast.error(`${options.type === "swap" ? "Swap" : "Bridge"} failed`, {
        description: errorMessage,
      });

      console.error(`${options.type} failed:`, error);

      if (options.onError && error instanceof Error) {
        options.onError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // State
    amount,
    setAmount,
    handleAmountChange,
    isProcessing,
    isValid,
    isButtonDisabled,
    quoteData,
    receiveAmount,
    isLoadingQuote,

    // Store state
    activeWallet,
    sourceChain,
    destinationChain,
    sourceToken,
    destinationToken,
    estimatedTimeSeconds,

    // Actions
    handleTransfer,
  };
}

export async function getMayanBridgeQuote({
  amount,
  sourceToken,
  sourceChain,
  destinationChain,
  slippageBps = "auto", // Default to 'auto' slippage
}: {
  amount: string;
  sourceToken: Token;
  sourceChain: Chain;
  destinationChain: Chain;
  slippageBps?: "auto" | number;
}): Promise<Quote[]> {
  return getMayanQuote({
    amount,
    sourceToken,
    destinationToken: sourceToken, // Same token on both chains
    sourceChain,
    destinationChain,
    slippageBps, // Pass through the slippage parameter
  });
}
