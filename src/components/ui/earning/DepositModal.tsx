"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ethers } from "ethers";
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
import { getTokenAllowance } from "@/utils/etherFi/fetch";
import { useEtherFiInteract } from "@/utils/etherFi/interact";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { useChainSwitch, useTokenTransfer } from "@/utils/walletMethods";
import { WalletType, Token, SwapStatus } from "@/types/web3";
import { chainList, getChainById, chains } from "@/config/chains";
import { useAppKit } from "@reown/appkit/react";
import useWeb3Store from "@/store/web3Store";
import { ConnectButton } from "@suiet/wallet-kit";
import useVaultDepositStore, {
  useActiveVaultDepositProcess,
} from "@/store/vaultDepositStore";
import { GasDrop } from "@/components/ui/GasDrop";
import { useWalletProviderAndSigner } from "@/utils/reownEthersUtils";
import TokenImage from "@/components/ui/TokenImage";

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
  // Form state
  const [selectedSwapChain, setSelectedSwapChain] = useState<string>("");
  const [selectedSwapToken, setSelectedSwapToken] = useState<Token | null>(
    null,
  );
  const [isDirectDeposit, setIsDirectDeposit] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState(false);

  // Integration hooks
  const { approveToken, depositTokens } = useEtherFiInteract();
  const { switchToChain } = useChainSwitch();
  const { open: openAppKit } = useAppKit();

  // Web3Store functions for token management
  const loadTokens = useWeb3Store((state) => state.loadTokens);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const tokensByCompositeKey = useWeb3Store(
    (state) => state.tokensByCompositeKey,
  );
  const tokensByChainId = useWeb3Store((state) => state.tokensByChainId);

  // Wallet connection states
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const isSuiWalletConnected = useIsWalletTypeConnected(WalletType.SUIET_SUI);
  const isSolanaWalletConnected = useIsWalletTypeConnected(
    WalletType.REOWN_SOL,
  );
  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );
  const destinationChain = useWeb3Store((state) => state.destinationChain);

  // Wallet hooks for address retrieval
  const { getEvmSigner } = useWalletProviderAndSigner();

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
  const suiButtonRef = useRef<HTMLDivElement>(null);

  // Helper functions for token management
  const getSupportedTokensForChain = useCallback(
    (chainId: number): Token[] => {
      const allTokens = tokensByChainId[chainId] || [];
      return allTokens.filter(
        (token) =>
          token.isNativeGas === true ||
          token.isNativeWrapped === true ||
          token.isL2Token === true,
      );
    },
    [tokensByChainId],
  );

  const getDestinationTokenForAsset = useCallback(
    (assetSymbol: string): Token | null => {
      // Get tokens for Ethereum (chainId: 1)
      const ethereumTokens = tokensByChainId[1] || [];

      // Find token that matches the asset symbol
      const matchingToken = ethereumTokens.find(
        (token) => token.ticker.toLowerCase() === assetSymbol.toLowerCase(),
      );

      return matchingToken || null;
    },
    [tokensByChainId],
  );

  const getNativeVaultTokenForAsset = useCallback(
    (assetSymbol: string): Token | null => {
      // Get tokens for Ethereum (chainId: 1) since vault assets are on Ethereum
      const ethereumTokens = tokensByChainId[1] || [];

      // Find token that matches the asset symbol and has balance data
      const matchingToken = ethereumTokens.find(
        (token) => token.ticker.toLowerCase() === assetSymbol.toLowerCase(),
      );

      console.log(`Looking for native vault token for ${assetSymbol}:`, {
        found: !!matchingToken,
        ticker: matchingToken?.ticker,
        userBalance: matchingToken?.userBalance,
        isWalletToken: matchingToken?.isWalletToken,
      });

      return matchingToken || null;
    },
    [tokensByChainId],
  );

  const getTokenByCompositeKey = useCallback(
    (chainStringId: string, tokenAddress: string): Token | null => {
      const compositeKey = `${chainStringId}-${tokenAddress}`;
      return tokensByCompositeKey[compositeKey] || null;
    },
    [tokensByCompositeKey],
  );

  const getTokenByChainSpecificId = useCallback(
    (chainSpecificTokenId: string): Token | null => {
      // Parse the chain-specific token ID format: chainId-tokenAddress
      const parts = chainSpecificTokenId.split("-");
      if (parts.length < 2) return null;

      const chainStringId = parts[0];
      const tokenAddress = parts.slice(1).join("-"); // Handle addresses that might contain dashes

      return getTokenByCompositeKey(chainStringId, tokenAddress);
    },
    [getTokenByCompositeKey],
  );

  const createChainSpecificTokenId = useCallback(
    (token: Token, chainStringId: string): string => {
      return `${chainStringId}-${token.address.toLowerCase()}`;
    },
    [],
  );

  // Wallet connection helpers
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

  // ===== UNIFIED APPROVAL AND RETRY FUNCTION =====
  const handleApprovalAndRetry = useCallback(
    async (
      processId: string,
      assetSymbol: string,
      vaultId: number,
      depositAmount: string,
    ): Promise<boolean> => {
      try {
        console.log("🔄 Starting approval process for:", {
          assetSymbol,
          depositAmount,
          vaultId,
        });

        // Update process to show approval is needed
        updateProcessState(processId, "APPROVAL_PENDING", {
          errorMessage: "Approval required - please approve the transaction",
        });

        const approvalResult = await approveToken(
          assetSymbol,
          vaultId,
          depositAmount,
        );

        if (approvalResult.success) {
          console.log("✅ Approval successful, proceeding with deposit");

          // Move to deposit pending and continue
          startDepositStep(processId);

          // Continue with deposit immediately after approval
          const depositResult = await depositTokens(
            assetSymbol,
            vaultId,
            depositAmount,
          );

          if (depositResult.success) {
            completeDepositStep(processId, {
              transactionHash: depositResult.hash || "",
              vaultShares: "0",
              completedAt: new Date(),
            });
            console.log("✅ Deposit completed successfully after approval");
            return true;
          } else {
            console.error(
              "❌ Deposit failed after approval:",
              depositResult.message,
            );
            failDepositStep(
              processId,
              depositResult.message || "Deposit failed after approval",
            );
            return false;
          }
        } else {
          console.error("❌ Approval failed:", approvalResult.message);
          failDepositStep(
            processId,
            `Approval failed: ${approvalResult.message}`,
          );
          return false;
        }
      } catch (error) {
        console.error("❌ Approval error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        failDepositStep(processId, `Approval error: ${errorMessage}`);
        return false;
      }
    },
    [
      updateProcessState,
      approveToken,
      startDepositStep,
      depositTokens,
      completeDepositStep,
      failDepositStep,
    ],
  );

  // ===== UNIFIED VAULT DEPOSIT FUNCTION =====
  const performVaultDeposit = useCallback(
    async (
      processId: string,
      assetSymbol: string,
      vaultId: number,
      depositAmount: string,
    ): Promise<boolean> => {
      try {
        console.log("🔄 Starting vault deposit process:", {
          assetSymbol,
          vaultId,
          depositAmount,
        });

        // Get signer for allowance check
        const signer = await getEvmSigner();

        // Convert deposit amount to BigInt for comparison
        const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
        if (!asset) {
          throw new Error(`Asset ${assetSymbol} not found`);
        }

        const depositAmountBigInt = ethers.parseUnits(
          depositAmount,
          asset.decimals,
        );
        console.log(
          "💰 Deposit amount in wei:",
          depositAmountBigInt.toString(),
        );

        // Check current allowance
        console.log("🔍 Checking current token allowance...");
        const { allowance, formatted: allowanceFormatted } =
          await getTokenAllowance(assetSymbol, vaultId, signer);

        console.log("📊 Allowance check result:", {
          current: allowanceFormatted,
          currentWei: allowance.toString(),
          required: depositAmount,
          requiredWei: depositAmountBigInt.toString(),
          sufficient: allowance >= depositAmountBigInt,
        });

        // If allowance is insufficient, handle approval first
        if (allowance < depositAmountBigInt) {
          console.log("⚠️ Insufficient allowance, requesting approval");
          const approvalSuccess = await handleApprovalAndRetry(
            processId,
            assetSymbol,
            vaultId,
            depositAmount,
          );
          return approvalSuccess;
        }

        // Allowance is sufficient, proceed with deposit
        console.log("✅ Sufficient allowance, proceeding with deposit");

        const result = await depositTokens(assetSymbol, vaultId, depositAmount);

        if (result.success) {
          completeDepositStep(processId, {
            transactionHash: result.hash || "",
            vaultShares: "0",
            completedAt: new Date(),
          });
          console.log("✅ Vault deposit completed successfully");
          return true;
        } else {
          console.error("❌ Deposit failed:", result.message);
          failDepositStep(processId, result.message || "Deposit failed");
          return false;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Vault deposit error:", errorMessage);
        failDepositStep(processId, errorMessage);
        return false;
      }
    },
    [
      getEvmSigner,
      handleApprovalAndRetry,
      depositTokens,
      completeDepositStep,
      failDepositStep,
    ],
  );

  // Token transfer hook for swap functionality
  const {
    amount: swapAmount,
    handleAmountChange: handleSwapAmountChange,
    isButtonDisabled: isSwapButtonDisabled,
    handleTransfer: handleSwapTransfer,
    receiveAmount,
    isLoadingQuote,
  } = useTokenTransfer({
    type: "swap",
    enableTracking: true,
    pauseQuoting: !!isDirectDeposit,
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log("🔄 TOKEN TRANSFER onSuccess called:", {
        amount,
        sourceToken: sourceToken?.ticker,
        destinationToken: destinationToken?.ticker,
        activeProcessId: activeProcess?.id,
        activeProcessState: activeProcess?.state,
      });

      // Get the current active process from store to ensure we have latest state
      const currentActiveProcess =
        useVaultDepositStore.getState().processes[
          useVaultDepositStore.getState().activeProcessId || ""
        ];

      if (currentActiveProcess && currentActiveProcess.state === "IDLE") {
        console.log(
          "✅ Starting swap step tracking - transaction approved",
          currentActiveProcess.id,
        );
        startSwapStep(currentActiveProcess.id, "swap-tracking-id");
      } else {
        console.warn("⚠️ Process not in IDLE state for swap start:", {
          processId: currentActiveProcess?.id,
          state: currentActiveProcess?.state,
          exists: !!currentActiveProcess,
        });
      }
    },
    onTrackingComplete: (status: SwapStatus) => {
      console.log("🏁 TOKEN TRANSFER onTrackingComplete called:", {
        status: status.status,
        statusObject: status,
        activeProcessId: activeProcess?.id,
        isSuccess: status.status === "COMPLETED",
        actualAmount: status.toAmount,
        completedAt: status.completedAt,
        txHash: status.txs?.[0]?.txHash,
      });

      // Get the current active process from store to ensure we have latest state
      const currentActiveProcess =
        useVaultDepositStore.getState().processes[
          useVaultDepositStore.getState().activeProcessId || ""
        ];

      if (currentActiveProcess) {
        console.log("📝 Current process state before completion:", {
          id: currentActiveProcess.id,
          state: currentActiveProcess.state,
          type: currentActiveProcess.type,
        });

        console.log(
          "🚀 Calling onSwapTrackingComplete with status:",
          status.status,
        );
        onSwapTrackingComplete(status, currentActiveProcess.id);

        // Force check the state after completion
        setTimeout(() => {
          const updatedProcess =
            useVaultDepositStore.getState().processes[currentActiveProcess.id];
          console.log("📊 Process state after onSwapTrackingComplete:", {
            id: updatedProcess?.id,
            state: updatedProcess?.state,
            actualTargetAmount: updatedProcess?.actualTargetAmount,
          });
        }, 100);
      } else {
        console.error("❌ No active process found for onTrackingComplete");
      }
    },
    onError: (error) => {
      console.error("❌ TOKEN TRANSFER onError called:", error);

      // Get the current active process from store
      const currentActiveProcess =
        useVaultDepositStore.getState().processes[
          useVaultDepositStore.getState().activeProcessId || ""
        ];

      if (currentActiveProcess) {
        console.log("Updating process state to FAILED...");
        updateProcessState(currentActiveProcess.id, "FAILED", {
          errorMessage: `Swap failed: ${error}`,
        });
      }
    },
  });

  // ===== MAIN DEPOSIT HANDLERS =====
  const handleStartCrossChainDeposit = async () => {
    if (!vault || !requiredWallet?.address || !selectedSwapToken) return;

    const selectedChain = getChainById(selectedSwapToken.stringChainId);
    if (!selectedChain) return;

    // Cancel any existing active process
    if (
      activeProcess &&
      !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
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
      depositAmount: receiveAmount || "0",
      sourceChain: selectedChain,
      sourceToken: selectedSwapToken,
      sourceAmount: swapAmount,
    });

    console.log("Created NEW cross-chain deposit process:", processId);

    // Trigger the swap
    await handleSwapTransfer();
  };

  const handleDirectDeposit = async () => {
    if (!isDirectDeposit || !swapAmount || !vault || !requiredWallet?.address)
      return;

    // Cancel any existing active process
    if (
      activeProcess &&
      !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
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
      targetAsset: selectedSwapToken?.ticker || "",
      depositAmount: swapAmount,
    });

    console.log("Starting direct deposit:", {
      selectedSwapToken: selectedSwapToken?.ticker || "",
      vaultId: vault.id,
      swapAmount,
    });
    const ethereumChain = getChainById("ethereum");
    if (!ethereumChain) {
      throw new Error("Ethereum chain not found");
    }

    await switchToChain(ethereumChain);

    // Start deposit step
    startDepositStep(processId);

    // Perform vault deposit with unified logic
    await performVaultDeposit(
      processId,
      selectedSwapToken?.ticker || "",
      vault.id,
      swapAmount,
    );
  };

  // ===== CROSS-CHAIN POST-SWAP HANDLING =====
  const operationInProgress = useRef(false);
  const lastProcessedId = useRef<string | null>(null);

  // Create stable references for the functions that cause dependency issues
  const performVaultDepositRef = useRef(performVaultDeposit);
  const switchToChainRef = useRef(switchToChain);

  // Update refs when functions change
  useEffect(() => {
    performVaultDepositRef.current = performVaultDeposit;
  }, [performVaultDeposit]);

  useEffect(() => {
    switchToChainRef.current = switchToChain;
  }, [switchToChain]);

  const performCrossChainVaultDeposit = useCallback(
    async (process: typeof activeProcess) => {
      if (!process) return;

      // Prevent duplicate operations
      if (
        operationInProgress.current ||
        lastProcessedId.current === process.id
      ) {
        console.log("🔄 Operation already in progress or already processed");
        return;
      }

      operationInProgress.current = true;
      lastProcessedId.current = process.id;

      let isCancelled = false;
      try {
        // Validate required data
        if (!process.actualTargetAmount || !process.vault) {
          console.error("❌ Missing required data for vault deposit:", {
            actualTargetAmount: process.actualTargetAmount,
            vault: !!process.vault,
          });
          failDepositStep(
            process.id,
            "Missing required data for vault deposit",
          );
          return;
        }
        if (isCancelled) return;

        // Switch to Ethereum network using ref
        console.log("🔄 Switching to Ethereum network...");
        const ethereumChain = getChainById("ethereum");
        if (!ethereumChain) {
          throw new Error("Ethereum chain not found");
        }
        await switchToChainRef.current(ethereumChain);
        console.log("✅ Successfully switched to Ethereum");
        if (isCancelled) return;

        // Small delay to ensure chain switch is settled
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Start deposit step
        console.log("🏦 Starting vault deposit step for cross-chain");
        startDepositStep(process.id);

        // Perform vault deposit with unified logic using ref
        console.log("💰 Performing vault deposit:", {
          targetAsset: process.targetAsset,
          vaultId: process.vault.id,
          depositAmount: process.depositAmount,
          actualTargetAmount: process.actualTargetAmount,
        });

        const success = await performVaultDepositRef.current(
          process.id,
          process.targetAsset,
          process.vault.id,
          process.depositAmount,
        );

        if (success) {
          console.log("🎉 Cross-chain vault deposit completed successfully");
        }
      } catch (error) {
        if (isCancelled) return;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Cross-chain vault deposit error:", errorMessage);
        failDepositStep(process.id, errorMessage);
      } finally {
        operationInProgress.current = false;
      }
      return () => {
        isCancelled = true;
      };
    },
    [failDepositStep, startDepositStep],
  );

  useEffect(() => {
    console.log("🔄 Cross-chain useEffect triggered:", {
      hasActiveProcess: !!activeProcess,
      processId: activeProcess?.id,
      state: activeProcess?.state,
      type: activeProcess?.type,
      shouldProceed:
        activeProcess?.state === "SWAP_COMPLETE" &&
        activeProcess?.type === "CROSS_CHAIN",
    });

    if (
      !activeProcess ||
      activeProcess.state !== "SWAP_COMPLETE" ||
      activeProcess.type !== "CROSS_CHAIN"
    ) {
      return;
    }

    console.log(
      "✅ Cross-chain swap completed, starting vault deposit process",
    );
    performCrossChainVaultDeposit(activeProcess);
  }, [activeProcess, performCrossChainVaultDeposit]);

  // ===== SWAP CONFIGURATION =====
  const configureSwapForToken = useCallback(
    (token: Token) => {
      if (!vault) return;

      const sourceChain = getChainById(token.stringChainId);
      if (!sourceChain) {
        console.error("Chain not found for token:", token);
        return;
      }

      const destinationChain = chains.ethereum;
      const firstDepositAsset = vault.supportedAssets.deposit[0];
      const destinationToken = getDestinationTokenForAsset(firstDepositAsset);

      if (!destinationToken) {
        console.error(
          "No destination token found for asset:",
          firstDepositAsset,
        );
        return;
      }

      const store = useWeb3Store.getState();
      store.setSourceChain(sourceChain);
      store.setDestinationChain(destinationChain);
      store.setSourceToken(token);
      store.setDestinationToken(destinationToken);

      console.log(
        `Configured swap: ${token.ticker} (${sourceChain.chainName}) → ${destinationToken.ticker} (${destinationChain.chainName})`,
      );
    },
    [vault, getDestinationTokenForAsset],
  );

  // Track the current selected token's composite key and previous balance
  const selectedTokenCompositeKeyRef = useRef<string | null>(null);
  const previousBalanceRef = useRef<string | null>(null);

  // Update the ref whenever selectedSwapToken changes
  useEffect(() => {
    if (selectedSwapToken) {
      selectedTokenCompositeKeyRef.current = `${selectedSwapToken.stringChainId}-${selectedSwapToken.address}`;
      previousBalanceRef.current = selectedSwapToken.userBalance || null;
    } else {
      selectedTokenCompositeKeyRef.current = null;
      previousBalanceRef.current = null;
    }
  }, [selectedSwapToken]);

  // Update selected token balance when tokensByCompositeKey changes
  useEffect(() => {
    const currentCompositeKey = selectedTokenCompositeKeyRef.current;

    if (currentCompositeKey) {
      const updatedToken = tokensByCompositeKey[currentCompositeKey] || null;
      if (updatedToken) {
        setSelectedSwapToken(updatedToken);
      }
    }
  }, [tokensByCompositeKey, setSelectedSwapToken]);

  // ===== TOKEN LOADING =====
  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading) {
      console.log("Loading tokens for DepositModal...");
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount]);

  // ===== INITIALIZATION EFFECTS =====
  // Track previous modal state to detect opening transition
  const prevIsOpenRef = useRef(false);
  const getNativeVaultTokenForAssetRef = useRef(getNativeVaultTokenForAsset);

  // Update function ref when it changes
  useEffect(() => {
    getNativeVaultTokenForAssetRef.current = getNativeVaultTokenForAsset;
  }, [getNativeVaultTokenForAsset]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const wasOpen = prevIsOpenRef.current;
    const isOpening = isOpen && !wasOpen; // Modal is transitioning from closed to open
    const isClosing = !isOpen && wasOpen; // Modal is transitioning from open to closed

    // Update the ref for next time
    prevIsOpenRef.current = isOpen;

    if (isOpening && vault && vault.supportedAssets.deposit.length > 0) {
      // Only initialize when modal first opens
      const firstAsset = vault.supportedAssets.deposit[0];
      setSelectedSwapChain("ethereum");
      setIsDirectDeposit(true);

      // Set the native token for the first asset using ref
      const nativeToken = getNativeVaultTokenForAssetRef.current(firstAsset);
      setSelectedSwapToken(nativeToken);
    } else if (isClosing) {
      // Reset form state when modal closes
      setSelectedSwapChain("");
      setSelectedSwapToken(null);
      // Cancel incomplete processes
      if (
        activeProcess &&
        !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
      ) {
        console.log(
          "Modal closing - cancelling incomplete process:",
          activeProcess.id,
        );
        cancelProcess(activeProcess.id);
      }
    }
  }, [isOpen, vault, isMounted, activeProcess, cancelProcess]);

  // Don't render on server
  if (!isMounted || !vault) return null;

  const getAssetIcon = (assetSymbol: string) => {
    const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
    return asset?.imagePath || "/images/etherFi/ethereum-assets/eth.png";
  };

  const isFormValid = !!(swapAmount && parseFloat(swapAmount) > 0);

  const processProgress = activeProcess
    ? getProcessProgress(activeProcess.id)
    : null;

  // ===== UI HELPER FUNCTIONS =====
  const getStepState = (
    stepNumber: number,
  ): "pending" | "active" | "completed" | "failed" => {
    if (!activeProcess || activeProcess.state === "CANCELLED") return "pending";

    const { state } = activeProcess;
    const isDirect = activeProcess.type === "DIRECT";

    if (isDirect) {
      // Direct deposit only has step 2 (vault deposit)
      if (stepNumber === 1) return "pending";
      if (stepNumber === 2) {
        if (state === "APPROVAL_PENDING" || state === "DEPOSIT_PENDING")
          return "active";
        if (state === "COMPLETED") return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
    } else {
      // Cross-chain has both steps
      if (stepNumber === 1) {
        // Swap step
        if (state === "IDLE") return "pending";
        if (state === "SWAP_PENDING") return "active";
        if (
          [
            "SWAP_COMPLETE",
            "APPROVAL_PENDING",
            "DEPOSIT_PENDING",
            "COMPLETED",
          ].includes(state)
        )
          return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
      if (stepNumber === 2) {
        // Deposit step
        if (["IDLE", "SWAP_PENDING", "SWAP_COMPLETE"].includes(state))
          return "pending";
        if (state === "APPROVAL_PENDING" || state === "DEPOSIT_PENDING")
          return "active";
        if (state === "COMPLETED") return "completed";
        if (state === "FAILED") return "failed";
        return "pending";
      }
    }
    return "pending";
  };

  const formatErrorMessage = (error: string | Error | unknown): string => {
    let errorString = "";

    if (error instanceof Error) {
      errorString = error.message;
    } else if (typeof error === "string") {
      errorString = error;
    } else {
      errorString = "An unexpected error occurred";
    }

    // Handle hex data
    if (errorString.startsWith("0x") && errorString.length > 100) {
      return "Transaction failed due to invalid data format";
    }

    if (/^[0-9a-fA-F]+$/.test(errorString) && errorString.length > 100) {
      return "Transaction failed due to invalid data format";
    }

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
            className={`text-sm font-medium ${
              state === "completed"
                ? "text-green-500"
                : state === "failed"
                  ? "text-red-500"
                  : state === "active"
                    ? "text-amber-500"
                    : "text-gray-400"
            }`}
          >
            {title}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    );
  };

  // ===== RENDER =====
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
          {/* Process Progress */}
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

          {/* Form - only show when no active process or process completed/failed/cancelled */}
          {(!activeProcess ||
            ["FAILED", "COMPLETED", "CANCELLED"].includes(
              activeProcess.state,
            )) && (
            <>
              {/* Asset/Chain Selection */}
              <div>
                <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
                  Select Asset
                </label>
                <Select
                  value={
                    selectedSwapToken
                      ? createChainSpecificTokenId(
                          selectedSwapToken,
                          selectedSwapChain,
                        )
                      : ""
                  }
                  onValueChange={async (value) => {
                    console.log(
                      "Select onValueChange called with value:",
                      value,
                    );
                    if (vault.supportedAssets.deposit.includes(value)) {
                      const vaultToken = getNativeVaultTokenForAsset(value);
                      if (!vaultToken) return;
                      setSelectedSwapChain(vaultToken.stringChainId);
                      setSelectedSwapToken(vaultToken);
                      setIsDirectDeposit(true);

                      // Get the native vault token for balance display
                      if (isWalletConnected) {
                        try {
                          const ethereumChain = getChainById("ethereum");
                          if (ethereumChain) {
                            await switchToChain(ethereumChain);
                            console.log("Switched to Ethereum for ERC20 asset");
                          }
                        } catch (error) {
                          console.error("Failed to switch to Ethereum:", error);
                        }
                      }
                    } else {
                      // Cross-chain token selection using chain-specific ID
                      console.log(
                        "Looking up token by chain-specific ID:",
                        value,
                      );
                      const selectedToken = getTokenByChainSpecificId(value);
                      console.log("Found token:", selectedToken);

                      if (selectedToken) {
                        const selectedChain = getChainById(
                          selectedToken.stringChainId,
                        );
                        console.log("Found chain:", selectedChain);

                        if (selectedChain) {
                          console.log("Setting cross-chain selection:", {
                            token: selectedToken.ticker,
                            chain: selectedChain.chainName,
                            tokenChainId: selectedToken.stringChainId,
                            selectedChainId: selectedChain.id,
                          });

                          setSelectedSwapToken(selectedToken);
                          setSelectedSwapChain(selectedChain.id);
                          configureSwapForToken(selectedToken);
                          setIsDirectDeposit(false);

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
                      } else {
                        console.error(
                          "Token not found for chain-specific ID:",
                          value,
                        );
                      }
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]">
                    <SelectValue>
                      {selectedSwapToken && (
                        <div className="flex items-center gap-2">
                          <TokenImage
                            token={selectedSwapToken}
                            chain={getChainById(selectedSwapChain)}
                            size="sm"
                          />
                          {!isDirectDeposit ? (
                            <span>
                              {chainList.find(
                                (chain) =>
                                  chain.id === selectedSwapToken.stringChainId,
                              )?.chainName ||
                                selectedSwapToken.stringChainId}{" "}
                              ({selectedSwapToken.ticker})
                            </span>
                          ) : (
                            <span>{selectedSwapToken.ticker}</span>
                          )}
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
                      {chainList
                        .filter((chain) => {
                          // Only show chains that have supported tokens
                          const supportedTokens = getSupportedTokensForChain(
                            chain.chainId,
                          );
                          return supportedTokens.length > 0;
                        })
                        .flatMap((chain) => {
                          const supportedTokens = getSupportedTokensForChain(
                            chain.chainId,
                          );

                          return supportedTokens.map((token) => {
                            // Create a label for the token type
                            let tokenTypeLabel = "";
                            if (token.isNativeGas) {
                              tokenTypeLabel = "Native";
                            } else if (token.isNativeWrapped) {
                              tokenTypeLabel = "Wrapped";
                            } else if (token.isL2Token) {
                              tokenTypeLabel = "L2 Token";
                            }

                            // Create chain-specific token ID for unique identification
                            const chainSpecificTokenId =
                              createChainSpecificTokenId(token, chain.id);

                            return (
                              <SelectItem
                                key={`swap-${chainSpecificTokenId}`}
                                value={chainSpecificTokenId}
                                className="text-[#FAFAFA] focus:bg-[#3F3F46] focus:text-[#FAFAFA]"
                              >
                                <div className="flex items-center gap-2">
                                  <TokenImage
                                    token={token}
                                    chain={chain}
                                    size="sm"
                                  />
                                  <Image
                                    src={chain.icon}
                                    alt={chain.chainName}
                                    width={16}
                                    height={16}
                                    className="rounded-full stroke-amber-500"
                                  />
                                  <span>
                                    {chain.chainName} ({token.ticker})
                                  </span>
                                  <span className="text-xs text-[#A1A1AA] ml-auto">
                                    {tokenTypeLabel}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          });
                        })}
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
                    {/* Balance display - always show when asset is selected */}
                    {selectedSwapToken && (
                      <div className="text-xs text-amber-500">
                        {selectedSwapToken && (
                          <span>
                            Balance:{" "}
                            {selectedSwapToken.userBalance
                              ? parseFloat(
                                  selectedSwapToken.userBalance,
                                ).toFixed(6)
                              : "0.00"}{" "}
                            {selectedSwapToken.ticker}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Connect wallet buttons */}
                    {selectedSwapToken && !isWalletConnected && (
                      <button
                        onClick={connectEvmWallet}
                        className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30 transition-colors"
                      >
                        Connect EVM
                      </button>
                    )}
                    {selectedSwapToken &&
                      selectedSwapChain &&
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

                    {/* Max button */}
                    {selectedSwapToken && selectedSwapToken.userBalance && (
                      <button
                        onClick={() => {
                          const balance = selectedSwapToken.userBalance || "0";
                          if (parseFloat(balance) > 0) {
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
                  </div>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={swapAmount}
                    onChange={(e) => {
                      handleSwapAmountChange(e);
                    }}
                    className="pr-20 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A]"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {selectedSwapToken && (
                      <>
                        <Image
                          src={
                            chainList.find(
                              (chain) =>
                                chain.id === selectedSwapToken.stringChainId,
                            )?.icon || ""
                          }
                          alt={selectedSwapToken.stringChainId}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-sm text-[#A1A1AA]">
                          {selectedSwapToken.ticker}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Will swap text under amount input */}
                {!isDirectDeposit && selectedSwapToken && (
                  <div className="flex justify-end mt-2">
                    <div className="text-xs text-[#A1A1AA]">
                      Will swap {selectedSwapToken.ticker} →{" "}
                      {vault.supportedAssets.deposit[0]}
                      {receiveAmount && (
                        <span className="text-green-500 ml-2">
                          ≈ {receiveAmount} {vault.supportedAssets.deposit[0]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Gas Drop - Only show for cross-chain swaps */}
              {!isDirectDeposit && (
                <GasDrop
                  maxGasDrop={destinationChain?.gasDrop || 0}
                  symbol={destinationChain.nativeGasToken.symbol}
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
            {/* Show processing state for active processes */}
            {activeProcess &&
            !["COMPLETED", "FAILED", "CANCELLED"].includes(
              activeProcess.state,
            ) ? (
              <div className="text-center py-4 text-[#A1A1AA]">
                <div className="animate-spin w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full mx-auto mb-2" />
                {activeProcess.state === "DEPOSIT_PENDING"
                  ? "Processing deposit..."
                  : activeProcess.state === "SWAP_PENDING"
                    ? "Processing swap..."
                    : activeProcess.state === "APPROVAL_PENDING"
                      ? "Waiting for approval..."
                      : "Processing your deposit..."}
              </div>
            ) : (
              /* Regular deposit/swap buttons when no active process */
              <Button
                onClick={
                  !isDirectDeposit
                    ? handleStartCrossChainDeposit
                    : handleDirectDeposit
                }
                disabled={
                  !isDirectDeposit
                    ? isSwapButtonDisabled ||
                      !isChainWalletConnected(selectedSwapChain) ||
                      !receiveAmount ||
                      parseFloat(receiveAmount) <= 0
                    : !isFormValid
                }
                className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
              >
                {isLoadingQuote ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    Getting Quote...
                  </div>
                ) : (
                  <>
                    {!isDirectDeposit ? (
                      <>
                        Start Cross-chain Deposit
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Direct Deposit {selectedSwapToken?.ticker || ""}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </>
                )}
              </Button>
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
