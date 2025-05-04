"use client";

import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { VaultDetails } from "./VaultModal";

// Assets that will be available for deposit in all vaults
const AVAILABLE_ASSETS = [
  { id: "weth", name: "wETH", icon: "🔷" },
  { id: "sui", name: "SUI", icon: "🔵" },
  { id: "solana", name: "SOL", icon: "🟣" },
];

export const DepositModal = ({
  vault,
  open,
  onOpenChange,
}: {
  vault: VaultDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [amount, setAmount] = useState<string>("");
  const [selectedAsset, setSelectedAsset] = useState(AVAILABLE_ASSETS[0]);

  if (!vault) return null;

  const handleDepositConfirm = () => {
    // This would normally interact with a blockchain wallet and contract
    alert(
      `Deposit of ${amount} ${selectedAsset.name} to ${vault.name} successful! (This is a demo message)`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:w-[450px] rounded-lg bg-[#18181B] border-[#27272A] border [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]">
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA] flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
              <span className="text-xs text-zinc-300">{vault.name[0]}</span>
            </div>
            <span>Deposit to {vault.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-1 gap-4">
          {/* Amount Input */}
          <div className="bg-zinc-800/50 p-4 rounded-md">
            <div className="text-sm text-zinc-400 mb-2">Amount to Deposit</div>
            <div className="flex border border-zinc-700 rounded-md overflow-hidden">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none"
              />

              {/* Asset Selector - Simple Select Element */}
              <select
                className="h-full px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 rounded-none appearance-none cursor-pointer"
                value={selectedAsset.id}
                onChange={(e) => {
                  const newAsset = AVAILABLE_ASSETS.find(
                    (asset) => asset.id === e.target.value,
                  );
                  if (newAsset) setSelectedAsset(newAsset);
                }}
              >
                {AVAILABLE_ASSETS.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.icon} {asset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Deposit Details */}
          <div className="bg-zinc-800/50 p-4 rounded-md">
            <div className="text-sm text-zinc-400 mb-2">Deposit Details</div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Vault APY</span>
              <span className="text-green-500">{vault.apy || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Protocol</span>
              <span className="text-zinc-100">{vault.ecosystem}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Current TVL</span>
              <span className="text-zinc-100">
                {vault.tvl === "N/A" ? "N/A" : `$${vault.tvl}`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-medium"
              onClick={handleDepositConfirm}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Confirm Deposit
            </Button>
          </div>

          {/* Explorer Link */}
          {vault.explorerUrl && (
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 mt-2 border-zinc-700 text-zinc-300 hover:text-zinc-100"
              onClick={() => window.open(vault.explorerUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              <span>View Vault on Explorer</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepositModal;
