import React, { ReactNode, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import {
  useChainSwitch,
  useWalletConnection,
  ensureCorrectWalletTypeForChain,
} from "@/utils/swap/walletMethods";
import useWeb3Store from "@/store/web3Store";
import { toast } from "sonner";
import { AvailableIconName } from "@/types/ui";
import { WalletType } from "@/types/web3";
import { useWallet } from "@suiet/wallet-kit";

interface SwapInterfaceProps {
  children: ReactNode;
  actionButton: {
    text: string;
    iconName: AvailableIconName;
    onClick?: () => void;
    disabled?: boolean;
  };
  className?: string;
  protocolFeeUsd?: number;
  relayerFeeUsd?: number;
  totalFeeUsd?: number;
  estimatedTime?: number | null;
  enforceSourceChain?: boolean;
  renderActionButton?: () => ReactNode;
  detailsOpen?: boolean;
  onDetailsToggle?: () => void;
  isLoadingQuote?: boolean;
}

export function SwapInterface({
  children,
  actionButton,
  className = "",
  protocolFeeUsd,
  relayerFeeUsd,
  totalFeeUsd,
  estimatedTime,
  enforceSourceChain = true,
  renderActionButton,
  detailsOpen,
  onDetailsToggle,
}: SwapInterfaceProps) {
  const sourceChain = useWeb3Store((state) => state.sourceChain);

  const {
    isLoading: isSwitchingChain,
    error: chainSwitchError,
    switchToSourceChain,
  } = useChainSwitch(sourceChain);

  // Get wallet connection information for EVM, Solana, and Sui
  const { evmNetwork, isEvmConnected } = useWalletConnection();

  // Get Sui wallet info directly
  const { connected: suiConnected } = useWallet();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  const checkCurrentChain = async (): Promise<boolean> => {
    if (!requiredWallet) {
      return false;
    }

    try {
      let currentChainId: number | undefined;

      // Check which wallet type we're using
      if (requiredWallet.type === WalletType.REOWN_EVM) {
        // For EVM wallets, get chain ID from the EVM network
        if (evmNetwork.chainId !== undefined) {
          currentChainId =
            typeof evmNetwork.chainId === "string"
              ? parseInt(evmNetwork.chainId, 10)
              : evmNetwork.chainId;
        }
      }
      // For Solana and Sui wallets, we only support the mainnet chain

      console.log("Current chain ID:", currentChainId);
      console.log("Source chain ID:", sourceChain.chainId);

      // Update the store if the chain ID has changed
      if (
        requiredWallet.chainId !== currentChainId &&
        currentChainId !== undefined
      ) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(requiredWallet.type, currentChainId);
      }

      return currentChainId === sourceChain.chainId;
    } catch (error) {
      console.error("Error checking current chain:", error);
      return false;
    }
  };

  // Update store when chain ID changes for EVM, Solana, or Sui wallets
  useEffect(() => {
    if (
      isEvmConnected &&
      requiredWallet?.type === WalletType.REOWN_EVM &&
      evmNetwork.chainId !== undefined
    ) {
      const numericChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      if (requiredWallet.chainId !== numericChainId) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(WalletType.REOWN_EVM, numericChainId);
      }
    }
  }, [evmNetwork.chainId, isEvmConnected, requiredWallet]);

  useEffect(() => {
    if (chainSwitchError) {
      toast.error("Chain switch failed", {
        description: chainSwitchError,
      });
    }
  }, [chainSwitchError]);

  const handleButtonClick = async () => {
    if (renderActionButton) {
      return;
    }

    if (!enforceSourceChain) {
      if (actionButton?.onClick) {
        actionButton.onClick();
      }
      return;
    }

    try {
      // First, check if we're using the correct wallet type for the source chain
      const isWalletTypeCorrect = ensureCorrectWalletTypeForChain(sourceChain);

      if (!isWalletTypeCorrect) {
        const requiredWalletType = sourceChain.walletType;

        toast.error(`${requiredWalletType} wallet required`, {
          description: `Please connect a ${requiredWalletType} wallet to continue`,
        });
        return;
      }

      // Special handling for Sui - no chain switching yet
      if (requiredWallet?.type === WalletType.SUIET_SUI) {
        // For Sui, we just check if we're connected
        if (!suiConnected) {
          toast.error("Sui wallet not connected", {
            description: "Please connect your Sui wallet to continue",
          });
          return;
        }

        // Execute the action directly since we can't switch chains in Sui yet
        if (actionButton?.onClick) {
          setIsProcessing(true);
          await Promise.resolve(actionButton.onClick());
        }
        return;
      }

      // Then check if we're on the correct chain for EVM and Solana
      const isOnCorrectChain = await checkCurrentChain();

      if (requiredWallet && !isOnCorrectChain) {
        const toastId = toast.loading(
          `Switching to ${sourceChain.name} network...`,
          {
            description: "Please confirm in your wallet",
          },
        );

        const switched = await switchToSourceChain();

        if (!switched) {
          toast.error("Chain switch required", {
            id: toastId,
            description: `Please switch to ${sourceChain.name} network to continue`,
          });
          return;
        }

        toast.success("Network switched", {
          id: toastId,
          description: `Successfully switched to ${sourceChain.name}`,
        });
      }

      if (actionButton?.onClick) {
        setIsProcessing(true);
        await Promise.resolve(actionButton.onClick());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      toast.error("Transaction error", {
        description: message,
      });
      console.error("Transaction error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled =
    (actionButton?.disabled ?? false) || isSwitchingChain || isProcessing;

  const getButtonText = () => {
    if (isSwitchingChain) {
      return `switching network`;
    }
    if (isProcessing) {
      return "swapping";
    }
    return actionButton?.text || "Swap";
  };

  const getButtonIcon = (): AvailableIconName => {
    if (isSwitchingChain) {
      return "ArrowLeftRight";
    }
    return actionButton?.iconName || "Coins";
  };

  return (
    <Card
      className={`w-full bg-zinc-950 border-none rounded-[6px] ${className}`}
    >
      <CardContent className="p-2">
        <div className="space-y-[3px]">{children}</div>

        <div className="mt-[10px]">
          {renderActionButton ? (
            renderActionButton()
          ) : (
            <BrandedButton
              buttonText={getButtonText()}
              iconName={getButtonIcon()}
              onClick={handleButtonClick}
              disabled={isButtonDisabled}
              className="h-[40px] w-full"
            />
          )}
        </div>

        <TransactionDetails
          protocolFeeUsd={protocolFeeUsd}
          relayerFeeUsd={relayerFeeUsd}
          totalFeeUsd={totalFeeUsd}
          estimatedTime={estimatedTime}
          isOpen={detailsOpen}
          onToggle={onDetailsToggle}
        />
      </CardContent>
    </Card>
  );
}

export default SwapInterface;
