"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import {
  History,
  ArrowUp,
  ArrowDown,
  Coins,
  RefreshCw,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import BrandedButton from "@/components/ui/BrandedButton";
import { WalletType } from "@/types/web3";
import {
  useIsWalletTypeConnected,
  useSetActiveSwapSection,
} from "@/store/web3Store";
import { useAaveMarketsData } from "@/hooks/aave/useAaveMarketsData";
import { useAaveUserTransactionHistory } from "@/hooks/aave/useAaveUserData";
import MarketCard from "@/components/ui/lending/MarketCard";
import CardsList from "@/components/ui/CardsList";
import { ChainId } from "@/types/aave";
import { evmAddress, chainId, PageSize, OrderDirection } from "@aave/react";

type LendingTabType = "markets" | "dashboard" | "staking" | "history";

// Types for transaction data
type TokenAmount = {
  __typename: "TokenAmount";
  usdPerToken: string;
  amount: {
    __typename: "DecimalValue";
    raw: string;
    decimals: number;
    value: string;
  };
  usd: string;
};

type UserTransactionItem = {
  __typename:
    | "UserSupplyTransaction"
    | "UserWithdrawTransaction"
    | "UserBorrowTransaction"
    | "UserRepayTransaction"
    | "UserUsageAsCollateralTransaction"
    | "UserLiquidationCallTransaction";
  amount?: TokenAmount;
  enabled?: boolean; // For collateral transactions
  reserve?: {
    underlyingToken?: {
      imageUrl?: string;
      symbol?: string;
    };
  };
  collateral?: {
    amount?: TokenAmount | null;
  };
  debtRepaid?: {
    amount?: TokenAmount;
  };
  blockExplorerUrl: string;
  txHash: string;
  timestamp: string;
};

interface TransactionCardProps {
  transaction: UserTransactionItem;
}

// Transaction Card Component
const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
  const getTransactionIcon = (txType: string) => {
    switch (txType) {
      case "UserSupplyTransaction":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "UserWithdrawTransaction":
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case "UserBorrowTransaction":
        return <Coins className="h-4 w-4 text-sky-500" />;
      case "UserRepayTransaction":
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      case "UserUsageAsCollateralTransaction":
        return (
          <Shield
            className={`h-4 w-4 ${transaction.enabled ? "text-amber-500" : "text-sky-500"}`}
          />
        );
      case "UserLiquidationCallTransaction":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Coins className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getTransactionLabel = (txType: string) => {
    switch (txType) {
      case "UserSupplyTransaction":
        return "supply";
      case "UserWithdrawTransaction":
        return "withdraw";
      case "UserBorrowTransaction":
        return "borrow";
      case "UserRepayTransaction":
        return "repay";
      case "UserUsageAsCollateralTransaction":
        return transaction.enabled ? "enable collateral" : "disable collateral";
      case "UserLiquidationCallTransaction":
        return "liquidation";
      default:
        return "transaction";
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: TokenAmount | undefined | null): string => {
    if (!amount) return "N/A";
    return `${parseFloat(amount.amount.value).toFixed(4)} ${transaction.reserve?.underlyingToken?.symbol || ""}`;
  };

  const formatUsdValue = (amount: TokenAmount | undefined | null): string => {
    if (!amount?.usd) return "";
    return `${parseFloat(amount.usd).toFixed(2)}`;
  };

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-lg p-4 hover:border-[#3A3A3D] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getTransactionIcon(transaction.__typename)}
          <div>
            <div className="font-medium text-white">
              {getTransactionLabel(transaction.__typename)}
            </div>
            <div className="text-sm text-[#A1A1AA]">
              {formatDate(transaction.timestamp)}
            </div>
          </div>
        </div>
        <div className="text-right">
          {transaction.amount && (
            <>
              <div className="font-medium font-mono text-white">
                {formatAmount(transaction.amount)}
              </div>
              <div className="text-sm font-mono text-[#A1A1AA]">
                {formatUsdValue(transaction.amount)}
              </div>
            </>
          )}
          {transaction.__typename === "UserLiquidationCallTransaction" && (
            <div className="text-sm text-red-500">liquidation event</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Image
            src={
              transaction.reserve?.underlyingToken?.imageUrl ||
              "/placeholder-token.png"
            }
            alt={transaction.reserve?.underlyingToken?.symbol || "token"}
            width={20}
            height={20}
            className="rounded-full"
            onError={(e) => {
              e.currentTarget.src = "/placeholder-token.png";
            }}
          />
          <span className="text-[#A1A1AA] font-mono uppercase">
            {transaction.reserve?.underlyingToken?.symbol || "UNKNOWN"}
          </span>
        </div>
        <a
          href={transaction.blockExplorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          view transaction ↗
        </a>
      </div>
    </div>
  );
};

// Transaction Table Component
const TransactionTable: React.FC<{ transactions: UserTransactionItem[] }> = ({
  transactions,
}) => {
  const getTransactionIcon = (txType: string, enabled?: boolean) => {
    switch (txType) {
      case "UserSupplyTransaction":
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case "UserWithdrawTransaction":
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      case "UserBorrowTransaction":
        return <Coins className="h-4 w-4 text-sky-500" />;
      case "UserRepayTransaction":
        return <RefreshCw className="h-4 w-4 text-amber-500" />;
      case "UserUsageAsCollateralTransaction":
        return (
          <Shield
            className={`h-4 w-4 ${enabled ? "text-amber-500" : "text-sky-500"}`}
          />
        );
      case "UserLiquidationCallTransaction":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Coins className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getTransactionLabel = (txType: string, enabled?: boolean) => {
    switch (txType) {
      case "UserSupplyTransaction":
        return "supply";
      case "UserWithdrawTransaction":
        return "withdraw";
      case "UserBorrowTransaction":
        return "borrow";
      case "UserRepayTransaction":
        return "repay";
      case "UserUsageAsCollateralTransaction":
        return enabled ? "enable collateral" : "disable collateral";
      case "UserLiquidationCallTransaction":
        return "liquidation";
      default:
        return "transaction";
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: TokenAmount | undefined | null): string => {
    if (!amount) return "—";
    return `${parseFloat(amount.amount.value).toFixed(4)}`;
  };

  const formatUsdValue = (amount: TokenAmount | undefined | null): string => {
    if (!amount?.usd) return "";
    return `${parseFloat(amount.usd).toFixed(2)}`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#27272A]">
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              type
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              asset
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              amount
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              value
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              date
            </th>
            <th className="text-center py-3 px-4 text-sm font-medium text-[#A1A1AA]">
              tx
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr
              key={transaction.txHash}
              className="border-b border-[#27272A]/50 hover:bg-[#27272A]/20 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  {getTransactionIcon(
                    transaction.__typename,
                    transaction.enabled,
                  )}
                  <span className="text-white text-sm">
                    {getTransactionLabel(
                      transaction.__typename,
                      transaction.enabled,
                    )}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <Image
                    src={
                      transaction.reserve?.underlyingToken?.imageUrl ||
                      "/placeholder-token.png"
                    }
                    alt={
                      transaction.reserve?.underlyingToken?.symbol || "token"
                    }
                    width={20}
                    height={20}
                    className="rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-token.png";
                    }}
                  />
                  <span className="text-white font-mono uppercase text-sm">
                    {transaction.reserve?.underlyingToken?.symbol || "UNKNOWN"}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-white font-mono text-sm">
                  {formatAmount(transaction.amount)}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <span className="text-[#A1A1AA] font-mono text-sm">
                  {formatUsdValue(transaction.amount)}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-[#A1A1AA] text-sm">
                  {formatDate(transaction.timestamp)}
                </span>
              </td>
              <td className="py-3 px-4 text-center">
                <a
                  href={transaction.blockExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
                >
                  ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MarketsContent = () => {
  const { markets } = useAaveMarketsData({
    chainIds: [1 as ChainId],
    user: undefined,
  });

  if (!markets || markets.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no markets found</div>
      </div>
    );
  }

  // Create unified market data by combining supply and borrow info for each asset
  const unifiedMarkets = markets.flatMap((market) => {
    // Create a map of assets by their underlying token address
    const assetMap = new Map();

    // Add supply reserves
    market.supplyReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;
      assetMap.set(key, {
        ...reserve,
        marketInfo: market,
        marketName: market.name,
        supplyData: {
          apy: reserve.supplyInfo?.apy?.value || 0,
          totalSupplied: reserve.supplyInfo?.total?.value || "0",
          totalSuppliedUsd: reserve.size?.usd || 0,
        },
        borrowData: {
          apy: 0,
          totalBorrowed: "0",
          totalBorrowedUsd: 0,
        },
        usdExchangeRate: reserve.usdExchangeRate,
        isFrozen: reserve.isFrozen,
        isPaused: reserve.isPaused,
        incentives: reserve.incentives || [],
      });
    });

    // Add/merge borrow reserves
    market.borrowReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;
      const existing = assetMap.get(key);

      const borrowData = {
        apy: reserve.borrowInfo?.apy?.value || 0,
        totalBorrowed: reserve.borrowInfo?.total?.amount?.value || "0",
        totalBorrowedUsd: reserve.borrowInfo?.total?.usd || 0,
      };

      if (existing) {
        // Merge with existing supply data
        existing.borrowData = borrowData;
        // Merge incentives arrays
        existing.incentives = [
          ...existing.incentives,
          ...(reserve.incentives || []),
        ];
      } else {
        // Create new entry with only borrow data
        assetMap.set(key, {
          ...reserve,
          marketInfo: market,
          marketName: market.name,
          supplyData: {
            apy: 0,
            totalSupplied: "0",
            totalSuppliedUsd: 0,
          },
          borrowData,
          usdExchangeRate: reserve.usdExchangeRate,
          isFrozen: reserve.isFrozen,
          isPaused: reserve.isPaused,
          incentives: reserve.incentives || [],
        });
      }
    });

    return Array.from(assetMap.values());
  });

  return (
    <CardsList
      data={unifiedMarkets}
      renderCard={(market) => (
        <MarketCard
          key={`${market.marketInfo.address}-${market.underlyingToken.address}`}
          market={market}
          onDetails={() => {}}
        />
      )}
      currentPage={1}
      totalPages={1}
      onPageChange={() => {}}
      itemsPerPage={unifiedMarkets.length}
      totalItems={unifiedMarkets.length}
    />
  );
};

const HistoryContent = () => {
  const { data } = useAaveUserTransactionHistory({
    market: evmAddress("0x794a61358D6845594F94dc1DB02A252b5b4814aD"), // Aave V3 Ethereum
    user: evmAddress("0xf5d8777EA028Ad29515aA81E38e9B85afb7d6303"), // Hardcoded user address
    chainId: chainId(137), // Ethereum mainnet
    orderBy: { date: OrderDirection.Desc },
    pageSize: PageSize.Fifty,
  });

  if (!data || !data.items || data.items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-[#A1A1AA]">no transaction history found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Desktop View: Table */}
      <div className="hidden md:block">
        <TransactionTable transactions={data.items} />
      </div>

      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-4">
        {data.items.map((tx) => (
          <TransactionCard key={tx.txHash} transaction={tx} />
        ))}
      </div>
    </div>
  );
};

export default function LendingPage() {
  const [activeTab, setActiveTab] = useState<LendingTabType>("markets");

  const setActiveSwapSection = useSetActiveSwapSection();
  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  useEffect(() => {
    setActiveSwapSection("lending");
  }, [setActiveSwapSection]);

  const handleTabChange = (value: LendingTabType) => {
    setActiveTab(value);
  };

  const showWalletConnectionRequired = !isEvmWalletConnected;

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Tab Toggle */}
        <div className="mb-6">
          <div className="overflow-x-auto">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={handleTabChange}
              variant="outline"
              className="justify-start shrink-0 min-w-max"
            >
              <ToggleGroupItem
                value="markets"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                markets
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dashboard"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                dashboard
              </ToggleGroupItem>
              <ToggleGroupItem
                value="history"
                className="data-[state=on]:text-[#FAFAFA]"
              >
                <History className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden 2xl:mb-0 mb-12">
          {showWalletConnectionRequired ? (
            <div className="text-center py-16 md:py-24 px-4 md:px-8">
              <p className="text-zinc-400 mb-6 px-2 sm:px-8 md:px-16 lg:px-20 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed">
                please connect an EVM wallet (metamask, etc.) to view and manage
                your positions. other environments (sui, solana, etc.) are
                supported; however, presently your positions will only be held
                and managed on EVM wallets as they will opened and managed on
                ethereum or other EVM chains.
              </p>
              <ConnectWalletModal
                trigger={
                  <BrandedButton
                    iconName="Wallet"
                    buttonText="connect EVM wallet"
                    className="max-w-xs h-8 text-sm md:text-md"
                  />
                }
              />
            </div>
          ) : (
            <>
              {activeTab === "markets" && (
                <Suspense
                  fallback={
                    <div className="text-center py-16">
                      <div className="text-[#A1A1AA]">loading markets...</div>
                    </div>
                  }
                >
                  <MarketsContent />
                </Suspense>
              )}
              {activeTab === "dashboard" && (
                <div className="p-8 text-center">
                  <div className="text-[#A1A1AA] text-lg">
                    Dashboard content coming soon...
                  </div>
                </div>
              )}
              {activeTab === "history" && (
                <Suspense
                  fallback={
                    <div className="text-center py-16">
                      <div className="text-[#A1A1AA]">
                        loading transaction history...
                      </div>
                    </div>
                  }
                >
                  <HistoryContent />
                </Suspense>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
