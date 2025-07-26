"use client";

import * as React from "react";
import { useState } from "react";
import Image from "next/image";
import { ExternalLink, Wallet } from "lucide-react";
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
import { formatCurrency } from "@/utils/ui/uiHelpers";
import WalletConnectButton from "@/components/ui/WalletConnectButton";

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

  const sourceChain = getChainById("ethereum");

  const isEvmWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  const { switchToChain } = useChainSwitch(sourceChain);

  const isWalletConnected = isEvmWalletConnected;

  if (!data) return null;

  const vault = data.details as EtherFiVault;

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

  const isDashboardRow = (
    row: EarnTableRow | DashboardTableRow,
  ): row is DashboardTableRow => {
    return "position" in row && "balance" in row && "balanceUsd" in row;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[460px] bg-[#18181B] border-[#27272A]">
        <DialogHeader className="pb-4">
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
              <div className="flex items-center gap-1">
                <Image
                  src={data.protocolIcon}
                  alt={data.protocol}
                  width={12}
                  height={12}
                  className="object-contain"
                />
                <span className="text-sm text-[#A1A1AA]">{data.protocol}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* APY and TVL Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#18181B] border border-[#27272A] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-300 lowercase tracking-wider">
                  apy
                </span>
                <span className="text-green-500 font-semibold font-mono">
                  {data.apy === 0 ? "TBD" : `${data.apy.toFixed(1)}%`}
                </span>
              </div>
            </div>

            {!isDashboardRow(data) && (
              <div className="bg-[#18181B] border border-[#27272A] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-300 lowercase tracking-wider">
                    tvl
                  </span>
                  <span className="text-[#FAFAFA] font-semibold font-mono">
                    {formatCurrency(data.tvl)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Position (Dashboard only) */}
          {isDashboardRow(data) && (
            <div className="border border-[#27272A] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-zinc-300 lowercase tracking-wider mb-3">
                your position
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-semibold text-zinc-300 lowercase tracking-wider">
                    balance
                  </span>
                  <div className="text-[#FAFAFA] font-semibold font-mono">
                    {data.balance.toFixed(4)} {data.position}
                  </div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-zinc-300 lowercase tracking-wider">
                    usd value
                  </span>
                  <div className="text-[#FAFAFA] font-semibold font-mono">
                    {formatCurrency(data.balanceUsd)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supported Assets */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 lowercase tracking-wider mb-3">
              supported assets
            </h3>
            <div className="flex gap-3">
              {data.assets.slice(0, 3).map((asset, index) => (
                <div
                  key={asset}
                  className="flex items-center gap-2 bg-[#27272A] rounded-full px-3 py-2"
                >
                  <Image
                    src={data.assetIcons[index]}
                    alt={asset}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#FAFAFA] text-sm font-medium">
                    {asset}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* You Will Receive */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 lowercase tracking-wider mb-3">
              you will receive
            </h3>
            <div className="flex items-center gap-3 bg-[#27272A] rounded-lg px-4 py-3">
              <Image
                src={
                  vault.supportedAssets.receive.imagePath ||
                  "/images/etherFi/liquid.svg"
                }
                alt={vault.supportedAssets.receive.symbol}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="text-[#FAFAFA] font-semibold text-base">
                {vault.supportedAssets.receive.symbol}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2">
            <p className="text-[#A1A1AA] text-sm leading-relaxed">
              {vault.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {isWalletConnected ? (
              <Button
                onClick={handleDepositClick}
                className="bg-green-500/25 hover:bg-green-500/50 hover:text-green-400 text-green-500 border-green-500/30 border rounded-lg py-3 font-semibold"
              >
                <Wallet className="h-4 w-4 mr-1" />
                deposit
              </Button>
            ) : (
              <WalletConnectButton
                walletType={WalletType.REOWN_EVM}
                size="md"
                className="border rounded-lg font-semibold bg-amber-500/25 border-[#61410B] D!text-sm !px-4 !h-10 !py-0 !justify-center"
                onSuccess={handleWalletConnectSuccess}
                showIcon={false}
              />
            )}
            <Button
              onClick={() => window.open(vault.links.analytics, "_blank")}
              className="bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border rounded-lg py-3 font-semibold"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              open vault
            </Button>
          </div>

          {/* Etherscan Link */}
          <Button
            variant="outline"
            onClick={() => window.open(vault.links.explorer, "_blank")}
            className="w-full border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] py-2 text-sm mt-2"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            view contract on etherscan
          </Button>
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
