"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import {
  ArrowRight,
  Info,
  AlertCircle,
  ExternalLink,
  Wallet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { EtherFiVault, DEPOSIT_ASSETS } from "@/config/etherFi";
import { getTokenAllowance } from "@/utils/etherFi/fetch";
import { useEtherFiInteract } from "@/hooks/etherFi/useEtherFiInteract";
import { useDynamicEvmProvider } from "@/hooks/dynamic/useDynamicProviderAndSigner";
import { useTokenTransfer } from "@/utils/swap/walletMethods";
import { WalletType, Token, SwapStatus } from "@/types/web3";
import { getChainById, chains } from "@/config/chains";
import useWeb3Store, {
  useSourceChain,
  useDestinationChain,
  useSourceToken,
  useDestinationToken,
  useTransactionDetails,
  useSetReceiveAddress,
} from "@/store/web3Store";
import useVaultDepositStore, {
  useActiveVaultDepositProcess,
} from "@/store/vaultDepositStore";
import { GasDrop } from "@/components/ui/GasDrop";
import {
  queryVaultConversionRate,
  VaultConversionRate,
} from "@/utils/etherFi/vaultShares";
import TokenInputGroup from "@/components/ui/TokenInputGroup";
import ConnectWalletButton from "@/components/ui/ConnectWalletButton";
import ProgressTracker, {
  Step,
  createStep,
  StepState,
} from "@/components/ui/ProgressTracker";
import { VaultDepositProcess } from "@/types/earn";
import { formatPercentage, parseDepositError } from "@/utils/formatters";
import { recordEarn } from "@/utils/metrics/metricsRecorder";
import {
  useWalletByType,
  useSwitchActiveNetwork,
  useIsWalletTypeConnected,
} from "@/hooks/dynamic/useUserWallets";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: EtherFiVault | null;
  apy?: number;
}

const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  vault,
  apy,
}) => {
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();
  const transactionDetails = useTransactionDetails();
  const setReceiveAddress = useSetReceiveAddress();
  const evmWallet = useWalletByType(WalletType.EVM);

  const isDirectDeposit = useMemo(() => {
    if (!sourceToken || !vault) {
      return true;
    }
    if (sourceChain.id !== destinationChain.id) return false;
    return vault.supportedAssets.deposit
      .map((asset) => asset.toLowerCase())
      .includes(sourceToken.ticker.toLowerCase());
  }, [sourceToken, vault, sourceChain.id, destinationChain.id]);

  const [isMounted, setIsMounted] = useState(false);

  // Vault shares conversion state
  const [vaultSharesPreview, setVaultSharesPreview] =
    useState<VaultConversionRate | null>(null);
  const [isLoadingConversion, setIsLoadingConversion] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Integration hooks
  const { approveToken, depositTokens } = useEtherFiInteract();
  const { switchNetwork } = useSwitchActiveNetwork(WalletType.EVM);

  // Web3Store functions for token management
  const loadTokens = useWeb3Store((state) => state.loadTokens);
  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);
  const tokensByChainId = useWeb3Store((state) => state.tokensByChainId);

  // Wallet connection states
  const isWalletConnected = useIsWalletTypeConnected(WalletType.EVM);
  const isSuiWalletConnected = useIsWalletTypeConnected(WalletType.SUI);
  const isSolanaWalletConnected = useIsWalletTypeConnected(WalletType.SOLANA);
  const requiredWallet = useWalletByType(sourceChain.walletType);

  // Wallet hooks for address retrieval
  const { getEvmSigner } = useDynamicEvmProvider(requiredWallet);

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

  // Wallet connection helpers
  const isChainWalletConnected = useCallback(
    (chainId: string) => {
      const chain = getChainById(chainId);
      if (!chain) return false;

      switch (chain.walletType) {
        case WalletType.EVM:
          return isWalletConnected;
        case WalletType.SUI:
          return isSuiWalletConnected;
        case WalletType.SOLANA:
          return isSolanaWalletConnected;
        default:
          return false;
      }
    },
    [isWalletConnected, isSuiWalletConnected, isSolanaWalletConnected],
  );

  // ===== UNIFIED APPROVAL AND RETRY FUNCTION =====
  const handleApprovalAndRetry = useCallback(
    async (
      processId: string,
      assetSymbol: string,
      vaultId: number,
      depositAmount: string,
    ): Promise<boolean> => {
      try {
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

            // Record earn metrics
            try {
              const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
              await recordEarn({
                user_address: requiredWallet!.address,
                tx_hash: depositResult.hash || "",
                protocol: "etherFi",
                action: "deposit",
                chain: "ethereum",
                vault_name: vault?.name || "",
                vault_address: vault?.addresses.vault || "",
                token_address: asset?.contractAddress || "",
                token_symbol: assetSymbol,
                amount: depositAmount,
                timestamp: Math.floor(Date.now() / 1000),
              });
            } catch (error) {
              console.error("Failed to record earn metrics:", error);
            }

            return true;
          } else {
            console.error(
              "❌ Deposit failed after approval:",
              depositResult.message,
            );
            const friendlyError = parseDepositError(
              depositResult.message || "Deposit failed after approval",
            );
            failDepositStep(processId, friendlyError);
            return false;
          }
        } else {
          console.error("❌ Approval failed:", approvalResult.message);
          const friendlyError = parseDepositError(approvalResult.message);
          failDepositStep(processId, friendlyError);
          return false;
        }
      } catch (error) {
        console.error("❌ Approval error:", error);
        const friendlyError = parseDepositError(error);
        failDepositStep(processId, friendlyError);
        return false;
      }
    },
    [
      updateProcessState,
      approveToken,
      startDepositStep,
      depositTokens,
      completeDepositStep,
      requiredWallet,
      vault?.name,
      vault?.addresses.vault,
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
        // Get signer for allowance check
        const signer = await getEvmSigner();
        if (!signer) {
          throw new Error("EVM signer not available");
        }

        // Convert deposit amount to BigInt for comparison
        const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
        if (!asset) {
          throw new Error(`Asset ${assetSymbol} not found`);
        }

        const depositAmountBigInt = ethers.parseUnits(
          depositAmount,
          asset.decimals,
        );

        // Check current allowance
        const { allowance } = await getTokenAllowance(
          assetSymbol,
          vaultId,
          signer,
        );

        // If allowance is insufficient, handle approval first
        if (allowance < depositAmountBigInt) {
          const approvalSuccess = await handleApprovalAndRetry(
            processId,
            assetSymbol,
            vaultId,
            depositAmount,
          );
          return approvalSuccess;
        }

        const result = await depositTokens(assetSymbol, vaultId, depositAmount);

        if (result.success) {
          completeDepositStep(processId, {
            transactionHash: result.hash || "",
            vaultShares: "0",
            completedAt: new Date(),
          });

          // Record earn metrics
          try {
            const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
            await recordEarn({
              user_address: requiredWallet!.address,
              tx_hash: result.hash || "",
              protocol: "etherFi",
              action: "deposit",
              chain: "ethereum",
              vault_name: vault?.name || "",
              vault_address: vault?.addresses.vault || "",
              token_address: asset?.contractAddress || "",
              token_symbol: assetSymbol,
              amount: depositAmount,
              timestamp: Math.floor(Date.now() / 1000),
            });
          } catch (error) {
            console.error("Failed to record earn metrics:", error);
          }

          return true;
        } else {
          console.error("❌ Deposit failed:", result.message);
          const friendlyError = parseDepositError(
            result.message || "Deposit failed",
          );
          failDepositStep(processId, friendlyError);
          return false;
        }
      } catch (error) {
        console.error("❌ Vault deposit error:", error);
        const friendlyError = parseDepositError(error);
        failDepositStep(processId, friendlyError);
        return false;
      }
    },
    [
      getEvmSigner,
      depositTokens,
      handleApprovalAndRetry,
      completeDepositStep,
      requiredWallet,
      vault?.name,
      vault?.addresses.vault,
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
    type: "earn/etherFi", // remember to change me when we integrate with other vaults
    sourceChain,
    destinationChain,
    sourceToken,
    destinationToken,
    transactionDetails,
    enableTracking: true,
    pauseQuoting: !!isDirectDeposit,
    onSuccess: () => {
      // Get the current active process from store to ensure we have latest state
      const currentActiveProcess =
        useVaultDepositStore.getState().processes[
          useVaultDepositStore.getState().activeProcessId || ""
        ];

      if (currentActiveProcess && currentActiveProcess.state === "IDLE") {
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
      // Get the current active process from store to ensure we have latest state
      const currentActiveProcess =
        useVaultDepositStore.getState().processes[
          useVaultDepositStore.getState().activeProcessId || ""
        ];

      if (currentActiveProcess) {
        onSwapTrackingComplete(status, currentActiveProcess.id);
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
        updateProcessState(currentActiveProcess.id, "FAILED", {
          errorMessage: `swap failed: ${error}`,
        });
      }
    },
  });

  // ===== MAIN DEPOSIT HANDLERS =====
  const handleStartCrossChainDeposit = async () => {
    if (!vault || !requiredWallet?.address || !sourceToken) return;

    if (!sourceChain) return;

    // Cancel any existing active process
    if (
      activeProcess &&
      !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
    ) {
      cancelProcess(activeProcess.id);
    }

    // Create process in store
    createProcess({
      userAddress: requiredWallet.address,
      vault,
      type: "CROSS_CHAIN",
      targetAsset: vault.supportedAssets.deposit[0],
      depositAmount: receiveAmount || "0",
      sourceChain: sourceChain,
      sourceToken: sourceToken,
      sourceAmount: swapAmount,
    });

    // Trigger the swap
    await handleSwapTransfer();
  };

  const handleDirectDeposit = async () => {
    if (
      !isDirectDeposit ||
      !swapAmount ||
      !vault ||
      !requiredWallet?.address ||
      !sourceToken
    )
      return;

    // Cancel any existing active process
    if (
      activeProcess &&
      !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
    ) {
      cancelProcess(activeProcess.id);
    }

    // Create process for direct deposit
    const processId = createProcess({
      userAddress: requiredWallet.address,
      vault,
      type: "DIRECT",
      targetAsset: sourceToken.ticker || "",
      depositAmount: swapAmount,
    });

    const ethereumChain = getChainById("ethereum");
    if (!ethereumChain) {
      throw new Error("Ethereum chain not found");
    }

    await switchNetwork(ethereumChain.chainId);

    // Start deposit step
    startDepositStep(processId);

    // Perform vault deposit with unified logic
    await performVaultDeposit(
      processId,
      sourceToken?.ticker || "",
      vault.id,
      swapAmount,
    );
  };

  // ===== CROSS-CHAIN POST-SWAP HANDLING =====
  const operationInProgress = useRef(false);
  const lastProcessedId = useRef<string | null>(null);

  // Create stable references for the functions that cause dependency issues
  const performVaultDepositRef = useRef(performVaultDeposit);
  const switchToChainRef = useRef(switchNetwork);

  // Update refs when functions change
  useEffect(() => {
    performVaultDepositRef.current = performVaultDeposit;
  }, [performVaultDeposit]);

  useEffect(() => {
    switchToChainRef.current = switchNetwork;
  }, [switchNetwork]);

  const performCrossChainVaultDeposit = useCallback(
    async (process: typeof activeProcess) => {
      if (!process) return;

      // Prevent duplicate operations
      if (
        operationInProgress.current ||
        lastProcessedId.current === process.id
      ) {
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
        const ethereumChain = getChainById("ethereum");
        if (!ethereumChain) {
          throw new Error("Ethereum chain not found");
        }
        await switchToChainRef.current(ethereumChain.chainId);
        if (isCancelled) return;

        // Small delay to ensure chain switch is settled
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Start deposit step
        startDepositStep(process.id);

        // Perform vault deposit with unified logic using ref
        await performVaultDepositRef.current(
          process.id,
          process.targetAsset,
          process.vault.id,
          process.depositAmount,
        );
      } catch (error) {
        if (isCancelled) return;
        console.error("❌ Cross-chain vault deposit error:", error);
        const friendlyError = parseDepositError(error);
        failDepositStep(process.id, friendlyError);
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
    if (
      !activeProcess ||
      activeProcess.state !== "SWAP_COMPLETE" ||
      activeProcess.type !== "CROSS_CHAIN"
    ) {
      return;
    }

    performCrossChainVaultDeposit(activeProcess);
  }, [activeProcess, performCrossChainVaultDeposit]);

  // ===== SWAP CONFIGURATION =====
  // Track the current selected token's composite key and previous balance
  const selectedTokenCompositeKeyRef = useRef<string | null>(null);
  const previousBalanceRef = useRef<string | null>(null);

  // Update the ref whenever selectedSwapToken changes
  useEffect(() => {
    if (sourceToken) {
      selectedTokenCompositeKeyRef.current = `${sourceToken.stringChainId}-${sourceToken.address}`;
      previousBalanceRef.current = sourceToken.userBalance || null;
    } else {
      selectedTokenCompositeKeyRef.current = null;
      previousBalanceRef.current = null;
    }
  }, [sourceToken]);

  const getNativeVaultTokenForAsset = useCallback(
    (assetSymbol: string): Token | null => {
      // Get tokens for Ethereum (chainId: 1) since vault assets are on Ethereum
      const ethereumTokens = tokensByChainId[1] || [];

      // Find token that matches the asset symbol and has balance data
      const matchingToken = ethereumTokens.find(
        (token) => token.ticker.toLowerCase() === assetSymbol.toLowerCase(),
      );

      return matchingToken || null;
    },
    [tokensByChainId],
  );

  // ===== TOKEN LOADING =====
  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading) {
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

    if (isOpen && evmWallet?.address) {
      setReceiveAddress(evmWallet.address);
    } else if (isOpen && !evmWallet?.address) {
      // Clear receiveAddress if no EVM wallet is connected
      setReceiveAddress(null);
    }

    const wasOpen = prevIsOpenRef.current;
    const isOpening = isOpen && !wasOpen; // Modal is transitioning from closed to open
    const isClosing = !isOpen && wasOpen; // Modal is transitioning from open to closed

    // Update the ref for next time
    prevIsOpenRef.current = isOpen;

    if (isOpening && vault && vault.supportedAssets.deposit.length > 0) {
      // Only initialize when modal first opens
      const firstAsset = vault.supportedAssets.deposit[0];
      // setSelectedSwapChain("ethereum");

      // Set the native token for the first asset using ref
      const nativeToken = getNativeVaultTokenForAssetRef.current(firstAsset);
      const store = useWeb3Store.getState();
      store.setDestinationToken(nativeToken);
      // setSelectedSwapToken(nativeToken);
    } else if (isClosing) {
      // Reset form state when modal closes
      // setSelectedSwapChain("");
      // setSelectedSwapToken(null);
      // Cancel incomplete processes
      if (
        activeProcess &&
        !["COMPLETED", "FAILED", "CANCELLED"].includes(activeProcess.state)
      ) {
        cancelProcess(activeProcess.id);
      }
    }
  }, [
    isOpen,
    vault,
    isMounted,
    activeProcess,
    cancelProcess,
    evmWallet,
    setReceiveAddress,
  ]);

  // Vault shares conversion rate effect
  useEffect(() => {
    if (!vault || !isMounted) return;

    // Determine the amount and asset to use for conversion
    let amountToConvert = "";
    let assetToConvert = "";

    if (!isDirectDeposit) {
      // For cross-chain swaps, use the receive amount and target asset
      if (receiveAmount && vault.supportedAssets.deposit[0]) {
        amountToConvert = receiveAmount;
        assetToConvert = vault.supportedAssets.deposit[0];
      }
    } else {
      // For direct deposits, use the input amount and selected asset
      if (swapAmount && sourceToken) {
        amountToConvert = swapAmount;
        assetToConvert = sourceToken.ticker;
      }
    }

    // Only proceed if we have valid inputs
    if (
      !amountToConvert ||
      !assetToConvert ||
      parseFloat(amountToConvert) <= 0
    ) {
      setVaultSharesPreview(null);
      setConversionError(null);
      return;
    }

    // Check if the asset is supported by the vault (case insensitive)
    const supportedAssets = vault.supportedAssets.deposit.map((asset) =>
      asset.toLowerCase(),
    );
    if (!supportedAssets.includes(assetToConvert.toLowerCase())) {
      setVaultSharesPreview(null);
      setConversionError(`${assetToConvert} not supported by ${vault.name}`);
      return;
    }

    const fetchConversionRate = async () => {
      setIsLoadingConversion(true);
      setConversionError(null);

      try {
        // Use automatic Ethereum provider for vault queries (vaults only exist on Ethereum)
        const conversionResult = await queryVaultConversionRate(
          vault.id,
          assetToConvert,
          amountToConvert,
        );
        setVaultSharesPreview(conversionResult);
      } catch (error) {
        console.error("Failed to fetch vault conversion rate:", error);
        setConversionError(
          error instanceof Error
            ? error.message
            : "Failed to fetch conversion rate",
        );
        setVaultSharesPreview(null);
      } finally {
        setIsLoadingConversion(false);
      }
    };

    fetchConversionRate();
  }, [
    vault,
    swapAmount,
    sourceToken,
    receiveAmount,
    isDirectDeposit,
    isMounted,
    getEvmSigner,
  ]);

  // Don't render on server
  if (!isMounted || !vault) return null;

  const isFormValid = !!(swapAmount && parseFloat(swapAmount) > 0);

  const processProgress = activeProcess
    ? getProcessProgress(activeProcess.id)
    : null;

  const getStepsFromActiveProcess = (
    activeProcess: VaultDepositProcess,
    vault: EtherFiVault,
  ): Step[] => {
    if (!activeProcess) return [];

    const { state, type } = activeProcess;
    const steps = [];

    if (type === "CROSS_CHAIN") {
      // Step 1: Cross-chain swap
      let swapState: StepState = "pending";
      if (state === "SWAP_PENDING") swapState = "active";
      else if (
        [
          "SWAP_COMPLETE",
          "APPROVAL_PENDING",
          "DEPOSIT_PENDING",
          "COMPLETED",
        ].includes(state)
      ) {
        swapState = "completed";
      } else if (state === "FAILED") swapState = "failed";

      steps.push(
        createStep(
          "swap",
          "cross-chain swap",
          `${activeProcess.sourceToken?.ticker} → ${activeProcess.targetAsset}`,
          swapState,
        ),
      );
    }

    // Step 2: Vault deposit (always present)
    let depositState: StepState = "pending";
    if (type === "DIRECT") {
      // Direct deposit only has the vault deposit step
      if (state === "APPROVAL_PENDING" || state === "DEPOSIT_PENDING")
        depositState = "active";
      else if (state === "COMPLETED") depositState = "completed";
      else if (state === "FAILED") depositState = "failed";
    } else {
      // Cross-chain deposit step
      if (["IDLE", "SWAP_PENDING", "SWAP_COMPLETE"].includes(state))
        depositState = "pending";
      else if (state === "APPROVAL_PENDING" || state === "DEPOSIT_PENDING")
        depositState = "active";
      else if (state === "COMPLETED") depositState = "completed";
      else if (state === "FAILED") depositState = "failed";
    }

    steps.push(
      createStep(
        "deposit",
        "vault deposit",
        `${activeProcess.targetAsset} → ${vault.name}`,
        depositState,
      ),
    );

    return steps;
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
            deposit to {vault.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Process Progress */}
          {activeProcess && activeProcess.state !== "CANCELLED" && (
            <ProgressTracker
              steps={getStepsFromActiveProcess(activeProcess, vault)}
              title={processProgress?.description || "Processing..."}
              actionButton={
                activeProcess.state === "SWAP_COMPLETE"
                  ? {
                      label: "cancel & keep swapped tokens",
                      onClick: () => cancelProcess(activeProcess.id),
                      variant: "outline" as const,
                    }
                  : undefined
              }
              show={true}
            />
          )}

          {/* Form - only show when no active process or process completed/failed/cancelled */}
          {(!activeProcess ||
            ["FAILED", "COMPLETED", "CANCELLED"].includes(
              activeProcess.state,
            )) && (
            <>
              {/* Asset/Chain Selection */}
              <div>
                <TokenInputGroup
                  variant="source"
                  amount={swapAmount}
                  onChange={handleSwapAmountChange}
                  showSelectToken={true}
                  isEnabled={true}
                  dollarValue={0}
                  featuredTokens={(
                    tokensByChainId[chains[vault.chain].chainId] || []
                  ).filter((t) =>
                    vault.supportedAssets.deposit.some(
                      (asset) => asset.toLowerCase() === t.ticker.toLowerCase(),
                    ),
                  )}
                  featuredTokensDescription="direct deposit"
                />
                {sourceToken &&
                  sourceChain &&
                  !isChainWalletConnected(sourceChain.id) &&
                  (() => {
                    const chain = getChainById(sourceChain.id);
                    if (chain) {
                      return (
                        <div className="pt-2 flex justify-end">
                          <ConnectWalletButton
                            size="sm"
                            className="w-auto"
                            walletType={chain.walletType}
                          />
                        </div>
                      );
                    }
                    return null;
                  })()}
                {!isDirectDeposit && sourceToken && (
                  <div className="flex justify-end mt-2">
                    <div className="text-xs text-[#A1A1AA]">
                      Will swap {sourceToken.ticker} →{" "}
                      {vault.supportedAssets.deposit[0]}
                      {receiveAmount && (
                        <span className="text-green-500 font-mono ml-2">
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

          {/* Vault shares preview */}
          {((!isDirectDeposit && receiveAmount) ||
            (isDirectDeposit && swapAmount)) && (
            <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-400">you will receive</div>
                {isLoadingConversion && (
                  <div className="text-xs text-zinc-500">loading...</div>
                )}
              </div>

              {conversionError ? (
                <div className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {parseDepositError(conversionError)}
                </div>
              ) : vaultSharesPreview ? (
                <div className="mt-1">
                  <div className="text-lg font-semibold text-green-500 font-mono">
                    ~
                    {parseFloat(vaultSharesPreview.vaultTokensReceived).toFixed(
                      6,
                    )}{" "}
                    {vaultSharesPreview.vaultTokenSymbol}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    exchange rate: 1 {vaultSharesPreview.depositAsset} ={" "}
                    {vaultSharesPreview.exchangeRate.toFixed(6)}{" "}
                    {vaultSharesPreview.vaultTokenSymbol}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-sm text-zinc-500">
                  enter amount to see vault shares preview
                </div>
              )}
            </div>
          )}

          {/* APY Information */}
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Info className="h-4 w-4 text-green-500" />
            <span className="text-sm text-[#FAFAFA]">
              current apy:{" "}
              <span className="text-green-500 font-semibold font-mono">
                {apy && apy != 0 ? formatPercentage(apy) : "--"}
              </span>
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
                      !isChainWalletConnected(sourceChain.id) ||
                      !receiveAmount ||
                      parseFloat(receiveAmount) <= 0
                    : !isFormValid
                }
                className="w-full bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border rounded-lg py-3 font-semibold disabled:opacity-50"
              >
                {isLoadingQuote ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    getting quote...
                  </div>
                ) : (
                  <>
                    {!isDirectDeposit ? (
                      <>
                        start{" "}
                        {sourceChain.id === destinationChain.id
                          ? "swap"
                          : "cross-chain "}{" "}
                        deposit
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        <Wallet className="h-4 w-4 mr-1" />
                        confirm deposit
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
              <ExternalLink className="h-4 w-4 mr-2" />
              withdraw on ether.fi
            </Button>

            <p className="text-xs text-[#71717A] text-center">
              By depositing, you agree to EtherFi&apos;s terms and conditions.
              Your deposit will start earning yield immediately.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
