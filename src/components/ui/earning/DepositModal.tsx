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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/Select";
import { EtherFiVault, DEPOSIT_ASSETS } from "@/config/etherFi";
import { useEtherFiFetch } from "@/utils/etherFi/fetch";
import { useEtherFiInteract } from "@/utils/etherFi/interact";
import { useIsWalletTypeConnected } from "@/store/web3Store";
import { useChainSwitch } from "@/utils/walletMethods";
import { WalletType } from "@/types/web3";
import { chainList, getChainById } from "@/config/chains";

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
  const [selectedSwapChain, setSelectedSwapChain] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { getTokenBalance } = useEtherFiFetch();
  const { approveToken, depositTokens } = useEtherFiInteract();
  const { switchToChain } = useChainSwitch();
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

  // Initialize selected asset when modal opens
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen && vault && vault.supportedAssets.deposit.length > 0) {
      const firstAsset = vault.supportedAssets.deposit[0];
      setSelectedAsset(firstAsset);
      setAmount("");
      setNeedsApproval(false);
    } else if (!isOpen) {
      setSelectedAsset("");
      setSelectedSwapChain("");
      setBalances({});
      setAmount("");
      setNeedsApproval(false);
    }
  }, [isOpen, vault, isMounted]);

  // Fetch balance when asset is selected and wallet is connected
  useEffect(() => {
    if (selectedAsset && isWalletConnected && isMounted) {
      fetchBalance(selectedAsset);
    }
  }, [selectedAsset, isWalletConnected, isMounted, fetchBalance]);

  // Don't render on server to prevent hydration mismatch
  if (!isMounted) {
    return null;
  }

  if (!vault) return null;

  const handleApprove = async () => {
    if (!selectedAsset || !amount || !vault) return;

    setIsApproving(true);
    try {
      const result = await approveToken(selectedAsset, vault.id, amount);
      if (result.success) {
        setNeedsApproval(false);
        console.log("Approval successful:", result.message);
      } else {
        console.error("Approval failed:", result.message);
        // You might want to show an error toast here
      }
    } catch (error) {
      console.error("Approval error:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedAsset || !amount || !vault) return;

    setIsLoading(true);
    try {
      const result = await depositTokens(selectedAsset, vault.id, amount);
      if (result.success) {
        console.log("Deposit successful:", result.message);
        // Refresh balance after successful deposit
        await fetchBalance(selectedAsset);
        // You might want to show a success toast here
        // Optionally close the modal
        // onClose();
      } else {
        console.error("Deposit failed:", result.message);
        if (result.message.includes("Insufficient allowance")) {
          setNeedsApproval(true);
        }
        // You might want to show an error toast here
      }
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

  const isFormValid =
    (selectedAsset || selectedSwapChain) && amount && parseFloat(amount) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[384px] bg-[#18181B] border-[#27272A]">
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
          {/* Smart Asset/Chain Selection */}
          <div>
            <label className="text-sm font-medium text-[#A1A1AA] mb-3 block">
              Select Asset
            </label>
            <Select
              value={selectedAsset || selectedSwapChain}
              onValueChange={async (value) => {
                // Check if it's a vault-supported asset or a chain
                if (vault.supportedAssets.deposit.includes(value)) {
                  // Direct deposit asset selected
                  setSelectedAsset(value);
                  setSelectedSwapChain("");
                  if (value && isWalletConnected) {
                    fetchBalance(value);
                  }
                } else {
                  // Swap chain selected - filter out non-EVM chains for now
                  const selectedChain = getChainById(value);
                  if (
                    selectedChain &&
                    selectedChain.walletType === WalletType.REOWN_EVM
                  ) {
                    setSelectedSwapChain(value);
                    setSelectedAsset("");

                    // Trigger chain switch if wallet is connected
                    if (isWalletConnected) {
                      try {
                        await switchToChain(selectedChain);
                        console.log(`Switched to ${selectedChain.chainName}`);
                      } catch (error) {
                        console.error("Failed to switch chain:", error);
                        // Could show a toast notification here
                      }
                    }
                  } else if (
                    selectedChain &&
                    (selectedChain.id === "sui" ||
                      selectedChain.id === "solana")
                  ) {
                    // For now, ignore Sui and Solana as requested
                    console.log(`${selectedChain.chainName} not supported yet`);
                  }
                }
              }}
            >
              <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-[#FAFAFA]">
                <SelectValue placeholder="Select asset or chain">
                  {selectedAsset && (
                    <div className="flex items-center gap-2">
                      <Image
                        src={getAssetIcon(selectedAsset)}
                        alt={selectedAsset}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span>{selectedAsset}</span>
                    </div>
                  )}
                  {selectedSwapChain && (
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500">🔄</span>
                      <Image
                        src={
                          chainList.find(
                            (chain) => chain.id === selectedSwapChain,
                          )?.icon || ""
                        }
                        alt={selectedSwapChain}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                      <span>
                        {chainList.find(
                          (chain) => chain.id === selectedSwapChain,
                        )?.chainName || selectedSwapChain}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#27272A] border-[#3F3F46]">
                {/* Direct Deposit Assets */}
                <SelectGroup>
                  <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                    Direct Deposit
                  </SelectLabel>
                  {vault.supportedAssets.deposit.map((asset) => (
                    <SelectItem
                      key={asset}
                      value={asset}
                      className="text-[#FAFAFA] focus:bg-[#3F3F46] focus:text-[#FAFAFA]"
                    >
                      <div className="flex items-center gap-2">
                        <Image
                          src={getAssetIcon(asset)}
                          alt={asset}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span>{asset}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>

                <SelectSeparator className="bg-[#3F3F46]" />

                {/* Swap from Chains */}
                <SelectGroup>
                  <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                    Swap from
                  </SelectLabel>
                  {chainList
                    .filter(
                      (chain) => chain.id !== "sui" && chain.id !== "solana",
                    )
                    .map((chain) => (
                      <SelectItem
                        key={`swap-${chain.id}`}
                        value={chain.id}
                        className="text-[#FAFAFA] focus:bg-[#3F3F46] focus:text-[#FAFAFA]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500 text-sm">🔄</span>
                          <Image
                            src={chain.icon}
                            alt={chain.chainName}
                            width={16}
                            height={16}
                            className="rounded-full"
                          />
                          <span>
                            {chain.chainName} ({chain.chainToken})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-[#A1A1AA]">
                Amount
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs text-amber-500">
                  {selectedSwapChain ? (
                    <span className="text-[#A1A1AA]">
                      Will swap{" "}
                      {
                        chainList.find(
                          (chain) => chain.id === selectedSwapChain,
                        )?.chainToken
                      }{" "}
                      → {vault.supportedAssets.deposit[0]}
                    </span>
                  ) : isLoadingBalance ? (
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
                {isWalletConnected &&
                  selectedAsset &&
                  balances[selectedAsset] && (
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
                {selectedSwapChain ? (
                  <>
                    <Image
                      src={
                        chainList.find(
                          (chain) => chain.id === selectedSwapChain,
                        )?.icon || ""
                      }
                      alt={selectedSwapChain}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                    <span className="text-sm text-[#A1A1AA]">
                      {
                        chainList.find(
                          (chain) => chain.id === selectedSwapChain,
                        )?.chainToken
                      }
                    </span>
                  </>
                ) : selectedAsset ? (
                  <>
                    <Image
                      src={getAssetIcon(selectedAsset)}
                      alt={selectedAsset}
                      width={16}
                      height={16}
                      className="rounded-full"
                    />
                    <span className="text-sm text-[#A1A1AA]">
                      {selectedAsset}
                    </span>
                  </>
                ) : null}
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
            {needsApproval && isFormValid && (
              <Button
                onClick={handleApprove}
                disabled={isApproving}
                className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isApproving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Approving...
                  </div>
                ) : (
                  <>
                    Approve {selectedAsset}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={handleDeposit}
              disabled={
                !isFormValid || isLoading || (needsApproval && isFormValid)
              }
              className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  {selectedSwapChain ? (
                    <>
                      Swap & Deposit{" "}
                      {
                        chainList.find(
                          (chain) => chain.id === selectedSwapChain,
                        )?.chainToken
                      }
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    <>
                      Deposit {selectedAsset}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
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
