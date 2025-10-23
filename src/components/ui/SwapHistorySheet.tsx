import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import {
  History,
  Clock,
  ExternalLink,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { useSwapHistory } from "@/hooks/swap/useSwapHistory";
import { WalletFilter, WalletIcons } from "@/components/ui/WalletFilter";
import { WalletType, SwapData } from "@/types/web3";
import { getChainByMayanChainId, getChainByMayanName } from "@/config/chains";
import { getExplorerUrl } from "@/utils/common";
import type { WalletFilterType } from "@/types/web3";
import { truncateAddress } from "@/utils/formatters";
import { useIsWalletTypeConnected } from "@/hooks/dynamic/useUserWallets";

interface SwapHistorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

interface TransactionDisplay {
  id: string;
  type: string;
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  fromAmount: string;
  toAmount: string;
  status: string;
  timestamp: string;
  txHash: string;
  fulfillTxHash: string;
  wallet: WalletFilterType;
  walletType: WalletType;
  orderHash: string;
  service: string;
  fees: string;
  fromTokenPrice: string;
  toTokenPrice: string;
}

interface WalletTypeMapping {
  wallet: WalletFilterType;
  walletType: WalletType;
}

type WalletConnectionChecker = (walletType: WalletType) => boolean;
type WalletTypeMap = Record<WalletFilterType, WalletType | undefined>;

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

const getChainName = (chainId: string): string => {
  return getChainByMayanChainId(Number(chainId))?.name || "Unknown Chain";
};

const getWalletTypeFromChain = (chainId: string): WalletTypeMapping => {
  const chain = getChainByMayanChainId(Number(chainId));
  const walletType = chain?.walletType;
  let wallet: WalletFilterType = "all";
  if (walletType === WalletType.EVM) {
    wallet = "evm";
  } else if (walletType === WalletType.SOLANA) {
    wallet = "solana";
  } else if (walletType === WalletType.SUI) {
    wallet = "sui";
  }
  return { wallet, walletType: walletType || WalletType.EVM };
};

const mapSwapToTransaction = (swap: SwapData): TransactionDisplay => {
  const walletInfo = getWalletTypeFromChain(swap.sourceChain);

  return {
    id: swap.orderId,
    type: "swap",
    fromToken: swap.fromTokenSymbol,
    toToken: swap.toTokenSymbol,
    fromChain: getChainName(swap.sourceChain),
    toChain: getChainName(swap.destChain),
    fromAmount: `${parseFloat(swap.fromAmount).toFixed(4)} ${swap.fromTokenSymbol}`,
    toAmount: `${swap.toAmount ? parseFloat(swap.toAmount).toFixed(6) : "--"} ${swap.toTokenSymbol}`,
    status: swap.clientStatus.toLowerCase(),
    timestamp: formatTimeAgo(swap.initiatedAt),
    txHash: swap.sourceTxHash,
    fulfillTxHash: swap.fulfillTxHash,
    wallet: walletInfo.wallet,
    walletType: walletInfo.walletType,
    orderHash: swap.orderHash,
    service: swap.service,
    fees: swap.clientRelayerFeeRefund?.toString() ?? "0",
    fromTokenPrice: swap.fromTokenPrice?.toString() ?? "N/A",
    toTokenPrice: swap.toTokenPrice?.toString() ?? "N/A",
  };
};

const getFilteredTransactions = (
  transactions: TransactionDisplay[],
  selectedWallet: WalletFilterType,
  isWalletTypeConnected: WalletConnectionChecker,
): TransactionDisplay[] => {
  if (selectedWallet === "all") {
    return transactions.filter((tx: TransactionDisplay): boolean => {
      return isWalletTypeConnected(tx.walletType);
    });
  } else {
    const walletTypeMap: WalletTypeMap = {
      all: undefined,
      evm: WalletType.EVM,
      solana: WalletType.SOLANA,
      sui: WalletType.SUI,
    };

    const walletType = walletTypeMap[selectedWallet];
    if (walletType && isWalletTypeConnected(walletType)) {
      return transactions.filter(
        (tx: TransactionDisplay): boolean => tx.wallet === selectedWallet,
      );
    }
    return [];
  }
};

export function SwapHistorySheet({
  isOpen,
  onOpenChange,
  children,
}: SwapHistorySheetProps) {
  const [selectedWallet, setSelectedWallet] = useState<WalletFilterType>("all");

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

  const fetchSwapHistoryRef = useRef(fetchSwapHistory);
  fetchSwapHistoryRef.current = fetchSwapHistory;

  // Call hooks at component level to avoid Rules of Hooks violation
  const isEVMConnected = useIsWalletTypeConnected(WalletType.EVM);
  const isSolanaConnected = useIsWalletTypeConnected(WalletType.SOLANA);
  const isSUIConnected = useIsWalletTypeConnected(WalletType.SUI);

  const isWalletTypeConnected: WalletConnectionChecker = (
    walletType: WalletType,
  ) => {
    if (walletType === WalletType.EVM) return isEVMConnected;
    if (walletType === WalletType.SOLANA) return isSolanaConnected;
    if (walletType === WalletType.SUI) return isSUIConnected;
    return false;
  };

  // Load swap history on initial page load
  useEffect((): void => {
    if (walletSummary.totalConnected > 0) {
      fetchSwapHistoryRef.current();
    }
  }, [walletSummary.totalConnected]);

  // Load swap history when history sheet opens (and wallets are connected)
  useEffect((): void => {
    if (isOpen && walletSummary.totalConnected > 0 && allSwaps.length === 0) {
      fetchSwapHistoryRef.current();
    }
  }, [isOpen, walletSummary.totalConnected, allSwaps.length]);

  const handleLoadMore = async (): Promise<void> => {
    await fetchSwapHistoryRef.current();
  };

  const handleWalletChange = (wallet: WalletFilterType): void => {
    setSelectedWallet(wallet);
  };

  const realTransactions: TransactionDisplay[] =
    allSwaps.map(mapSwapToTransaction);

  const filteredTransactions: TransactionDisplay[] = getFilteredTransactions(
    realTransactions,
    selectedWallet,
    isWalletTypeConnected,
  );

  const getEmptyStateMessage = (): string => {
    if (walletSummary.totalConnected === 0) {
      return "connect a wallet to see your transaction history";
    }

    if (selectedWallet === "all") {
      return "start swapping to see your transaction history";
    }

    const walletTypeMap: WalletTypeMap = {
      all: undefined,
      evm: WalletType.EVM,
      solana: WalletType.SOLANA,
      sui: WalletType.SUI,
    };

    const walletType = walletTypeMap[selectedWallet];
    const isConnected = walletType ? isWalletTypeConnected(walletType) : false;

    return isConnected
      ? `your ${selectedWallet} swap history will appear here`
      : `connect your ${selectedWallet} wallet to see transaction history`;
  };

  const getEmptyStateTitle = (): string => {
    if (walletSummary.totalConnected === 0) {
      return "no wallets connected";
    }

    return selectedWallet === "all"
      ? "no transactions yet"
      : `no ${selectedWallet} transactions`;
  };

  const renderChainBadge = (chainName: string) => {
    const chain = getChainByMayanName(chainName);

    if (!chain) {
      return (
        <span className="text-muted-foreground text-xs bg-white/5 px-2 py-1 rounded">
          {chainName}
        </span>
      );
    }

    return (
      <div
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-all duration-300"
        style={{
          backgroundColor: `${chain.backgroundColor}20`,
          borderColor: `${chain.backgroundColor}40`,
          color: chain.fontColor,
        }}
      >
        <div className="relative w-3 h-3 flex-shrink-0">
          <Image
            src={chain.brandedIcon || chain.icon}
            alt={chain.name}
            fill
            className="object-contain"
          />
        </div>
        <span>{chain.name}</span>
      </div>
    );
  };

  const renderSkeletonLoading = () => (
    <div className="space-y-4 animate-pulse pb-6">
      {[...Array(3)].map((_, i: number) => (
        <div
          key={i}
          className="border border-amber-500/10 rounded-xl p-4 space-y-3 bg-amber-500/20 backdrop-blur-sm"
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
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 animate-pulse">
        <ExternalLink className="h-8 w-8 text-red-500" />
      </div>
      <div className="text-red-400 text-sm mb-3 font-medium">
        error loading swap history
      </div>
      <div className="text-red-300/70 text-xs mb-4 max-w-[280px]">{error}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLoadMore}
        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all duration-300"
      >
        try again
      </Button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-6 animate-pulse">
        <Clock className="h-10 w-10 text-amber-500" />
      </div>
      <h3 className="text-lg font-medium mb-3 bg-amber-500 bg-clip-text text-transparent">
        {getEmptyStateTitle()}
      </h3>
      <p className="text-muted-foreground text-sm max-w-[300px] leading-relaxed">
        {getEmptyStateMessage()}
      </p>
    </div>
  );

  const renderTransactionCard = (tx: TransactionDisplay, index: number) => (
    <div
      key={tx.id}
      className="group border border-amber-500/10 rounded-xl p-5 space-y-4 bg-amber-500/5 backdrop-blur-sm hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-500 ease-out animate-fade-in-up"
      style={{
        animationDelay: `${index * 100}ms`,
        animationFillMode: "both",
      }}
    >
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
            className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-all duration-[1000ms] ${
              tx.status === "completed"
                ? "text-green-400 bg-green-500/10 border-green-500/30 group-hover:shadow-green-500/20 group-hover:shadow-md"
                : tx.status === "inprogress"
                  ? "text-amber-400 bg-amber-500/10 border-amber-500/30 animate-pulse group-hover:shadow-amber-500/20 group-hover:shadow-md"
                  : tx.status === "failed"
                    ? "text-red-400 bg-red-500/10 border-red-500/30 group-hover:shadow-red-500/20 group-hover:shadow-md"
                    : "text-gray-400 bg-gray-500/10 border-gray-500/30"
            }`}
          >
            {tx.status}
          </span>
          <div className="ml-1 p-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 group-hover:bg-zinc-500/20 group-hover:border-zinc-500/40 transition-all duration-300">
            <WalletIcons walletType={tx.wallet} size="sm" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded-md">
          {tx.timestamp}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm group-hover:text-amber-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground min-w-[40px]">from:</span>
            <span className="font-mono font-medium text-amber-200 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
              {tx.fromAmount}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">on</span>
              {renderChainBadge(tx.fromChain)}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm group-hover:text-sky-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground min-w-[40px]">to:</span>
            <span className="font-mono font-medium text-sky-200 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
              {tx.toAmount}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs">on</span>
              {renderChainBadge(tx.toChain)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-amber-500/20 group-hover:border-amber-500/30 transition-colors">
        <span className="text-xs text-muted-foreground font-mono bg-white/5 px-3 py-2 rounded-lg group-hover:bg-white/10 transition-all">
          {truncateAddress(tx.txHash)}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-amber-500/20 hover:text-amber-300 border border-transparent hover:border-amber-500/30 transition-all duration-300 hover:scale-110"
            asChild
          >
            <a
              href={getExplorerUrl(tx.txHash, tx.fromChain)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">view source transaction</span>
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
                href={getExplorerUrl(tx.fulfillTxHash, tx.toChain)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">view destination transaction</span>
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      {children}
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[500px] [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px] [&_button]:focus:ring-0 [&_button]:focus:ring-offset-0 [&_button]:focus:outline-none"
      >
        <SheetHeader>
          <SheetTitle>
            <div className="flex items-center gap-3">
              <History className="h-5 w-5" />
              <span className="text-lg font-semibold">transaction history</span>
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
          <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-amber-500/20 bg-amber-500/5 rounded-lg p-3 backdrop-blur-sm flex-shrink-0 relative z-50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4 text-amber-500" />
              <span>filter by wallet:</span>
            </div>
            <div className="relative z-50">
              <WalletFilter
                selectedWallet={selectedWallet}
                onWalletChange={handleWalletChange}
              />
            </div>
          </div>

          {isLoading && loadingProgress && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
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
            {isLoading &&
              filteredTransactions.length === 0 &&
              !loadingProgress &&
              renderSkeletonLoading()}

            {error && !isLoading && renderErrorState()}

            {!isLoading &&
              !error &&
              filteredTransactions.length === 0 &&
              renderEmptyState()}

            {!error && filteredTransactions.length > 0 && (
              <>
                <div className="space-y-4 pb-6">
                  {filteredTransactions.map(renderTransactionCard)}
                </div>

                {isLoading && (
                  <div className="mt-6 mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
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
                              {loadingProgress.current}/{loadingProgress.total}
                            </span>
                          )}
                        </div>
                        {loadingProgress && (
                          <div className="w-full bg-amber-500/20 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500 ease-out animate-progress-pulse"
                              style={{
                                width: `${Math.min((loadingProgress.current / loadingProgress.total) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      {filteredTransactions.length} transactions loaded so far.
                      Searching remaining sources...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {!isLoading && !error && (
            <div className="pt-6 mt-2 border-t border-amber-500/20 flex-shrink-0 bg-background/80 backdrop-blur-sm">
              <Button
                variant="outline"
                className="w-full bg-amber-500/25 border-[#61410B] text-amber-500 hover:bg-amber-500/50 hover:border-amber-500/50 hover:text-amber-400 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 backdrop-blur-sm"
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
  );
}
