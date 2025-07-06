"use client";

import React, { useState, useMemo } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import ProtocolFilter from "@/components/ui/earning/ProtocolFilter";
import { Input } from "@/components/ui/Input";
import EarnTable from "@/components/ui/earning/EarnTable";
import EarnCards from "@/components/ui/earning/EarnCards";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import BrandedButton from "@/components/ui/BrandedButton";
import { Wallet } from "lucide-react";
import { chainList } from "@/config/chains";
import { WalletType } from "@/types/web3";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { useEtherFiEarnData, filterEarnData, ProtocolModal } from "./etherFi";
import {
  EarnTableRow,
  DashboardTableRow,
  EarnFilters,
  EarnTableType,
  ProtocolOption,
} from "@/types/earn";
import { getColorFilter } from "@/utils/ui/uiHelpers";
import Image from "next/image";

const ITEMS_PER_PAGE = 10;

const availableProtocols: ProtocolOption[] = [
  {
    id: "Ether.fi",
    name: "Ether.fi",
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
  const [selectedRowForModal, setSelectedRowForModal] = useState<
    EarnTableRow | DashboardTableRow | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

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
      const sortedEarnRows = [...filtered.earnRows].sort((a, b) => {
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
      });

      const sortedDashboardRows = [...filtered.dashboardRows].sort((a, b) => {
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
      });

      return {
        earnRows: sortedEarnRows,
        dashboardRows: sortedDashboardRows,
      };
    }

    return filtered;
  }, [earnData, filters, sortConfig]);

  const currentData =
    activeTab === "earn" ? filteredData.earnRows : filteredData.dashboardRows;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortConfig({ column, direction });
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

  const handleChainChange = (chains: string[]) => {
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
    <div className="container mx-auto px-2 py-8">
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

              {/* Chain Toggle */}
              <ToggleGroup
                type="multiple"
                value={filters.chains}
                onValueChange={handleChainChange}
                variant="outline"
                className="justify-start flex-wrap"
              >
                {chainList.map((chain) => {
                  return (
                    <ToggleGroupItem
                      key={chain.id}
                      value={chain.id}
                      aria-label={`Toggle ${chain.name}`}
                      className="h-8 w-8 p-1"
                    >
                      <Image
                        src={chain.icon}
                        alt={chain.name}
                        width={16}
                        height={16}
                        className="object-contain"
                        style={{
                          filter: getColorFilter(chain.backgroundColor),
                        }}
                      />
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>

            {/* Right Side: Protocol Filter and Asset Input */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center xl:shrink-0">
              <ProtocolFilter
                protocols={availableProtocols}
                selectedProtocols={filters.protocols}
                onSelectionChange={handleProtocolChange}
              />

              <Input
                placeholder="filter by asset (e.g., ETH, BTC)"
                value={filters.assetFilter}
                onChange={(e) => handleAssetFilterChange(e.target.value)}
                className="w-full sm:w-60 border-[#27272A] bg-[#18181B] text-[#FAFAFA] placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden">
          {showWalletConnectionRequired ? (
            <div className="text-center py-16">
              <Wallet className="h-16 w-16 mx-auto text-[#A1A1AA] mb-4" />
              <h2 className="text-2xl font-semibold text-[#FAFAFA] mb-2">
                Connect Your EVM Wallet
              </h2>
              <p className="text-[#A1A1AA] mb-6 px-5 md:px-20">
                Please connect an EVM wallet (Metamask, etc.) to view and manage
                your positions. We support other environments; however,
                presently your positions will only be held on EVM wallets.
              </p>
              <ConnectWalletModal
                trigger={
                  <BrandedButton
                    iconName="Wallet"
                    buttonText="Connect Wallet"
                    className="max-w-xs"
                  />
                }
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
              <div className="block md:hidden">
                <EarnCards
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

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <EarnTable
                  type={activeTab}
                  data={paginatedData}
                  onSort={handleSort}
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
