import React, { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { TransactionDetails } from "@/components/ui/TransactionDetails";
import { useChainSwitch } from "@/utils/walletMethods";
import useWeb3Store from "@/store/web3Store";
import { toast } from "sonner";
import { AvailableIconName } from "@/types/ui";

interface SwapInterfaceProps {
  children: ReactNode;
  actionButton: {
    text: string;
    iconName: AvailableIconName;
    onClick?: () => void;
    disabled?: boolean;
  };
  className?: string;
  // Transaction details props
  exchangeRate?: string;
  exchangeValue?: string;
  gasFee?: string;
  estimatedTime?: string;
  transactionDetails?: {
    slippage: string;
    fee: { percentage: string; value: string };
    relayerFees: string;
    sending: string;
    receiving: string;
  };
  enforceSourceChain?: boolean;
  renderActionButton?: () => ReactNode;
}

export function SwapInterface({
  children,
  actionButton,
  className = "",
  exchangeRate,
  exchangeValue,
  gasFee,
  estimatedTime,
  transactionDetails,
  enforceSourceChain = true,
  renderActionButton,
}: SwapInterfaceProps) {
  const {
    isLoading: isSwitchingChain,
    error: chainSwitchError,
    switchToSourceChain,
  } = useChainSwitch();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const sourceChain = useWeb3Store((state) => state.sourceChain);

  const checkCurrentChain = async (): Promise<boolean> => {
    if (!activeWallet || !window.ethereum) {
      return false;
    }

    try {
      const chainIdHex = await window.ethereum.request<string>({
        method: "eth_chainId",
      });
      const currentChainId = parseInt(chainIdHex as string, 16);

      console.log("Current MetaMask chainId:", currentChainId);
      console.log("Source chain ID:", sourceChain.chainId);

      if (activeWallet.chainId !== currentChainId) {
        const store = useWeb3Store.getState();
        store.updateWalletChainId(activeWallet.type, currentChainId);
      }

      return currentChainId === sourceChain.chainId;
    } catch (error) {
      console.error("Error checking current chain:", error);
      return false;
    }
  };

  React.useEffect(() => {
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
      const isOnCorrectChain = await checkCurrentChain();

      if (activeWallet && !isOnCorrectChain) {
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

        const verifySwitch = await checkCurrentChain();
        if (!verifySwitch) {
          toast.error("Network mismatch", {
            description: `Your wallet is still not on ${sourceChain.name}. Please try again.`,
          });
          return;
        }
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
          exchangeRate={exchangeRate}
          exchangeValue={exchangeValue}
          gasFee={gasFee}
          estimatedTime={estimatedTime}
          transactionDetails={transactionDetails}
        />
      </CardContent>
    </Card>
  );
}

export default SwapInterface;
