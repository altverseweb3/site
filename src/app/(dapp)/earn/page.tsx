"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import VaultModal, { VaultDetails } from "@/components/ui/VaultModal";
import { getVedaPoints, FormattedVedaPointsData } from "@/utils/vedapoints";
import useWeb3Store from "@/store/web3Store";
import { ExternalLink } from "lucide-react";

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

  // State for data
  const [tvlValues, setTvlValues] = useState<Record<number, string>>({});
  const [apyValues, setApyValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isApyLoading, setIsApyLoading] = useState(true);
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
          // No fallback, leave empty
          setTvlValues({});
        }
      } catch (error) {
        console.error("Error fetching TVL data:", error);
        // No fallback, leave empty
        setTvlValues({});
      } finally {
        setIsLoading(false);
      }
    }

    // Call the function when component mounts
    fetchTVLData();
  }, []);

  // Effect to load APY data on page load
  useEffect(() => {
    async function fetchAPYData() {
      try {
        setIsApyLoading(true);
        console.log("🔄 Fetching APY data...");

        // Make a simple API call to get APY data
        const response = await fetch("/api/apy");

        if (response.ok) {
          const data = await response.json();
          console.log("✅ APY data received:", data);
          setApyValues(data);
        } else {
          console.error("Failed to fetch APY data, status:", response.status);
          // No fallback, leave empty
          setApyValues({});
        }
      } catch (error) {
        console.error("Error fetching APY data:", error);
        // No fallback, leave empty
        setApyValues({});
      } finally {
        setIsApyLoading(false);
      }
    }

    // Call the function when component mounts
    fetchAPYData();
  }, []);

  // Create an array of vaults with sample data
  const vaults = [
    {
      id: 1,
      name: "Liquid ETH",
      ecosystem: "Ether.fi",
      token: ["wETH"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Liquid ETH vault provides staking rewards plus additional yield from ETH delegation strategies.",
      contractAddress: "0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      explorerUrl:
        "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      analyticsUrl: "https://www.ether.fi/app/liquid/eth",
    },
    {
      id: 2,
      name: "The Bera ETH Vault",
      ecosystem: "Ether.fi",
      token: ["wETH"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "The Bera ETH Vault focuses on low-risk strategies with consistent returns for ETH holders.",
      contractAddress: "0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      explorerUrl:
        "https://etherscan.io/address/0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      analyticsUrl: "https://www.ether.fi/app/liquid/bera-eth",
    },
    {
      id: 3,
      name: "Liquid BTC",
      ecosystem: "Ether.fi",
      token: ["wBTC"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Liquid BTC vault uses wrapped BTC to generate yield through lending and options strategies.",
      contractAddress: "0x5f46d540b6eD704C3c8789105F30E075AA900726",
      explorerUrl:
        "https://etherscan.io/address/0x5f46d540b6eD704C3c8789105F30E075AA900726",
      analyticsUrl: "https://www.ether.fi/app/liquid/btc",
    },
    {
      id: 4,
      name: "Liquid USD",
      ecosystem: "Ether.fi",
      token: ["USDC"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Liquid USD vault focuses on stable returns using conservative stablecoin strategies.",
      contractAddress: "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      explorerUrl:
        "https://etherscan.io/address/0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      analyticsUrl: "https://www.ether.fi/app/liquid/usd",
    },
    {
      id: 5,
      name: "Liquid Move ETH",
      ecosystem: "Ether.fi",
      token: ["wETH"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Liquid Move ETH vault combines ETH staking with automated trading strategies.",
      contractAddress: "0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      explorerUrl:
        "https://etherscan.io/address/0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      analyticsUrl: "https://www.ether.fi/app/liquid/move-eth",
    },
    {
      id: 6,
      name: "Ultra Yield Stablecoin Vault",
      ecosystem: "Ether.fi",
      token: ["USDC"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Ultra Yield Stablecoin Vault uses aggressive yet secure strategies to maximize stablecoin returns.",
      contractAddress: "0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      explorerUrl:
        "https://etherscan.io/address/0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      analyticsUrl: "https://www.ether.fi/app/liquid/ultra-yield-stablecoin",
    },
    {
      id: 7,
      name: "Elixir Stable Vault",
      ecosystem: "Ether.fi",
      token: ["deUSD"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Elixir Stable Vault specializes in decentralized stablecoin yield strategies.",
      contractAddress: "0x352180974C71f84a934953Cf49C4E538a6F9c997",
      explorerUrl:
        "https://etherscan.io/address/0x352180974C71f84a934953Cf49C4E538a6F9c997",
      analyticsUrl: "https://analytics.ether.fi/vaults/elixir-stable",
    },
    {
      id: 8,
      name: "Usual Stable Vault",
      ecosystem: "Ether.fi",
      token: ["USD0"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Usual Stable Vault provides reliable yield on USD0 stablecoins through diversified DeFi protocols.",
      contractAddress: "0xeDa663610638E6557c27e2f4e973D3393e844E70",
      explorerUrl:
        "https://etherscan.io/address/0xeDa663610638E6557c27e2f4e973D3393e844E70",
      analyticsUrl: "https://analytics.ether.fi/vaults/usual-stable",
    },
  ];
  // State for active tab
  const [activeTab, setActiveTab] = useState<"yield" | "stake" | "points">(
    "yield",
  );

  // Tabs for the earn page
  const tabs = [
    { id: "yield", label: "yield", active: activeTab === "yield" },
    {
      id: "stake",
      label: "stake",
      disabled: true,
      active: activeTab === "stake",
      disabledMessage: "Coming soon",
    },
    {
      id: "points",
      label: "points",
      disabled: false,
      active: activeTab === "points",
      disabledMessage: "",
    },
  ];

  const handleVaultClick = (vault: VaultDetails) => {
    // Check if we have real APY data for this vault
    const realAPY = vault.contractAddress
      ? apyValues[vault.contractAddress]
      : null;

    // Add TVL and real APY (if available) to the vault data
    const vaultWithData = {
      ...vault,
      tvl: isLoading ? "Loading..." : tvlValues[vault.id] || "N/A",
      hasRealAPY: !!realAPY,
      apy: isApyLoading ? "Loading..." : realAPY || "N/A",
    };
    setSelectedVault(vaultWithData);
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
              onClick={() => {
                if (
                  !tab.disabled &&
                  (tab.id === "yield" ||
                    tab.id === "stake" ||
                    tab.id === "points")
                ) {
                  setActiveTab(tab.id as "yield" | "stake" | "points");
                }
              }}
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
        {activeTab === "yield" && (
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
                      Token
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
                          {vault.token.map((tokenName, idx) => (
                            <div
                              key={idx}
                              className="bg-zinc-800 rounded-full px-2 text-xs text-zinc-400 mr-1"
                            >
                              {tokenName}
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
        )}
        {activeTab === "points" && <PointsTab />}
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

// The VedaPointsData interface is now imported from utils/vedapoints

// PointsTab component displays Veda points data for the connected wallet
const PointsTab: React.FC = () => {
  const [pointsData, setPointsData] = useState<FormattedVedaPointsData | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeWallet = useWeb3Store((state) => state.activeWallet);

  // Function to handle wallet connection
  const handleConnectWallet = async () => {
    try {
      // Import dynamically to avoid server-side errors
      const { connectMetamask } = await import("@/utils/walletMethods");
      await connectMetamask();
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setError("Failed to connect wallet. Please try again.");
    }
  };

  useEffect(() => {
    async function fetchPoints() {
      if (!activeWallet) {
        setError("Please connect your wallet to view points");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Use only the connected wallet address - no fallbacks
        const data = await getVedaPoints(activeWallet.address);
        setPointsData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load points data";
        setError(errorMessage);
        console.error("Error fetching points data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPoints();
  }, [activeWallet]);

  // Function to get chain display name
  const getChainDisplayName = (name: string): string => {
    const displayNames: Record<string, string> = {
      ethereum: "Ethereum",
      base: "Base",
      sonic: "Sonic",
    };
    return displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="w-[700px] bg-zinc-900 rounded-[6px] overflow-hidden">
      <div className="px-8 py-6">
        {!activeWallet ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-zinc-300 mb-4">
              Connect your wallet to view your Veda points
            </div>
            <Button
              variant="outline"
              className="bg-amber-500 hover:bg-amber-600 text-black border-none"
              onClick={handleConnectWallet}
            >
              Connect Wallet
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-zinc-300">Loading points data...</div>
          </div>
        ) : error ? (
          <div className="flex justify-center py-8">
            <div className="text-red-400">{error}</div>
          </div>
        ) : pointsData ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-zinc-100">
                Your Veda Points
              </h2>
              <div className="text-2xl font-bold text-amber-500">
                {pointsData.totalPoints.toFixed(2)}
              </div>
            </div>

            <div className="space-y-6">
              {pointsData.chains.map((chain) => (
                <div
                  key={chain.name}
                  className="border border-zinc-800 rounded-md"
                >
                  <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-800/50">
                    <div className="text-zinc-200 font-medium">
                      {getChainDisplayName(chain.name)}
                    </div>
                    <div
                      className={
                        chain.points > 0
                          ? "text-amber-500 font-medium"
                          : "text-zinc-400 font-medium"
                      }
                    >
                      {chain.points.toFixed(2)} points
                    </div>
                  </div>

                  {chain.vaults.length > 0 ? (
                    <div className="p-3">
                      <table className="w-full">
                        <thead>
                          <tr className="text-zinc-400 text-sm">
                            <th className="text-left p-2 font-normal">Vault</th>
                            <th className="text-right p-2 font-normal">
                              Points
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {chain.vaults.map((vault) => (
                            <tr
                              key={vault.address}
                              className="border-t border-zinc-800 text-sm hover:bg-zinc-800/30 transition-colors"
                            >
                              <td className="text-left p-2 text-zinc-200">
                                {vault.name}
                              </td>
                              <td className="text-right p-2 text-amber-500">
                                {vault.points.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-zinc-400 text-sm">
                      No points earned yet on {getChainDisplayName(chain.name)}
                    </div>
                  )}
                </div>
              ))}

              {pointsData.chains.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  No points data available. Start using vaults to earn points!
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="outline"
                className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
                onClick={() =>
                  window.open("https://app.veda.tech/points", "_blank")
                }
              >
                View on Veda <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="text-zinc-300">No points data available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnComponent;
