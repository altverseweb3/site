import React, { useState } from "react";
import { Wallet } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAppKit } from "@reown/appkit/react";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { WalletType } from "@/types/web3";
import { toast } from "sonner";
import { walletOptions } from "@/config/wallets";
import { CustomSuiConnectButton } from "@/components/ui/CustomSuiConnectButton";

interface WalletConnectButtonProps {
  walletType: WalletType;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  walletType,
  onSuccess,
  onError,
  className,
  size = "sm",
  showIcon = true,
  children,
}) => {
  const [connecting, setConnecting] = useState(false);
  const { open: openAppKit } = useAppKit();
  const { isWalletTypeConnected } = useWalletConnection();

  const walletOption = walletOptions.find(
    (option) => option.walletType === walletType,
  );

  if (!walletOption) {
    console.error(`No wallet option found for wallet type: ${walletType}`);
    return null;
  }

  const isConnected = isWalletTypeConnected(walletType);

  if (isConnected) {
    return null;
  }

  // handling for Suiet
  if (walletType === WalletType.SUIET_SUI) {
    return (
      <CustomSuiConnectButton onSuccess={onSuccess} className={className} />
    );
  }

  const handleConnect = async () => {
    try {
      setConnecting(true);

      switch (walletType) {
        case WalletType.REOWN_EVM:
          openAppKit({ view: "Connect", namespace: "eip155" });
          break;
        case WalletType.REOWN_SOL:
          openAppKit({ view: "Connect", namespace: "solana" });
          break;
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      if (onSuccess) {
        setTimeout(onSuccess, 1000);
      }

      setTimeout(() => {
        setConnecting(false);
      }, 3000);
    } catch (error) {
      console.error(`Error connecting to ${walletOption.label}:`, error);
      const errorMessage =
        error instanceof Error
          ? error
          : new Error(`Failed to connect to ${walletOption.label}`);

      toast.error(errorMessage.message);

      if (onError) {
        onError(errorMessage);
      }

      setConnecting(false);
    }
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2",
    lg: "text-base px-4 py-3",
  };

  const iconSizes = {
    sm: { width: 12, height: 12, iconClass: "h-3 w-3" },
    md: { width: 16, height: 16, iconClass: "h-4 w-4" },
    lg: { width: 20, height: 20, iconClass: "h-5 w-5" },
  };

  const getWalletStyles = () => {
    switch (walletType) {
      case WalletType.REOWN_EVM:
        return "bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30";
      case WalletType.REOWN_SOL:
        return "bg-purple-500/20 text-purple-500 hover:text-purple-400 hover:bg-purple-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30";
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className={cn(
        sizeClasses[size],
        "rounded transition-colors flex items-center justify-between w-full",
        getWalletStyles(),
        connecting && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Wallet className={iconSizes[size].iconClass} />
        <span>
          {children ||
            (connecting
              ? "connecting..."
              : `connect ${walletOption.label.toLowerCase()}`)}
        </span>
      </div>
      {showIcon && walletOption.icon && (
        <Image
          src={walletOption.icon}
          alt={walletOption.label}
          width={iconSizes[size].width}
          height={iconSizes[size].height}
          className="object-contain"
        />
      )}
    </button>
  );
};

export default WalletConnectButton;
