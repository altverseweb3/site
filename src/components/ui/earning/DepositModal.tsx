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
import { useChainSwitch, useTokenTransfer } from "@/utils/walletMethods";
import { WalletType, Token, Chain } from "@/types/web3";
import { chainList, getChainById, chains } from "@/config/chains";
import { useAppKit } from "@reown/appkit/react";
import useWeb3Store from "@/store/web3Store";
import { ConnectButton } from "@suiet/wallet-kit";
import { useRef } from "react";

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
  const { open: openAppKit } = useAppKit();
  const isWalletConnected = useIsWalletTypeConnected(WalletType.REOWN_EVM);
  const isSuiWalletConnected = useIsWalletTypeConnected(WalletType.SUIET_SUI);
  const isSolanaWalletConnected = useIsWalletTypeConnected(
    WalletType.REOWN_SOL,
  );

  const isChainWalletConnected = (chainId: string) => {
    const chain = getChainById(chainId);
    if (!chain) return false;

    switch (chain.walletType) {
      case WalletType.REOWN_EVM:
        return isWalletConnected;
      case WalletType.SUIET_SUI:
        return isSuiWalletConnected;
      case WalletType.REOWN_SOL:
        return isSolanaWalletConnected;
      default:
        return false;
    }
  };

  // Refs for wallet connection
  const suiButtonRef = useRef<HTMLDivElement>(null);

  const connectSuiWallet = () => {
    if (!suiButtonRef.current) {
      console.error("SUI button ref is null or undefined.");
      return;
    }

    const suietButton = suiButtonRef.current.querySelector("button");
    if (!suietButton) {
      console.error(
        "Could not find the SUI button element inside the hidden div.",
      );
      return;
    }

    suietButton.click();
  };

  const connectSolanaWallet = async () => {
    openAppKit({ view: "Connect", namespace: "solana" });
  };

  const connectEvmWallet = async () => {
    openAppKit({ view: "Connect", namespace: "eip155" });
  };

  // Helper to create token objects for swapping
  const createNativeToken = (chain: Chain): Token => ({
    id: chain.chainToken.toLowerCase(),
    name: chain.chainToken,
    ticker: chain.chainToken,
    icon: chain.icon,
    address: chain.nativeAddress,
    decimals: chain.decimals,
    chainId: chain.chainId,
    stringChainId: chain.chainId.toString(),
    native: true,
  });

  // Helper to create destination token from vault's first deposit asset
  const createDestinationToken = (assetSymbol: string): Token => {
    const assetInfo = DEPOSIT_ASSETS[assetSymbol.toLowerCase()];
    return {
      id: assetSymbol.toLowerCase(),
      name: assetSymbol,
      ticker: assetSymbol,
      icon: assetInfo.imagePath,
      address: assetInfo.contractAddress,
      decimals: assetInfo.decimals,
      chainId: 1, // EtherFi vaults are on Ethereum
      stringChainId: "1",
      native: assetSymbol.toLowerCase() === "eth",
    };
  };

  // Token transfer hook for swap functionality
  const {
    amount: swapAmount,
    handleAmountChange: handleSwapAmountChange,
    isButtonDisabled: isSwapButtonDisabled,
    handleTransfer: handleSwapTransfer,
    receiveAmount,
    isLoadingQuote,
    totalFeeUsd,
  } = useTokenTransfer({
    type: "swap",
    onSuccess: (amount, sourceToken, destinationToken) => {
      console.log(
        `Swap succeeded: ${amount} ${sourceToken?.ticker} → ${destinationToken?.ticker}`,
      );
      // After successful swap, we can proceed with the deposit
      // The swapped tokens should now be available in the user's wallet
    },
    onError: (error) => {
      console.error("Swap failed:", error);
    },
  });

  // Helper to determine if we should use direct deposit vs cross-chain swap
  const isDirectDeposit = (chainId: string) => {
    const selectedChain = getChainById(chainId);
    // Direct deposit ONLY for Ethereum mainnet
    return selectedChain?.id === "ethereum";
  };

  // Configure cross-chain swap for any non-Ethereum chain (including EVM chains like ARB, OP, etc.)
  const configureSwapForChain = useCallback(
    (chainId: string) => {
      const selectedChain = getChainById(chainId);
      if (!selectedChain || !vault) return;

      // All non-Ethereum chains use cross-chain swap
      if (selectedChain.id !== "ethereum") {
        // Set up source chain and token
        const sourceChain = selectedChain;
        const sourceToken = createNativeToken(selectedChain);

        // Set up destination chain and token (first deposit asset from vault)
        const destinationChain = chains.ethereum; // EtherFi vaults are on Ethereum
        const firstDepositAsset = vault.supportedAssets.deposit[0];

        // Create destination token from vault's first deposit asset
        const destinationToken = createDestinationToken(firstDepositAsset);

        // Update Web3 store with swap configuration
        const store = useWeb3Store.getState();
        store.setSourceChain(sourceChain);
        store.setDestinationChain(destinationChain);
        store.setSourceToken(sourceToken);
        store.setDestinationToken(destinationToken);

        console.log(
          `Configured swap: ${sourceToken.ticker} (${sourceChain.chainName}) → ${destinationToken.ticker} (${destinationChain.chainName})`,
        );
      }
    },
    [vault],
  );

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

  // Form validation - distinguish between direct deposits and cross-chain swaps
  const isFormValid = selectedSwapChain
    ? swapAmount && parseFloat(swapAmount) > 0 // Cross-chain swap
    : selectedAsset && amount && parseFloat(amount) > 0; // Direct deposit

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
                  // Direct deposit asset selected (only allowed on Ethereum)
                  setSelectedAsset(value);
                  setSelectedSwapChain("");
                  if (value && isWalletConnected) {
                    fetchBalance(value);
                  }
                } else {
                  // Chain selected - determine if direct deposit or cross-chain swap
                  const selectedChain = getChainById(value);
                  if (selectedChain) {
                    if (isDirectDeposit(value)) {
                      // Ethereum - use direct deposit
                      setSelectedAsset("");
                      setSelectedSwapChain("");
                      // Will show direct deposit assets in dropdown
                    } else {
                      // All other chains - use cross-chain swap
                      setSelectedSwapChain(value);
                      setSelectedAsset("");

                      // Configure cross-chain swap for any non-Ethereum chain
                      configureSwapForChain(value);
                    }

                    // Handle chain switching for EVM chains
                    if (
                      selectedChain.walletType === WalletType.REOWN_EVM &&
                      isWalletConnected
                    ) {
                      try {
                        await switchToChain(selectedChain);
                        console.log(`Switched to ${selectedChain.chainName}`);
                      } catch (error) {
                        console.error("Failed to switch chain:", error);
                      }
                    }
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
                <SelectGroup>
                  <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                    Direct Deposit (Ethereum)
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

                {/* Cross-chain Swap from all other chains (excluding Ethereum) */}
                <SelectGroup>
                  <SelectLabel className="text-[#A1A1AA] px-2 py-1.5 text-xs font-medium">
                    Cross-chain Swap from
                  </SelectLabel>
                  {chainList
                    .filter((chain) => chain.id !== "ethereum") // Exclude Ethereum from swap options
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
                      {receiveAmount && (
                        <span className="text-green-500 ml-2">
                          ≈ {receiveAmount} {vault.supportedAssets.deposit[0]}
                        </span>
                      )}
                      {totalFeeUsd && (
                        <span className="text-amber-500 ml-2">
                          (Fee: ${totalFeeUsd})
                        </span>
                      )}
                    </span>
                  ) : isLoadingBalance ? (
                    <span>Loading balance...</span>
                  ) : selectedAsset && isWalletConnected ? (
                    <span>
                      Balance: {balances[selectedAsset] || "0.00"}{" "}
                      {selectedAsset}
                    </span>
                  ) : selectedAsset && !isWalletConnected ? (
                    <span className="text-[#71717A]">
                      Connect EVM wallet to see balance
                    </span>
                  ) : (
                    <span className="text-[#71717A]">
                      Select asset or chain
                    </span>
                  )}
                </div>
                {/* Show Max button for direct deposits when EVM wallet is connected */}
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

                {/* Show Connect EVM button when asset is selected but EVM wallet isn't connected */}
                {selectedAsset && !isWalletConnected && (
                  <button
                    onClick={connectEvmWallet}
                    className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30 transition-colors"
                  >
                    Connect EVM
                  </button>
                )}

                {/* Show wallet connection buttons for swap chains when not connected */}
                {selectedSwapChain &&
                  !isChainWalletConnected(selectedSwapChain) &&
                  (() => {
                    const chain = getChainById(selectedSwapChain);
                    if (chain?.walletType === WalletType.SUIET_SUI) {
                      return (
                        <button
                          onClick={connectSuiWallet}
                          className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-500 hover:text-blue-400 hover:bg-blue-500/30 transition-colors"
                        >
                          Connect SUI
                        </button>
                      );
                    } else if (chain?.walletType === WalletType.REOWN_SOL) {
                      return (
                        <button
                          onClick={connectSolanaWallet}
                          className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-500 hover:text-purple-400 hover:bg-purple-500/30 transition-colors"
                        >
                          Connect Solana
                        </button>
                      );
                    } else if (chain?.walletType === WalletType.REOWN_EVM) {
                      return (
                        <button
                          onClick={connectEvmWallet}
                          className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-500 hover:text-green-400 hover:bg-green-500/30 transition-colors"
                        >
                          Connect EVM
                        </button>
                      );
                    }
                    return null;
                  })()}
              </div>
            </div>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={selectedSwapChain ? swapAmount : amount} // Cross-chain swap uses swapAmount, direct deposit uses amount
                onChange={(e) => {
                  if (selectedSwapChain) {
                    // Cross-chain swap - use swap handler
                    handleSwapAmountChange(e);
                  } else {
                    // Direct deposit - use regular amount state
                    setAmount(e.target.value);
                  }
                }}
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
              onClick={
                selectedSwapChain
                  ? isWalletConnected
                    ? handleSwapTransfer
                    : connectEvmWallet // Require EVM connection for cross-chain swaps
                  : handleDeposit
              }
              disabled={
                selectedSwapChain
                  ? isSwapButtonDisabled ||
                    !isChainWalletConnected(selectedSwapChain) // Source chain wallet must be connected
                  : !isFormValid || isLoading || (needsApproval && isFormValid) // Direct deposit
              }
              className="w-full bg-amber-500 text-black hover:bg-amber-600 disabled:opacity-50"
            >
              {(selectedSwapChain ? isLoadingQuote : isLoading) ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  {selectedSwapChain ? "Getting Quote..." : "Processing..."}
                </div>
              ) : (
                <>
                  {selectedSwapChain ? (
                    isWalletConnected ? (
                      <>
                        Cross-chain Swap{" "}
                        {
                          chainList.find(
                            (chain) => chain.id === selectedSwapChain,
                          )?.chainToken
                        }
                        {receiveAmount &&
                          ` → ${receiveAmount} ${vault.supportedAssets.deposit[0]}`}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      <>
                        Connect EVM Wallet for Swap (Required)
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )
                  ) : (
                    <>
                      Direct Deposit {selectedAsset}
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

        {/* Hidden SUI wallet connect button */}
        <div
          ref={suiButtonRef}
          className="absolute opacity-0 pointer-events-auto -z-10"
        >
          <ConnectButton />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
