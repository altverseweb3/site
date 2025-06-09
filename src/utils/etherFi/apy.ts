import {
  ETHERFI_VAULTS,
  FALLBACK_APY_VALUES,
  EtherFiVault,
} from "@/config/etherFi";

// APY response interface
export interface VaultApyData {
  vaultId: number;
  name: string;
  address: string;
  source: string;
  overall_apy: number | null;
  fee: number;
  net_apy: number | null;
  timestamp?: string;
  deposit_disabled?: boolean;
  withdraw_disabled?: boolean;
}

/**
 * Fetch APY data for a specific vault
 */
export async function fetchVaultAPY(vaultId: number): Promise<VaultApyData> {
  const vault = ETHERFI_VAULTS[vaultId];
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  const yieldUrl = vault.links.yield;

  // Check for fallback case
  if (yieldUrl === "fallback") {
    const fallbackAPY =
      FALLBACK_APY_VALUES[vault.addresses.vault.toLowerCase()];
    if (fallbackAPY) {
      console.log(`✅ Using fallback APY for ${vault.name}: ${fallbackAPY}%`);
      return {
        vaultId,
        name: vault.name,
        address: vault.addresses.vault,
        source: "EtherFi Website (Fallback)",
        overall_apy: fallbackAPY / 100,
        fee: 0,
        net_apy: fallbackAPY / 100,
      };
    } else {
      throw new Error(`No fallback APY configured for vault ${vault.name}`);
    }
  }

  // Determine API type based on URL and fetch accordingly
  if (yieldUrl.includes("api.sevenseas.capital")) {
    return fetchFromSevenSeasAPI(vaultId, vault, yieldUrl);
  } else if (yieldUrl.includes("ether.fi/_next/data")) {
    return fetchFromEtherFiAPI(vaultId, vault, yieldUrl);
  } else if (yieldUrl.includes("app.veda.tech")) {
    return fetchFromVedaAPI(vaultId, vault, yieldUrl);
  } else {
    throw new Error(`Unknown APY URL format: ${yieldUrl}`);
  }
}

/**
 * Fetch APY data from Seven Seas API
 */
export async function fetchFromSevenSeasAPI(
  vaultId: number,
  vault: EtherFiVault,
  url: string,
): Promise<VaultApyData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const overallApy = data.Response?.apy;
    const fee = data.Response?.fees || 0;

    // Validate APY
    const isValidApy = overallApy !== undefined && overallApy > 0.001;

    return {
      vaultId,
      name: vault.name,
      address: vault.addresses.vault,
      source: "Seven Seas API",
      overall_apy: isValidApy ? overallApy : null,
      fee: fee,
      net_apy: isValidApy ? overallApy - fee : null,
      timestamp: data.Response?.timestamp,
    };
  } catch (error) {
    throw new Error(
      `Seven Seas API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetch APY data from EtherFi API
 */
export async function fetchFromEtherFiAPI(
  vaultId: number,
  vault: EtherFiVault,
  url: string,
): Promise<VaultApyData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const vaultData = data.pageProps?.vault;

    let apyValue = null;
    let feeValue = 0;

    // Extract APY value from various possible locations
    if (vaultData?.apy?.hardcodedApy) {
      apyValue = parseFloat(vaultData.apy.hardcodedApy) / 100;
    } else if (typeof vaultData?.apy?.apy === "number") {
      apyValue = vaultData.apy.apy;
    }

    // Extract fee if available
    if (vaultData?.details?.platformFee) {
      feeValue = vaultData.details.platformFee / 100;
    }

    return {
      vaultId,
      name: vault.name,
      address: vault.addresses.vault,
      source: "EtherFi Website",
      overall_apy: apyValue,
      fee: feeValue,
      net_apy: apyValue !== null ? apyValue - feeValue : null,
      deposit_disabled: vaultData?.depositDisabled || false,
      withdraw_disabled:
        vaultData?.withdrawDetails?.withdrawalDisabled || false,
    };
  } catch (error) {
    throw new Error(
      `EtherFi API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetch APY data from Veda API
 */
export async function fetchFromVedaAPI(
  vaultId: number,
  vault: EtherFiVault,
  url: string,
): Promise<VaultApyData> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    let apyValue = null;
    let feeValue = 0;

    // Extract APY from dailyApys array
    if (data?.dailyApys?.length > 0) {
      const latestApy = data.dailyApys[0].apy;
      apyValue = latestApy > 0 ? latestApy / 100 : null;
    }

    // Extract fee if available
    if (data.fee !== undefined) {
      feeValue = data.fee;
    }

    return {
      vaultId,
      name: vault.name,
      address: vault.addresses.vault,
      source: "Veda API",
      overall_apy: apyValue,
      fee: feeValue,
      net_apy: apyValue !== null ? apyValue - feeValue : null,
    };
  } catch (error) {
    throw new Error(
      `Veda API error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Fetch APY data for all vaults concurrently
 */
export async function fetchAllVaultsAPY(): Promise<VaultApyData[]> {
  const vaultIds = Object.keys(ETHERFI_VAULTS).map(Number);

  const promises = vaultIds.map(async (vaultId) => {
    try {
      return await fetchVaultAPY(vaultId);
    } catch (error) {
      console.error(`Error fetching APY for vault ${vaultId}:`, error);

      // Return fallback data structure on error
      const vault = ETHERFI_VAULTS[vaultId];
      return {
        vaultId,
        name: vault?.name || `Unknown Vault ${vaultId}`,
        address: vault?.addresses.vault || "",
        source: "Error Fallback",
        overall_apy: null,
        fee: 0,
        net_apy: null,
      };
    }
  });

  return Promise.all(promises);
}

/**
 * React hook for etherFi APY functions
 */
export function useEtherFiAPY() {
  return {
    fetchVaultAPY: (vaultId: number) => fetchVaultAPY(vaultId),
    fetchAllVaultsAPY: () => fetchAllVaultsAPY(),
    fetchFromSevenSeasAPI: (vaultId: number) => {
      const vault = ETHERFI_VAULTS[vaultId];
      if (!vault) throw new Error(`Vault ${vaultId} not found`);
      return fetchFromSevenSeasAPI(vaultId, vault, vault.links.yield);
    },
    fetchFromEtherFiAPI: (vaultId: number) => {
      const vault = ETHERFI_VAULTS[vaultId];
      if (!vault) throw new Error(`Vault ${vaultId} not found`);
      return fetchFromEtherFiAPI(vaultId, vault, vault.links.yield);
    },
    fetchFromVedaAPI: (vaultId: number) => {
      const vault = ETHERFI_VAULTS[vaultId];
      if (!vault) throw new Error(`Vault ${vaultId} not found`);
      return fetchFromVedaAPI(vaultId, vault, vault.links.yield);
    },
  };
}

// Legacy function names for backward compatibility
export const queryAllVaultsAPY = fetchAllVaultsAPY;
export const queryVaultAPY = fetchVaultAPY;
