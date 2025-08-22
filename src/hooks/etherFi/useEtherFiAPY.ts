import {
  fetchVaultAPY,
  fetchAllVaultsAPY,
  fetchFromSevenSeasAPI,
  fetchFromEtherFiAPI,
  fetchFromVedaAPI,
} from "@/utils/etherFi/apy";
import { ETHERFI_VAULTS } from "@/config/etherFi";

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
