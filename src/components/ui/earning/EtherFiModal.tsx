"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ExternalLink, ChevronDown, ChevronUp, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import DepositModal from "@/components/ui/earning/DepositModal";
import { EarnTableRow, DashboardTableRow } from "@/types/earn";
import { EtherFiVault } from "@/config/etherFi";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { getChainById } from "@/config/chains";
import { formatCurrency } from "@/utils/formatters";
import WalletConnectButton from "@/components/ui/WalletConnectButton";
import { useEtherFiFetch } from "@/utils/etherFi/fetch";
import { fetchAssetPrice } from "@/utils/etherFi/prices";

interface EtherFiModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: EarnTableRow | DashboardTableRow | null;
}

const EtherFiModal: React.FC<EtherFiModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isVaultDetailsExpanded, setIsVaultDetailsExpanded] = useState(false);
  const [userVaultBalance, setUserVaultBalance] = useState<{
    balance: string;
    balanceUsd: number;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const sourceChain = getChainById("ethereum");

  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const { switchToChain } = useChainSwitch(sourceChain);
  const { getUserVaultBalance } = useEtherFiFetch();

  const isWalletConnected = isEvmWalletConnected;

  const vault = data?.details as EtherFiVault;

  const isDashboardRow = useCallback(
    (row: EarnTableRow | DashboardTableRow): row is DashboardTableRow => {
      return "position" in row && "balance" in row && "balanceUsd" in row;
    },
    [],
  );

  // Clear previous vault balance when modal opens or vault changes
  useEffect(() => {
    if (isOpen) {
      setUserVaultBalance(null);
      setIsLoadingBalance(false);
    }
  }, [isOpen, data?.id]); // Reset when modal opens or vault ID changes

  // Fetch user's vault balance when modal opens and wallet is connected
  useEffect(() => {
    const fetchUserBalance = async () => {
      if (
        !isOpen ||
        !isWalletConnected ||
        !vault ||
        !data ||
        isDashboardRow(data)
      ) {
        return;
      }

      setIsLoadingBalance(true);
      try {
        const balanceResult = await getUserVaultBalance(vault.id);
        const balanceNum = parseFloat(balanceResult.formatted);

        // Always set balance state, even if it's 0
        let balanceUsd = 0;
        if (balanceNum > 0) {
          try {
            // Get the primary deposit asset to use for price estimation
            const primaryAsset = vault.supportedAssets.deposit[0];
            if (primaryAsset) {
              const assetPrice = await fetchAssetPrice(primaryAsset);
              balanceUsd = balanceNum * assetPrice;
            }
          } catch (error) {
            console.warn(
              "Failed to fetch asset price for USD calculation:",
              error,
            );
          }
        }

        setUserVaultBalance({
          balance: balanceResult.formatted,
          balanceUsd,
        });
      } catch (error) {
        console.error("Failed to fetch user vault balance:", error);
        setUserVaultBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchUserBalance();
  }, [
    isOpen,
    isWalletConnected,
    vault,
    data,
    getUserVaultBalance,
    isDashboardRow,
  ]);

  if (!data || !vault) return null;

  const handleDepositClick = async () => {
    const ethereumChain = getChainById("ethereum");
    if (!ethereumChain) {
      throw new Error("Ethereum chain not found");
    }

    await switchToChain(ethereumChain);
    setIsDepositModalOpen(true);
  };

  const handleWalletConnectSuccess = () => {
    setIsDepositModalOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] bg-[#18181B] border-[#27272A]">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={data.marketVaultIcon}
                alt={data.marketVault}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <DialogTitle className="text-[#FAFAFA] text-lg font-semibold">
                  {data.marketVault}
                </DialogTitle>
                <button
                  onClick={() => window.open(vault.links.analytics, "_blank")}
                  className="flex items-center gap-1 py-1 px-2 -mx-2 rounded hover:bg-[#27272A]/50 transition-all group"
                >
                  <Image
                    src={data.protocolIcon}
                    alt={data.protocol}
                    width={12}
                    height={12}
                    className="object-contain"
                  />
                  <span className="text-sm text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors">
                    {data.protocol}
                  </span>
                  <ExternalLink className="h-3 w-3 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors ml-1" />
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance and Value - Show for dashboard rows or when wallet is connected */}
          {(isDashboardRow(data) || isWalletConnected) && (
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-[#FAFAFA] mb-1 mt-1">
                  balance
                </h3>
                <div className="flex items-center gap-2">
                  {isLoadingBalance ? (
                    <span className="text-[#A1A1AA] font-mono">loading...</span>
                  ) : (
                    <span className="text-[#FAFAFA] font-mono">
                      {isDashboardRow(data)
                        ? data.balance.toFixed(6)
                        : userVaultBalance?.balance
                          ? parseFloat(userVaultBalance.balance).toFixed(6)
                          : "0.000000"}
                    </span>
                  )}
                  <Image
                    src={data.marketVaultIcon}
                    alt={
                      isDashboardRow(data)
                        ? data.position
                        : vault.supportedAssets.receive.symbol
                    }
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#FAFAFA]">
                    {isDashboardRow(data)
                      ? data.position
                      : vault.supportedAssets.receive.symbol}
                  </span>
                  <ExternalLink className="h-3 w-3 text-[#A1A1AA] ml-1" />
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-bold text-[#FAFAFA] mb-1 mt-1">
                  value
                </h3>
                <div className="text-[#FAFAFA] font-mono">
                  {isDashboardRow(data)
                    ? formatCurrency(data.balanceUsd)
                    : userVaultBalance?.balanceUsd
                      ? formatCurrency(userVaultBalance.balanceUsd)
                      : "$0.00"}{" "}
                  USD
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Vault Details */}
          <div className="border border-[#27272A] rounded-lg">
            <button
              onClick={() => setIsVaultDetailsExpanded(!isVaultDetailsExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-[#27272A]/50 transition-colors"
            >
              <span className="text-[#FAFAFA] font-medium">vault details</span>
              {isVaultDetailsExpanded ? (
                <ChevronUp className="h-5 w-5 text-[#A1A1AA]" />
              ) : (
                <ChevronDown className="h-5 w-5 text-[#A1A1AA]" />
              )}
            </button>

            {isVaultDetailsExpanded && (
              <div className="px-4 pb-4 space-y-4">
                {/* Description */}
                <p className="text-[#A1A1AA] text-sm leading-relaxed">
                  {vault.description}
                </p>

                {/* APY and TVL */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center">
                    <div className="text-sm text-[#A1A1AA] mb-1">APY</div>
                    <div className="text-2xl font-bold text-green-500 font-mono">
                      {data.apy === 0 ? "TBD" : `${data.apy.toFixed(1)}%`}
                    </div>
                  </div>
                  {!isDashboardRow(data) && (
                    <div className="text-center">
                      <div className="text-sm text-[#A1A1AA] mb-1">TVL</div>
                      <div className="text-2xl font-bold text-[#FAFAFA] font-mono">
                        {formatCurrency(data.tvl)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Supported Assets */}
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA] mb-3">
                    supported assets
                  </h3>
                  <div className="flex gap-2">
                    {data.assets.slice(0, 4).map((asset, index) => (
                      <div
                        key={asset}
                        className="flex items-center gap-1 bg-[#27272A] rounded-full px-3 py-1"
                      >
                        <Image
                          src={data.assetIcons[index]}
                          alt={asset}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-[#FAFAFA] text-sm">{asset}</span>
                      </div>
                    ))}
                    {data.assets.length > 4 && (
                      <div className="flex items-center justify-center bg-[#27272A] rounded-full px-3 py-1">
                        <span className="text-[#A1A1AA] text-sm">
                          +{data.assets.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {isWalletConnected ? (
              <Button
                onClick={handleDepositClick}
                className="bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border rounded-lg py-3 font-semibold flex items-center justify-center"
              >
                <Link className="h-4 w-4 mr-2" />
                earn more
              </Button>
            ) : (
              <WalletConnectButton
                walletType={WalletType.REOWN_EVM}
                size="md"
                className="border rounded-lg font-semibold bg-amber-500/25 border-[#61410B] !text-sm !px-4 !h-10 !py-0 !justify-center"
                onSuccess={handleWalletConnectSuccess}
                showIcon={false}
              />
            )}
            <Button
              onClick={() => window.open(vault.links.analytics, "_blank")}
              className="bg-[#3F3F46] hover:bg-[#52525B] text-[#A1A1AA] hover:text-[#FAFAFA] border-[#52525B] border rounded-lg py-3 font-semibold flex items-center justify-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              withdraw
            </Button>
          </div>
        </div>

        {/* Deposit Modal */}
        <DepositModal
          isOpen={isDepositModalOpen}
          onClose={() => setIsDepositModalOpen(false)}
          vault={vault}
          apy={data.apy}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EtherFiModal;
