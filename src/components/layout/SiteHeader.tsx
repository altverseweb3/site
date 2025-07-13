"use client";

import { MainNav } from "@/components/layout/MainNav";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { Menu, History, Clock, ExternalLink, Filter } from "lucide-react";
import BrandedButton from "@/components/ui/BrandedButton";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import {
  WalletSelector,
  WalletIcons,
  type WalletFilterType,
} from "@/components/ui/WalletFilter";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { WalletType } from "@/types/web3";
import Link from "next/link";

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletFilterType>("all");

  const { isWalletTypeConnected } = useWalletConnection();

  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  const handleSheetClose = () => {
    setIsOpen(false);
  };

  // Get wallet button text based on connection status
  const getWalletButtonText = () => {
    if (!requiredWallet) return "connect wallet";
    return "wallet connected";
  };

  useEffect(() => {
    const handleResize = () => {
      // Check if window width is at or above the md breakpoint
      if (window.innerWidth >= 768 && isOpen) {
        setIsOpen(false);
      }
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]); // Only re-run if isOpen changes

  // Placeholder transaction data for design purposes
  const mockTransactions = [
    {
      id: "1",
      type: "Swap",
      fromToken: "USDC",
      toToken: "SOL",
      fromChain: "Ethereum",
      toChain: "Solana",
      amount: "100 USDC",
      status: "completed",
      timestamp: "2 hours ago",
      txHash: "0x1234...5678",
      wallet: "metamask" as WalletFilterType,
      walletType: WalletType.REOWN_EVM,
    },
    {
      id: "2",
      type: "Swap",
      fromToken: "ETH",
      toToken: "AVAX",
      fromChain: "Ethereum",
      toChain: "Avalanche",
      amount: "0.5 ETH",
      status: "pending",
      timestamp: "1 day ago",
      txHash: "0xabcd...efgh",
      wallet: "phantom" as WalletFilterType,
      walletType: WalletType.REOWN_SOL,
    },
    {
      id: "3",
      type: "Swap",
      fromToken: "SUI",
      toToken: "USDT",
      fromChain: "Sui",
      toChain: "Polygon",
      amount: "1000 SUI",
      status: "failed",
      timestamp: "3 days ago",
      txHash: "0x9999...1111",
      wallet: "suiet" as WalletFilterType,
      walletType: WalletType.SUIET_SUI,
    },
  ];

  // Filter transactions based on selected wallet and connection status
  const getFilteredTransactions = () => {
    if (selectedWallet === "all") {
      // For "all", only show transactions from connected wallets
      return mockTransactions.filter((tx) => {
        return isWalletTypeConnected(tx.walletType);
      });
    } else {
      // For specific wallet, check if it's connected and filter
      const walletTypeMap: Record<WalletFilterType, WalletType | undefined> = {
        all: undefined,
        metamask: WalletType.REOWN_EVM,
        phantom: WalletType.REOWN_SOL,
        suiet: WalletType.SUIET_SUI,
      };

      const walletType = walletTypeMap[selectedWallet];
      if (walletType && isWalletTypeConnected(walletType)) {
        return mockTransactions.filter((tx) => tx.wallet === selectedWallet);
      }
      return [];
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "pending":
        return "text-yellow-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="flex h-14 items-center px-4">
        {/* Logo and Nav Container */}
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3" href="/">
            <Image
              src="/tokens/branded/ALT.svg"
              alt="Altverse Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-xl font-normal">altverse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <MainNav onNavigate={() => void 0} />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="mr-0 px-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[360px] [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px] [&_button]:focus:ring-0 [&_button]:focus:ring-offset-0 [&_button]:focus:outline-none"
            >
              <SheetHeader>
                <SheetTitle>
                  <div
                    className="flex items-center gap-3"
                    onClick={() => setIsOpen(false)}
                  >
                    <Image
                      src="/tokens/branded/ALT.svg"
                      alt="Altverse Logo"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      priority
                    />
                    <span className="text-lg font-normal">altverse</span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-6">
                <nav className="flex flex-col gap-2">
                  <MainNav onNavigate={() => setIsOpen(false)} />
                </nav>
                {/* transaction history Button for Mobile */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setIsHistoryOpen(true);
                  }}
                  className="flex items-center gap-2 justify-start"
                >
                  <History className="h-4 w-4" />
                  transaction history
                </Button>
                {/* Always use ConnectWalletModal for mobile */}
                <ConnectWalletModal
                  onSuccess={handleSheetClose}
                  trigger={
                    <BrandedButton
                      className="md:inline-flex whitespace-nowrap text-sm h-[30px]"
                      iconClassName="h-4 w-4"
                      iconName="Wallet"
                      buttonText={getWalletButtonText()}
                    />
                  }
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop transaction history Button */}
          <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <SheetTrigger asChild className="hidden md:block">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <History className="h-4 w-4" />
                <span className="sr-only">transaction history</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[400px] sm:w-[500px] [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px] [&_button]:focus:ring-0 [&_button]:focus:ring-offset-0 [&_button]:focus:outline-none"
            >
              <SheetHeader>
                <SheetTitle>
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5" />
                    <span className="text-lg font-semibold">
                      transaction history
                    </span>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Wallet Filter */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>filter by wallet:</span>
                  </div>
                  <WalletSelector
                    selectedWallet={selectedWallet}
                    onWalletChange={setSelectedWallet}
                  />
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      {selectedWallet === "all"
                        ? "no transactions yet"
                        : `no ${selectedWallet} transactions`}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {selectedWallet === "all"
                        ? "connect a wallet and start swapping to see your transaction history"
                        : (() => {
                            const walletTypeMap: Record<
                              WalletFilterType,
                              WalletType | undefined
                            > = {
                              all: undefined,
                              metamask: WalletType.REOWN_EVM,
                              phantom: WalletType.REOWN_SOL,
                              suiet: WalletType.SUIET_SUI,
                            };
                            const walletType = walletTypeMap[selectedWallet];
                            const isConnected = walletType
                              ? isWalletTypeConnected(walletType)
                              : false;

                            return isConnected
                              ? `your ${selectedWallet} swap history will appear here`
                              : `connect your ${selectedWallet} wallet to see transaction history`;
                          })()}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {filteredTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tx.type}</span>
                              <span
                                className={`text-sm font-mono ${getStatusColor(tx.status)}`}
                              >
                                {tx.status}
                              </span>
                              {/* Wallet indicator */}
                              <div className="ml-2">
                                <WalletIcons walletType={tx.wallet} size="sm" />
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {tx.timestamp}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">
                                From:
                              </span>
                              <span className="font-mono">{tx.amount}</span>
                              <span className="text-muted-foreground">
                                on {tx.fromChain}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">To:</span>
                              <span className="font-medium">{tx.toToken}</span>
                              <span className="text-muted-foreground">
                                on {tx.toChain}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground font-mono">
                              {tx.txHash}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="sr-only">view transaction</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <Button variant="outline" className="w-full" size="sm">
                        load more
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop Wallet Button - Always use ConnectWalletModal */}
          <ConnectWalletModal
            trigger={
              <BrandedButton
                className="hidden md:inline-flex whitespace-nowrap text-sm h-[30px]"
                iconClassName="h-4 w-4"
                iconName="Wallet"
                buttonText={getWalletButtonText()}
              />
            }
          />
        </div>
      </div>
    </header>
  );
}
