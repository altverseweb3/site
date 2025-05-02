"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import VaultModal, { VaultDetails } from "@/components/ui/VaultModal";

const EarnComponent: React.FC = () => {
  // Add scroll padding at the bottom to ensure the table is fully visible
  useEffect(() => {
    // Function to adjust padding based on screen height
    const adjustPadding = () => {
      const viewportHeight = window.innerHeight;

      // Calculate needed padding based on viewport size
      // Smaller screens need more padding to ensure enough scrollable space
      if (viewportHeight < 768) {
        document.body.style.paddingBottom = "200px";
      } else if (viewportHeight < 1024) {
        document.body.style.paddingBottom = "100px";
      } else {
        document.body.style.paddingBottom = "0px";
      }
    };

    // Initial adjustment
    adjustPadding();

    // Add event listener for resize
    window.addEventListener("resize", adjustPadding);

    // Clean up when component unmounts
    return () => {
      document.body.style.paddingBottom = "";
      window.removeEventListener("resize", adjustPadding);
    };
  }, []);

  // State for TVL data
  const [tvlValues, setTvlValues] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVault, setSelectedVault] = useState<VaultDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Effect to load TVL data on page load
  useEffect(() => {
    async function fetchTVLData() {
      try {
        setIsLoading(true);
        console.log("🔄 Fetching TVL data...");

        // Make a simple API call to get TVL data
        const response = await fetch("/api/tvl");

        if (response.ok) {
          const data = await response.json();
          console.log("✅ TVL data received:", data);
          setTvlValues(data);
        } else {
          console.error("Failed to fetch TVL data, status:", response.status);

          // Fallback to static values
          setTvlValues({
            1: "NA",
            2: "NA",
            3: "NA",
            4: "NA",
            5: "NA",
            6: "NA",
            7: "NA",
            8: "NA",
          });
        }
      } catch (error) {
        console.error("Error fetching TVL data:", error);

        // Fallback to static values
        setTvlValues({
          1: "NA",
          2: "NA",
          3: "NA",
          4: "NA",
          5: "NA",
          6: "NA",
          7: "NA",
          8: "NA",
        });
      } finally {
        setIsLoading(false);
      }
    }

    // Call the function when component mounts
    fetchTVLData();
  }, []);

  // Create an array of vaults with sample data
  const vaults = [
    {
      id: 1,
      name: "Liquid ETH",
      ecosystem: "Ether.fi",
      chains: ["Ethereum"],
      points: "FML",
      apy: "12.4%",
      description:
        "Liquid ETH vault provides staking rewards plus additional yield from ETH delegation strategies.",
      contractAddress: "0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      explorerUrl:
        "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
    },
    {
      id: 2,
      name: "The Bera ETH Vault",
      ecosystem: "Ether.fi",
      chains: ["Ethereum"],
      points: "FML",
      apy: "8.2%",
      description:
        "The Bera ETH Vault focuses on low-risk strategies with consistent returns for ETH holders.",
      contractAddress: "0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      explorerUrl:
        "https://etherscan.io/address/0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
    },
    {
      id: 3,
      name: "Liquid BTC",
      ecosystem: "Ether.fi",
      chains: ["BTC"],
      points: "FML",
      apy: "14.5%",
      description:
        "Liquid BTC vault uses wrapped BTC to generate yield through lending and options strategies.",
      contractAddress: "0x5f46d540b6eD704C3c8789105F30E075AA900726",
      explorerUrl:
        "https://etherscan.io/address/0x5f46d540b6eD704C3c8789105F30E075AA900726",
    },
    {
      id: 4,
      name: "Liquid USD",
      ecosystem: "Ether.fi",
      chains: ["USDC"],
      points: "FML",
      apy: "10.8%",
      description:
        "Liquid USD vault focuses on stable returns using conservative stablecoin strategies.",
      contractAddress: "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      explorerUrl:
        "https://etherscan.io/address/0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
    },
    {
      id: 5,
      name: "Liquid Move ETH",
      ecosystem: "Ether.fi",
      chains: ["Ethereum"],
      points: "FML",
      apy: "6.5%",
      description:
        "Liquid Move ETH vault combines ETH staking with automated trading strategies.",
      contractAddress: "0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      explorerUrl:
        "https://etherscan.io/address/0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
    },
    {
      id: 6,
      name: "Ultra Yield Stablecoin Vault",
      ecosystem: "Ether.fi",
      chains: ["USDC"],
      points: "FML",
      apy: "15.2%",
      description:
        "Ultra Yield Stablecoin Vault uses aggressive yet secure strategies to maximize stablecoin returns.",
      contractAddress: "0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      explorerUrl:
        "https://etherscan.io/address/0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
    },
    {
      id: 7,
      name: "Elixir Stable Vault",
      ecosystem: "Ether.fi",
      chains: ["deUSD"],
      points: "FML",
      apy: "11.3%",
      description:
        "Elixir Stable Vault specializes in decentralized stablecoin yield strategies.",
      contractAddress: "0x352180974C71f84a934953Cf49C4E538a6F9c997",
      explorerUrl:
        "https://etherscan.io/address/0x352180974C71f84a934953Cf49C4E538a6F9c997",
    },
    {
      id: 8,
      name: "Usual Stable Vault",
      ecosystem: "Ether.fi",
      chains: ["USD0"],
      points: "FML",
      apy: "9.7%",
      description:
        "Usual Stable Vault provides reliable yield on USD0 stablecoins through diversified DeFi protocols.",
      contractAddress: "0xeDa663610638E6557c27e2f4e973D3393e844E70",
      explorerUrl:
        "https://etherscan.io/address/0xeDa663610638E6557c27e2f4e973D3393e844E70",
    },
  ];

  // Tabs for the earn page
  const tabs = [
    { id: "yield", label: "yield", active: true },
    {
      id: "stake",
      label: "stake",
      disabled: true,
      disabledMessage: "Coming soon",
    },
    {
      id: "points",
      label: "points",
      disabled: true,
      disabledMessage: "Coming soon",
    },
  ];

  const handleVaultClick = (vault: VaultDetails) => {
    // Add TVL to the vault data
    const vaultWithTVL = {
      ...vault,
      tvl: tvlValues[vault.id] || "N/A",
    };
    setSelectedVault(vaultWithTVL);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full w-full items-start justify-center min-h-[500px]">
      <div className="w-full flex flex-col items-center">
        <div className="w-[700px] flex justify-center mb-6 mt-6">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              disabled={tab.disabled}
              title={tab.disabledMessage}
              className={cn(
                "text-sm font-medium transition-colors bg-transparent mx-2",
                tab.active
                  ? "text-amber-500 hover:text-amber-400 hover:bg-transparent"
                  : tab.disabled
                    ? "text-zinc-600" // Use default disabled styling
                    : "text-zinc-50 hover:text-zinc-200 hover:bg-transparent",
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="w-[700px] bg-zinc-900 rounded-[6px] overflow-hidden">
          <div className="px-8 py-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="p-4 text-left text-zinc-400 font-medium w-[35%]">
                    Vault
                  </th>
                  <th className="p-4 text-left text-zinc-400 font-medium w-[30%]">
                    Ecosystem
                  </th>
                  <th className="p-4 text-left text-zinc-400 font-medium w-[20%]">
                    Chain
                  </th>
                  <th className="p-4 text-right text-zinc-400 font-medium w-[15%]">
                    TVL
                  </th>
                </tr>
              </thead>
              <tbody>
                {vaults.map((vault) => (
                  <tr
                    key={vault.id}
                    className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => handleVaultClick(vault)}
                  >
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-zinc-700 rounded-full mr-3 flex items-center justify-center">
                          <span className="text-xs text-zinc-300">
                            {vault.name[0]}
                          </span>
                        </div>
                        <span className="text-zinc-100">{vault.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-zinc-100">{vault.ecosystem}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex">
                        {vault.chains.map((chain, idx) => (
                          <div
                            key={idx}
                            className="bg-zinc-800 rounded-full px-2 text-xs text-zinc-400 mr-1"
                          >
                            {chain}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-green-500 font-medium">
                        {isLoading
                          ? "Loading..."
                          : tvlValues[vault.id]
                            ? `$${tvlValues[vault.id]}`
                            : "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="h-16 sm:h-20 md:h-24 lg:h-16"></div>{" "}
        {/* Responsive space at the bottom */}
      </div>

      {/* Vault Modal */}
      <VaultModal
        vault={selectedVault}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
};

export default EarnComponent;
