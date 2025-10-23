import React, { ReactNode, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { useSourceChain } from "@/store/web3Store";
import { toast } from "sonner";
import { AvailableIconName } from "@/types/ui";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";
import { useSwitchActiveNetwork } from "@/hooks/dynamic/useUserWallets";

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
  const sourceChain = useSourceChain();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const requiredWallet = useWalletByType(sourceChain.walletType);

  const {
    switchNetwork,
    error: networkSwitchError,
    isLoading: isSwitchingNetwork,
  } = useSwitchActiveNetwork(sourceChain.walletType);

  const checkCurrentChain = async (): Promise<boolean> => {
    if (!requiredWallet) {
      return false;
    }

    try {
      const currentChainId = await requiredWallet.getNetwork();
      return currentChainId === sourceChain.chainId;
    } catch (error) {
      console.error("Error checking current chain:", error);
      return false;
    }
  };

  useEffect(() => {
    if (networkSwitchError) {
      toast.error("Chain switch failed", {
        description: networkSwitchError,
      });
    }
  }, [networkSwitchError]);

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
      const isWalletTypeCorrect = requiredWallet !== null;

      if (!isWalletTypeCorrect) {
        const requiredWalletType = sourceChain.walletType;

        toast.error(`${requiredWalletType} wallet required`, {
          description: `Please connect a ${requiredWalletType} wallet to continue`,
        });
        return;
      }

      // Special handling for Sui - no chain switching yet
      if (requiredWallet?.chain === "SUI") {
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

        const switched = await switchNetwork(sourceChain.chainId);

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
    (actionButton?.disabled ?? false) || isSwitchingNetwork || isProcessing;

  const getButtonText = () => {
    if (isSwitchingNetwork) {
      return `switching network`;
    }
    if (isProcessing) {
      return "swapping";
    }
    return actionButton?.text || "Swap";
  };

  const getButtonIcon = (): AvailableIconName => {
    if (isSwitchingNetwork) {
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
