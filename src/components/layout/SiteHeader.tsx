"use client";

import { MainNav } from "@/components/layout/MainNav";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useState, useEffect, useRef } from "react";
import useWeb3Store from "@/store/web3Store";
import { useSwapHistory } from "@/hooks/useSwapHistory";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import {
  Menu,
  History,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import BrandedButton from "@/components/ui/BrandedButton";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import {
  WalletSelector,
  WalletIcons,
  type WalletFilterType,
} from "@/components/ui/WalletFilter";
import { useWalletConnection } from "@/utils/swap/walletMethods";
import { WalletType, SwapData } from "@/types/web3";
import Link from "next/link";
import { getChainByMayanChainId, getChainByMayanName } from "@/config/chains";

const getChainName = (chainId: string): string => {
  return getChainByMayanChainId(Number(chainId))?.name || "Unknown Chain";
};

// Map swap data to display format
const mapSwapToTransaction = (swap: SwapData) => {
  // Determine wallet type based on source chain (this is approximate)
  const getWalletTypeFromChain = (
    chainId: string,
  ): { wallet: WalletFilterType; walletType: WalletType } => {
    const chain = getChainByMayanChainId(Number(chainId));
    console.log(`CHAIN IS: ${chainId} - ${chain?.name}`);
    const walletType = chain?.walletType;
    let wallet: WalletFilterType = "all";
    if (walletType === WalletType.REOWN_EVM) {
      wallet = "metamask";
    } else if (walletType === WalletType.REOWN_SOL) {
      wallet = "phantom";
    } else if (walletType === WalletType.SUIET_SUI) {
      wallet = "suiet";
    }
    return { wallet, walletType: walletType || WalletType.REOWN_EVM };
  };

  const walletInfo = getWalletTypeFromChain(swap.sourceChain);

  return {
    id: swap.orderId,
    type: "swap",
    fromToken: swap.fromTokenSymbol,
    toToken: swap.toTokenSymbol,
    fromChain: getChainName(swap.sourceChain),
    toChain: getChainName(swap.destChain),
    fromAmount: `${parseFloat(swap.fromAmount).toFixed(4)} ${swap.fromTokenSymbol}`,
    toAmount: `${parseFloat(swap.toAmount).toFixed(6)} ${swap.toTokenSymbol}`,
    status: swap.clientStatus.toLowerCase(),
    timestamp: formatTimeAgo(swap.initiatedAt),
    txHash: swap.sourceTxHash,
    fulfillTxHash: swap.fulfillTxHash,
    wallet: walletInfo.wallet,
    walletType: walletInfo.walletType,
    // Additional fields for display
    orderHash: swap.orderHash,
    service: swap.service,
    fees: swap.clientRelayerFeeRefund,
    fromTokenPrice: swap.fromTokenPrice,
    toTokenPrice: swap.toTokenPrice,
  };
};

// Format timestamp to relative time
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const swapTime = new Date(timestamp);
  const diffMs = now.getTime() - swapTime.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletFilterType>("all");

  const { isWalletTypeConnected } = useWalletConnection();
  const {
    isLoading,
    isLoadingMore,
    loadingProgress,
    allSwaps,
    error,
    summary,
    fetchSwapHistory,
    walletSummary,
  } = useSwapHistory();

  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  const fetchSwapHistoryRef = useRef(fetchSwapHistory);
  fetchSwapHistoryRef.current = fetchSwapHistory;

  // Load swap history on initial page load
  useEffect(() => {
    if (walletSummary.totalConnected > 0) {
      fetchSwapHistoryRef.current();
    }
  }, [walletSummary.totalConnected]);

  // Load swap history when history sheet opens (and wallets are connected)
  useEffect(() => {
    if (
      isHistoryOpen &&
      walletSummary.totalConnected > 0 &&
      allSwaps.length === 0
    ) {
      fetchSwapHistoryRef.current();
    }
  }, [isHistoryOpen, walletSummary.totalConnected, allSwaps.length]);

  const handleSheetClose = () => {
    setIsOpen(false);
  };

  const handleLoadMore = async () => {
    await fetchSwapHistoryRef.current();
  };

  // Get wallet button text based on connection status
  const getWalletButtonText = () => {
    if (!requiredWallet) return "connect wallet";
    return "wallet connected";
  };

  // Convert real swap data to transaction format
  const realTransactions = allSwaps.map(mapSwapToTransaction);

  // Filter transactions based on selected wallet and connection status
  const getFilteredTransactions = () => {
    if (selectedWallet === "all") {
      // For "all", only show transactions from connected wallets
      return realTransactions.filter((tx) => {
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
        return realTransactions.filter((tx) => tx.wallet === selectedWallet);
      }
      return [];
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const getExplorerUrl = (txHash: string, chainName: string) => {
    const chain = getChainByMayanName(chainName);
    return `${chain?.explorerUrl}/tx/${txHash}`;
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
                {/* transaction history Button for Mobile with enhanced styling */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false);
                    setIsHistoryOpen(true);
                  }}
                  className="flex items-center gap-2 justify-start bg-gradient-to-r from-amber-500/10 to-sky-500/10 border-amber-500/30 text-amber-200 hover:from-amber-500/20 hover:to-sky-500/20 hover:border-amber-500/50 hover:text-amber-100 transition-all duration-300"
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
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500/10 to-sky-500/10 border-amber-500/30 text-amber-200 hover:from-amber-500/20 hover:to-sky-500/20 hover:border-amber-500/50 hover:text-amber-100 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300"
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
                    {/* Show count with loading indicator when appropriate */}
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                        <span className="text-sm text-amber-400 font-normal animate-pulse">
                          loading...
                        </span>
                      </div>
                    ) : summary ? (
                      <span className="text-sm text-muted-foreground font-normal">
                        ({summary.totalSwaps} swaps)
                      </span>
                    ) : null}
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] mt-6">
                {/* Wallet Filter - Fixed at top with glassmorphism */}
                <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-sky-500/5 rounded-lg p-3 backdrop-blur-sm flex-shrink-0 relative z-50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4 text-amber-500" />
                    <span>filter by wallet:</span>
                  </div>
                  <div className="relative z-50">
                    <WalletSelector
                      selectedWallet={selectedWallet}
                      onWalletChange={setSelectedWallet}
                    />
                  </div>
                </div>

                {/* Loading Progress Indicator */}
                {isLoading && loadingProgress && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-sky-500/10 border border-amber-500/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30">
                          <div className="w-full h-full rounded-full border-2 border-transparent border-t-amber-500 animate-spin"></div>
                        </div>
                        <Search className="w-4 h-4 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-amber-200">
                            {loadingProgress.stage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      querying swap data across multiple chains and referrer
                      addresses. this may take a moment...
                    </p>
                  </div>
                )}

                {/* Scrollable Content Area with custom scrollbar */}
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-amber hover:scrollbar-thumb-amber transition-all duration-300 pb-4">
                  {/* Enhanced Loading State with skeleton shimmer - only show when no transactions yet */}
                  {isLoading &&
                    filteredTransactions.length === 0 &&
                    !loadingProgress && (
                      <div className="space-y-4 animate-pulse pb-6">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="border border-amber-500/10 rounded-xl p-4 space-y-3 bg-gradient-to-r from-amber-500/5 to-sky-500/5 backdrop-blur-sm"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="h-4 bg-amber-500/20 rounded w-24 animate-shimmer"></div>
                                <div className="h-6 bg-sky-500/20 rounded-full w-16 animate-shimmer"></div>
                                <div className="h-5 w-5 bg-amber-500/20 rounded animate-shimmer"></div>
                              </div>
                              <div className="h-3 bg-muted/20 rounded w-16 shimmer"></div>
                            </div>
                            <div className="space-y-2">
                              <div className="h-4 bg-muted/20 rounded w-full animate-shimmer"></div>
                              <div className="h-4 bg-muted/20 rounded w-3/4 animate-shimmer"></div>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-amber-500/10">
                              <div className="h-3 bg-muted/20 rounded w-32 animate-shimmer"></div>
                              <div className="flex gap-2">
                                <div className="h-6 w-6 bg-muted/20 rounded animate-shimmer"></div>
                                <div className="h-6 w-6 bg-muted/20 rounded animate-shimmer"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Error State with better styling */}
                  {error && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 animate-pulse">
                        <ExternalLink className="h-8 w-8 text-red-500" />
                      </div>
                      <div className="text-red-400 text-sm mb-3 font-medium">
                        error loading swap history
                      </div>
                      <div className="text-red-300/70 text-xs mb-4 max-w-[280px]">
                        {error}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLoadMore}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
                      >
                        try again
                      </Button>
                    </div>
                  )}

                  {/* No transactions state with enhanced styling */}
                  {!isLoading &&
                    !error &&
                    filteredTransactions.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-sky-500/20 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse">
                          <Clock className="h-10 w-10 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-medium mb-3 bg-gradient-to-r from-amber-500 to-sky-500 bg-clip-text text-transparent">
                          {walletSummary.totalConnected === 0
                            ? "no wallets connected"
                            : selectedWallet === "all"
                              ? "no transactions yet"
                              : `no ${selectedWallet} transactions`}
                        </h3>
                        <p className="text-muted-foreground text-sm max-w-[300px] leading-relaxed">
                          {walletSummary.totalConnected === 0
                            ? "connect a wallet to see your transaction history"
                            : selectedWallet === "all"
                              ? "start swapping to see your transaction history"
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
                                  const walletType =
                                    walletTypeMap[selectedWallet];
                                  const isConnected = walletType
                                    ? isWalletTypeConnected(walletType)
                                    : false;

                                  return isConnected
                                    ? `your ${selectedWallet} swap history will appear here`
                                    : `connect your ${selectedWallet} wallet to see transaction history`;
                                })()}
                        </p>
                      </div>
                    )}

                  {/* Transaction List - show even while loading to display incremental results */}
                  {!error && filteredTransactions.length > 0 && (
                    <>
                      <div className="space-y-4 pb-6">
                        {filteredTransactions.map((tx, index) => (
                          <div
                            key={tx.id}
                            className="group border border-amber-500/10 rounded-xl p-5 space-y-4 bg-gradient-to-r from-amber-500/5 to-sky-500/5 backdrop-blur-sm hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-500 ease-out animate-fade-in-up"
                            style={{
                              animationDelay: `${index * 100}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            {/* Header with enhanced styling */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Image
                                  src="/tokens/branded/ALT.svg"
                                  alt="Altverse Logo"
                                  width={18}
                                  height={18}
                                  className="h-5 w-5"
                                  priority
                                />
                                <span className="font-medium text-md text-amber-100 group-hover:text-amber-50 transition-colors">
                                  {tx.type}
                                </span>
                                <span
                                  className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-all duration-300 ${
                                    tx.status === "completed"
                                      ? "text-green-400 bg-green-500/10 border-green-500/30 group-hover:shadow-green-500/20 group-hover:shadow-md"
                                      : tx.status === "pending"
                                        ? "text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse group-hover:shadow-amber-500/20 group-hover:shadow-md"
                                        : tx.status === "failed"
                                          ? "text-red-400 bg-red-500/10 border-red-500/30 group-hover:shadow-red-500/20 group-hover:shadow-md"
                                          : "text-gray-400 bg-gray-500/10 border-gray-500/30"
                                  }`}
                                >
                                  {tx.status}
                                </span>
                                {/* Enhanced wallet indicator */}
                                <div className="ml-1 p-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 group-hover:bg-zinc-500/20 group-hover:border-zinc-500/40 transition-all duration-300">
                                  <WalletIcons
                                    walletType={tx.wallet}
                                    size="sm"
                                  />
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded-md">
                                {tx.timestamp}
                              </span>
                            </div>

                            {/* Transaction details with better hierarchy and chain icons */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm group-hover:text-amber-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground min-w-[40px]">
                                    from:
                                  </span>
                                  <span className="font-mono font-medium text-amber-200 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                    {tx.fromAmount}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground text-xs">
                                      on
                                    </span>
                                    {(() => {
                                      const fromChain = getChainByMayanName(
                                        tx.fromChain,
                                      );
                                      return fromChain ? (
                                        <div
                                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-300"
                                          style={{
                                            backgroundColor: `${fromChain.backgroundColor}20`,
                                            borderColor: `${fromChain.backgroundColor}40`,
                                            color: fromChain.fontColor,
                                          }}
                                        >
                                          <div className="relative w-3 h-3 flex-shrink-0">
                                            <Image
                                              src={
                                                fromChain.brandedIcon ||
                                                fromChain.icon
                                              }
                                              alt={fromChain.name}
                                              fill
                                              className="object-contain"
                                            />
                                          </div>
                                          <span>{fromChain.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs bg-white/5 px-2 py-1 rounded">
                                          {tx.fromChain}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm group-hover:text-sky-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <span className="text-muted-foreground min-w-[40px]">
                                    to:
                                  </span>
                                  <span className="font-mono font-medium text-sky-200 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                                    {tx.toAmount}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground text-xs">
                                      on
                                    </span>
                                    {(() => {
                                      const toChain = getChainByMayanName(
                                        tx.toChain,
                                      );
                                      return toChain ? (
                                        <div
                                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-300"
                                          style={{
                                            backgroundColor: `${toChain.backgroundColor}20`,
                                            borderColor: `${toChain.backgroundColor}40`,
                                            color: toChain.fontColor,
                                          }}
                                        >
                                          <div className="relative w-3 h-3 flex-shrink-0">
                                            <Image
                                              src={
                                                toChain.brandedIcon ||
                                                toChain.icon
                                              }
                                              alt={toChain.name}
                                              fill
                                              className="object-contain"
                                            />
                                          </div>
                                          <span>{toChain.name}</span>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs bg-white/5 px-2 py-1 rounded">
                                          {tx.toChain}
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Footer with enhanced styling */}
                            <div className="flex items-center justify-between pt-3 border-t border-amber-500/20 group-hover:border-amber-500/30 transition-colors">
                              <span className="text-xs text-muted-foreground font-mono bg-white/5 px-3 py-2 rounded-lg group-hover:bg-white/10 transition-all">
                                {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all duration-300 hover:scale-110"
                                  asChild
                                >
                                  <a
                                    href={getExplorerUrl(
                                      tx.txHash,
                                      tx.fromChain,
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="sr-only">
                                      view source transaction
                                    </span>
                                  </a>
                                </Button>
                                {tx.fulfillTxHash && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-sky-500/20 hover:text-sky-300 border border-transparent hover:border-sky-500/30 transition-all duration-300 hover:scale-110"
                                    asChild
                                  >
                                    <a
                                      href={getExplorerUrl(
                                        tx.fulfillTxHash,
                                        tx.toChain,
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      <span className="sr-only">
                                        view destination transaction
                                      </span>
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Loading more indicator - show when initial load is in progress */}
                      {isLoading && (
                        <div className="mt-6 mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-sky-500/10 border border-amber-500/20 backdrop-blur-sm">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                              <div className="w-6 h-6 rounded-full border-2 border-amber-500/30">
                                <div className="w-full h-full rounded-full border-2 border-transparent border-t-amber-500 animate-spin"></div>
                              </div>
                              <Search className="w-3 h-3 text-amber-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-amber-200">
                                  loading more transactions...
                                </span>
                                {loadingProgress && (
                                  <span className="text-xs text-amber-400 font-mono">
                                    {loadingProgress.current}/
                                    {loadingProgress.total}
                                  </span>
                                )}
                              </div>
                              {loadingProgress && (
                                <div className="w-full bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-sky-500 transition-all duration-500 ease-out animate-progress-pulse"
                                    style={{
                                      width: `${Math.min((loadingProgress.current / loadingProgress.total) * 100, 100)}%`,
                                    }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-amber-300/80 leading-relaxed">
                            {filteredTransactions.length} transactions loaded so
                            far. Searching remaining sources...
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Enhanced Refresh Button at bottom */}
                {!isLoading && !error && (
                  <div className="pt-6 mt-2 border-t border-amber-500/20 flex-shrink-0 bg-background/80 backdrop-blur-sm">
                    <Button
                      variant="outline"
                      className="w-full bg-gradient-to-r from-amber-500/10 to-sky-500/10 border-amber-500/30 text-amber-200 hover:from-amber-500/20 hover:to-sky-500/20 hover:border-amber-500/50 hover:text-amber-100 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 backdrop-blur-sm"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoading || isLoadingMore}
                    >
                      {isLoading || isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2 text-amber-400" />
                          {isLoadingMore ? "updating..." : "loading..."}
                        </>
                      ) : (
                        <>
                          <History className="h-4 w-4 mr-2" />
                          refresh history
                        </>
                      )}
                    </Button>
                  </div>
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
