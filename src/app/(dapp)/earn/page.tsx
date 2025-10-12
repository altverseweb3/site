"use client";

import { useState, useMemo, useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import ProtocolFilter from "@/components/ui/earn/ProtocolFilter";
import SortDropdown from "@/components/ui/earn/SortDropdown";
import AssetFilter from "@/components/ui/AssetFilter";
import EarnTable from "@/components/ui/earn/EarnTable";
import CardsList from "@/components/ui/CardsList";
import EarnCard from "@/components/ui/earn/EarnCard";
import BrandedButton from "@/components/ui/BrandedButton";
import ChainPicker from "@/components/ui/ChainPicker";
import { chainList, getChainById } from "@/config/chains";
import { WalletType } from "@/types/web3";
import {
  useIsWalletTypeConnected,
  useSetActiveSwapSection,
} from "@/store/web3Store";
import {
  useEtherFiEarnData,
  filterEarnData,
  ProtocolModal,
} from "@/app/(dapp)/earn/etherFi";
import {
  EarnTableRow,
  DashboardTableRow,
  EarnFilters,
  EarnTableType,
  ProtocolOption,
} from "@/types/earn";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import useWeb3Store, { useSourceChain } from "@/store/web3Store";
import { useHandleWalletClick } from "@/hooks/dynamic/useUserWallets";

const ITEMS_PER_PAGE = 10;

const availableProtocols: ProtocolOption[] = [
  {
    id: "ether.fi",
    name: "ether.fi",
    icon: "/images/etherFi/vaults/ethfi.svg",
    checked: true,
    disabled: false,
  },
  {
    id: "Aave",
    name: "Aave",
    icon: "/images/protocols/aave.svg",
    checked: false,
    disabled: true,
  },
  {
    id: "Pendle",
    name: "Pendle",
    icon: "/images/protocols/pendle.svg",
    checked: false,
    disabled: true,
  },
];

const ethereumChain = getChainById("ethereum");

export default function EarnPage() {
  const [activeTab, setActiveTab] = useState<EarnTableType>("earn");
  const [filters, setFilters] = useState<EarnFilters>({
    chains: [], // Start with empty array, meaning show all chains
    protocols: [],
    assetFilter: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    column: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [sortDropdownValue, setSortDropdownValue] = useState<string>("");
  const [selectedRowForModal, setSelectedRowForModal] = useState<
    EarnTableRow | DashboardTableRow | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chainSwitchAttempted, setChainSwitchAttempted] = useState(false);

  const sourceChain = useSourceChain();
  const { switchToChain } = useChainSwitch(sourceChain);

  const setActiveSwapSection = useSetActiveSwapSection();

  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.EVM);
  const handleWalletClick = useHandleWalletClick();
  useEffect(() => {
    setActiveSwapSection("earn");
  }, [setActiveSwapSection]);

  useEffect(() => {
    const attemptChainSwitch = async () => {
      if (chainSwitchAttempted) return;

      const walletForEthereum = useWeb3Store
        .getState()
        .getWalletByChain(ethereumChain);

      if (isEvmWalletConnected && switchToChain && walletForEthereum) {
        setChainSwitchAttempted(true);

        try {
          await switchToChain(ethereumChain);
        } catch (error) {
          console.error("Failed to switch to Ethereum chain:", error);
        }
      }
    };

    attemptChainSwitch();
  }, [isEvmWalletConnected, switchToChain, chainSwitchAttempted]);

  useEffect(() => {
    if (!isEvmWalletConnected) {
      setChainSwitchAttempted(false);
    }
  }, [isEvmWalletConnected]);

  // Use the etherFi hook for data fetching - always fetch earn data, only require wallet for dashboard
  const {
    data: earnData,
    loading,
    userPositionsLoading,
  } = useEtherFiEarnData(isEvmWalletConnected);

  // Filter and sort data
  const filteredData = useMemo(() => {
    const filtered = filterEarnData(earnData, filters);

    if (sortConfig) {
      const sortEarnData = (data: EarnTableRow[]) => {
        return [...data].sort((a, b) => {
          // Handle multi-column sorting for dropdown options
          if (sortDropdownValue === "apy-desc-tvl-desc") {
            // Sort by APY first (desc), then by TVL (desc)
            const apyDiff = b.apy - a.apy;
            if (apyDiff !== 0) return apyDiff;
            return b.tvl - a.tvl;
          } else if (sortDropdownValue === "tvl-desc-apy-desc") {
            // Sort by TVL first (desc), then by APY (desc)
            const tvlDiff = b.tvl - a.tvl;
            if (tvlDiff !== 0) return tvlDiff;
            return b.apy - a.apy;
          } else {
            // Single column sorting
            const aValue = a[sortConfig.column as keyof EarnTableRow];
            const bValue = b[sortConfig.column as keyof EarnTableRow];

            if (typeof aValue === "number" && typeof bValue === "number") {
              return sortConfig.direction === "asc"
                ? aValue - bValue
                : bValue - aValue;
            }

            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            return sortConfig.direction === "asc"
              ? aStr.localeCompare(bStr)
              : bStr.localeCompare(aStr);
          }
        });
      };

      const sortDashboardData = (data: DashboardTableRow[]) => {
        return [...data].sort((a, b) => {
          // Dashboard rows don't have TVL, so multi-column sorting only applies to APY
          if (
            sortDropdownValue === "apy-desc-tvl-desc" ||
            sortDropdownValue === "tvl-desc-apy-desc"
          ) {
            // For dashboard, just sort by APY since TVL doesn't exist
            return b.apy - a.apy;
          } else {
            // Single column sorting
            const aValue = a[sortConfig.column as keyof DashboardTableRow];
            const bValue = b[sortConfig.column as keyof DashboardTableRow];

            if (typeof aValue === "number" && typeof bValue === "number") {
              return sortConfig.direction === "asc"
                ? aValue - bValue
                : bValue - aValue;
            }

            const aStr = String(aValue).toLowerCase();
            const bStr = String(bValue).toLowerCase();
            return sortConfig.direction === "asc"
              ? aStr.localeCompare(bStr)
              : bStr.localeCompare(aStr);
          }
        });
      };

      return {
        earnRows: sortEarnData(filtered.earnRows),
        dashboardRows: sortDashboardData(filtered.dashboardRows),
      };
    }

    return filtered;
  }, [earnData, filters, sortConfig, sortDropdownValue]);

  const currentData =
    activeTab === "earn" ? filteredData.earnRows : filteredData.dashboardRows;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSortDropdownChange = (
    column: string,
    direction: "asc" | "desc",
  ) => {
    setSortConfig({ column, direction });

    if (column === "apy") {
      setSortDropdownValue("apy-desc");
    } else if (column === "tvl") {
      setSortDropdownValue("tvl-desc");
    }

    setCurrentPage(1);
  };

  const handleMultiSort = (sortValue: string) => {
    setSortDropdownValue(sortValue);

    // Set sortConfig for the primary column
    if (sortValue === "apy-desc-tvl-desc") {
      setSortConfig({ column: "apy", direction: "desc" });
    } else if (sortValue === "tvl-desc-apy-desc") {
      setSortConfig({ column: "tvl", direction: "desc" });
    }

    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDetails = (row: EarnTableRow | DashboardTableRow) => {
    setSelectedRowForModal(row);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRowForModal(null);
  };

  const handleChainChange = (value: string | string[]) => {
    // For multiple select, value will be an array
    const chains = Array.isArray(value) ? value : [];
    setFilters((prev) => ({ ...prev, chains }));
    setCurrentPage(1);
  };

  const handleProtocolChange = (protocols: string[]) => {
    setFilters((prev) => ({ ...prev, protocols }));
    setCurrentPage(1);
  };

  const handleAssetFilterChange = (value: string) => {
    setFilters((prev) => ({ ...prev, assetFilter: value }));
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    if (value === "earn" || value === "dashboard") {
      setActiveTab(value);
    }
  };

  // Show wallet connection requirement only for dashboard tab
  const showWalletConnectionRequired =
    !isEvmWalletConnected && activeTab === "dashboard";

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Main Controls */}
        <div className="mb-6">
          {/* Single Row Layout - fits all components when there's space */}
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
            {/* Left Side: Tab Toggle and Chain Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 xl:flex-1">
              {/* Tab Toggle */}
              <ToggleGroup
                type="single"
                value={activeTab}
                onValueChange={handleTabChange}
                variant="outline"
                className="justify-start shrink-0"
              >
                <ToggleGroupItem
                  value="earn"
                  className="data-[state=on]:text-[#FAFAFA]"
                >
                  earn
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="dashboard"
                  className="data-[state=on]:text-[#FAFAFA]"
                >
                  dashboard
                </ToggleGroupItem>
              </ToggleGroup>

              <ChainPicker
                type="multiple"
                value={filters.chains}
                onSelectionChange={handleChainChange}
                chains={chainList}
                size="sm"
                className="!mb-0 !pb-0"
              />
            </div>

            {/* Right Side: Protocol Filter, Sort Dropdown, and Asset Input */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center xl:shrink-0">
              {/* Protocol Filter and Sort Dropdown - side by side on mobile */}
              <div className="flex gap-4 w-full sm:w-auto">
                <div className="flex-1 sm:flex-none">
                  <ProtocolFilter
                    protocols={availableProtocols}
                    selectedProtocols={filters.protocols}
                    onSelectionChange={handleProtocolChange}
                  />
                </div>
                <div className="flex-1 sm:flex-none">
                  <SortDropdown
                    value={sortDropdownValue}
                    onSortChange={handleSortDropdownChange}
                    onMultiSort={handleMultiSort}
                    className="w-full sm:w-32"
                  />
                </div>
              </div>

              <AssetFilter
                value={filters.assetFilter}
                onChange={handleAssetFilterChange}
                placeholder="filter by asset (e.g., ETH, BTC)"
                className="w-full sm:w-60"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
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
              <BrandedButton
                onClick={handleWalletClick}
                iconName="Wallet"
                buttonText="connect EVM wallet"
                className="max-w-xs h-8 text-sm md:text-md"
              />
            </div>
          ) : (activeTab === "earn" && loading) ||
            (activeTab === "dashboard" && userPositionsLoading) ? (
            <div className="text-center py-16">
              <div className="text-[#A1A1AA]">
                loading {activeTab === "earn" ? "opportunities" : "positions"}
                ...
              </div>
            </div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-[#A1A1AA]">
                no {activeTab === "earn" ? "opportunities" : "positions"} found
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="block 2xl:hidden">
                <CardsList<EarnTableRow | DashboardTableRow>
                  data={currentData}
                  renderCard={(row) => (
                    <EarnCard
                      key={row.id}
                      type={activeTab}
                      data={row}
                      onDetails={handleDetails}
                    />
                  )}
                />
              </div>

              {/* Desktop Table View - Only show when header and all columns fit properly */}
              <div className="hidden 2xl:block">
                <EarnTable
                  type={activeTab}
                  data={paginatedData}
                  onDetails={handleDetails}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={ITEMS_PER_PAGE}
                  totalItems={currentData.length}
                />
              </div>
            </>
          )}
        </div>

        {/* Protocol Modal */}
        <ProtocolModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          data={selectedRowForModal}
        />
      </div>
    </div>
  );
}
