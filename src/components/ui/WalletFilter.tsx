"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { ChevronDownIcon, CheckIcon, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import Image from "next/image";
import { useAppKit } from "@reown/appkit/react";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import { WalletType } from "@/types/web3";
import { toast } from "sonner";

export type WalletFilterType = "all" | "metamask" | "phantom" | "suiet";

interface WalletOption {
  value: WalletFilterType;
  label: string;
  icon?: string;
  icons?: string[]; // For "all" option
  walletType?: WalletType; // Map to actual wallet type
}

interface WalletFilterProps {
  selectedWallet: WalletFilterType;
  onWalletChange: (wallet: WalletFilterType) => void;
  className?: string;
}

const walletOptions: WalletOption[] = [
  {
    value: "all",
    label: "all wallets",
    icons: [
      "/wallets/metamask.svg",
      "/wallets/phantom.svg",
      "/wallets/sui.svg",
    ],
  },
  {
    value: "metamask",
    label: "metamask",
    icon: "/wallets/metamask.svg",
    walletType: WalletType.REOWN_EVM,
  },
  {
    value: "phantom",
    label: "phantom",
    icon: "/wallets/phantom.svg",
    walletType: WalletType.REOWN_SOL,
  },
  {
    value: "suiet",
    label: "suiet",
    icon: "/wallets/sui.svg",
    walletType: WalletType.SUIET_SUI,
  },
];

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

  // Handle "all" case with multiple icons
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

  // Handle single wallet case
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

const CustomSuiConnectButton = ({
  onSuccess,
  className,
}: {
  onSuccess?: () => void;
  className?: string;
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { connected, disconnect } = useWallet();

  const handleCustomClick = () => {
    if (connected) {
      disconnect();
    } else {
      if (!buttonRef.current) {
        console.error("Button ref is null or undefined.");
        return;
      }

      const suietButton = buttonRef.current.querySelector("button");
      if (!suietButton) {
        console.error(
          "Could not find the button element inside the hidden div.",
        );
        return;
      }

      suietButton.click();
      // Success will be handled by the wallet sync component
      if (onSuccess) {
        // Delay the callback to allow connection to complete
        setTimeout(onSuccess, 1000);
      }
    }
  };

  return (
    <div className="relative">
      {/* Hidden Suiet button */}
      <div
        ref={buttonRef}
        className="absolute opacity-0 pointer-events-auto inset-0 z-10"
        style={{ height: "1px", width: "1px", overflow: "hidden" }}
      >
        <ConnectButton />
      </div>

      {/* Visible custom button */}
      <button
        className={cn(
          "text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30 transition-colors",
          "flex items-center justify-between w-full",
          className,
        )}
        onClick={handleCustomClick}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-3 w-3" />
          <span className="text-[11px]">connect sui</span>
        </div>
        <Image
          src="/wallets/sui.svg"
          alt="Suiet"
          width={12}
          height={12}
          className="object-contain"
        />
      </button>
    </div>
  );
};

const WalletFilter: React.FC<WalletFilterProps> = ({
  selectedWallet,
  onWalletChange,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [connecting, setConnecting] = useState<WalletType | null>(null);

  const { open: openAppKit } = useAppKit();
  const { isWalletTypeConnected } = useWalletConnection();

  const selectedOption = walletOptions.find(
    (option) => option.value === selectedWallet,
  );

  const handleSelect = (wallet: WalletFilterType) => {
    onWalletChange(wallet);
    setIsOpen(false);
  };

  const handleWalletConnect = async (
    walletType: WalletType,
    walletName: string,
  ) => {
    try {
      setConnecting(walletType);

      switch (walletType) {
        case WalletType.REOWN_EVM:
          openAppKit({ view: "Connect", namespace: "eip155" });
          break;
        case WalletType.REOWN_SOL:
          openAppKit({ view: "Connect", namespace: "solana" });
          break;
        // Suiet is handled by CustomSuiConnectButton
      }

      // Reset connecting state after a delay
      setTimeout(() => {
        setConnecting(null);
      }, 3000);
    } catch (error) {
      console.error(`Error connecting to ${walletName}:`, error);
      toast.error(`Failed to connect to ${walletName}`);
      setConnecting(null);
    }
  };

  // Get only connected wallets for dropdown
  const getAvailableOptions = () => {
    const availableOptions = [walletOptions[0]]; // Always include "all"

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
      {/* Dropdown for connected wallets */}
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
            {/* Backdrop */}
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

      {/* Connect buttons for disconnected wallets */}
      <div className="space-y-2">
        {walletOptions.slice(1).map((option) => {
          if (!option.walletType) return null;

          const isConnected = isWalletTypeConnected(option.walletType);
          const isCurrentlyConnecting = connecting === option.walletType;

          if (isConnected) return null; // Don't show connect button if already connected

          // Special handling for Suiet
          if (option.walletType === WalletType.SUIET_SUI) {
            return (
              <CustomSuiConnectButton
                key={option.value}
                onSuccess={() => {
                  toast.success(`Connected to ${option.label}`);
                }}
              />
            );
          }

          return (
            <button
              key={option.value}
              onClick={() =>
                handleWalletConnect(option.walletType!, option.label)
              }
              disabled={isCurrentlyConnecting}
              className={cn(
                "text-xs px-2 py-1 rounded transition-colors flex items-center justify-between w-full",
                option.walletType === WalletType.REOWN_EVM &&
                  "bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30",
                option.walletType === WalletType.REOWN_SOL &&
                  "bg-purple-500/20 text-purple-500 hover:text-purple-400 hover:bg-purple-500/30",
                isCurrentlyConnecting && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-3 w-3" />
                <span className="text-[11px]">
                  {isCurrentlyConnecting
                    ? "connecting..."
                    : `connect ${option.label}`}
                </span>
              </div>
              {option.icon && (
                <Image
                  src={option.icon}
                  alt={option.label}
                  width={12}
                  height={12}
                  className="object-contain"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { WalletFilter, WalletIcons };
export type { WalletFilterProps };
