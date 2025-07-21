import { useRef } from "react";
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import { Wallet } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const CustomSuiConnectButton = ({
  onSuccess,
  className,
  size = "sm",
}: {
  onSuccess?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { connected, disconnect } = useWallet();

  // Size classes to match WalletConnectButton exactly
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
      {/* Visible custom button - now matches WalletConnectButton styling exactly */}
      <button
        className={cn(
          sizeClasses[size],
          "rounded transition-colors flex items-center justify-between w-full",
          "bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30",
          className,
        )}
        onClick={handleCustomClick}
      >
        <div className="flex items-center gap-2">
          <Wallet className={iconSizes[size].iconClass} />
          <span className="pr-2">connect sui</span>
        </div>
        <Image
          src="/wallets/sui.svg"
          alt="Suiet"
          width={iconSizes[size].width}
          height={iconSizes[size].height}
          className="object-contain"
        />
      </button>
    </div>
  );
};

export default CustomSuiConnectButton;
