import React from "react";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletType } from "@/types/web3";
import { walletOptions } from "@/config/wallets";
import { useHandleWalletClick } from "@/hooks/dynamic/useUserWallets";

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
  className,
  size = "sm",
  showIcon = true,
  children,
}) => {
  const handleWalletClick = useHandleWalletClick(walletType);
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
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const getWalletStyles = () => {
    switch (walletType) {
      case WalletType.EVM:
        return "bg-[#6379F8]/20 text-[#6379F8] hover:text-[#6379F8] hover:bg-[#6379F8]/30";
      case WalletType.SOLANA:
        return "bg-purple-500/20 text-purple-500 hover:text-purple-400 hover:bg-purple-500/30";
      default:
        return "bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30";
    }
  };

  return (
    <button
      onClick={handleWalletClick}
      className={cn(
        sizeClasses[size],
        "rounded transition-colors flex items-center justify-between hover:cursor-pointer w-full",
        getWalletStyles(),
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Wallet className={iconSizes[size]} />
        <span className="pr-2">
          {children || `connect ${walletOption.label.toLowerCase()}`}
        </span>
      </div>
      {showIcon && walletOption.icon && (
        <div className={iconSizes[size]}>{walletOption.icon}</div>
      )}
    </button>
  );
};

export default ConnectWalletButton;
