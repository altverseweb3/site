"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { EarnTableRow, DashboardTableRow, EarnTableType } from "@/types/earn";
import { Button } from "@/components/ui/Button";
import BrandedButton from "@/components/ui/BrandedButton";
import Image from "next/image";
import { chains } from "@/config/chains";
import { formatCurrency, formatAPY } from "@/utils/formatters";

interface EarnTableProps {
  type: EarnTableType;
  data: EarnTableRow[] | DashboardTableRow[];
  onDetails?: (row: EarnTableRow | DashboardTableRow) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

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
  onDetails,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);
  const tableHeaderClass = `px-4 py-2 text-left text-sm font-semibold text-zinc-300 lowercase tracking-wider`;

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-800/90 border-b border-[#27272A]">
            <tr>
              <th className={cn(tableHeaderClass, "pl-6")}>protocol</th>
              <th className={tableHeaderClass}>market/vault</th>
              <th className={tableHeaderClass}>assets</th>
              <th className={tableHeaderClass}>chains</th>
              {type === "dashboard" && (
                <>
                  <th className={tableHeaderClass}>position</th>
                  <th className={tableHeaderClass}>balance</th>
                </>
              )}
              {type === "earn" && <th className={tableHeaderClass}>tvl</th>}
              <th className={tableHeaderClass}>apy</th>
              <th className={tableHeaderClass}>details</th>
            </tr>
          </thead>
          <tbody className="bg-[#18181B] divide-y divide-[#27272A]">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-[#1C1C1F] transition-colors">
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
                    <div className="w-8 h-8 flex items-center justify-center">
                      <Image
                        src={row.marketVaultIcon}
                        alt={row.marketVault}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-[#FAFAFA] text-sm font-semibold">
                      {row.marketVault}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AssetIcons assets={row.assets} assetIcons={row.assetIcons} />
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
                    buttonText={type === "dashboard" ? " view " : "details"}
                    onClick={() => onDetails?.(row)}
                    className="text-sm h-8 px-2"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#27272A]">
          <div className="text-sm text-[#A1A1AA]">
            showing {startItem}-{endItem} of {totalItems} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] h-8"
            >
              previous
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
              className="border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] h-8"
            >
              next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarnTable;
