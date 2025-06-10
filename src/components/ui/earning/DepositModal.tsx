"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ArrowRight, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EtherFiVault, DEPOSIT_ASSETS } from "@/config/etherFi";
import { useEtherFiFetch } from "@/utils/etherFi/fetch";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { cn } from "@/lib/utils";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: EtherFiVault | null;
}

const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  vault,
}) => {
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { getTokenBalance } = useEtherFiFetch();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);

  // Simple function to fetch balance for an asset
  const fetchBalance = useCallback(
    async (assetSymbol: string) => {
      if (!assetSymbol || !isWalletConnected) {
        return;
      }

      setIsLoadingBalance(true);
      try {
        const balanceData = await getTokenBalance(assetSymbol);
        setBalances((prev) => ({
          ...prev,
          [assetSymbol]: balanceData.formatted,
        }));
      } catch (error) {
        console.error(`Error fetching balance for ${assetSymbol}:`, error);
        setBalances((prev) => ({
          ...prev,
          [assetSymbol]: "0.00",
        }));
      } finally {
        setIsLoadingBalance(false);
      }
    },
    [isWalletConnected, getTokenBalance],
  );

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize selected asset when modal opens and fetch its balance
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen && vault && vault.supportedAssets.deposit.length > 0) {
      const firstAsset = vault.supportedAssets.deposit[0];
      setSelectedAsset(firstAsset);
      setAmount("");
      // Call fetchBalance directly to avoid dependency issues
      if (firstAsset && isWalletConnected) {
        setIsLoadingBalance(true);
        getTokenBalance(firstAsset)
          .then((balanceData) => {
            setBalances((prev) => ({
              ...prev,
              [firstAsset]: balanceData.formatted,
            }));
          })
          .catch((error) => {
            console.error(`Error fetching balance for ${firstAsset}:`, error);
            setBalances((prev) => ({
              ...prev,
              [firstAsset]: "0.00",
            }));
          })
          .finally(() => {
            setIsLoadingBalance(false);
          });
      }
    } else if (!isOpen) {
      setSelectedAsset("");
      setBalances({});
      setAmount("");
    }
  }, [isOpen, vault, isMounted, isWalletConnected, getTokenBalance]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  if (!vault) return null;

  const handleDeposit = async () => {
    if (!selectedAsset || !amount) return;

    setIsLoading(true);
    try {
      // TODO: Implement actual deposit logic
      console.log("Depositing:", {
        vault: vault.name,
        asset: selectedAsset,
        amount,
      });
      // Placeholder for deposit implementation
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Deposit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetIcon = (assetSymbol: string) => {
    const asset = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
    return asset?.imagePath || "/images/etherFi/ethereum-assets/eth.png";
  };

  const isFormValid = selectedAsset && amount && parseFloat(amount) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-[#18181B] border-[#27272A]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-[#FAFAFA]">
            <Image
              src={vault.vaultIcon}
              alt={vault.name}
              width={24}
              height={24}
              className="rounded-full"
            />
            Deposit to {vault.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Asset Selection */}
          <div>
            <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
              Select Asset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {vault.supportedAssets.deposit.map((asset) => (
                <button
                  key={asset}
                  onClick={() => {
                    setSelectedAsset(asset);
                    fetchBalance(asset);
                  }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all",
                    selectedAsset === asset
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-[#27272A] hover:border-[#3F3F46] hover:bg-[#27272A]/50",
                  )}
                >
                  <Image
                    src={getAssetIcon(asset)}
                    alt={asset}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#FAFAFA] font-medium">{asset}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-amber-500">
                  {isLoadingBalance ? (
                    <span>Loading balance...</span>
                  ) : isWalletConnected ? (
                    <span>
                      Balance: {balances[selectedAsset] || "0.00"}{" "}
                      {selectedAsset}
                    </span>
                  ) : (
                    <span className="text-[#71717A]">
                      Connect wallet to see balance
                    </span>
                  )}
                </div>
                {isWalletConnected && balances[selectedAsset] && (
                  <button
                    onClick={() => setAmount(balances[selectedAsset] || "0")}
                    className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-500 hover:text-amber-400 hover:bg-amber-500/30 transition-colors"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-20 bg-[#27272A] border-[#3F3F46] text-[#FAFAFA] placeholder:text-[#71717A]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <Image
                  src={getAssetIcon(selectedAsset)}
                  alt={selectedAsset}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                <span className="text-sm text-[#A1A1AA]">{selectedAsset}</span>
              </div>
            </div>
          </div>

          {/* Transaction Summary */}
          <div className="border border-[#27272A] rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-[#A1A1AA]">
              Transaction Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">You deposit</span>
                <span className="text-[#FAFAFA]">
                  {amount || "0.00"} {selectedAsset}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#A1A1AA]">You receive</span>
                <div className="flex items-center gap-2">
                  <Image
                    src={
                      vault.supportedAssets.receive.imagePath ||
                      "/images/etherFi/liquid.svg"
                    }
                    alt={vault.supportedAssets.receive.symbol}
                    width={16}
                    height={16}
                    className="rounded-full"
                  />
                  <span className="text-[#FAFAFA]">
                    ~{amount || "0.00"} {vault.supportedAssets.receive.symbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* APY Information */}
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <Info className="h-4 w-4 text-green-500" />
            <span className="text-sm text-[#FAFAFA]">
              Current APY:{" "}
              <span className="text-green-500 font-semibold">
                {/* This would come from the vault's current APY */}
                5.2%
              </span>
            </span>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleDeposit}
              disabled={!isFormValid || isLoading}
              className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  Deposit {selectedAsset}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <Button
              onClick={() => window.open(vault.links.withdrawal, "_blank")}
              variant="outline"
              className="w-full border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Withdraw on EtherFi
            </Button>

            <p className="text-xs text-[#71717A] text-center">
              By depositing, you agree to EtherFi&apos;s terms and conditions.
              Your deposit will start earning yield immediately.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
