// utils/walletMethods.ts

import { WalletInfo, WalletType, Token, Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  useAppKitAccount,
  useAppKit,
  useDisconnect,
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
import { useWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { Connection } from "@solana/web3.js";
import { useWallet } from "@suiet/wallet-kit"; // Import Suiet hook
import { SwapStatus } from "@/types/web3";
import { SwapTrackingOptions } from "@/types/web3";
import { useSwapTracking } from "@/hooks/useSwapTracking";

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
    disconnect: disconnectSui,
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

  /**
   * Helper function to sync wallet data to our store
   */
  const syncWalletToStore = useCallback(
    (
      walletType: WalletType,
      address: string,
      walletName: string,
      currentChainId?: string | number,
    ) => {
      // Map of known Solana network IDs
      const solanaNetworkMap: Record<string, number> = {
        "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp": 101, // Mainnet
        // Add other Solana networks as needed
      };

      // Map for Sui networks (add appropriate mappings)
      const suiNetworkMap: Record<string, number> = {
        mainnet: 1, // Sui mainnet
        testnet: 2,
        devnet: 3,
        // Add other Sui networks as needed
      };

      // Ensure chainId is a number
      let chainId: number;

      if (
        walletType === WalletType.REOWN_SOL &&
        typeof currentChainId === "string"
      ) {
        // Use the mapping for Solana networks
        chainId = solanaNetworkMap[currentChainId] || 101; // Default to 101 if unknown
      } else if (
        walletType === WalletType.SUIET_SUI &&
        typeof currentChainId === "string"
      ) {
        // Use the mapping for Sui networks
        chainId = suiNetworkMap[currentChainId] || 1; // Default to 1 (mainnet) if unknown
      } else if (currentChainId !== undefined) {
        // For EVM chains, parse normally
        chainId =
          typeof currentChainId === "string"
            ? parseInt(currentChainId, 10)
            : currentChainId;
      } else {
        // Fallbacks based on wallet type
        if (walletType === WalletType.REOWN_SOL) {
          chainId = 101; // Default Solana mainnet
        } else if (walletType === WalletType.SUIET_SUI) {
          chainId = 1; // Default Sui mainnet
        } else {
          chainId = 1; // Default Ethereum mainnet
        }
      }

      // Create wallet info object for our store
      const walletInfo: WalletInfo = {
        type: walletType,
        name: walletName,
        address,
        chainId,
      };

      // Update our app's store
      const store = useWeb3Store.getState();
      store.addWallet(walletInfo);

      console.log(
        `${walletType} wallet connected and synced with store:`,
        walletInfo,
      );
    },
    [],
  );

  // Update connected namespaces state when accounts change
  useEffect(() => {
    setConnectedNamespaces({
      evm: evmAccount.isConnected,
      solana: solanaAccount.isConnected,
      sui: suiConnected,
    });
  }, [evmAccount.isConnected, solanaAccount.isConnected, suiConnected]);

  // Effect to sync EVM wallet state with our app's store
  useEffect(() => {
    if (evmAccount.isConnected && evmAccount.address) {
      syncWalletToStore(
        WalletType.REOWN_EVM,
        evmAccount.address,
        evmWalletInfo?.name || "EVM Wallet",
        evmNetwork.chainId,
      );
    } else if (!evmAccount.isConnected) {
      // Remove EVM wallet from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_EVM);
    }
  }, [
    evmAccount.address,
    evmAccount.isConnected,
    evmNetwork.chainId,
    evmWalletInfo,
    syncWalletToStore,
  ]);

  // Effect to sync Solana wallet state with our app's store
  useEffect(() => {
    if (solanaAccount.isConnected && solanaAccount.address) {
      syncWalletToStore(
        WalletType.REOWN_SOL,
        solanaAccount.address,
        solanaWalletInfo?.name || "Solana Wallet",
        solanaNetwork.chainId,
      );
    } else if (!solanaAccount.isConnected) {
      // Remove Solana wallet from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.REOWN_SOL);
    }
  }, [
    solanaAccount.address,
    solanaAccount.isConnected,
    solanaNetwork.chainId,
    solanaWalletInfo,
    syncWalletToStore,
  ]);

  // NEW: Effect to sync Sui wallet state with our app's store
  useEffect(() => {
    if (suiConnected && suiAddress) {
      syncWalletToStore(
        WalletType.SUIET_SUI,
        suiAddress,
        suiWalletName || "Sui Wallet",
        1, // Default to Sui mainnet chainId
      );
    } else if (!suiConnected) {
      // Remove Sui wallet from store when disconnected
      const store = useWeb3Store.getState();
      store.removeWallet(WalletType.SUIET_SUI);
    }
  }, [suiConnected, suiAddress, suiWalletName, syncWalletToStore]);
  useEffect(() => {
    if (evmAccount.isConnected && evmNetwork.chainId !== undefined) {
      const store = useWeb3Store.getState();
      const requiredWallet = store.getWalletBySourceChain();

      if (requiredWallet?.type === WalletType.REOWN_EVM) {
        // Convert chainId to a number if it's a string
        const numericChainId =
          typeof evmNetwork.chainId === "string"
            ? parseInt(evmNetwork.chainId, 10)
            : evmNetwork.chainId;

        if (requiredWallet.chainId !== numericChainId) {
          store.updateWalletChainId(WalletType.REOWN_EVM, numericChainId);
          console.log(`EVM chain updated to ${numericChainId}`);
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
   * Disconnect the specified wallet type
   * @param walletType The type of wallet to disconnect, defaults to both
   */
  // Use a single disconnect function with proper namespace parameter
  const { disconnect } = useDisconnect();

  /**
   * Disconnect the specified wallet type
   * @param walletType The type of wallet to disconnect, defaults to all wallets if not specified
   */
  const disconnectWallet = useCallback(
    async (walletType?: WalletType) => {
      try {
        const store = useWeb3Store.getState();

        // If no specific wallet type is provided, disconnect all wallets
        if (walletType === undefined) {
          console.log("Disconnecting ALL wallets");

          // Disconnect EVM wallet if connected
          if (evmAccount.isConnected) {
            await disconnect({ namespace: "eip155" });
            console.log("EVM wallet disconnected");
          }

          // Disconnect Solana wallet if connected
          if (solanaAccount.isConnected) {
            await disconnect({ namespace: "solana" });
            console.log("Solana wallet disconnected");
          }

          // Disconnect Sui wallet if connected
          if (suiConnected) {
            await disconnectSui();
            console.log("Sui wallet disconnected");
          }

          // Clear all wallets from store
          store.disconnectAll();
          return true;
        }

        // Disconnect a specific wallet type
        console.log(`Disconnecting specific wallet type: ${walletType}`);

        if (walletType === WalletType.REOWN_EVM && evmAccount.isConnected) {
          // Pass the namespace "eip155" for EVM wallets
          await disconnect({ namespace: "eip155" });
          store.removeWallet(WalletType.REOWN_EVM);
          console.log("EVM wallet disconnected");
        }

        if (walletType === WalletType.REOWN_SOL && solanaAccount.isConnected) {
          // Pass the namespace "solana" for Solana wallets
          await disconnect({ namespace: "solana" });
          store.removeWallet(WalletType.REOWN_SOL);
          console.log("Solana wallet disconnected");
        }

        // Handle SUI wallet case
        if (walletType === WalletType.SUIET_SUI && suiConnected) {
          await disconnectSui();
          store.removeWallet(WalletType.SUIET_SUI);
          console.log("SUI wallet disconnected");
        }

        return true;
      } catch (error) {
        console.error("Error disconnecting wallet:", error);
        throw error;
      }
    },
    [
      disconnect,
      evmAccount.isConnected,
      solanaAccount.isConnected,
      suiConnected,
      disconnectSui,
    ],
  );

  /**
   * Check if a specific wallet type is connected
   */
  const isWalletTypeConnected = useCallback(
    (walletType: WalletType) => {
      if (walletType === WalletType.REOWN_EVM) {
        return evmAccount.isConnected;
      } else if (walletType === WalletType.REOWN_SOL) {
        return solanaAccount.isConnected;
      } else if (walletType === WalletType.SUIET_SUI) {
        return suiConnected;
      }
      return false;
    },
    [evmAccount.isConnected, solanaAccount.isConnected, suiConnected],
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
    disconnectWallet,
    isWalletTypeConnected,
    openModal: open,
    closeModal: close,
  };
}

/**
 * Enhanced hook for managing chain switching functionality in the UI
 * Uses Reown AppKit's network functions
 * Supports both EVM and Solana chains
 */
export function useChainSwitch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  // Get the wallet connection hook for access to both wallet types
  const { evmNetwork, solanaNetwork } = useWalletConnection();

  const switchToChain = useCallback(
    async (chain: Chain): Promise<boolean> => {
      setError(null);

      try {
        setIsLoading(true);

        // For Sui wallets, just update the store with the chain ID
        if (chain.walletType === WalletType.SUIET_SUI) {
          useWeb3Store
            .getState()
            .updateWalletChainId(requiredWallet!.type, chain.chainId);
        }

        // For EVM and Solana wallets, proceed with regular network switching
        const isSolanaChain = chain.walletType === WalletType.REOWN_SOL;
        const isEvmChain = chain.walletType === WalletType.REOWN_EVM;
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
              http: [chain.rpcUrl || ""],
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
          .updateWalletChainId(requiredWallet!.type, chain.chainId);

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
    [setError, setIsLoading, requiredWallet, solanaNetwork, evmNetwork],
  );

  /**
   * Switch to the source chain specified in the store
   */
  const switchToSourceChain = async (): Promise<boolean> => {
    setError(null);

    try {
      setIsLoading(true);
      const sourceChain = useWeb3Store.getState().sourceChain;

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
  };
}
/**
 * Ensures the correct wallet type is active for the given chain
 * Automatically switches active wallet if needed and possible
 *
 * @param targetChain The chain we want to use
 * @returns True if the correct wallet type is active or was switched to, false otherwise
 */
export function ensureCorrectWalletTypeForChain(sourceChain: Chain): boolean {
  const store = useWeb3Store.getState();
  const requiredWallet = store.getWalletByType(sourceChain.walletType);
  const connectedWallets = store.connectedWallets;

  const neededWalletType = sourceChain.walletType;

  // If active wallet is already the correct type, return true
  if (requiredWallet?.type === neededWalletType) {
    return true;
  }

  // Check if we have a connected wallet of the needed type
  const compatibleWallet = connectedWallets.find(
    (w) => w.type === neededWalletType,
  );

  if (compatibleWallet) {
    // Switch to the compatible wallet
    console.log(`${neededWalletType} wallet found`);
    return true;
  }

  // No compatible wallet connected
  console.error(
    `No connected ${neededWalletType} wallet available for ${sourceChain.name}`,
  );
  return false;
}

interface TokenTransferOptions {
  type: "swap" | "bridge" | "V";
  pauseQuoting?: boolean;
  enableTracking?: boolean; // New option to enable automatic tracking
  trackingOptions?: SwapTrackingOptions; // Pass through tracking configuration
  onSuccess?: (
    amount: string,
    sourceToken: Token,
    destinationToken?: Token,
  ) => void;
  onError?: (error: Error) => void;
  onSwapInitiated?: (swapId: string) => void; // New callback when swap starts
  onTrackingComplete?: (status: SwapStatus) => void; // New callback when tracking completes
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken?: Token | null;
  destinationToken?: Token | null;
}

interface TokenTransferState {
  // Input state
  amount: string;
  setAmount: (amount: string) => void;
  handleAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

  isProcessing: boolean;

  isValid: boolean;
  isButtonDisabled: boolean;

  isWalletCompatible: boolean;
  quoteData: Quote[] | null;
  receiveAmount: string;
  isLoadingQuote: boolean;

  // Add estimated time in seconds from the quote
  estimatedTimeSeconds: number | null;

  // Add fee information
  protocolFeeBps: number | null;
  protocolFeeUsd: number | null;
  relayerFeeUsd: number | null;
  totalFeeUsd: number | null;

  swapId: string | null;
  swapStatus: SwapStatus | null;
  isTracking: boolean;
  trackingError: Error | null;

  swapAmounts: () => Promise<void>;
  handleTransfer: () => Promise<string | void>;
}

// I had to include this as it appears the Mayan SDK is outdated
interface ExtendedQuote extends Quote {
  toTokenPrice?: number;
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
  const [isWalletCompatible, setIsWalletCompatible] = useState<boolean>(true);

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
    state.getWalletBySourceChain(),
  );

  // Get the transaction details for slippage
  const transactionDetails = useWeb3Store((state) => state.transactionDetails);
  const receiveAddress = useWeb3Store(
    (state) => state.transactionDetails.receiveAddress,
  );

  // Get wallet providers and signers
  const { getEvmSigner, getSolanaSigner } = useWalletProviderAndSigner();

  // Add the chain switch hook
  const { switchToSourceChain, isLoading: isChainSwitching } = useChainSwitch();

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
        console.log("Swap tracking completed:", status); // DEBUG

        // Dismiss the progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
          setProgressToastId(null);
        }

        // Show final success toast ONLY ONCE
        toast.success(
          `${options.type === "swap" ? "Swap" : "Bridge"} completed successfully`,
          {
            description: `${amount} ${options.sourceToken!.ticker} → ${receiveAmount} ${
              options.type === "swap"
                ? options.destinationToken?.ticker
                : options.sourceToken!.ticker
            }`,
          },
        );

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
        console.log("Swap tracking error:", error); // DEBUG

        // Dismiss the progress toast
        if (progressToastId) {
          toast.dismiss(progressToastId);
          setProgressToastId(null);
        }

        toast.error("Swap tracking failed", {
          description: error.message,
        });
        options.onError?.(error);
      },
      onStatusUpdate: (status) => {
        console.log("Swap status update:", status.clientStatus); // DEBUG

        // Update the progress toast with current status
        if (progressToastId) {
          const statusText = getStatusDescription(status.clientStatus);
          const stepsText = getStepsDescription(status.steps);

          toast.loading(
            `${options.type === "swap" ? "Swap" : "Bridge"} in progress...`,
            {
              id: progressToastId,
              description: `${statusText}${stepsText ? ` • ${stepsText}` : ""}`,
            },
          );
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
      console.log("Starting progress toast for swap:", swapId); // DEBUG

      const toastId = toast.loading(
        `${options.type === "swap" ? "Swap" : "Bridge"} in progress...`,
        {
          description: "Tracking transaction progress...",
          duration: Infinity, // Keep it open until we dismiss it
        },
      );

      setProgressToastId(toastId);
    }
  }, [isTracking, swapId, isTrackingEnabled, progressToastId, options.type]);

  // Clean up progress toast if tracking stops unexpectedly
  useEffect(() => {
    if (!isTracking && progressToastId) {
      console.log("Cleaning up progress toast"); // DEBUG
      toast.dismiss(progressToastId);
      setProgressToastId(null);
    }
  }, [isTracking, progressToastId]);
  // HOOK CHECK: Check wallet compatibility when source chain changes
  useEffect(() => {
    if (!requiredWallet) {
      setIsWalletCompatible(true);
      return;
    }

    const walletCompatible = ensureCorrectWalletTypeForChain(
      options.sourceChain,
    );
    setIsWalletCompatible(walletCompatible);
  }, [requiredWallet, options.sourceChain]);

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

  // Convert gasDrop from store (number) or default to 0
  const getGasDrop = useCallback((): number => {
    // if it isn't set or isn't a number, fall back to 0
    if (
      transactionDetails.gasDrop === undefined ||
      typeof transactionDetails.gasDrop !== "number"
    ) {
      return 0;
    }
    return transactionDetails.gasDrop;
  }, [transactionDetails.gasDrop]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setAmount(e.target.value);
  };

  const isValidForSwap = Boolean(
    options.sourceToken &&
      options.destinationToken &&
      amount &&
      parseFloat(amount) > 0,
  );
  const isValidForBridge = Boolean(
    options.sourceToken && amount && parseFloat(amount) > 0,
  );

  const isValid: boolean =
    options.type === "swap" ? isValidForSwap : isValidForBridge;

  // Update this useEffect to include fee calculation
  useEffect(() => {
    if (options.pauseQuoting === true) {
      failQuote();
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const fetchQuote = async () => {
      if (!isValid) {
        failQuote();
        return;
      }
      // Reset if no valid amount
      if (!amount || parseFloat(amount) <= 0) {
        failQuote();
        return;
      }

      // For swap: Check if we have both source and destination tokens
      if (
        options.type === "swap" &&
        (!options.sourceToken || !options.destinationToken)
      ) {
        failQuote();
        return;
      }

      // For bridge: Check if we have source token
      if (options.type === "bridge" && !options.sourceToken) {
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
        const referrer = "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh";
        const referrerBps = 0;
        // Use the source and destination chains and tokens from options
        const sourceChain = options.sourceChain;
        const destinationChain = options.destinationChain;
        const sourceToken = options.sourceToken;
        const destinationToken = options.destinationToken;

        if (options.type === "swap" && sourceToken && destinationToken) {
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
        } else if (options.type === "bridge" && sourceToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken: sourceToken, // Same token on destination chain
            sourceChain,
            destinationChain,
            slippageBps,
            gasDrop,
            referrer,
            referrerBps,
          });
        }

        // Check if this is still the latest request
        if (currentRequestId !== latestRequestIdRef.current) {
          console.log(`Ignoring stale response for amount: ${amount}`);
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
            console.log(`Estimated time: ${quote.etaSeconds} seconds`);
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

            console.log(
              `Protocol fee: ${quote.protocolBps} BPS (${protocolFeeUsdValue.toFixed(6)} USD)`,
            );
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
            console.log(`Relayer fee: ${relayerFee.toFixed(6)} USD`);
          } else {
            setRelayerFeeUsd(null);
          }

          // Calculate total fee - the difference between input and output
          const totalFee = inputAmount - outputAmount;

          if (!isNaN(totalFee)) {
            setTotalFeeUsd(parseFloat(totalFee.toFixed(6)));
            console.log(`Total fee: ${totalFee.toFixed(6)} USD`);
          } else {
            setTotalFeeUsd(null);
          }

          // For bridging, we use the source token's decimals
          const token =
            options.type === "swap" ? destinationToken! : sourceToken!;
          const decimals = token.decimals || 6;

          const formattedAmount = parseFloat(
            expectedAmountOut.toString(),
          ).toFixed(Math.min(decimals, 6));

          setReceiveAmount(formattedAmount);

          console.log(`${options.type.toUpperCase()} Quote Updated:`, {
            requestId: currentRequestId,
            amount: amount,
            slippageBps: slippageBps,
            raw: expectedAmountOut,
            formatted: formattedAmount,
            etaSeconds: quote.etaSeconds,
            protocolBps: quote.protocolBps,
            relayerFee: relayerFee,
            totalFee: totalFee,
          });
        } else {
          failQuote();
        }
      } catch (error: unknown) {
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
    transactionDetails.slippage,
    getSlippageBps,
    getGasDrop,
    refreshTrigger,
    isValid,
    options.pauseQuoting,
  ]);

  useEffect(() => {
    // Only set up interval if everything is valid
    if (!isValid) return;

    console.log("Setting up quote refresh interval");

    const intervalId = setInterval(() => {
      // Skip if already loading or processing
      if (isLoadingQuote || isProcessing) return;

      console.log("Refreshing quote (5-second interval)");
      setRefreshTrigger((prev) => prev + 1);
    }, 5000);

    return () => {
      console.log("Cleaning up quote refresh interval");
      clearInterval(intervalId);
    };
  }, [isValid, isLoadingQuote, isProcessing]);

  const swapAmounts = async (): Promise<void> => {
    setAmount(receiveAmount);
  };

  const handleTransfer = async (): Promise<string | void> => {
    if (!isValid) {
      toast.warning(`Invalid ${options.type} parameters`, {
        description:
          options.type === "swap"
            ? "Please select tokens and enter a valid amount"
            : "Please select a token and enter a valid amount",
      });
      return;
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
    if (
      options.sourceChain.walletType === WalletType.REOWN_EVM &&
      requiredWallet
    ) {
      // Convert both chainIds to numbers for comparison
      const currentChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      const targetChainId = options.sourceChain.chainId;

      // If we're on the wrong chain, switch to the correct one
      if (currentChainId !== targetChainId) {
        console.log(
          `Current chain: ${currentChainId}, Target chain: ${targetChainId}. Switching...`,
        );

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
      ? toast.loading(
          `Initiating ${options.type === "swap" ? "swap" : "bridge"}...`,
          {
            description: "Please confirm the transaction in your wallet",
          },
        )
      : toast.loading(
          `${options.type === "swap" ? "Swapping" : "Bridging"} ${amount} ${options.sourceToken!.ticker}...`,
          {
            description: `From ${options.sourceChain.name} to ${
              options.type === "swap"
                ? options.destinationToken?.ticker
                : options.destinationChain.name
            }`,
          },
        );

    try {
      setIsProcessing(true);

      let quotes: Quote[] = [];

      // Get current slippage in basis points
      const slippageBps = getSlippageBps();

      // Get gas drop
      const gasDrop = getGasDrop();

      // Set referrer
      const referrer = "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh";
      const referrerBps = 0;

      // Use the source and destination chains and tokens from options
      const sourceChain = options.sourceChain;
      const destinationChain = options.destinationChain;
      const sourceToken = options.sourceToken;
      const destinationToken = options.destinationToken;
      // Refresh quote if needed
      if (!quoteData || quoteData.length === 0) {
        // Fetch fresh quote
        if (options.type === "swap" && sourceToken && destinationToken) {
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
        } else if (options.type === "bridge" && sourceToken) {
          quotes = await getMayanQuote({
            amount,
            sourceToken,
            destinationToken: sourceToken, // Same token on destination
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
      if (sourceChain.walletType === WalletType.REOWN_SOL) {
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
          destinationAddress: receiveAddress || requiredWallet!.address,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
            evm: "0x95C0029426afa8E47a71b8E6b251f5B70511e599",
            sui: "0xc232b25bd8796b2b1c8797f66f732fd22aa01db65102fe9f22f76b51af78476e",
          },
          solanaSigner: solanaSigner as SolanaSigner,
          connection: connection,
        });
      } else if (sourceChain.walletType === WalletType.SUIET_SUI) {
        // Get Sui signer
        if (!wallet || !wallet.signAndExecuteTransaction) {
          throw new Error(
            "Sui wallet not connected or doesn't support signAndExecuteTransaction",
          );
        }
        result = await executeSuiSwap({
          quote: quotes[0],
          swapperAddress: requiredWallet!.address,
          destinationAddress: receiveAddress || requiredWallet!.address,
          referrerAddresses: {
            solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
            evm: "0x95C0029426afa8E47a71b8E6b251f5B70511e599",
            sui: "0xc232b25bd8796b2b1c8797f66f732fd22aa01db65102fe9f22f76b51af78476e",
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
          destinationAddress: receiveAddress || requiredWallet!.address,
          sourceToken: sourceToken!.address,
          amount,
          referrerAddresses: {
            solana: "9tks3cKdFxDwBPiyoYy9Wi4gQ29T9Qizniq7kDW86kNh",
            evm: "0x95C0029426afa8E47a71b8E6b251f5B70511e599",
            sui: "0xc232b25bd8796b2b1c8797f66f732fd22aa01db65102fe9f22f76b51af78476e",
          },
          signer: evmSigner,
          tokenDecimals: sourceToken!.decimals || 18,
        });
      }

      console.log(
        `${sourceChain.walletType === WalletType.REOWN_SOL ? "Solana" : sourceChain.walletType === WalletType.SUIET_SUI ? "Sui" : "EVM"} swap initiated:`,
        result,
      );

      setSwapId(result);
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
        toast.success(
          `${options.type === "swap" ? "Swap" : "Bridge"} completed successfully`,
          {
            id: toastId,
            description: `Transferred ${amount} ${sourceToken!.ticker}`,
          },
        );
      }

      return result; // Return swap ID for parent components
    } catch (error) {
      // Make sure to dismiss the loading toast
      toast.dismiss(toastId);

      // Use our new error parser to get a user-friendly message
      const friendlyError = parseSwapError(error);

      toast.error(`${options.type === "swap" ? "Swap" : "Bridge"} failed`, {
        description: friendlyError,
      });
      setSwapId(null);

      // Still log the full error for debugging
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
    isValid,
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
      !isValid || isProcessing || !isWalletCompatible || isChainSwitching,
    // Actions
    handleTransfer,
    swapAmounts,
  };
}
/**
 * Extract a user-friendly error message from blockchain errors
 */
export function parseSwapError(error: unknown): string {
  // Default fallback message
  const friendlyMessage = "Something went wrong with your swap";

  try {
    if (!error) return friendlyMessage;

    // Convert to string for easier parsing
    const errorString = JSON.stringify(error);

    // Try to extract common error patterns
    const patterns = [
      // Balance errors
      {
        regex: /transfer amount exceeds balance/i,
        message: "Insufficient token balance for this swap",
      },
      // Slippage errors
      {
        regex:
          /slippage|price impact|price too low|min.*?received|output.*?amount/i,
        message:
          "Price moved too much during the swap. Try increasing slippage tolerance.",
      },
      // Gas errors
      {
        regex: /gas|fee|ETH balance|execution reverted/i,
        message: "Not enough ETH to cover gas fees",
      },
      // Approval errors
      {
        regex: /allowance|approve|permission|ERC20: insufficient allowance/i,
        message: "Token approval required. Please try again.",
      },
      // Timeout errors
      {
        regex: /timeout|timed? out|expired/i,
        message: "Request timed out. Please try again.",
      },
    ];

    // Check for specific error patterns
    for (const pattern of patterns) {
      if (pattern.regex.test(errorString)) {
        return pattern.message;
      }
    }

    // Extract reason if present (common in revert errors)
    const reasonMatch = /reason="([^"]+)"/.exec(errorString);
    if (reasonMatch && reasonMatch[1]) {
      return reasonMatch[1];
    }

    // Extract message if present
    const messageMatch = /"message":"([^"]+)"/.exec(errorString);
    if (messageMatch && messageMatch[1]) {
      return messageMatch[1];
    }

    // If error is actually an Error object
    if (error instanceof Error) {
      return error.message;
    }

    // If error is a string
    if (typeof error === "string") {
      return error;
    }

    return friendlyMessage;
  } catch (e) {
    console.error("Error parsing swap error:", e);
    return friendlyMessage;
  }
}

export const truncateAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
