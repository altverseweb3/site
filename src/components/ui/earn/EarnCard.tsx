"use client";

import React from "react";
import { EarnTableRow, DashboardTableRow, EarnTableType } from "@/types/earn";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import BrandedButton from "@/components/ui/BrandedButton";
import Image from "next/image";
import { chains } from "@/config/chains";
import { formatCurrency, formatAPY } from "@/utils/formatters";

interface EarnCardProps {
  type: EarnTableType;
  data: EarnTableRow | DashboardTableRow;
  onDetails?: (row: EarnTableRow | DashboardTableRow) => void;
}

const EarnCard: React.FC<EarnCardProps> = ({ type, data, onDetails }) => {
  const formatLimitedList = (items: string[], maxDisplay: number = 3) => {
    if (items.length <= maxDisplay) {
      return items.join(", ");
    }
    const displayItems = items.slice(0, maxDisplay);
    const remainingCount = items.length - maxDisplay;
    return `${displayItems.join(", ")}, +${remainingCount}`;
  };

  const AssetIcons = ({
    assets,
    assetIcons,
  }: {
    assets: string[];
    assetIcons: string[];
  }) => {
    const maxDisplay = 3;
    const displayAssets = assets.slice(0, maxDisplay);
    const remainingCount = assets.length - maxDisplay;

    return (
      <div className="flex -space-x-1">
        {displayAssets.map((asset, index) => (
          <div
            key={asset}
            className="relative w-5 h-5 rounded-full border border-[#27272A] overflow-hidden"
            title={asset}
          >
            <Image
              src={assetIcons[index]}
              alt={asset}
              width={20}
              height={20}
              className="object-cover"
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div
            className="relative w-5 h-5 rounded-full border border-[#27272A] bg-[#27272A] flex items-center justify-center text-[#FAFAFA] text-xs font-medium"
            title={`+${remainingCount} more assets: ${assets.slice(maxDisplay).join(", ")}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  const ChainIcons = ({
    chains: chainNames,
    chainIcons,
  }: {
    chains: string[];
    chainIcons: string[];
  }) => {
    const maxDisplay = 3;
    const displayChains = chainNames.slice(0, maxDisplay);
    const remainingCount = chainNames.length - maxDisplay;

    return (
      <div className="flex -space-x-1">
        {displayChains.map((chainName, index) => {
          const chain = chains[chainName];
          return (
            <div
              key={chainName}
              className="relative w-4 h-4 rounded-full border border-[#27272A] overflow-hidden"
              title={chainName}
              style={{ backgroundColor: chain?.backgroundColor || "#18181B" }}
            >
              <Image
                src={chainIcons[index]}
                alt={chainName}
                width={16}
                height={16}
                className="object-contain p-0.5"
                style={{ filter: "brightness(0) saturate(100%) invert(1)" }}
              />
            </div>
          );
        })}
        {remainingCount > 0 && (
          <div
            className="relative w-4 h-4 rounded-full border border-[#27272A] bg-[#27272A] flex items-center justify-center text-[#FAFAFA] text-xs font-medium"
            title={`+${remainingCount} more chains: ${chainNames.slice(maxDisplay).join(", ")}`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="text-white border border-[#27272A] bg-[#18181B] rounded-lg shadow-none hover:bg-[#1C1C1F] transition-colors">
      <CardHeader className="flex flex-row items-start p-4 pb-2 space-y-0">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center mr-3 flex-shrink-0">
          <Image
            src={data.protocolIcon}
            alt={data.protocol}
            width={32}
            height={32}
            className="object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-sm font-semibold text-[#FAFAFA] leading-none">
            {data.protocol}
          </CardTitle>
          <CardDescription className="text-[#A1A1AA] text-xs mt-1 flex items-center gap-2">
            <Image
              src={data.marketVaultIcon}
              alt={data.marketVault}
              width={16}
              height={16}
              className="object-contain"
            />
            {data.marketVault}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Assets row */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">assets</div>
          <div className="flex items-center gap-2">
            <AssetIcons assets={data.assets} assetIcons={data.assetIcons} />
            <span className="text-[#FAFAFA] text-xs">
              {formatLimitedList(data.assets)}
            </span>
          </div>
        </div>

        {/* Chains row */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">chains</div>
          <div className="flex items-center gap-2">
            <ChainIcons
              chains={data.supportedChains}
              chainIcons={data.supportedChainIcons}
            />
            <span className="text-[#FAFAFA] text-xs">
              {formatLimitedList(data.supportedChains)}
            </span>
          </div>
        </div>

        {/* Dashboard specific fields */}
        {type === "dashboard" && "position" in data && (
          <>
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">position</div>
              <div className="text-[#FAFAFA] text-sm font-semibold">
                {data.position}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-[#A1A1AA] text-sm">balance</div>
              <div className="text-right">
                <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
                  {data.balance.toFixed(4)}
                </div>
                <div className="text-[#A1A1AA] text-xs font-mono">
                  {formatCurrency(data.balanceUsd)}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Earn specific fields */}
        {type === "earn" && (
          <div className="flex justify-between items-center">
            <div className="text-[#A1A1AA] text-sm">tvl</div>
            <div className="text-[#FAFAFA] text-sm font-semibold font-mono">
              {formatCurrency((data as EarnTableRow).tvl)}
            </div>
          </div>
        )}

        {/* APY row */}
        <div className="flex justify-between items-center">
          <div className="text-[#A1A1AA] text-sm">apy</div>
          <div className="text-green-500 text-sm font-semibold font-mono">
            {data.apy != 0 ? formatAPY(data.apy) : "--"}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center p-4 pt-0">
        <BrandedButton
          buttonText={type === "dashboard" ? "view" : "details"}
          onClick={() => onDetails?.(data)}
          className="w-full text-xs py-2 h-8"
        />
      </CardFooter>
    </Card>
  );
};

export default EarnCard;
