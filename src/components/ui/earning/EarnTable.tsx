"use client";

import * as React from "react";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EarnTableRow, DashboardTableRow, EarnTableType } from "@/types/earn";
import { Button } from "@/components/ui/Button";
import BrandedButton from "@/components/ui/BrandedButton";
import Image from "next/image";
import { ScrollArea, ScrollBar } from "@/components/ui/ScrollArea";
import { chains } from "@/config/chains";

interface EarnTableProps {
  type: EarnTableType;
  data: EarnTableRow[] | DashboardTableRow[];
  onSort?: (column: string, direction: "asc" | "desc") => void;
  onDetails?: (row: EarnTableRow | DashboardTableRow) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

interface SortableHeaderProps {
  children: React.ReactNode;
  column: string;
  onSort?: (column: string, direction: "asc" | "desc") => void;
  sortDirection?: "asc" | "desc" | null;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  children,
  column,
  onSort,
  sortDirection,
  className,
}) => {
  const handleSort = () => {
    if (!onSort) return;
    const newDirection = sortDirection === "asc" ? "desc" : "asc";
    onSort(column, newDirection);
  };

  return (
    <th
      className={cn(
        "px-4 py-2 text-left text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider cursor-pointer hover:text-[#FAFAFA] transition-colors",
        className,
      )}
      onClick={handleSort}
    >
      <div className="flex items-center gap-1">
        {children}
        {onSort && (
          <div className="flex flex-col">
            <ChevronUpIcon
              className={cn(
                "h-3 w-3",
                sortDirection === "asc" ? "text-amber-500" : "text-[#52525B]",
              )}
            />
            <ChevronDownIcon
              className={cn(
                "h-3 w-3 -mt-1",
                sortDirection === "desc" ? "text-amber-500" : "text-[#52525B]",
              )}
            />
          </div>
        )}
      </div>
    </th>
  );
};

const AssetIcons: React.FC<{ assets: string[]; assetIcons: string[] }> = ({
  assets,
  assetIcons,
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {assets.map((asset, index) => (
          <div
            key={asset}
            className="relative w-6 h-6 rounded-full border border-[#27272A] overflow-hidden group cursor-pointer"
            title={asset}
          >
            <Image
              src={assetIcons[index]}
              alt={asset}
              width={24}
              height={24}
              className="object-cover"
            />
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
              {asset}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChainIcons: React.FC<{ chains: string[]; chainIcons: string[] }> = ({
  chains: chainNames,
  chainIcons,
}) => {
  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        {chainNames.map((chainName, index) => {
          const chain = chains[chainName];
          return (
            <div
              key={chainName}
              className="relative w-5 h-5 rounded-full border border-[#27272A] overflow-hidden group cursor-pointer"
              title={chainName}
              style={{ backgroundColor: chain?.backgroundColor || "#18181B" }}
            >
              <Image
                src={chainIcons[index]}
                alt={chainName}
                width={20}
                height={20}
                className="object-contain p-0.5"
                style={{ filter: "brightness(0) saturate(100%) invert(1)" }}
              />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                {chainName}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const EarnTable: React.FC<EarnTableProps> = ({
  type,
  data,
  onSort,
  onDetails,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">(
    "asc",
  );

  const handleSort = (column: string, direction: "asc" | "desc") => {
    setSortColumn(column);
    setSortDirection(direction);
    onSort?.(column, direction);
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return "$0";
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatAPY = (apy: number) => `${apy.toFixed(1)}%`;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);

  return (
    <div className="w-full">
      <ScrollArea className="w-full h-auto">
        <div className="min-w-[900px] w-full">
          <table className="w-full min-w-[900px]">
            <thead className="bg-[#18181B] border-b border-[#27272A]">
              <tr>
                <SortableHeader column="protocol" className="pl-6">
                  protocol
                </SortableHeader>
                <SortableHeader column="marketVault">
                  market/vault
                </SortableHeader>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  assets
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                  chains
                </th>
                {type === "dashboard" && (
                  <>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                      position
                    </th>
                    <SortableHeader
                      column="balance"
                      onSort={handleSort}
                      sortDirection={
                        sortColumn === "balance" ? sortDirection : null
                      }
                    >
                      balance
                    </SortableHeader>
                  </>
                )}
                {type === "earn" && (
                  <SortableHeader
                    column="tvl"
                    onSort={handleSort}
                    sortDirection={sortColumn === "tvl" ? sortDirection : null}
                  >
                    tvl
                  </SortableHeader>
                )}
                <SortableHeader
                  column="apy"
                  onSort={handleSort}
                  sortDirection={sortColumn === "apy" ? sortDirection : null}
                >
                  apy
                </SortableHeader>
                <th className="px-4 py-2 text-left text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider pr-6">
                  details
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#18181B] divide-y divide-[#27272A]">
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#1C1C1F] transition-colors"
                >
                  <td className="px-4 py-3 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                        <Image
                          src={row.protocolIcon}
                          alt={row.protocol}
                          width={32}
                          height={32}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[#FAFAFA] font-semibold">
                        {row.protocol}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-white flex items-center justify-center">
                        <Image
                          src={row.marketVaultIcon}
                          alt={row.marketVault}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      <span className="text-[#FAFAFA] text-sm font-semibold">
                        {row.marketVault}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <AssetIcons
                      assets={row.assets}
                      assetIcons={row.assetIcons}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ChainIcons
                      chains={row.supportedChains}
                      chainIcons={row.supportedChainIcons}
                    />
                  </td>
                  {type === "dashboard" && "position" in row && (
                    <>
                      <td className="px-4 py-3">
                        <span className="text-[#FAFAFA] text-sm font-semibold">
                          {row.position}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-[#FAFAFA] font-semibold font-mono">
                            {row.balance.toFixed(4)}
                          </span>
                          <span className="text-[#A1A1AA] text-xs font-mono">
                            {formatCurrency(row.balanceUsd)}
                          </span>
                        </div>
                      </td>
                    </>
                  )}
                  {type === "earn" && (
                    <td className="px-4 py-3">
                      <span className="text-[#FAFAFA] font-semibold font-mono">
                        {formatCurrency((row as EarnTableRow).tvl)}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <span className="text-green-500 font-semibold font-mono">
                      {formatAPY(row.apy)}
                    </span>
                  </td>
                  <td className="px-4 py-3 pr-6">
                    <BrandedButton
                      buttonText={type === "dashboard" ? "view" : "details"}
                      onClick={() => onDetails?.(row)}
                      className="text-xs py-1 px-2 h-8"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A]">
          <div className="text-sm text-[#A1A1AA]">
            Showing {startItem}-{endItem} of {totalItems} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className={cn(
                      "w-8 h-8 p-0",
                      page === currentPage
                        ? "bg-amber-500/25 text-amber-500 border-[#61410B] hover:bg-amber-500/50 hover:text-amber-400"
                        : "border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]",
                    )}
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarnTable;
