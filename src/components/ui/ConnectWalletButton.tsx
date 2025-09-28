import React from "react";
import { Wallet } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { WalletType } from "@/types/web3";
import { walletOptions } from "@/config/wallets";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";

interface ConnectWalletButtonProps {
  walletType: WalletType;
  onSuccess?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  children?: React.ReactNode;
}

export const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  walletType,
  onSuccess,
  className,
  size = "sm",
  showIcon = true,
  children,
}) => {
  const walletOption = walletOptions.find(
    (option) => option.walletType === walletType,
  );

  if (!walletOption) {
    console.error(`No wallet option found for wallet type: ${walletType}`);
    return null;
  }

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

  const trigger = (
    <button
      className={cn(
        sizeClasses[size],
        "rounded transition-colors flex items-center justify-between w-full",
        getWalletStyles(),
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Wallet className={iconSizes[size].iconClass} />
        <span className="pr-2">
          {children || `connect ${walletOption.label.toLowerCase()}`}
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

  return <ConnectWalletModal trigger={trigger} onSuccess={onSuccess} />;
};

export default ConnectWalletButton;
