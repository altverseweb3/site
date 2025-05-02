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

  if (!vault) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:w-1/2 w-2/3 rounded-lg bg-[#18181B] border-[#27272A] border 
        [&>button]:!focus:ring-0 [&>button]:!focus:ring-offset-0 [&>button]:!focus:outline-none
        [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] 
        [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] 
        [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px]"
      >
        <DialogHeader>
          <DialogTitle className="text-[#FAFAFA] flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center">
              <span className="text-xs text-zinc-300">{vault.name[0]}</span>
            </div>
            <span>{vault.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 p-4 rounded-md">
              <div className="text-sm text-zinc-400">Ecosystem</div>
              <div className="text-zinc-100 mt-1">{vault.ecosystem}</div>
              <div className="flex mt-2">
                {vault.token.map((tokenName, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-800 rounded-full px-2 text-xs text-zinc-400 mr-1"
                  >
                    {tokenName}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-800/50 p-4 rounded-md">
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-sm text-zinc-400">TVL</div>
                  <div className="text-zinc-100">
                    {vault.tvl === "Loading..."
                      ? "Loading..."
                      : vault.tvl === "N/A"
                        ? "N/A"
                        : `$${vault.tvl}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-zinc-400">APY</div>
                  {vault.hasRealAPY && vault.apy !== "N/A" ? (
                    <>
                      <div className="text-green-500 text-sm font-medium mb-1">
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
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex items-center justify-center gap-1 mt-1 h-6 border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs px-2 py-0"
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
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 p-4 rounded-md">
            <div className="text-sm text-zinc-400 mb-2">Description</div>
            <div className="text-zinc-100">
              {vault.description ||
                `${vault.name} provides sustainable yield through a variety of DeFi strategies optimized for maximum returns with managed risk.`}
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

          <div className="bg-zinc-800/50 p-4 rounded-md">
            {activeTab === "deposit" ? (
              <div className="flex flex-col gap-4">
                <div className="text-center text-zinc-200">
                  Ready to earn {vault.apy} APY with {vault.name}?
                </div>
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
                  onClick={() =>
                    alert(`Deposit functionality coming soon for ${vault.name}`)
                  }
                >
                  Deposit
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="text-center text-zinc-200">
                  Withdraw your funds from {vault.name}
                </div>
                <Button
                  className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium"
                  onClick={() =>
                    alert(
                      `Withdraw functionality coming soon for ${vault.name}`,
                    )
                  }
                >
                  Withdraw
                </Button>
              </div>
            )}
          </div>

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
