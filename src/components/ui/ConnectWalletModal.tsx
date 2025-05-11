"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { WalletInfo, WalletType } from "@/types/web3";
import { cn } from "@/lib/utils";
import { useAppKit } from "@reown/appkit/react";
import { useWalletConnection } from "@/utils/walletMethods";
import { ConnectButton, useWallet } from "@suiet/wallet-kit";
import useWeb3Store from "@/store/web3Store";

type WalletOption = {
  id: WalletType;
  name: string;
  icons: string[];
  disabled: boolean;
  background: string;
  connectMethod: () => Promise<WalletInfo | null>;
};

const CustomSuiConnectButton = ({ className }: { className?: string }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const { connected, disconnect } = useWallet(); // Access Sui wallet state directly
  const isConnected = useWeb3Store((state) => state.isWalletTypeConnected(WalletType.SUIET_SUI));

  const handleCustomClick = () => {
    if (connected) {
      // If connected, disconnect
      disconnect();
      // Store will be updated via the SuiWalletSync component
    } else {
      // If not connected, click the hidden button
      if (!buttonRef.current) {
        console.error("Button ref is null or undefined.");
        return;
      }
      
      const suietButton = buttonRef.current.querySelector("button");
      if (!suietButton) {
        console.error("Could not find the button element inside the hidden div.");
        return;
      }
      
      suietButton.click();
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
      <Button
        variant="outline"
        className={cn(
          "w-full flex items-center justify-between px-3 py-6 rounded-md bg-[#18181B] border transition-colors text-[#FAFAFA] hover:bg-[#27272A]",
          isConnected ? "border-amber-600" : "border-[#27272A]",
          className,
        )}
        onClick={handleCustomClick}
      >
        <div className="flex items-center">
          <span className="font-medium">sui wallets</span>
          {isConnected && (
            <span className="ml-3 text-xs text-amber-500">
              {buttonRef.current?.querySelector("button")?.classList.contains("wkit-disconnecting-button") 
                ? "disconnecting..." 
                : "connected"}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <Image
            src="/wallets/sui.svg"
            alt="sui wallet icon"
            width={24}
            height={24}
            className="object-contain mx-1"
          />
        </div>
      </Button>
    </div>
  );
};

export const ConnectWalletModal = ({
  trigger,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const [hoveredWallet, setHoveredWallet] = useState<WalletType | null>(null);

  // Use refs to track wallet state and whether a connection is in progress
  // Using Partial to allow for empty or incomplete records
  const previousWalletsRef = useRef<Partial<Record<WalletType, string>>>({});
  const isNewConnectionRef = useRef<boolean>(false);

  const { open: openAppKit } = useAppKit();
  const { disconnectWallet, isWalletTypeConnected } = useWalletConnection();

  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const connectedWallets = useWeb3Store((state) => state.connectedWallets);

  // When modal opens, capture the current state of wallets
  useEffect(() => {
    if (modalOpen) {
      // Reset the new connection flag
      isNewConnectionRef.current = false;

      // Store current wallet addresses by type
      const currentWallets: Partial<Record<WalletType, string>> = {};
      connectedWallets.forEach((wallet) => {
        currentWallets[wallet.type] = wallet.address;
      });

      previousWalletsRef.current = currentWallets;
    }
  }, [modalOpen, connectedWallets]);

  // Check for new wallet connections
  useEffect(() => {
    if (!modalOpen || !activeWallet) return;

    // Check if this wallet was newly connected
    const previousAddress = previousWalletsRef.current[activeWallet.type];
    const isNewWallet =
      !previousAddress || previousAddress !== activeWallet.address;

    // Only react if this is a newly connected wallet AND the connection was initiated
    // within this component (not from elsewhere)
    if (isNewWallet && isNewConnectionRef.current) {
      // Update our record of connected wallets
      previousWalletsRef.current[activeWallet.type] = activeWallet.address;

      // Show success and close modal
      setModalOpen(false);
      toast.success(`Connected to ${activeWallet.name}`);
      if (onSuccess) onSuccess();

      // Reset the connection flag
      isNewConnectionRef.current = false;
    }
  }, [activeWallet, modalOpen, onSuccess]);

  // Special handler for Dialog onOpenChange
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && connecting) {
        // Reset connecting state when modal is closed while connecting
        setConnecting(null);
      }
      setModalOpen(open);
    },
    [connecting],
  );

  const walletOptions: WalletOption[] = [
    {
      id: WalletType.REOWN_EVM,
      name: "evm wallets",
      icons: ["/wallets/metamask.svg", "/wallets/walletconnect.svg"],
      disabled: false,
      background: "bg-[#E27625]/0",
      connectMethod: async () => {
        openAppKit({ view: "Connect", namespace: "eip155" });
        return null;
      },
    },
    {
      id: WalletType.REOWN_SOL,
      name: "solana wallets",
      icons: ["/wallets/phantom.svg"],
      disabled: false,
      background: "bg-[#E27625]/0",
      connectMethod: async () => {
        openAppKit({ view: "Connect", namespace: "solana" });
        return null;
      },
    },
  ];

  const handleWalletSelect = async (wallet: WalletOption) => {
    if (wallet.disabled) {
      toast.info(`${wallet.name} integration coming soon!`);
      return;
    }

    // Check if wallet is already connected
    const isConnected = isWalletTypeConnected(wallet.id);

    if (isConnected) {
      // If already connected, disconnect it
      try {
        setConnecting(wallet.id);
        console.log(`Disconnecting from ${wallet.name}...`);

        await disconnectWallet(wallet.id);
        toast.success(`Disconnected from ${wallet.name}`);

        // Update our ref of connected wallets
        const updatedWallets = { ...previousWalletsRef.current };
        delete updatedWallets[wallet.id];
        previousWalletsRef.current = updatedWallets;

        // Reset connecting state
        setConnecting(null);
      } catch (error) {
        console.error(`Error disconnecting from ${wallet.name}:`, error);
        toast.error(`Failed to disconnect from ${wallet.name}`);
        setConnecting(null);
      }
    } else {
      // If not connected, connect to it
      try {
        setConnecting(wallet.id);
        console.log(`Connecting to ${wallet.name}...`);

        // Set flag to indicate we're initiating a new connection
        isNewConnectionRef.current = true;

        await wallet.connectMethod();

        // Add a timeout to reset the connecting state if it gets stuck
        setTimeout(() => {
          if (connecting === wallet.id) {
            setConnecting(null);
            // If we're still connecting after timeout, reset the new connection flag
            isNewConnectionRef.current = false;
          }
        }, 5000);
      } catch (error) {
        console.error(`Error connecting to ${wallet.name}:`, error);
        toast.error(`Failed to connect to ${wallet.name}.`);
        setConnecting(null);
        isNewConnectionRef.current = false;
      }
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger className="flex items-center gap-2 px-4 py-2 rounded-md border border-amber-600 bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-500 hover:from-amber-500/20 hover:to-amber-500/10 transition-colors">
          <Wallet className="h-4 w-4" />
          <span>Connect Wallet</span>
        </DialogTrigger>
      )}
      <DialogContent
        className="sm:w-1/2 w-2/3 rounded-lg bg-[#18181B] border-[#27272A] border 
  [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none
  [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] 
  [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] 
  [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]"
      >
        {" "}
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA]">select wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {walletOptions.map((wallet) => {
            const isConnected = isWalletTypeConnected(wallet.id);
            const isHovered = hoveredWallet === wallet.id;
            const isCurrentlyConnecting = connecting === wallet.id;

            return (
              <Button
                key={wallet.id}
                variant="outline"
                className={cn(
                  "w-full flex items-center justify-between px-3 py-6 rounded-md bg-[#18181B] border border-[#27272A] transition-colors",
                  wallet.disabled
                    ? "text-[#52525b]"
                    : isConnected
                      ? "text-[#FAFAFA] hover:bg-[#27272A] border-amber-600"
                      : "text-[#FAFAFA] hover:bg-[#27272A]",
                )}
                onClick={() => handleWalletSelect(wallet)}
                disabled={
                  wallet.disabled ||
                  (connecting !== null && connecting !== wallet.id)
                }
                onMouseEnter={() => setHoveredWallet(wallet.id)}
                onMouseLeave={() => setHoveredWallet(null)}
              >
                <div className="flex items-center">
                  <span className="font-medium">{wallet.name}</span>
                  {isCurrentlyConnecting ? (
                    <span className="ml-3 text-xs text-amber-500">
                      {isConnected ? "disconnecting..." : "connecting..."}
                    </span>
                  ) : isConnected ? (
                    <span className="ml-3 text-xs text-amber-500">
                      {isHovered ? "disconnect" : "connected"}
                    </span>
                  ) : null}
                </div>

                <div
                  className={`h-8 w-auto relative flex items-center justify-center rounded-md ${
                    wallet.background
                  }`}
                >
                  <div className="flex items-center">
                    {wallet.icons.map((icon, index) => (
                      <Image
                        key={index}
                        src={icon}
                        alt={`${wallet.name} icon ${index + 1}`}
                        width={24}
                        height={24}
                        className="object-contain mx-1"
                      />
                    ))}
                  </div>
                </div>
              </Button>
            );
          })}
          <CustomSuiConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectWalletModal;
