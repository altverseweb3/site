"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Info,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/Select";
import { EtherFiVault, DEPOSIT_ASSETS } from "@/config/etherFi";
import { useEtherFiFetch } from "@/utils/etherFi/fetch";
import {
  fetchNativeBalanceForChain,
  NativeBalance,
} from "@/utils/nativeAssetBalancesLocal";
import { useWallet } from "@suiet/wallet-kit";
import { useEtherFiInteract } from "@/utils/etherFi/interact";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { useChainSwitch, useTokenTransfer } from "@/utils/walletMethods";
import { WalletType, Token, Chain, SwapStatus } from "@/types/web3";
import { chainList, getChainById, chains } from "@/config/chains";
import { useAppKit } from "@reown/appkit/react";
import useWeb3Store from "@/store/web3Store";
import { ConnectButton } from "@suiet/wallet-kit";
import useVaultDepositStore, {
  useActiveVaultDepositProcess,
} from "@/store/vaultDepositStore";
import { GasDrop } from "@/components/ui/GasDrop";
import { useWalletProviderAndSigner } from "@/utils/reownEthersUtils";
interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: EtherFiVault | null;
}

const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  vault,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [selectedSwapChain, setSelectedSwapChain] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [nativeBalances, setNativeBalances] = useState<
    Record<string, NativeBalance>
  >({});
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [justFetchedBalance, setJustFetchedBalance] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);

  const { getTokenBalance } = useEtherFiFetch();
  const { approveToken, depositTokens } = useEtherFiInteract();
  const { switchToChain } = useChainSwitch();
  const { open: openAppKit } = useAppKit();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const isSuiWalletConnected = useIsWalletTypeConnected(WalletType.SUIET_SUI);
  const isSolanaWalletConnected = useIsWalletTypeConnected(
    WalletType.REOWN_SOL,
  );
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const activeProcessIdRef = useRef<string | null>(null);

  // Wallet hooks for address retrieval
  const { getEvmSigner, getSolanaSigner } = useWalletProviderAndSigner();
  const { address: suiAddress } = useWallet();

  // Vault Deposit Store integration
  const {
    createProcess,
    updateProcessState,
    startSwapStep,
    startDepositStep,
    completeDepositStep,
    failDepositStep,
    onSwapTrackingComplete,
    getProcessProgress,
    cancelProcess,
  } = useVaultDepositStore();

  const activeProcess = useActiveVaultDepositProcess();

  useEffect(() => {
    // We Only update ref if there's a new active process or if we need to clear it
    if (activeProcess?.id !== activeProcessIdRef.current) {
      activeProcessIdRef.current = activeProcess?.id || null;
      console.log("Updated activeProcessIdRef to:", activeProcessIdRef.current);
    }

    // Show toast and clear ref when process is cancelled
    if (activeProcess && activeProcess.state === "CANCELLED") {
      toast.info("Process cancelled");
      setTimeout(() => {
        if (activeProcessIdRef.current === activeProcess.id) {
          activeProcessIdRef.current = null;
          console.log("🧹 Cleared activeProcessIdRef for cancelled process");
        }
      }, 500);
    }

    // Clear ref when process is completed or failed
    if (
      activeProcess &&
      (activeProcess.state === "COMPLETED" || activeProcess.state === "FAILED")
    ) {
      setTimeout(() => {
        if (activeProcessIdRef.current === activeProcess.id) {
          activeProcessIdRef.current = null;
          console.log(
            "Cleared activeProcessIdRef for completed/failed process",
          );
        }
      }, 2000); // Give a bit more time for the user to see the final state
    }
  }, [activeProcess?.id, activeProcess?.state, activeProcess]);

  const isChainWalletConnected = useCallback(
    (chainId: string) => {
      const chain = getChainById(chainId);
      if (!chain) return false;

      switch (chain.walletType) {
        case WalletType.REOWN_EVM:
          return isWalletConnected;
        case WalletType.SUIET_SUI:
          return isSuiWalletConnected;
        case WalletType.REOWN_SOL:
          return isSolanaWalletConnected;
        default:
          return false;
      }
    },
    [isWalletConnected, isSuiWalletConnected, isSolanaWalletConnected],
  );

  // Refs for wallet connection
  const suiButtonRef = useRef<HTMLDivElement>(null);

  const connectSuiWallet = () => {
    if (!suiButtonRef.current) return;
    const suietButton = suiButtonRef.current.querySelector("button");
    if (!suietButton) return;
    suietButton.click();
  };

  const connectSolanaWallet = async () => {
    openAppKit({ view: "Connect", namespace: "solana" });
  };

  const connectEvmWallet = async () => {
    openAppKit({ view: "Connect", namespace: "eip155" });
  };

  // Helper to create token objects for swapping
  const createNativeToken = (chain: Chain): Token => ({
    id: chain.chainToken.toLowerCase(),
    name: chain.chainToken,
    ticker: chain.chainToken,
    icon: chain.icon,
    address: chain.nativeAddress,
    decimals: chain.decimals,
    chainId: chain.chainId,
    stringChainId: chain.chainId.toString(),
    native: true,
  });

  // Helper to create destination token from vault's first deposit asset
  const createDestinationToken = (assetSymbol: string): Token => {
    const assetInfo = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
    return {
      id: assetSymbol.toLowerCase(),
      name: assetSymbol,
      ticker: assetSymbol,
      icon: assetInfo.imagePath,
      address: assetInfo.contractAddress,
      decimals: assetInfo.decimals,
      chainId: 1, // EtherFi vaults are on Ethereum
      stringChainId: "1",
      native: assetSymbol.toLowerCase() === "eth",
    };
  };

  // Token transfer hook for swap functionality -
  const {
    amount: swapAmount,
    handleAmountChange: handleSwapAmountChange,
    isButtonDisabled: isSwapButtonDisabled,
    handleTransfer: handleSwapTransfer,
    receiveAmount,
    isLoadingQuote,
    totalFeeUsd,
  } = useTokenTransfer({
    type: "swap",
    enableTracking: true,
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log("TOKEN TRANSFER onSuccess called:", {
        amount,
        sourceToken: sourceToken?.ticker,
        destinationToken: destinationToken?.ticker,
        activeProcessId: activeProcessIdRef.current,
      });

      // Use ref to get current active process ID and verify state
      if (activeProcessIdRef.current) {
        // Get current process state from store
        const currentProcess =
          useVaultDepositStore.getState().processes[activeProcessIdRef.current];
        console.log("🔍 Current process found:", {
          processId: activeProcessIdRef.current,
          processState: currentProcess?.state,
          processExists: !!currentProcess,
        });

        if (currentProcess && currentProcess.state === "IDLE") {
          console.log("Starting swap step tracking - transaction approved");
          startSwapStep(activeProcessIdRef.current, "swap-tracking-id");
        } else {
          console.log("Process not in IDLE state:", {
            processState: currentProcess?.state,
            processId: activeProcessIdRef.current,
            processExists: !!currentProcess,
          });
        }
      } else {
        console.log("No active process ID found in ref");
      }
    },
    onTrackingComplete: (status: SwapStatus) => {
      console.log("TOKEN TRANSFER onTrackingComplete called:", {
        status,
        activeProcessId: activeProcessIdRef.current,
        isSuccess: status.status === "COMPLETED",
        actualAmount: status.toAmount,
      });

      // Use ref to get current active process ID
      if (activeProcessIdRef.current) {
        console.log("Calling onSwapTrackingComplete - transaction completed");
        onSwapTrackingComplete(status, activeProcessIdRef.current);
      } else {
        console.warn(
          "No active process ID found in ref for onTrackingComplete",
        );
      }
    },
    onError: (error) => {
      console.error("TOKEN TRANSFER onError called:", error);
      if (activeProcessIdRef.current) {
        console.log("Updating process state to FAILED...");
        updateProcessState(activeProcessIdRef.current, "FAILED", {
          errorMessage: `Swap failed: ${error}`,
        });
      }
    },
  });

  // Enhanced deposit handlers with store integration
  const handleStartCrossChainDeposit = async () => {
    if (!vault || !requiredWallet?.address || !selectedSwapChain) return;

    const selectedChain = getChainById(selectedSwapChain);
    if (!selectedChain) return;

    // Clear any stale process reference before creating new one
    activeProcessIdRef.current = null;

    // Cancel any existing active process to avoid conflicts (but only if not already completed/failed/cancelled)
    if (
      activeProcess &&
      activeProcess.state !== "COMPLETED" &&
      activeProcess.state !== "FAILED" &&
      activeProcess.state !== "CANCELLED"
    ) {
      console.log(
        "Cancelling existing process before starting new one:",
        activeProcess.id,
      );
      cancelProcess(activeProcess.id);
    }

    // Create process in store
    const processId = createProcess({
      userAddress: requiredWallet.address,
      vault,
      type: "CROSS_CHAIN",
      targetAsset: vault.supportedAssets.deposit[0],
      depositAmount: receiveAmount || "0", // Expected amount after swap
      sourceChain: selectedChain,
      sourceToken: createNativeToken(selectedChain),
      sourceAmount: swapAmount,
    });

    // Immediately update ref with new process ID
    activeProcessIdRef.current = processId;

    console.log("Created NEW cross-chain deposit process:", processId);

    // Trigger the swap - this will automatically update the process via onSuccess/onTrackingComplete
    await handleSwapTransfer();
  };

  const handleDirectDeposit = async () => {
    if (!selectedAsset || !amount || !vault || !requiredWallet?.address) return;

    // Reset approval state at the start of a new deposit
    setNeedsApproval(false);
    console.log(
      "🔄 Starting new direct deposit, called setNeedsApproval(false)",
    );

    // Clear any stale process reference and cancel existing process (but only if not already completed/failed/cancelled)
    activeProcessIdRef.current = null;
    if (
      activeProcess &&
      activeProcess.state !== "COMPLETED" &&
      activeProcess.state !== "FAILED" &&
      activeProcess.state !== "CANCELLED"
    ) {
      console.log(
        "Cancelling existing process before direct deposit:",
        activeProcess.id,
      );
      cancelProcess(activeProcess.id);
    }

    // Create process for direct deposit
    const processId = createProcess({
      userAddress: requiredWallet.address,
      vault,
      type: "DIRECT",
      targetAsset: selectedAsset,
      depositAmount: amount,
    });

    // Update the ref with new process ID
    activeProcessIdRef.current = processId;

    // Start deposit step immediately for direct deposits
    startDepositStep(processId);

    try {
      console.log("Starting direct deposit:", {
        selectedAsset,
        vaultId: vault.id,
        amount,
      });

      const result = await depositTokens(selectedAsset, vault.id, amount);

      console.log("Direct deposit result:", result);

      if (result.success) {
        // Complete the deposit step with correct property names
        completeDepositStep(processId, {
          transactionHash: result.hash || "",
          vaultShares: "0", // TODO: Fetch actual vault shares if possible
          completedAt: new Date(),
        });

        console.log("Direct deposit completed successfully");
        await fetchBalance(selectedAsset);
      } else {
        // Check if it's an approval issue
        console.log("Deposit failed, checking if approval needed:", {
          message: result.message,
          includesAllowance: result.message?.includes("Insufficient allowance"),
          includesApproval: result.message?.includes("approval"),
        });

        if (
          result.message &&
          (result.message.includes("Insufficient allowance") ||
            result.message.includes("approval") ||
            result.message.includes("allowance"))
        ) {
          console.log(
            "✅ Approval needed, setting needsApproval=true and state=IDLE",
          );
          setNeedsApproval(true);
          console.log("🔄 Called setNeedsApproval(true)");
          // Don't mark as failed - just pause the process and wait for approval
          updateProcessState(processId, "IDLE", {
            errorMessage: "Approval required before deposit can proceed",
          });
          console.log("🔄 Called updateProcessState to IDLE");
        } else {
          // Handle other deposit failures
          console.log(
            "❌ Other deposit failure, marking as failed:",
            result.message,
          );
          failDepositStep(processId, result.message || "Deposit failed");
        }
      }
    } catch (error) {
      console.error("Direct deposit error:", error);

      // Check if error message indicates approval issue
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log("Deposit error caught, checking if approval needed:", {
        errorMessage,
        includesAllowance: errorMessage.includes("allowance"),
        includesApproval: errorMessage.includes("approval"),
      });

      if (
        errorMessage.includes("allowance") ||
        errorMessage.includes("approval") ||
        errorMessage.includes("ERC20: insufficient allowance")
      ) {
        console.log(
          "✅ Approval needed from error, setting needsApproval=true and state=IDLE",
        );
        setNeedsApproval(true);
        console.log("🔄 Called setNeedsApproval(true) from catch block");
        updateProcessState(processId, "IDLE", {
          errorMessage: "Approval required before deposit can proceed",
        });
        console.log("🔄 Called updateProcessState to IDLE from catch block");
      } else {
        console.log("❌ Other error, marking as failed:", errorMessage);
        failDepositStep(processId, errorMessage);
      }
    }
  };

  const handleApprove = async () => {
    if (!selectedAsset || !amount || !vault) return;

    console.log("🔄 Starting approval process for:", {
      selectedAsset,
      amount,
      vaultId: vault.id,
    });

    try {
      const result = await approveToken(selectedAsset, vault.id, amount);
      console.log("Approval result:", result);

      if (result.success) {
        setNeedsApproval(false);
        console.log("✅ Approval successful, called setNeedsApproval(false)");

        // After successful approval, automatically retry the deposit
        if (activeProcessIdRef.current) {
          console.log("Auto-retrying deposit after successful approval");

          // Update process to deposit pending
          startDepositStep(activeProcessIdRef.current);

          try {
            const depositResult = await depositTokens(
              selectedAsset,
              vault.id,
              amount,
            );

            if (depositResult.success) {
              completeDepositStep(activeProcessIdRef.current, {
                transactionHash: depositResult.hash || "",
                vaultShares: "0",
                completedAt: new Date(),
              });

              console.log("Auto-retry deposit completed successfully");
              await fetchBalance(selectedAsset);
            } else {
              failDepositStep(
                activeProcessIdRef.current,
                depositResult.message || "Deposit failed after approval",
              );
            }
          } catch (error) {
            console.error("Auto-retry deposit error:", error);
            failDepositStep(
              activeProcessIdRef.current,
              error instanceof Error ? error.message : "Unknown error",
            );
          }
        }
      } else {
        console.error("❌ Approval failed:", result.message);
        toast.error(`Approval failed: ${result.message}`);
      }
    } catch (error) {
      console.error("❌ Approval error:", error);
      toast.error(
        `Approval error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Handle process completion for cross-chain deposits - only trigger on SWAP_COMPLETE
  useEffect(() => {
    if (!activeProcess) return;

    console.log("Cross-chain deposit useEffect:", {
      state: activeProcess.state,
      type: activeProcess.type,
      hasTargetAmount: !!activeProcess.actualTargetAmount,
      targetAmount: activeProcess.actualTargetAmount,
    });

    // Only trigger when swap is actually complete (not just when amount exists)
    if (
      activeProcess.state === "SWAP_COMPLETE" &&
      activeProcess.type === "CROSS_CHAIN"
    ) {
      console.log("TRIGGERING VAULT DEPOSIT - Swap completed!");

      const performVaultDeposit = async () => {
        console.log("Starting cross-chain vault deposit...");

        if (!activeProcess.actualTargetAmount || !activeProcess.vault) {
          console.error("Missing required data:", {
            actualTargetAmount: activeProcess.actualTargetAmount,
            vault: !!activeProcess.vault,
          });
          failDepositStep(
            activeProcess.id,
            "Missing required data for vault deposit",
          );
          return;
        }

        startDepositStep(activeProcess.id);

        try {
          console.log("Calling depositTokens for cross-chain:", {
            targetAsset: activeProcess.targetAsset,
            vaultId: activeProcess.vault.id,
            amount: activeProcess.actualTargetAmount,
          });

          const result = await depositTokens(
            activeProcess.targetAsset,
            activeProcess.vault.id,
            activeProcess.actualTargetAmount,
          );

          console.log("Cross-chain deposit result:", result);

          if (result.success) {
            completeDepositStep(activeProcess.id, {
              transactionHash: result.hash || "",
              vaultShares: "0",
              completedAt: new Date(),
            });

            console.log("Cross-chain vault deposit completed successfully");
          } else {
            console.error("Cross-chain deposit failed:", result.message);
            failDepositStep(
              activeProcess.id,
              result.message || "Vault deposit failed",
            );
          }
        } catch (error) {
          console.error("Cross-chain vault deposit error:", error);
          failDepositStep(
            activeProcess.id,
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      };

      const timeoutId = setTimeout(performVaultDeposit, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [
    activeProcess?.state,
    activeProcess?.id,
    activeProcess?.type,
    activeProcess,
    startDepositStep,
    completeDepositStep,
    failDepositStep,
    depositTokens,
  ]);

  // Configure cross-chain swap for any non-Ethereum chain
  const configureSwapForChain = useCallback(
    (chainId: string) => {
      const selectedChain = getChainById(chainId);
      if (!selectedChain || !vault) return;

      const sourceChain = selectedChain;
      const sourceToken = createNativeToken(selectedChain);
      const destinationChain = chains.ethereum;
      const firstDepositAsset = vault.supportedAssets.deposit[0];
      const destinationToken = createDestinationToken(firstDepositAsset);

      const store = useWeb3Store.getState();
      store.setSourceChain(sourceChain);
      store.setDestinationChain(destinationChain);
      store.setSourceToken(sourceToken);
      store.setDestinationToken(destinationToken);

      console.log(
        `Configured swap: ${sourceToken.ticker} (${sourceChain.chainName}) → ${destinationToken.ticker} (${destinationChain.chainName})`,
      );
    },
    [vault],
  );

  const fetchNativeBalance = useCallback(
    async (chainId: string) => {
      const chain = getChainById(chainId);
      if (!chain || !isChainWalletConnected(chainId)) return;

      setIsLoadingBalance(true);
      try {
        let walletAddress = "";

        // Get wallet address based on chain type
        if (chain.walletType === WalletType.REOWN_EVM && isWalletConnected) {
          const signer = await getEvmSigner();
          walletAddress = await signer.getAddress();
        } else if (
          chain.walletType === WalletType.SUIET_SUI &&
          isSuiWalletConnected &&
          suiAddress
        ) {
          walletAddress = suiAddress;
        } else if (
          chain.walletType === WalletType.REOWN_SOL &&
          isSolanaWalletConnected
        ) {
          const signer = await getSolanaSigner();
          walletAddress = signer.publicKey;
        }

        if (walletAddress) {
          const nativeBalance = await fetchNativeBalanceForChain(
            chain,
            walletAddress,
          );
          setNativeBalances((prev) => ({
            ...prev,
            [chainId]: nativeBalance,
          }));
        }
      } catch (error) {
        console.error(`Error fetching native balance for ${chainId}:`, error);
        setNativeBalances((prev) => ({
          ...prev,
          [chainId]: {
            chainId,
            chainName: chain?.chainName || "",
            symbol: chain?.symbol || "",
            balance: "0",
            balanceFormatted: "0.00",
            decimals: chain?.decimals || 18,
            address: "",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        }));
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [
      isWalletConnected,
      isSuiWalletConnected,
      isSolanaWalletConnected,
      isChainWalletConnected,
      getEvmSigner,
      getSolanaSigner,
      suiAddress,
    ],
  );

  // Simple function to fetch balance for an asset
  const fetchBalance = useCallback(
    async (assetSymbol: string) => {
      if (!assetSymbol || !isWalletConnected) return;

      setIsLoadingBalance(true);
      try {
        // Get a fresh signer and ensure we're stable on Ethereum
        const signer = await getEvmSigner();

        // Wait for network to be stable on Ethereum
        let isStable = false;
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max

        while (!isStable && attempts < maxAttempts) {
          const network = await signer.provider?.getNetwork();

          if (network?.chainId === BigInt(1)) {
            // Check stability by waiting a bit and checking again
            await new Promise((resolve) => setTimeout(resolve, 100));
            const networkCheck = await signer.provider?.getNetwork();

            if (networkCheck?.chainId === BigInt(1)) {
              isStable = true;
              console.log(
                `Network stable on Ethereum, fetching balance for ${assetSymbol}`,
              );
            }
          } else {
            console.log(
              `Waiting for Ethereum... Currently on ${network?.chainId}`,
            );
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          attempts++;
        }

        if (!isStable) {
          console.error(
            `Failed to get stable Ethereum connection after ${attempts} attempts`,
          );
          return;
        }

        const balanceData = await getTokenBalance(assetSymbol);
        setBalances((prev) => ({
          ...prev,
          [assetSymbol]: balanceData.formatted,
        }));
      } catch (error) {
        console.error(`Error fetching balance for ${assetSymbol}:`, error);
        setBalances((prev) => ({
          ...prev,
          [assetSymbol]: "0.00",
        }));
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [isWalletConnected, getTokenBalance, getEvmSigner],
  );

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize selected asset when modal opens
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen && vault && vault.supportedAssets.deposit.length > 0) {
      const firstAsset = vault.supportedAssets.deposit[0];
      setSelectedAsset(firstAsset);
      setSelectedSwapChain(""); // ← Add this line
      setAmount("");
      setNeedsApproval(false);
    } else if (!isOpen) {
      setSelectedAsset("");
      setSelectedSwapChain("");
      setBalances({});
      setNativeBalances({});
      setAmount("");
      setNeedsApproval(false);
      setJustFetchedBalance(false);
      setIsNetworkSwitching(false);

      if (
        activeProcess &&
        activeProcess.state !== "COMPLETED" &&
        activeProcess.state !== "FAILED" &&
        activeProcess.state !== "CANCELLED"
      ) {
        console.log(
          "Modal closing - cancelling incomplete process:",
          activeProcess.id,
        );
        cancelProcess(activeProcess.id);
      }

      // Clear ref when modal closes
      activeProcessIdRef.current = null;
    }
  }, [isOpen, vault, isMounted, activeProcess, cancelProcess]);

  // Fetch balance when asset is selected and wallet is connected
  useEffect(() => {
    // Don't fetch balance if we have a swap chain selected, are network switching, or just fetched
    if (
      selectedAsset &&
      isWalletConnected &&
      isMounted &&
      !justFetchedBalance &&
      !selectedSwapChain &&
      !isNetworkSwitching
    ) {
      fetchBalance(selectedAsset);
    }
    // Reset the flag after the effect runs
    if (justFetchedBalance) {
      setJustFetchedBalance(false);
    }
  }, [
    selectedAsset,
    isWalletConnected,
    isMounted,
    fetchBalance,
    justFetchedBalance,
    selectedSwapChain,
    isNetworkSwitching,
  ]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) return null;
  if (!vault) return null;

  const getAssetIcon = (assetSymbol: string) => {
    const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
    return asset?.imagePath || "/images/etherFi/ethereum-assets/eth.png";
  };

  // Form validation - distinguish between direct deposits and cross-chain swaps
  const isFormValid = selectedSwapChain
    ? swapAmount && parseFloat(swapAmount) > 0
    : selectedAsset && amount && parseFloat(amount) > 0;

  // Get process progress for UI
  const processProgress = activeProcess
    ? getProcessProgress(activeProcess.id)
    : null;

  // Determine current step state for UI with proper state mapping
  const getStepState = (
    stepNumber: number,
  ): "pending" | "active" | "completed" | "failed" => {
    if (!activeProcess || activeProcess.state === "CANCELLED") return "pending";

    const { state } = activeProcess;
    const isDirect = activeProcess.type === "DIRECT";

    if (isDirect) {
      // Direct deposit only has step 2
      if (stepNumber === 1) return "pending";
      if (stepNumber === 2) {
        if (state === "DEPOSIT_PENDING") return "active";
        if (state === "COMPLETED") return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
    } else {
      // Cross-chain has both steps
      if (stepNumber === 1) {
        if (state === "IDLE") return "pending";
        if (state === "SWAP_PENDING") return "active";
        if (
          state === "SWAP_COMPLETE" ||
          state === "DEPOSIT_PENDING" ||
          state === "COMPLETED"
        )
          return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
      if (stepNumber === 2) {
        if (state === "DEPOSIT_PENDING") return "active";
        if (state === "COMPLETED") return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
    }
    return "pending";
  };

  const formatErrorMessage = (error: string | Error | unknown): string => {
    let errorString = "";

    // Convert error to string
    if (error instanceof Error) {
      errorString = error.message;
    } else if (typeof error === "string") {
      errorString = error;
    } else {
      errorString = "An unexpected error occurred";
    }

    // Check if it's likely hex data (starts with 0x and is very long)
    if (errorString.startsWith("0x") && errorString.length > 100) {
      return "Transaction failed due to invalid data format";
    }

    // Check if it's just a long hex string without 0x
    if (/^[0-9a-fA-F]+$/.test(errorString) && errorString.length > 100) {
      return "Transaction failed due to invalid data format";
    }

    // Truncate extremely long error messages
    const MAX_LENGTH = 300;
    if (errorString.length > MAX_LENGTH) {
      return errorString.substring(0, MAX_LENGTH) + "...";
    }

    return errorString;
  };

  const StepIndicator = ({
    step,
    title,
    description,
  }: {
    step: number;
    title: string;
    description: string;
  }) => {
    const state = getStepState(step);
    const icons = {
      pending: (
        <div className="w-6 h-6 rounded-full border-2 border-gray-600 bg-gray-800" />
      ),
      active: <Clock className="w-6 h-6 text-amber-500" />,
      completed: <CheckCircle className="w-6 h-6 text-green-500" />,
      failed: <AlertCircle className="w-6 h-6 text-red-500" />,
    };

    return (
      <div className="flex items-center gap-3">
        {icons[state]}
        <div>
          <div
            className={`text-sm font-medium ${state === "completed" ? "text-green-500" : state === "failed" ? "text-red-500" : state === "active" ? "text-amber-500" : "text-gray-400"}`}
          >
            {title}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[384px] bg-[#18181B] border-[#27272A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#FAFAFA]">
            <Image
              src={vault.vaultIcon}
              alt={vault.name}
              width={24}
              height={24}
              className="rounded-full"
            />
            Deposit to {vault.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Process Progress - shown when there's an active process (not cancelled) */}
          {activeProcess && activeProcess.state !== "CANCELLED" && (
            <div className="p-4 bg-[#27272A] rounded-lg border border-[#3F3F46]">
              <div className="text-sm text-wrap font-medium text-[#FAFAFA] mb-3 break-all">
                {formatErrorMessage(processProgress?.description) ||
                  "Processing..."}
              </div>

              <div className="space-y-3">
                {activeProcess.type === "CROSS_CHAIN" && (
                  <StepIndicator
                    step={1}
                    title="Cross-chain Swap"
                    description={`${activeProcess.sourceToken?.ticker} → ${activeProcess.targetAsset}`}
                  />
                )}
                <StepIndicator
                  step={2}
                  title="Vault Deposit"
                  description={`${activeProcess.targetAsset} → ${vault.name}`}
                />
              </div>

              {/* Show cancel option for completed swaps */}
              {activeProcess.state === "SWAP_COMPLETE" && (
                <div className="mt-3 pt-3 border-t border-[#3F3F46]">
                  <Button
                    onClick={() => cancelProcess(activeProcess.id)}
                    variant="outline"
                    size="sm"
                    className="w-full text-amber-500 border-amber-500 hover:bg-amber-500/10"
                  >
                    Cancel & Keep Swapped Tokens
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Only show form inputs when no active process or process failed/completed/cancelled */}
          {(!activeProcess ||
            ["FAILED", "COMPLETED", "CANCELLED"].includes(
              activeProcess.state,
            )) && (
            <>
              {/* Smart Asset/Chain Selection */}
              <div>
                <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
                  Select Asset
                </label>
                <Select
                  value={selectedAsset || selectedSwapChain}
                  onValueChange={async (value) => {
                    if (vault.supportedAssets.deposit.includes(value)) {
                      setSelectedAsset(value);
                      setSelectedSwapChain("");

                      // Switch to Ethereum network for ERC20 asset balance fetching
                      if (isWalletConnected) {
                        try {
                          setIsNetworkSwitching(true);
                          const ethereumChain = getChainById("ethereum");
                          if (ethereumChain) {
                            await switchToChain(ethereumChain);
                            console.log("Switched to Ethereum for ERC20 asset");

                            // Immediately fetch balance after network switch is complete
                            if (value) {
                              setJustFetchedBalance(true);
                              await fetchBalance(value);
                            }
                          }
                        } catch (error) {
                          console.error("Failed to switch to Ethereum:", error);
                        } finally {
                          setIsNetworkSwitching(false);
                        }
                      }
                    } else {
                      const selectedChain = getChainById(value);
                      if (selectedChain) {
                        // Allow all chains (including Ethereum) as swap sources
                        setSelectedSwapChain(value);
                        setSelectedAsset("");
                        configureSwapForChain(value);
                        if (isChainWalletConnected(value)) {
                          // Immediately fetch native balance for faster max button display
                          fetchNativeBalance(value);
                        }

                        if (
                          selectedChain.walletType === WalletType.REOWN_EVM &&
                          isWalletConnected
                        ) {
                          try {
                            await switchToChain(selectedChain);
                            console.log(
                              `Switched to ${selectedChain.chainName}`,
                            );
                          } catch (error) {
                            console.error("Failed to switch chain:", error);
                          }
                        }
                      }
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]">
                    <SelectValue placeholder="Select asset or chain">
                      {selectedAsset && (
                        <div className="flex items-center gap-2">
                          <Image
                            src={getAssetIcon(selectedAsset)}
                            alt={selectedAsset}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span>{selectedAsset}</span>
                        </div>
                      )}
                      {selectedSwapChain && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">🔄</span>
                          <Image
                            src={
                              chainList.find(
                                (chain) => chain.id === selectedSwapChain,
                              )?.icon || ""
                            }
                            alt={selectedSwapChain}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span>
                            {chainList.find(
                              (chain) => chain.id === selectedSwapChain,
                            )?.chainName || selectedSwapChain}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                    <SelectGroup>
                      <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                        Direct Deposit (Ethereum)
                      </SelectLabel>
                      {vault.supportedAssets.deposit.map((asset) => (
                        <SelectItem
                          key={asset}
                          value={asset}
                          className="text-[#FAFAFA] focus:bg-[#3F3F46] focus:text-[#FAFAFA]"
                        >
                          <div className="flex items-center gap-2">
                            <Image
                              src={getAssetIcon(asset)}
                              alt={asset}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                            <span>{asset}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>

                    <SelectSeparator className="bg-[#3F3F46]" />

                    <SelectGroup>
                      <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                        Cross-chain Swap from
                      </SelectLabel>
                      {chainList.map((chain) => (
                        <SelectItem
                          key={`swap-${chain.id}`}
                          value={chain.id}
                          className="text-[#FAFAFA] focus:bg-[#3F3F46] focus:text-[#FAFAFA]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500 text-sm">🔄</span>
                            <Image
                              src={chain.icon}
                              alt={chain.chainName}
                              width={16}
                              height={16}
                              className="rounded-full"
                            />
                            <span>
                              {chain.chainName} ({chain.chainToken})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-[#A1A1AA]">
                    Amount
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-amber-500">
                      {selectedSwapChain ? (
                        <span className="text-[#A1A1AA]">
                          Will swap{" "}
                          {
                            chainList.find(
                              (chain) => chain.id === selectedSwapChain,
                            )?.chainToken
                          }{" "}
                          → {vault.supportedAssets.deposit[0]}
                          {receiveAmount && (
                            <span className="text-green-500 ml-2">
                              ≈ {receiveAmount}{" "}
                              {vault.supportedAssets.deposit[0]}
                            </span>
                          )}
                          {totalFeeUsd && (
                            <span className="text-amber-500 ml-2">
                              (Fee: ${totalFeeUsd})
                            </span>
                          )}
                        </span>
                      ) : isLoadingBalance ? (
                        <span>Loading balance...</span>
                      ) : selectedSwapChain &&
                        nativeBalances[selectedSwapChain] ? (
                        <span>
                          Balance:{" "}
                          {nativeBalances[selectedSwapChain].balanceFormatted}{" "}
                          {nativeBalances[selectedSwapChain].symbol}
                        </span>
                      ) : selectedAsset && isWalletConnected ? (
                        <span>
                          Balance: {balances[selectedAsset] || "0.00"}{" "}
                          {selectedAsset}
                        </span>
                      ) : selectedAsset && !isWalletConnected ? (
                        <span className="text-[#71717A]">
                          Connect EVM wallet to see balance
                        </span>
                      ) : (
                        <span className="text-[#71717A]">
                          Select asset or chain
                        </span>
                      )}
                    </div>

                    {/* Wallet connection and Max buttons */}
                    {selectedSwapChain &&
                      nativeBalances[selectedSwapChain] &&
                      !nativeBalances[selectedSwapChain].error && (
                        <button
                          onClick={() => {
                            const balance =
                              nativeBalances[selectedSwapChain]
                                .balanceFormatted;
                            if (selectedSwapChain) {
                              handleSwapAmountChange({
                                target: { value: balance },
                              } as React.ChangeEvent<HTMLInputElement>);
                            }
                          }}
                          className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30 transition-colors"
                        >
                          Max
                        </button>
                      )}
                    {isWalletConnected &&
                      selectedAsset &&
                      balances[selectedAsset] && (
                        <button
                          onClick={() =>
                            setAmount(balances[selectedAsset] || "0")
                          }
                          className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30 transition-colors"
                        >
                          Max
                        </button>
                      )}

                    {selectedAsset && !isWalletConnected && (
                      <button
                        onClick={connectEvmWallet}
                        className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30 transition-colors"
                      >
                        Connect EVM
                      </button>
                    )}

                    {selectedSwapChain &&
                      !isChainWalletConnected(selectedSwapChain) &&
                      (() => {
                        const chain = getChainById(selectedSwapChain);
                        if (chain?.walletType === WalletType.SUIET_SUI) {
                          return (
                            <button
                              onClick={connectSuiWallet}
                              className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30 transition-colors"
                            >
                              Connect SUI
                            </button>
                          );
                        } else if (chain?.walletType === WalletType.REOWN_SOL) {
                          return (
                            <button
                              onClick={connectSolanaWallet}
                              className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-500 hover:text-purple-400 hover:bg-purple-500/30 transition-colors"
                            >
                              Connect Solana
                            </button>
                          );
                        } else if (chain?.walletType === WalletType.REOWN_EVM) {
                          return (
                            <button
                              onClick={connectEvmWallet}
                              className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30 transition-colors"
                            >
                              Connect EVM
                            </button>
                          );
                        }
                        return null;
                      })()}
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={selectedSwapChain ? swapAmount : amount}
                    onChange={(e) => {
                      if (selectedSwapChain) {
                        handleSwapAmountChange(e);
                      } else {
                        setAmount(e.target.value);
                      }
                    }}
                    className="pr-20 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {selectedSwapChain ? (
                      <>
                        <Image
                          src={
                            chainList.find(
                              (chain) => chain.id === selectedSwapChain,
                            )?.icon || ""
                          }
                          alt={selectedSwapChain}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-sm text-[#A1A1AA]">
                          {
                            chainList.find(
                              (chain) => chain.id === selectedSwapChain,
                            )?.chainToken
                          }
                        </span>
                      </>
                    ) : selectedAsset ? (
                      <>
                        <Image
                          src={getAssetIcon(selectedAsset)}
                          alt={selectedAsset}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-sm text-[#A1A1AA]">
                          {selectedAsset}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Gas Drop - Only show for cross-chain swaps */}
              {selectedSwapChain && (
                <GasDrop
                  maxGasDrop={destinationChain?.gasDrop || 0}
                  symbol={destinationChain?.symbol || "ETH"}
                  initialEnabled={false}
                  initialValue={50}
                />
              )}
            </>
          )}

          {/* APY Information */}
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Info className="h-4 w-4 text-green-500" />
            <span className="text-sm text-[#FAFAFA]">
              Current APY:{" "}
              <span className="text-green-500 font-semibold">5.2%</span>
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Show process-specific actions */}
            {activeProcess &&
            activeProcess.state !== "COMPLETED" &&
            activeProcess.state !== "FAILED" &&
            activeProcess.state !== "CANCELLED" ? (
              <>
                {/* Show approval button if needed - this takes priority */}
                {needsApproval ? (
                  <Button
                    onClick={handleApprove}
                    className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    <>
                      Approve {selectedAsset} to Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  </Button>
                ) : (
                  /* Show processing state only when not waiting for approval */
                  <div className="text-center py-4 text-[#A1A1AA]">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full mx-auto mb-2" />
                    {activeProcess.state === "DEPOSIT_PENDING"
                      ? "Processing deposit..."
                      : activeProcess.state === "SWAP_PENDING"
                        ? "Processing swap..."
                        : "Processing your deposit..."}
                  </div>
                )}

                {/* Debug info */}
                {process.env.NODE_ENV === "development" && (
                  <div className="text-xs text-gray-500 p-2 bg-gray-800 rounded">
                    Debug: needsApproval={needsApproval.toString()}, state=
                    {activeProcess.state}, processId={activeProcess.id}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Regular deposit/swap buttons when no active process */}
                <Button
                  onClick={
                    selectedSwapChain
                      ? isWalletConnected
                        ? handleStartCrossChainDeposit
                        : connectEvmWallet
                      : handleDirectDeposit
                  }
                  disabled={
                    selectedSwapChain
                      ? isSwapButtonDisabled ||
                        !isChainWalletConnected(selectedSwapChain)
                      : !isFormValid
                  }
                  className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
                >
                  {(selectedSwapChain ? isLoadingQuote : false) ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      {selectedSwapChain ? "Getting Quote..." : "Processing..."}
                    </div>
                  ) : (
                    <>
                      {selectedSwapChain ? (
                        isWalletConnected ? (
                          <>
                            Start Cross-chain Deposit
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            Connect EVM Wallet for Swap (Required)
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )
                      ) : (
                        <>
                          Direct Deposit {selectedAsset}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </>
                  )}
                </Button>
              </>
            )}

            <Button
              onClick={() => window.open(vault.links.withdrawal, "_blank")}
              variant="outline"
              className="w-full border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Withdraw on EtherFi
            </Button>

            <p className="text-xs text-[#71717A] text-center">
              By depositing, you agree to EtherFi&apos;s terms and conditions.
              Your deposit will start earning yield immediately.
            </p>
          </div>
        </div>

        {/* Hidden SUI wallet connect button */}
        <div
          ref={suiButtonRef}
          className="absolute opacity-0 pointer-events-auto -z-10"
        >
          <ConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
