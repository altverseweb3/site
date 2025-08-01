"use client";

import * as React from "react";
import { useState } from "react";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { WalletFilterType } from "@/types/web3";
import { toast } from "sonner";
import { walletOptions } from "@/config/wallets";
import { WalletConnectButton } from "@/components/ui/WalletConnectButton";

interface WalletFilterProps {
  selectedWallet: WalletFilterType;
  onWalletChange: (wallet: WalletFilterType) => void;
  className?: string;
}

const WalletIcons: React.FC<{
  walletType: WalletFilterType;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}> = ({ walletType, size = "md", showTooltip = true }) => {
  const selectedOption = walletOptions.find(
    (option) => option.value === walletType,
  );

  if (!selectedOption) return null;

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const iconSize = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  // handle all case with multiple icons
  if (selectedOption.icons) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex -space-x-1">
          {selectedOption.icons.map((iconPath, index) => {
            const walletName = ["MetaMask", "Phantom", "Suiet"][index];
            return (
              <div
                key={iconPath}
                className={cn(
                  "relative rounded-full border border-[#27272A] overflow-hidden bg-[#18181B] group cursor-pointer",
                  sizeClasses[size],
                )}
                title={showTooltip ? walletName : undefined}
              >
                <Image
                  src={iconPath}
                  alt={walletName}
                  width={iconSize[size]}
                  height={iconSize[size]}
                  className="object-contain p-0.5"
                />
                {showTooltip && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                    {walletName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // handle single wallet case
  if (selectedOption.icon) {
    return (
      <div className="flex items-center gap-1">
        <div
          className={cn(
            "relative rounded-full border border-[#27272A] overflow-hidden bg-[#18181B] group cursor-pointer",
            sizeClasses[size],
          )}
          title={showTooltip ? selectedOption.label : undefined}
        >
          <Image
            src={selectedOption.icon}
            alt={selectedOption.label}
            width={iconSize[size]}
            height={iconSize[size]}
            className="object-contain p-0.5"
          />
          {showTooltip && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
              {selectedOption.label}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

const WalletFilter: React.FC<WalletFilterProps> = ({
  selectedWallet,
  onWalletChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isWalletTypeConnected } = useWalletConnection();

  const selectedOption = walletOptions.find(
    (option) => option.value === selectedWallet,
  );

  const handleSelect = (wallet: WalletFilterType) => {
    onWalletChange(wallet);
    setIsOpen(false);
  };

  const getAvailableOptions = () => {
    const availableOptions = [walletOptions[0]];

    walletOptions.slice(1).forEach((option) => {
      if (option.walletType && isWalletTypeConnected(option.walletType)) {
        availableOptions.push(option);
      }
    });

    return availableOptions;
  };

  const availableOptions = getAvailableOptions();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between gap-2 min-w-[140px] h-9 px-3",
            "border-[#27272A] bg-[#18181B] hover:bg-[#1C1C1F] text-[#FAFAFA]",
            "focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50",
          )}
        >
          <div className="flex items-center gap-2">
            <WalletIcons
              walletType={selectedWallet}
              size="sm"
              showTooltip={false}
            />
            <span className="text-sm font-medium">
              {selectedOption?.label || "Select Wallet"}
            </span>
          </div>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
          />
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] z-20 bg-[#18181B] border border-[#27272A] rounded-md shadow-lg overflow-hidden">
              {availableOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2.5",
                    "hover:bg-[#1C1C1F] transition-colors text-left",
                    "focus:bg-[#1C1C1F] focus:outline-none",
                    selectedWallet === option.value && "bg-amber-500/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <WalletIcons
                      walletType={option.value}
                      size="sm"
                      showTooltip={false}
                    />
                    <span className="text-sm font-medium text-[#FAFAFA]">
                      {option.label}
                    </span>
                  </div>
                  {selectedWallet === option.value && (
                    <CheckIcon className="h-4 w-4 text-amber-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        {walletOptions.slice(1).map((option) => {
          if (!option.walletType) return null;

          const isConnected = isWalletTypeConnected(option.walletType);

          if (isConnected) return null; // Don't show connect button if already connected

          return (
            <WalletConnectButton
              key={option.value}
              walletType={option.walletType}
              onSuccess={() => {
                toast.success(`Connected to ${option.label}`);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export { WalletFilter, WalletIcons };
export type { WalletFilterProps };
