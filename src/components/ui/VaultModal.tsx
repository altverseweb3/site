"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// Assets that will be available for deposit in all vaults
const AVAILABLE_ASSETS = [
  { id: "weth", name: "wETH", icon: "🔷" },
  { id: "sui", name: "SUI", icon: "🔵" },
  { id: "solana", name: "SOL", icon: "🟣" },
];

export type VaultDetails = {
  id: number;
  name: string;
  ecosystem: string;
  token: string[];
  points: string;
  apy: string;
  tvl?: string;
  description?: string;
  contractAddress?: string;
  explorerUrl?: string;
  analyticsUrl?: string;
  hasRealAPY?: boolean;
};

export const VaultModal = ({
  vault,
  open,
  onOpenChange,
}: {
  vault: VaultDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
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
      <DialogContent className="sm:w-1/2 w-2/3 rounded-lg bg-[#18181B] border-[#27272A] border [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]">
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA] flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
              <span className="text-xs text-zinc-300">{vault.name[0]}</span>
            </div>
            <span>
              {vault.name} -{" "}
              <span className="text-zinc-400">{vault.ecosystem}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="bg-zinc-800/50 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-zinc-400">TVL</div>
              <div className="text-amber-500 font-medium">
                {vault.tvl === "Loading..."
                  ? "Loading..."
                  : vault.tvl === "N/A"
                    ? "N/A"
                    : `$${vault.tvl}`}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">APY</div>
              {/* Special case for EIGEN Restaking */}
              {vault.name === "EIGEN Restaking" ? (
                <div className="flex items-center justify-end">
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open("https://app.ether.fi/eigen", "_blank")
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View APY</span>
                  </Button>
                </div>
              ) : vault.hasRealAPY && vault.apy !== "N/A" ? (
                <div className="flex items-center gap-3">
                  <div className="text-green-500 text-sm font-medium">
                    {vault.apy}
                  </div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open(
                        vault.analyticsUrl ||
                          `https://analytics.example.com/vaults/${vault.id}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-zinc-400 text-sm">N/A</div>
                  <Button
                    variant="outline"
                    className="flex items-center justify-center gap-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
                    onClick={() =>
                      window.open(
                        vault.analyticsUrl ||
                          `https://analytics.example.com/vaults/${vault.id}`,
                        "_blank",
                      )
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2 my-2">
            <Button
              variant="ghost"
              className={cn(
                "text-sm font-medium transition-colors",
                activeTab === "deposit"
                  ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
              )}
              onClick={() => setActiveTab("deposit")}
            >
              Deposit
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "text-sm font-medium transition-colors",
                activeTab === "withdraw"
                  ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                  : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
              )}
              onClick={() => setActiveTab("withdraw")}
            >
              Withdraw
            </Button>
          </div>

          {activeTab === "deposit" ? (
            <div className="bg-zinc-800/50 p-4 rounded-md">
              {/* Amount Input */}
              <div className="text-sm text-zinc-400 mb-2">
                Amount to Deposit
              </div>
              <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none"
                />

                {/* Asset Selector - Simple Select Element */}
                <select
                  className="h-full px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 rounded-none appearance-none cursor-pointer min-w-[120px]"
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

              {/* User Receives Section */}
              <div className="text-sm text-zinc-400 mb-2">User Receives</div>
              <div className="flex border border-zinc-700 rounded-md overflow-hidden mb-4 h-14">
                <input
                  type="number"
                  value={amount} // Just using the same amount for now
                  readOnly
                  placeholder="0.0"
                  className="flex-grow bg-transparent border-none text-zinc-100 p-3 focus:outline-none"
                />

                {/* Token Received Selector */}
                <select
                  className="h-full px-3 py-3 bg-zinc-800 text-zinc-100 border-l border-zinc-700 rounded-none appearance-none cursor-pointer min-w-[120px]"
                  defaultValue="weETH"
                >
                  <option value="weETH">🔷 weETH</option>
                  <option value="eETH">🔶 eETH</option>
                </select>
              </div>

              {/* Deposit Button */}
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
                onClick={handleDepositConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Confirm Deposit
              </Button>
            </div>
          ) : (
            <div className="bg-zinc-800/50 p-4 rounded-md">
              <div className="flex flex-col gap-4">
                <div className="text-center text-zinc-200">
                  Withdraw your funds from {vault.name}
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={() =>
                    window.open(
                      vault.analyticsUrl ||
                        `https://analytics.example.com/vaults/${vault.id}`,
                      "_blank",
                    )
                  }
                >
                  Withdraw
                </Button>
              </div>
            </div>
          )}

          {vault.explorerUrl && (
            <Button
              variant="outline"
              className="flex items-center justify-center gap-2 mt-2 border-zinc-700 text-zinc-300 hover:text-zinc-100"
              onClick={() => window.open(vault.explorerUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
              <span>View on Explorer</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VaultModal;
