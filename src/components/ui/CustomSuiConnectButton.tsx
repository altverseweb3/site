import { useRef } from "react";
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import { Wallet } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const CustomSuiConnectButton = ({
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

export default CustomSuiConnectButton;
