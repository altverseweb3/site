"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import * as ethers from "ethers";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import VaultModal, { VaultDetails } from "@/components/ui/VaultModal";
import { getVedaPoints, FormattedVedaPointsData } from "@/utils/vedapoints";
import { checkAllVaultsDepositStatus } from "@/utils/checkifpaused";
import useWeb3Store from "@/store/web3Store";
import { ExternalLink } from "lucide-react";
import { useWalletConnection } from "@/utils/walletMethods"

// Token SVG mapping with updated image paths from tokens folder
const TOKEN_SVG_MAPPING: Record<string, string> = {
  // Vault tokens
  "Liquid ETH Yield": "/earnImages/earnSVGs/liquid-eth-icon.png",
  "Liquid BTC Yield": "/earnImages/earnSVGs/liquid-btc-icon.png",
  "The Bera ETH Vault": "/earnImages/earnSVGs/beraeth.svg",
  "The Bera BTC Vault": "/earnImages/earnSVGs/beraeth.svg",
  "EIGEN Restaking": "/earnImages/earnSVGs/eigenlayer-icon.svg",
  "UltraYield Stablecoin Vault": "/earnImages/earnSVGs/ultrayieldstable.png",
  "Market-Neutral USD": "/earnImages/earnTokens/usdc-icon.png",
  "Liquid Move ETH": "/earnImages/earnSVGs/liquidmove.png",
  // Token icons
  ETH: "/earnImages/earnTokens/eth-icon-2.png",
  wETH: "/earnImages/earnTokens/eth-icon-2.png",
  eETH: "/earnImages/earnTokens/eeth-icon.png",
  weETH: "/earnImages/earnSVGs/weETH.png",
  stETH: "/earnImages/earnSVGs/stETH.svg",
  wstETH: "/earnImages/earnSVGs/wstETH.png",
  wBTC: "/earnImages/earnTokens/wbtc.png",
  LBTC: "/earnImages/earnTokens/lbtc-icon.png",
  cbBTC: "/earnImages/earnTokens/cbbtc-icon.png",
  eBTC: "/earnImages/earnTokens/ebtc-icon.png",
  USDC: "/earnImages/earnTokens/usdc-icon.png",
  DAI: "/earnImages/earnTokens/dai-icon.png",
  USDT: "/earnImages/earnTokens/usdt-icon.png",
  USDe: "/earnImages/earnTokens/usde-icon.png",
  deUSD: "/earnImages/earnTokens/deUSD.png",
  sdeUSD: "/earnImages/earnTokens/sdeUSD.png",
  EIGEN: "/earnImages/earnTokens/eigenlayer-token.svg",
  SUI: "/earnImages/earnTokens/sui-logo.svg",
  SOL: "/earnImages/earnTokens/solana-sol-logo.svg",
};

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
  const [vaultDepositStatus, setVaultDepositStatus] = useState<Record<number, boolean>>({});
  const [isVaultStatusLoading, setIsVaultStatusLoading] = useState(true);
  const [selectedVault, setSelectedVault] = useState<VaultDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Effect to load TVL data on page load
  useEffect(() => {
    async function fetchTVLData() {
      try {
        setIsLoading(true);
        console.log("🔄 Fetching TVL data...");

        // Make a simple API call to get TVL data
        const response = await fetch("/api/tvlfetch");

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
        const response = await fetch("/api/apyfetch");

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
  
  // Effect to check vault deposit status
  useEffect(() => {
    async function checkVaultStatus() {
      try {
        setIsVaultStatusLoading(true);
        console.log("🔄 Checking vault deposit status...");

        // Always use a public provider for status checks
        const provider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");

        // Check all vaults' deposit status
        const depositStatus = await checkAllVaultsDepositStatus(provider);
        console.log("✅ Vault deposit status:", depositStatus);
        setVaultDepositStatus(depositStatus);
      } catch (error) {
        console.error("Error checking vault deposit status:", error);
        // Default to empty status object if there's an error
        setVaultDepositStatus({});
      } finally {
        setIsVaultStatusLoading(false);
      }
    }

    // Call the function when component mounts
    checkVaultStatus();
  }, []);

  // Create an array of vaults with sample data
  const vaults = [
    {
      id: 1,
      name: "Liquid ETH Yield",
      ecosystem: "Ether.fi",
      type: "Featured",
      chain: "Ethereum",
      token: ["wETH", "eETH", "weETH", "SOL", "SUI"],
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
      name: "Liquid BTC Yield",
      ecosystem: "Ether.fi",
      type: "Featured",
      chain: "Ethereum",
      token: ["LBTC", "wBTC", "cbBTC", "eBTC", "SOL", "SUI"],
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
      id: 3,
      name: "Market-Neutral USD",
      ecosystem: "Ether.fi",
      type: "Strategy Vault",
      chain: "Ethereum",
      token: ["USDC", "DAI", "USDT", "USDe", "deUSD", "sdeUSD", "SOL", "SUI"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "Market-Neutral USD vault focuses on stable returns using conservative stablecoin strategies.",
      contractAddress: "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      explorerUrl:
        "https://etherscan.io/address/0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      analyticsUrl: "https://www.ether.fi/app/liquid/usd",
    },
    {
      id: 4,
      name: "EIGEN Restaking",
      ecosystem: "Ether.fi",
      type: "Governance Restaking",
      chain: "Ethereum",
      token: ["EIGEN", "SOL", "SUI"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "EIGEN Restaking vault allows users to earn rewards by staking EIGEN tokens.",
      contractAddress: "0xE77076518A813616315EaAba6cA8e595E845EeE9",
      explorerUrl:
        "https://etherscan.io/address/0xE77076518A813616315EaAba6cA8e595E845EeE9",
      analyticsUrl: "https://www.ether.fi/app/eigen",
    },
    {
      id: 5,
      name: "UltraYield Stablecoin Vault",
      ecosystem: "Ether.fi",
      type: "Partner Vault",
      chain: "Ethereum",
      token: ["USDC", "DAI", "USDT", "SOL", "SUI"],
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
      id: 6,
      name: "Liquid Move ETH",
      ecosystem: "Ether.fi",
      type: "Partner Vault",
      chain: "Ethereum",
      token: ["wETH", "SOL", "SUI"],
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
      id: 7,
      name: "The Bera ETH Vault",
      ecosystem: "Ether.fi",
      type: "Partner Vault",
      chain: "Ethereum",
      token: ["wETH", "eETH", "weETH", "stETH", "wstETH", "SOL", "SUI"],
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
      id: 8,
      name: "The Bera BTC Vault",
      ecosystem: "Bera",
      type: "Partner Vault",
      chain: "Ethereum",
      token: ["wBTC", "LBTC", "cbBTC", "eBTC", "SOL", "SUI"],
      points: "FML",
      apy: "", // Will be populated with real-time data
      description:
        "The Bera BTC Vault focuses on low-risk strategies with consistent returns for BTC holders.",
      contractAddress: "0x94599e71926f857E089c3E23Ab4eaDEF3a7FB178",
      explorerUrl:
        "https://etherscan.io/address/0x94599e71926f857E089c3E23Ab4eaDEF3a7FB178",
      analyticsUrl: "https://www.ether.fi/app/liquid/bera-btc",
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

    // Get deposit status for this vault
    const isAcceptingDeposits = isVaultStatusLoading
      ? true // Default to enabled while loading
      : vault.id in vaultDepositStatus
        ? vaultDepositStatus[vault.id]
        : true; // Default to enabled if not in status map
    
    // For debugging
    console.log(`Vault ${vault.id} (${vault.name}) deposit status:`, isAcceptingDeposits);

    // Add TVL, APY and deposit status to the vault data
    const vaultWithData = {
      ...vault,
      tvl: isLoading ? "Loading..." : tvlValues[vault.id] || "N/A",
      hasRealAPY: !!realAPY,
      apy: isApyLoading ? "Loading..." : realAPY || "N/A",
      isAcceptingDeposits: isAcceptingDeposits // Use on-chain status for all vaults including Liquid Move ETH
    };
    setSelectedVault(vaultWithData);
    setIsModalOpen(true);
  };

  return (
    <div className="flex h-full w-full items-start justify-center min-h-[500px]">
      <div className="w-full flex flex-col items-center">
        <div className="w-[880px] flex justify-center mb-6 mt-6">
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
          <div className="w-[880px] bg-zinc-900 rounded-[6px] overflow-hidden">
            <div className="px-6 py-3">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="p-3 text-left text-zinc-400 font-medium w-[28%]">
                      Vault
                    </th>
                    <th className="p-3 text-left text-zinc-400 font-medium w-[13%]">
                      Type
                    </th>
                    <th className="p-3 text-left text-zinc-400 font-medium w-[31%] pr-0">
                      Token
                    </th>
                    <th className="p-3 text-left text-zinc-400 font-medium w-[12%] pl-0">
                      APY
                    </th>
                    <th className="p-3 text-right text-zinc-400 font-medium w-[16%]">
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
                      <td className="p-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 min-w-[2rem] bg-zinc-100/10 rounded-full mr-3 flex items-center justify-center overflow-hidden">
                            {TOKEN_SVG_MAPPING[vault.name] ? (
                              <div className="w-5 h-5 relative flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <Image
                                  src={TOKEN_SVG_MAPPING[vault.name]}
                                  alt={vault.name}
                                  width={18}
                                  height={18}
                                  className="object-contain max-w-full max-h-full"
                                  style={{ objectFit: "contain" }}
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-300">
                                {vault.name[0]}
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-100">{vault.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-zinc-400">{vault.type}</span>
                      </td>
                      <td className="p-4 pr-0">
                        <div
                          className="flex flex-wrap"
                          style={{ width: "fit-content", maxWidth: "200px" }}
                        >
                          {vault.token.map((tokenName, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-center relative group"
                              title={tokenName}
                              style={{
                                width: "30px",
                                height: "30px",
                                marginLeft: idx === 0 ? "0" : "-10px",
                                zIndex: 10 - (idx % 20),
                              }} /* Overlapping effect in a single row */
                            >
                              {TOKEN_SVG_MAPPING[tokenName] ? (
                                <div className="w-6 h-6 relative flex items-center justify-center flex-shrink-0">
                                  <Image
                                    src={TOKEN_SVG_MAPPING[tokenName]}
                                    alt={tokenName}
                                    width={24}
                                    height={24}
                                    className="object-contain max-w-full max-h-full"
                                    style={{ objectFit: "contain" }}
                                  />
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-300">
                                  {tokenName[0]}
                                </span>
                              )}
                              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-zinc-800 text-xs text-zinc-200 px-2 py-1 rounded whitespace-nowrap z-20">
                                {tokenName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 pl-0 text-left">
                        {isApyLoading ? (
                          <div className="text-zinc-300 font-medium w-full">
                            Loading...
                          </div>
                        ) : vault.name === "Liquid Move ETH" ? (
                          // Hardcoded 11% APY for Liquid Move ETH vault
                          <div className="text-green-500 font-medium font-mono w-full">
                            11.0%
                          </div>
                        ) : vault.name === "EIGEN Restaking" ? (
                          // Hardcoded 3.9% APY for EIGEN Restaking vault
                          <div className="text-green-500 font-medium font-mono w-full">
                            3.1%
                          </div>
                        ) : vault.name === "The Bera ETH Vault" ||
                          vault.name === "The Bera BTC Vault" ||
                          !vault.contractAddress ||
                          !apyValues[vault.contractAddress] ? (
                          // For Bera vaults or N/A values when apyValues doesn't have a value or is null
                          <div className="text-zinc-300 w-full">
                            <Button
                              variant="link"
                              className="h-auto p-0 font-medium text-amber-500 hover:text-amber-300"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(vault.analyticsUrl, "_blank");
                              }}
                            >
                              View APY
                            </Button>
                          </div>
                        ) : // Check if APY is a number and greater than zero
                        parseFloat(apyValues[vault.contractAddress]) > 0 ? (
                          <div className="text-green-500 font-medium font-mono w-full">
                            {apyValues[vault.contractAddress]}
                          </div>
                        ) : (
                          // For APY values that are 0 or negative
                          <div className="text-zinc-300 font-medium font-mono w-full">&lt;0.01%</div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className="text-amber-500 font-medium font-mono">
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
  // Local state to hold fetched points data
  const [pointsData, setPointsData] = useState<FormattedVedaPointsData | null>(null);
  // Loading & error flags
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // STEP 1: grab the “active” wallet out of your store
  // getWalletBySourceChain() returns the currently‐selected WalletInfo or undefined
  const activeWallet = useWeb3Store((state) => state.getWalletBySourceChain());

  // STEP 2: pull connectWallet() out of your wallet‐connection hook
  const { connectWallet } = useWalletConnection();

  // Whenever the activeWallet changes, re‐fetch points
  useEffect(() => {
    async function fetchPoints() {
      // If we have no connected address, bail out with an error message
      if (!activeWallet?.address) {
        setError("Please connect your wallet to view points");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Call your Veda‐points util with the connected address
        const data = await getVedaPoints(activeWallet.address);
        setPointsData(data);
      } catch (err) {
        // Capture any error message
        const message = err instanceof Error ? err.message : "Failed to load points data";
        setError(message);
        console.error("Error fetching points data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPoints();
  }, [activeWallet]);

  /**
   * Helper to convert chain keys (e.g. “ethereum”) into display names
   */
  const getChainDisplayName = (name: string): string => {
    const displayNames: Record<string, string> = {
      ethereum: "Ethereum",
      base:     "Base",
      sonic:    "Sonic",
      // …add more mappings here…
    };
    // Fallback: capitalize first letter
    return displayNames[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="w-[700px] bg-zinc-900 rounded-[6px] overflow-hidden">
      <div className="px-8 py-6">

        {/* === No wallet connected === */}
        {!activeWallet?.address ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-zinc-300 mb-4">
              Connect your wallet to view your Veda points
            </div>
            <Button
              variant="outline"
              className="bg-amber-500 hover:bg-amber-600 text-black border-none"
              onClick={() => connectWallet()}
            >
              Connect Wallet
            </Button>
          </div>

        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-zinc-300">Loading points data…</div>
          </div>

        ) : error ? (
          <div className="flex justify-center py-8">
            <div className="text-red-400">{error}</div>
          </div>

        ) : pointsData ? (
          <>
            {/* Header with total points */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-medium text-zinc-100">
                Your Veda Points
              </h2>
              <div className="text-2xl font-bold text-amber-500">
                {pointsData.totalPoints.toFixed(2)}
              </div>
            </div>

            {/* Per‐chain breakdown */}
            <div className="space-y-6">
              {pointsData.chains.map((chain) => (
                <div key={chain.name} className="border border-zinc-800 rounded-md">
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

                  {/* Vault‐level points table, or “no points yet” message */}
                  {chain.vaults.length > 0 ? (
                    <div className="p-3">
                      <table className="w-full">
                        <thead>
                          <tr className="text-zinc-400 text-sm">
                            <th className="text-left p-2 font-normal">Vault</th>
                            <th className="text-right p-2 font-normal">Points</th>
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

              {/* Fallback if there are zero chains in the data */}
              {pointsData.chains.length === 0 && (
                <div className="text-center py-8 text-zinc-400">
                  No points data available. Start using vaults to earn points!
                </div>
              )}
            </div>

            {/* Footer: link out to Veda web app */}
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                className="text-amber-500 border-amber-500 hover:bg-amber-500/10"
                onClick={() => window.open("https://app.veda.tech/points", "_blank")}
              >
                View on Veda <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          /* Last‐ditch fallback if pointsData is somehow null */
          <div className="flex justify-center py-8">
            <div className="text-zinc-300">No points data available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EarnComponent;