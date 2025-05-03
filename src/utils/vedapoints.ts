"use client";
// This utility fetches and formats Veda points data for a connected wallet

// Interfaces for Veda Points API data
interface VaultData {
  name: string;
  timestamp: string;
  totalPoints: number;
}

interface ChainData {
  userChainVedaPointsSum: number;
  vaults: Record<string, VaultData>;
}

interface VedaApiResponse {
  Response: {
    userTotalVedaPointsSum: number;
    ethereum: ChainData;
    base: ChainData;
    sonic: ChainData;
    [key: string]: unknown;
  };
}

export interface VaultPointsData {
  address: string;
  name: string;
  points: number;
  timestamp: string;
}

export interface ChainPointsData {
  name: string;
  chainId: number;
  points: number;
  vaults: VaultPointsData[];
}

export interface FormattedVedaPointsData {
  totalPoints: number;
  chains: ChainPointsData[];
  error?: string;
}

// Function to format date strings
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Function to fetch Veda points data for a specific wallet address
export async function fetchVedaPoints(
  walletAddress: string,
): Promise<VedaApiResponse> {
  if (!walletAddress) {
    throw new Error("No wallet address provided");
  }

  // Use our own API endpoint to avoid CORS issues
  const apiUrl = `/api/veda-points?userAddress=${walletAddress}`;
  console.log(`Fetching Veda points data for wallet: ${walletAddress}`);

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching Veda points data:", error);
    throw error;
  }
}

// Function to format the raw Veda points data into a more usable structure
export function formatVedaPointsData(
  data: VedaApiResponse,
): FormattedVedaPointsData {
  if (!data || !data.Response) {
    return {
      totalPoints: 0,
      chains: [],
    };
  }

  const response = data.Response;
  const totalPoints = response.userTotalVedaPointsSum || 0;

  // Process each blockchain
  const chains = ["ethereum", "base", "sonic"]; // Add more chains if needed

  const formattedData: FormattedVedaPointsData = {
    totalPoints,
    chains: chains
      // Include all chains, even those with 0 points
      .map((chain) => {
        // Handle case where the chain might not exist in the response
        const chainData = (response[chain] as ChainData) || {
          userChainVedaPointsSum: 0,
          vaults: {},
        };
        const chainPoints = chainData.userChainVedaPointsSum || 0;

        // Get vaults for this chain and sort by points (highest first)
        const vaults = Object.entries(chainData.vaults || {})
          .map(([address, vaultData]) => ({
            address,
            name: vaultData.name,
            points: vaultData.totalPoints,
            timestamp: vaultData.timestamp,
          }))
          .sort((a, b) => b.points - a.points);

        return {
          name: chain,
          chainId: getChainId(chain),
          points: chainPoints,
          vaults,
        };
      }),
  };

  return formattedData;
}

// Helper function to get chain ID from chain name
function getChainId(chain: string): number {
  const chainMap: Record<string, number> = {
    ethereum: 1,
    base: 8453,
    sonic: 0, // Update with actual Sonic chain ID when available
  };

  return chainMap[chain] || 0;
}

// Function to get Veda points for a wallet address
export async function getVedaPoints(
  walletAddress: string,
): Promise<FormattedVedaPointsData> {
  if (!walletAddress) {
    return {
      totalPoints: 0,
      chains: [],
    };
  }

  try {
    const data = await fetchVedaPoints(walletAddress);
    return formatVedaPointsData(data);
  } catch (error) {
    console.error("Failed to process Veda points data:", error);
    return {
      totalPoints: 0,
      chains: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
