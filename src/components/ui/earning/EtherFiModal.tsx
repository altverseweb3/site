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
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import DepositModal from "@/components/ui/earning/DepositModal";
import { EarnTableRow, DashboardTableRow } from "@/types/earn";
import { EtherFiVault } from "@/config/etherFi";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { useChainSwitch } from "@/utils/swap/walletMethods";
import { getChainById } from "@/config/chains";
import { formatCurrency } from "@/utils/ui/uiHelpers";

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
  const isSuiWalletConnected = useIsWalletTypeConnected(WalletType.SUIET_SUI);
  const isSolanaWalletConnected = useIsWalletTypeConnected(
    WalletType.REOWN_SOL,
  );
  const { switchToChain } = useChainSwitch(sourceChain);

  const isWalletConnected =
    isEvmWalletConnected || isSuiWalletConnected || isSolanaWalletConnected;

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
      <DialogContent className="sm:max-w-[600px] bg-[#18181B] border-[#27272A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#FAFAFA]">
            <Image
              src={data.marketVaultIcon}
              alt={data.marketVault}
              width={32}
              height={32}
              className="rounded-full"
            />
            {data.marketVault}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-[#A1A1AA] mb-2">
              Description
            </h3>
            <p className="text-[#FAFAFA] text-sm leading-relaxed">
              {vault.description}
            </p>
          </div>

          {/* Vault Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-2">
                Protocol
              </h3>
              <div className="flex items-center gap-2">
                <Image
                  src={data.protocolIcon}
                  alt={data.protocol}
                  width={20}
                  height={20}
                />
                <span className="text-[#FAFAFA]">{data.protocol}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-2">Type</h3>
              <span className="text-[#FAFAFA]">{vault.type}</span>
            </div>
          </div>

          {/* Performance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-2">APY</h3>
              <span className="text-green-500 font-semibold text-lg">
                {data.apy.toFixed(1)}%
              </span>
            </div>
            {!isDashboardRow(data) && (
              <div>
                <h3 className="text-sm font-medium text-[#A1A1AA] mb-2">TVL</h3>
                <span className="text-[#FAFAFA] font-semibold text-lg">
                  {formatCurrency(data.tvl)}
                </span>
              </div>
            )}
          </div>

          {/* User Position (Dashboard only) */}
          {isDashboardRow(data) && (
            <div className="border border-[#27272A] rounded-lg p-4">
              <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">
                Your Position
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-[#A1A1AA]">Balance</span>
                  <div className="text-[#FAFAFA] font-medium">
                    {data.balance.toFixed(4)} {data.position}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-[#A1A1AA]">USD Value</span>
                  <div className="text-[#FAFAFA] font-medium">
                    {formatCurrency(data.balanceUsd)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supported Assets */}
          <div>
            <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">
              Supported Assets
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.assets.map((asset, index) => (
                <div
                  key={asset}
                  className="flex items-center gap-2 bg-[#27272A] rounded-full px-3 py-1"
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
            </div>
          </div>

          {/* Receive Token */}
          <div>
            <h3 className="text-sm font-medium text-[#A1A1AA] mb-3">
              You Will Receive
            </h3>
            <div className="flex items-center gap-2">
              <Image
                src={
                  vault.supportedAssets.receive.imagePath ||
                  "/images/etherFi/liquid.svg"
                }
                alt={vault.supportedAssets.receive.symbol}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span className="text-[#FAFAFA]">
                {vault.supportedAssets.receive.symbol}
              </span>
            </div>
          </div>

          {/* Etherscan Link */}
          <div className="border-t border-[#27272A] pt-4">
            <Button
              variant="outline"
              onClick={() => window.open(vault.links.explorer, "_blank")}
              className="w-full border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Etherscan
            </Button>
          </div>

          {/* Main Actions */}
          <div className="flex gap-3">
            {isWalletConnected ? (
              <Button
                onClick={handleDepositClick}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Deposit
              </Button>
            ) : (
              <ConnectWalletModal
                trigger={
                  <Button className="flex-1 bg-green-600 text-white hover:bg-green-700">
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                }
                onSuccess={handleWalletConnectSuccess}
              />
            )}
            <Button
              onClick={() => window.open(vault.links.analytics, "_blank")}
              className="flex-1 bg-amber-500 text-black hover:bg-amber-600"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Ether.fi
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
