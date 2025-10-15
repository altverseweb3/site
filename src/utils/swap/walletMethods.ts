// utils/walletMethods.ts

import { WalletType, Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  useAppKitAccount,
  useAppKit,
  useAppKitNetwork,
  useWalletInfo,
} from "@reown/appkit/react";
import { ChainNamespace, SolanaSigner } from "@/types/web3";
import { defineChain } from "@reown/appkit/networks";
import {
  getMayanQuote,
  executeEvmSwap,
  executeSolanaSwap,
  executeSuiSwap,
} from "@/utils/swap/mayanSwapMethods";
import { Quote } from "@mayanfinance/swap-sdk";
import { toast } from "sonner";
import { useSwapTracking } from "@/hooks/swap/useSwapTracking";
import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import { Connection } from "@solana/web3.js";
import { useWallet } from "@suiet/wallet-kit"; // Import Suiet hook
import {
  TokenTransferOptions,
  TokenTransferState,
  ExtendedQuote,
} from "@/types/web3";
import { recordSwap, SwapPayload } from "@/utils/metrics/metricsRecorder";
import {
  REFERRER_EVM,
  REFERRER_SOL,
  REFERRER_SUI,
  REFERRER_BPS,
} from "@/config/mayan";
import { parseSwapError } from "@/utils/formatters";
import { useConnectedRequiredWallet } from "@/hooks/dynamic/useUserWallets";

/**
 * Creates a properly formatted CAIP network ID with correct TypeScript typing
 * @param namespace The chain namespace (eip155, solana, etc)
 * @param chainId The chain ID
 * @returns A properly typed CAIP network ID
 */
function createCaipNetworkId(
  namespace: "eip155" | "solana" | "bip122" | "polkadot",
  chainId: number,
): `${typeof namespace}:${number}` {
  return `${namespace}:${chainId}` as `${typeof namespace}:${number}`;
}

/**
 * Custom hook for wallet connections via Reown AppKit
 * Handles both EVM (MetaMask) and Solana (Phantom) wallets through Reown
 * Also handles Sui wallets through Suiet
 * Supports connecting to multiple wallet types simultaneously
 */
export function useWalletConnection() {
  // Get the Reown AppKit modal control functions
  const { open, close } = useAppKit();

  // Track the wallet accounts for each namespace
  const evmAccount = useAppKitAccount({ namespace: "eip155" });
  const solanaAccount = useAppKitAccount({ namespace: "solana" });

  // Get Sui wallet info from Suiet
  const {
    connected: suiConnected,
    address: suiAddress,
    name: suiWalletName,
  } = useWallet();

  // Get wallet information for each namespace
  const { walletInfo: evmWalletInfo } = useWalletInfo();
  const { walletInfo: solanaWalletInfo } = useWalletInfo();

  // Get network/chain info for each namespace
  const evmNetwork = useAppKitNetwork();
  const solanaNetwork = useAppKitNetwork();

  // Track connection status in local state
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track which namespaces are connected
  const [connectedNamespaces, setConnectedNamespaces] = useState<{
    evm: boolean;
    solana: boolean;
    sui: boolean; // Add Sui to connected namespaces
  }>({ evm: false, solana: false, sui: false });

  // Update connected namespaces state when accounts change
  useEffect(() => {
    setConnectedNamespaces({
      evm: evmAccount.isConnected,
      solana: solanaAccount.isConnected,
      sui: suiConnected,
    });
  }, [evmAccount.isConnected, solanaAccount.isConnected, suiConnected]);

  useEffect(() => {
    if (evmAccount.isConnected && evmNetwork.chainId !== undefined) {
      const store = useWeb3Store.getState();
      const requiredWallet = store.getWalletBySourceChain();

      if (requiredWallet?.type === WalletType.EVM) {
        // Convert chainId to a number if it's a string
        const numericChainId =
          typeof evmNetwork.chainId === "string"
            ? parseInt(evmNetwork.chainId, 10)
            : evmNetwork.chainId;

        if (requiredWallet.chainId !== numericChainId) {
          store.updateWalletChainId(WalletType.EVM, numericChainId);
        }
      }
    }
  }, [evmNetwork.chainId, evmAccount.isConnected]);
  /**
   * Connect to a wallet via Reown AppKit or Suiet
   * @param walletType Specific wallet type to connect to
   */
  const connectWallet = useCallback(
    (walletType?: "metamask" | "phantom" | "walletConnect" | "sui") => {
      setConnecting(true);
      setError(null);

      try {
        if (walletType === "phantom") {
          // Open the Solana-specific connection modal
          open({ view: "Connect", namespace: "solana" });
        } else if (walletType === "metamask") {
          // Open the EVM-specific connection modal
          open({ view: "Connect", namespace: "eip155" });
        } else if (walletType === "walletConnect") {
          // For WalletConnect, just open the standard view
          open({ view: "Connect" });
        } else if (walletType === "sui") {
          // For Sui, we would trigger the Suiet wallet connection
          // This would typically happen through the CustomSuiConnectButton
          // Find and click the hidden button
          const suiButton = document.querySelector("[data-sui-wallet-button]");
          if (suiButton && suiButton instanceof HTMLButtonElement) {
            suiButton.click();
          } else {
            throw new Error(
              "Could not find Sui wallet button to trigger connection",
            );
          }
        } else {
          // Open the general connect modal
          open({ view: "Connect" });
        }
      } catch (error) {
        console.error("Error initiating wallet connection:", error);
        setError(
          typeof error === "string" ? error : "Failed to connect wallet",
        );
      } finally {
        setConnecting(false);
      }
    },
    [open],
  );

  /**
   * Checks if the connected wallet is MetaMask (based on wallet name)
   */
  const isMetaMask = useCallback(() => {
    if (!evmWalletInfo || !evmWalletInfo.name) return false;
    return evmWalletInfo.name.toLowerCase().includes("metamask");
  }, [evmWalletInfo]);

  /**
   * Checks if the connected wallet is Phantom (based on wallet name)
   */
  const isPhantom = useCallback(() => {
    if (!solanaWalletInfo || !solanaWalletInfo.name) return false;
    return solanaWalletInfo.name.toLowerCase().includes("phantom");
  }, [solanaWalletInfo]);

  /**
   * Checks if the connected wallet is a Sui wallet (Suiet, etc.)
   */
  const isSuiWallet = useCallback(() => {
    return suiConnected && !!suiAddress;
  }, [suiConnected, suiAddress]);

  return {
    // Connection state
    evmAccount,
    solanaAccount,
    suiConnected,
    suiAddress,
    connecting,
    error,

    // Connected states
    isEvmConnected: evmAccount.isConnected,
    isSolanaConnected: solanaAccount.isConnected,
    isSuiConnected: suiConnected,
    connectedNamespaces,

    // Wallet info
    evmWalletInfo,
    solanaWalletInfo,
    suiWalletName,
    isMetaMask: isMetaMask(),
    isPhantom: isPhantom(),
    isSuiWallet: isSuiWallet(),

    // Network/chain info
    evmNetwork,
    solanaNetwork,

    // Actions
    connectWallet,
    openModal: open,
    closeModal: close,
  };
}

/**
 * Enhanced hook for managing chain switching functionality in the UI
 * Uses Reown AppKit's network functions
 * Supports both EVM and Solana chains
 */
export function useChainSwitch(sourceChain: Chain) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletByChain(sourceChain),
  );

  // Get the wallet connection hook for access to both wallet types
  const { evmNetwork, solanaNetwork } = useWalletConnection();

  const switchToChain = useCallback(
    async (chain: Chain): Promise<boolean> => {
      setError(null);

      try {
        setIsLoading(true);

        const walletForChain = useWeb3Store.getState().getWalletByChain(chain);
        if (!walletForChain) {
          const errorMsg = `No ${chain.walletType} wallet connected for chain ${chain.name}`;
          setError(errorMsg);
          console.warn(errorMsg);
          return false;
        }

        // For Sui wallets, just update the store with the chain ID
        if (chain.walletType === WalletType.SUI) {
          useWeb3Store
            .getState()
            .updateWalletChainId(walletForChain.type, chain.chainId);
          return true;
        }

        // For EVM and Solana wallets, proceed with regular network switching
        const isSolanaChain = chain.walletType === WalletType.SOLANA;
        const isEvmChain = chain.walletType === WalletType.EVM;
        const namespace = isSolanaChain ? "solana" : "eip155";

        // Create properly typed CAIP network ID
        const caipNetworkId = createCaipNetworkId(
          namespace as "eip155" | "solana" | "bip122" | "polkadot",
          chain.chainId,
        );

        // Create a proper Reown network definition
        const reownNetwork = defineChain({
          id: chain.chainId,
          caipNetworkId: caipNetworkId,
          chainNamespace: namespace as ChainNamespace,
          name: chain.name,
          nativeCurrency: {
            decimals: chain.decimals,
            name: chain.currency,
            symbol: chain.nativeGasToken.symbol,
          },
          rpcUrls: {
            default: {
              http: chain.rpcUrls || [],
            },
          },
          blockExplorers: chain.explorerUrl
            ? {
                default: {
                  name: chain.name,
                  url: chain.explorerUrl,
                },
              }
            : undefined,
        });

        // Use the appropriate network switcher
        if (isSolanaChain) {
          await solanaNetwork.switchNetwork(reownNetwork);
        } else if (isEvmChain) {
          await evmNetwork.switchNetwork(reownNetwork);
        }

        useWeb3Store
          .getState()
          .updateWalletChainId(walletForChain.type, chain.chainId);
        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        const errorMsg = `Error switching chains: ${message}`;
        setError(errorMsg);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [setError, setIsLoading, solanaNetwork, evmNetwork],
  );

  /**
   * Switch to the source chain specified in the store
   */
  const switchToSourceChain = async (): Promise<boolean> => {
    setError(null);

    try {
      setIsLoading(true);
      return await switchToChain(sourceChain);
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
    requiredWallet,
    hasRequiredWallet: !!requiredWallet,
  };
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
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Add state for fee information
  const [protocolFeeBps, setProtocolFeeBps] = useState<number | null>(null);
  const [protocolFeeUsd, setProtocolFeeUsd] = useState<number | null>(null);
  const [relayerFeeUsd, setRelayerFeeUsd] = useState<number | null>(null);
  const [totalFeeUsd, setTotalFeeUsd] = useState<number | null>(null);
  const [swapId, setSwapId] = useState<string | null>(null);
  const isTrackingEnabled = options.enableTracking ?? false;
  const [progressToastId, setProgressToastId] = useState<
    number | string | null
  >(null);

  // Get relevant state from the web3 store
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletByChain(options.sourceChain),
  );

  // Get the transaction details for slippage
  const receiveAddress = options.transactionDetails.receiveAddress;

  // Get wallet providers and signers
  const { getEvmSigner, getSolanaSigner } = useReownWalletProviderAndSigner();

  const isWalletCompatible = useConnectedRequiredWallet();

  // Add the chain switch hook
  const { switchToSourceChain, isLoading: isChainSwitching } = useChainSwitch(
    options.sourceChain,
  );

  // Get wallet connection info for chain checking
  const { evmNetwork } = useWalletConnection();

  const latestRequestIdRef = useRef<number>(0);

  // Determine if source chain requires Solana or Sui
  const wallet = useWallet();
  const {
    status: swapStatus,
    isLoading: isTracking,
    error: trackingError,
  } = useSwapTracking(
    isTrackingEnabled ? swapId : null, // Only track if enabled and we have an ID
    {
      ...options.trackingOptions,
      onComplete: (status) => {
        // Dismiss the progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
          setProgressToastId(null);
        }

        // Show final success toast ONLY ONCE
        toast.success("Swap completed successfully", {
          description: `${amount} ${options.sourceToken!.ticker} → ${receiveAmount} ${options.destinationToken?.ticker}`,
        });

        // Call user's completion callback
        options.onTrackingComplete?.(status);

        // Call original success callback - but DON'T let it show another toast
        if (options.onSuccess) {
          options.onSuccess(
            amount,
            options.sourceToken!,
            options.destinationToken!,
          );
        }
      },
      onError: (error) => {
        console.error("Swap tracking error:", error);

        // Dismiss the progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
          setProgressToastId(null);
        }

        toast.error("Swap tracking failed", {
          description: error.message,
        });
        options.onError?.(parseSwapError(error));
      },
      onStatusUpdate: (status) => {
        // Update the progress toast with current status
        if (progressToastId) {
          const statusText = getStatusDescription(status.clientStatus);
          const stepsText = getStepsDescription(status.steps);

          toast.loading("Swap in progress...", {
            id: progressToastId,
            description: `${statusText}${stepsText ? ` • ${stepsText}` : ""}`,
          });
        }
      },
    },
  );

  // Helper function to get user-friendly status descriptions
  const getStatusDescription = (clientStatus: string): string => {
    switch (clientStatus) {
      case "PENDING":
        return "Waiting for confirmation";
      case "CONFIRMING":
        return "Confirming transaction";
      case "CONFIRMED":
        return "Transaction confirmed, processing swap";
      case "BRIDGING":
        return "Bridging tokens between chains";
      case "SWAPPING":
        return "Executing swap";
      case "RELEASING":
        return "Releasing destination tokens";
      default:
        return "Processing transaction";
    }
  };

  // Helper function to get current step description
  const getStepsDescription = (
    steps: Array<{
      title: string;
      status: string;
      type: string;
    }>,
  ): string => {
    if (!steps || steps.length === 0) return "";

    const completedSteps = steps.filter(
      (step) => step.status === "COMPLETED",
    ).length;
    const totalSteps = steps.length;

    if (completedSteps === 0) return "";

    return `Step ${completedSteps}/${totalSteps}`;
  };

  // Start progress toast when tracking begins
  useEffect(() => {
    if (isTracking && swapId && isTrackingEnabled && !progressToastId) {
      const toastId = toast.loading("Swap in progress...", {
        description: "Tracking transaction progress...",
        duration: Infinity, // Keep it open until we dismiss it
      });

      setProgressToastId(toastId);
    }
  }, [isTracking, swapId, isTrackingEnabled, progressToastId, options.type]);

  // Clean up progress toast if tracking stops unexpectedly
  useEffect(() => {
    if (!isTracking && progressToastId) {
      toast.dismiss(progressToastId);
      setProgressToastId(null);
    }
  }, [isTracking, progressToastId]);

  const failQuote = () => {
    setQuoteData(null);
    setReceiveAmount("");
    setIsLoadingQuote(false);
    setEstimatedTimeSeconds(null);
    // Reset fee information
    setProtocolFeeBps(null);
    setProtocolFeeUsd(null);
    setRelayerFeeUsd(null);
    setTotalFeeUsd(null);
  };

  // Convert slippage from string (e.g., "3.00%") to basis points (e.g., 300) or "auto"
  const getSlippageBps = useCallback((): "auto" | number => {
    if (options.transactionDetails.slippage) return "auto"; // Default to 'auto'

    if (options.transactionDetails.slippage === "auto") {
      return "auto";
    }

    // Remove "%" and convert to number
    const slippagePercent = parseFloat(
      options.transactionDetails.slippage.replace("%", ""),
    );

    // Convert percentage to basis points (1% = 100 bps)
    return Math.round(slippagePercent * 100);
  }, [options.transactionDetails.slippage]);

  // Convert gasDrop from store (number) or default to 0
  const getGasDrop = useCallback((): number => {
    // if it isn't set or isn't a number, fall back to 0
    if (
      options.transactionDetails.gasDrop === undefined ||
      typeof options.transactionDetails.gasDrop !== "number"
    ) {
      return 0;
    }
    return options.transactionDetails.gasDrop;
  }, [options.transactionDetails.gasDrop]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAmount(e.target.value);
  };

  const isValidForSwap = Boolean(
    options.sourceToken &&
      options.destinationToken &&
      amount &&
      parseFloat(amount) > 0,
  );

  // Update this useEffect to include fee calculation
  useEffect(() => {
    if (options.pauseQuoting === true) {
      failQuote();
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const fetchQuote = async () => {
      if (!isValidForSwap) {
        failQuote();
        return;
      }
      // Reset if no valid amount
      if (!amount || parseFloat(amount) <= 0) {
        failQuote();
        return;
      }

      // For swap: Check if we have both source and destination tokens
      if (!options.sourceToken || !options.destinationToken) {
        failQuote();
        return;
      }

      setIsLoadingQuote(true);

      // Generate a unique ID for this request
      const currentRequestId = ++latestRequestIdRef.current;

      try {
        let quotes: Quote[] = [];

        // Get current slippage in basis points
        const slippageBps = getSlippageBps();

        // Get gas drop
        const gasDrop = getGasDrop();

        // Set referrer
        const referrer = REFERRER_SOL;
        const referrerBps = REFERRER_BPS;
        // Use the source and destination chains and tokens from options
        const sourceChain = options.sourceChain;
        const destinationChain = options.destinationChain;
        const sourceToken = options.sourceToken;
        const destinationToken = options.destinationToken;

        if (sourceToken && destinationToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain, // using the reference defined above
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        }

        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          return; // Ignore stale responses
        }

        setQuoteData(quotes);

        if (quotes && quotes.length > 0) {
          // Cast the quote to ExtendedQuote to access additional properties
          const quote = quotes[0] as ExtendedQuote;
          const expectedAmountOut = quote.expectedAmountOut;
          const inputAmount = parseFloat(amount);
          const outputAmount = expectedAmountOut;

          // Extract ETA seconds if available
          if (quote.etaSeconds !== undefined) {
            setEstimatedTimeSeconds(quote.etaSeconds);
          } else {
            setEstimatedTimeSeconds(null);
          }

          // Calculate and set fee information
          // Protocol fee in BPS
          if (quote.protocolBps !== undefined) {
            setProtocolFeeBps(quote.protocolBps);

            // Calculate protocol fee in USD
            const protocolFeeUsdValue =
              inputAmount * (quote.protocolBps / 10000);
            setProtocolFeeUsd(parseFloat(protocolFeeUsdValue.toFixed(6)));
          } else {
            setProtocolFeeBps(null);
            setProtocolFeeUsd(null);
          }

          // Relayer fee in USD
          let relayerFee = null;
          if (
            quote.clientRelayerFeeSuccess !== undefined &&
            quote.clientRelayerFeeSuccess !== null
          ) {
            relayerFee = quote.clientRelayerFeeSuccess;
          } else if (
            quote.clientRelayerFeeRefund !== undefined &&
            quote.clientRelayerFeeRefund !== null
          ) {
            relayerFee = quote.clientRelayerFeeRefund;
          }

          if (relayerFee !== null) {
            setRelayerFeeUsd(parseFloat(relayerFee.toFixed(6)));
          } else {
            setRelayerFeeUsd(null);
          }

          // Calculate total fee - the difference between input and output
          const totalFee = inputAmount - outputAmount;

          if (!isNaN(totalFee)) {
            setTotalFeeUsd(parseFloat(totalFee.toFixed(6)));
          } else {
            setTotalFeeUsd(null);
          }

          // For bridging, we use the source token's decimals
          const decimals = destinationToken.decimals || 6;

          const formattedAmount = parseFloat(
            expectedAmountOut.toString(),
          ).toFixed(Math.min(decimals, 6));

          setReceiveAmount(formattedAmount);
        } else {
          failQuote();
        }
      } catch (error: unknown) {
        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          return; // Ignore errors from stale requests
        }

        let errorMessage = "Unknown error occurred";
        console.error("Raw error:", error);
        if (
          error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ) {
          errorMessage = error.message;

          if ("code" in error && typeof error.code === "number") {
            console.error("Error code:", error.code);
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
          console.error("Using Error.message:", errorMessage);
        } else if (typeof error === "string") {
          errorMessage = error;
          console.error("Using string error:", errorMessage);
        }

        toast.error(`Error: ${errorMessage}`);
        failQuote();
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
      failQuote();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    amount,
    options.sourceToken,
    options.destinationToken,
    options.sourceChain,
    options.destinationChain,
    options.type,
    options.transactionDetails.slippage,
    getSlippageBps,
    getGasDrop,
    refreshTrigger,
    isValidForSwap,
    options.pauseQuoting,
  ]);

  useEffect(() => {
    // Only set up interval if everything is valid
    if (!isValidForSwap) return;

    const intervalId = setInterval(() => {
      // Skip if already loading or processing
      if (isLoadingQuote || isProcessing) return;

      setRefreshTrigger((prev) => prev + 1);
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isValidForSwap, isLoadingQuote, isProcessing]);

  const swapAmounts = async (): Promise<void> => {
    setAmount(receiveAmount);
  };

  const handleTransfer = async (): Promise<string | void> => {
    if (!isValidForSwap) {
      toast.warning(`Invalid ${options.type} parameters`, {
        description: "Please select tokens and enter a valid amount",
      });
      return;
    }

    if (!receiveAddress) {
      switch (options.destinationChain.walletType) {
        case WalletType.SOLANA:
          throw new Error(
            "Please connect a Solana wallet or provide a receive address",
          );
        case WalletType.SUI:
          throw new Error(
            "Please connect a Sui wallet or provide a receive address",
          );
        case WalletType.EVM:
          throw new Error(
            "Please connect an EVM wallet or provide a receive address",
          );
        default:
          throw new Error("Please provide a receive address for the transfer");
      }
    }

    // Check if wallet is compatible with source chain
    if (!isWalletCompatible) {
      const requiredWalletType = options.sourceChain.walletType;

      toast.error(`${requiredWalletType} wallet required`, {
        description: `Please connect a ${requiredWalletType} wallet to continue`,
      });
      return;
    }

    // NEW: Check if we need to switch chains for EVM wallets
    if (options.sourceChain.walletType === WalletType.EVM && requiredWallet) {
      // Convert both chainIds to numbers for comparison
      const currentChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      const targetChainId = options.sourceChain.chainId;

      // If we're on the wrong chain, switch to the correct one
      if (currentChainId !== targetChainId) {
        // Show a loading toast for chain switching
        const switchToastId = toast.loading(
          `Switching to ${options.sourceChain.name}...`,
          {
            description: "Please confirm the network switch in your wallet",
          },
        );

        try {
          // Switch to the source chain and wait for completion
          const switchSuccess = await switchToSourceChain();

          if (!switchSuccess) {
            // Update the toast to show error instead of dismissing and creating new one
            toast.error("Failed to switch chains", {
              id: switchToastId, // Replace the loading toast
              description: `Please manually switch to ${options.sourceChain.name} in your wallet`,
            });
            return;
          }

          // Update the toast to show success instead of dismissing and creating new one
          toast.success(`Switched to ${options.sourceChain.name}`, {
            id: switchToastId, // Replace the loading toast
            description: "You can now proceed with the swap",
          });

          // Wait a bit for the chain switch to fully propagate
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error("Error switching chains:", error);
          // Update the toast to show error instead of dismissing and creating new one
          toast.error("Failed to switch chains", {
            id: switchToastId, // Replace the loading toast
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
          return;
        }
      }
    }

    // Generate a toast ID that we'll use for both success and error cases
    const toastId = isTrackingEnabled
      ? toast.loading("Initiating swap...", {
          description: "Please confirm the transaction in your wallet",
        })
      : toast.loading(`Swapping ${amount} ${options.sourceToken!.ticker}...`, {
          description: `From ${options.sourceChain.name} to ${options.destinationToken?.ticker}`,
        });

    try {
      setIsProcessing(true);

      let quotes: Quote[] = [];

      // Get current slippage in basis points
      const slippageBps = getSlippageBps();

      // Get gas drop
      const gasDrop = getGasDrop();

      // Set referrer
      const referrer = REFERRER_SOL;
      const referrerBps = REFERRER_BPS;

      // Use the source and destination chains and tokens from options
      const sourceChain = options.sourceChain;
      const destinationChain = options.destinationChain;
      const sourceToken = options.sourceToken;
      const destinationToken = options.destinationToken;
      // Refresh quote if needed
      if (!quoteData || quoteData.length === 0) {
        // Fetch fresh quote
        if (sourceToken && destinationToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken,
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        }

        setQuoteData(quotes);
      } else {
        // Use existing quote
        quotes = quoteData;
      }

      if (!quotes || quotes.length === 0) {
        throw new Error("Could not obtain a valid quote");
      }

      let result: string;

      // Execute the appropriate swap based on wallet type
      if (sourceChain.walletType === WalletType.SOLANA) {
        // Get Solana signer
        const solanaSigner = await getSolanaSigner();
        const connection = new Connection(
          `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`,
          "confirmed",
        );
        // Execute Solana swap
        result = await executeSolanaSwap({
          quote: quotes[0],
          swapperAddress: requiredWallet!.address,
          destinationAddress: receiveAddress,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: REFERRER_SOL,
            evm: REFERRER_EVM,
            sui: REFERRER_SUI,
          },
          solanaSigner: solanaSigner as SolanaSigner,
          connection: connection,
        });
      } else if (sourceChain.walletType === WalletType.SUI) {
        // Get Sui signer
        if (!wallet || !wallet.signAndExecuteTransaction) {
          throw new Error(
            "Sui wallet not connected or doesn't support signAndExecuteTransaction",
          );
        }
        result = await executeSuiSwap({
          quote: quotes[0],
          swapperAddress: requiredWallet!.address,
          destinationAddress: receiveAddress,
          referrerAddresses: {
            solana: REFERRER_SOL,
            evm: REFERRER_EVM,
            sui: REFERRER_SUI,
          },
          signTransaction: wallet.signTransaction,
        });
      } else {
        // Get EVM signer
        const evmSigner = await getEvmSigner();

        // Execute EVM swap
        result = await executeEvmSwap({
          quote: quotes[0],
          swapperAddress: requiredWallet!.address,
          destinationAddress: receiveAddress,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: REFERRER_SOL,
            evm: REFERRER_EVM,
            sui: REFERRER_SUI,
          },
          signer: evmSigner,
          tokenDecimals: sourceToken!.decimals || 18,
        });
      }

      setSwapId(result);

      // Get the expected amount out from the quote
      const quote = quotes[0] as ExtendedQuote;
      const amountOut = quote.expectedAmountOut.toString();

      const swapPayload: SwapPayload = {
        user_address: requiredWallet!.address,
        tx_hash: result,
        protocol: options.type,
        swap_provider: "mayan",
        source_chain: options.sourceChain.name,
        source_token_address: options.sourceToken!.address,
        source_token_symbol: options.sourceToken!.ticker,
        amount_in: amount,
        destination_chain: options.destinationChain.name,
        destination_token_address: options.destinationToken!.address,
        destination_token_symbol: options.destinationToken!.ticker,
        amount_out: amountOut,
        timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
      };

      // Send swap metrics to the backend
      try {
        await recordSwap(swapPayload);
      } catch (error) {
        console.error("Failed to record swap metrics:", error);
      }

      // Call the swap initiated callback
      options.onSwapInitiated?.(result);

      if (isTrackingEnabled) {
        // Update toast to show tracking has started
        toast.success("Transaction submitted successfully", {
          id: toastId,
          description: "Tracking swap progress...",
        });
        if (options.onSuccess) {
          options.onSuccess(amount, sourceToken!, destinationToken!);
        }
      } else {
        // Original behavior - immediate success
        toast.success("Swap completed successfully", {
          id: toastId,
          description: `Transferred ${amount} ${sourceToken!.ticker}`,
        });
      }

      return result; // Return swap ID for parent components
    } catch (error) {
      // Make sure to dismiss the loading toast
      toast.dismiss(toastId);

      // Use our new error parser to get a user-friendly message
      const friendlyError = parseSwapError(error);

      toast.error("Swap failed", {
        description: friendlyError,
      });
      setSwapId(null);

      // Still log the full error for debugging
      console.error(`${options.type} failed:`, error);

      if (options.onError) {
        options.onError(friendlyError);
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
    isValid: isValidForSwap,
    quoteData,
    receiveAmount,
    isLoadingQuote,

    // Store state
    estimatedTimeSeconds,

    // Fee information
    protocolFeeBps,
    protocolFeeUsd,
    relayerFeeUsd,
    totalFeeUsd,

    // Wallet compatibility
    isWalletCompatible,

    swapId,
    swapStatus,
    isTracking,
    trackingError,

    // Enhanced processing state (includes tracking)
    isProcessing:
      isProcessing || isChainSwitching || (isTrackingEnabled && isTracking),
    isButtonDisabled:
      !isValidForSwap ||
      isProcessing ||
      !isWalletCompatible ||
      isChainSwitching,
    // Actions
    handleTransfer,
    swapAmounts,
  };
}
