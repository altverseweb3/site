import { useState, useEffect } from "react";
import { ETHERFI_VAULTS, DEPOSIT_ASSETS } from "@/config/etherFi";
import { EarnTableRow, DashboardTableRow } from "@/types/earn";
import { fetchVaultTVLPublic } from "@/utils/etherFi/fetch";
import { fetchAssetPrice } from "@/utils/etherFi/prices";
import { queryAllVaultsAPY, VaultApyData } from "@/utils/etherFi/apy";
import { chains } from "@/config/chains";
import EtherFiModal from "@/components/ui/earning/EtherFiModal";

export interface EtherFiEarnData {
  earnRows: EarnTableRow[];
  dashboardRows: DashboardTableRow[];
}

// Hook-based function for component use
export function useEtherFiEarnData(isWalletConnected: boolean) {
  const [data, setData] = useState<EtherFiEarnData>({
    earnRows: [],
    dashboardRows: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async (): Promise<void> => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const earnRows: EarnTableRow[] = [];
        const dashboardRows: DashboardTableRow[] = [];

        // Fetch APY data for all vaults first
        const apyData = await queryAllVaultsAPY().catch(
          () => [] as VaultApyData[],
        );

        // Create a map of vault address to APY data for quick lookup
        const apyMap = new Map<string, VaultApyData>();
        apyData.forEach((data) => {
          apyMap.set(data.address.toLowerCase(), data);
        });

        // Fetch all vault data in parallel for speed
        const vaultEntries = Object.entries(ETHERFI_VAULTS);

        // Create parallel promises for all vault data
        const vaultPromises = vaultEntries.map(async ([vaultIdStr, vault]) => {
          const vaultId = parseInt(vaultIdStr);

          try {
            // Get APY from our API data (which includes fallback values if needed)
            const vaultApyData = apyMap.get(
              vault.addresses.vault.toLowerCase(),
            );
            const apy = vaultApyData?.net_apy
              ? vaultApyData.net_apy * 100 // Convert from decimal to percentage
              : 0; // Default to 0 if no APY data available

            // Fetch TVL and price in parallel
            const [tvlData, firstAssetPrice] = await Promise.all([
              fetchVaultTVLPublic(vaultId).catch(() => null),
              vault.supportedAssets.deposit[0]
                ? fetchAssetPrice(
                    vault.supportedAssets.deposit[0].toLowerCase(),
                  ).catch(() => 1)
                : Promise.resolve(1),
            ]);

            // Calculate TVL value
            let tvlValue = 0;
            if (tvlData && firstAssetPrice) {
              const totalSupplyInTokens = parseFloat(tvlData.tvl);
              tvlValue = totalSupplyInTokens * firstAssetPrice;
            }

            const earnRow: EarnTableRow = {
              id: vaultId,
              protocol: vault.ecosystem,
              protocolIcon: "/images/etherFi/vaults/ethfi.svg",
              marketVault: vault.name,
              marketVaultIcon: vault.vaultIcon,
              assets: vault.supportedAssets.deposit,
              assetIcons: vault.supportedAssets.deposit.map(getAssetIcon),
              supportedChains: [vault.chain],
              supportedChainIcons: [
                chains[vault.chain]?.icon || chains.ethereum.icon,
              ],
              tvl: tvlValue,
              apy: apy,
              details: vault,
            };

            return earnRow;
          } catch (error) {
            console.error(`Error processing vault ${vaultId}:`, error);
            return null;
          }
        });

        // Wait for all vault data to complete
        const vaultResults = await Promise.all(vaultPromises);
        earnRows.push(
          ...(vaultResults.filter((row) => row !== null) as EarnTableRow[]),
        );

        if (isMounted) {
          setData({
            earnRows,
            dashboardRows,
          });
        }
      } catch (error) {
        console.error("Error fetching etherFi earn data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isWalletConnected]);

  return { data, loading };
}

function getAssetIcon(assetSymbol: string): string {
  const lowerSymbol = assetSymbol.toLowerCase();
  const asset = DEPOSIT_ASSETS[lowerSymbol];
  return asset?.imagePath || "/images/etherFi/ethereum-assets/eth.png";
}

export function filterEarnData(
  data: EtherFiEarnData,
  filters: {
    chains: string[];
    protocols: string[];
    assetFilter: string;
  },
): EtherFiEarnData {
  const filteredEarnRows = data.earnRows.filter((row) => {
    // Filter by chains - if specific chains are selected, only show rows that match
    // Empty chains array means show all chains
    if (
      filters.chains.length > 0 &&
      !row.supportedChains.some((chain) => filters.chains.includes(chain))
    ) {
      return false;
    }

    if (
      filters.protocols.length > 0 &&
      !filters.protocols.includes(row.protocol)
    ) {
      return false;
    }

    if (
      filters.assetFilter &&
      !row.assets.some((asset) =>
        asset.toLowerCase().includes(filters.assetFilter.toLowerCase()),
      )
    ) {
      return false;
    }

    return true;
  });

  const filteredDashboardRows = data.dashboardRows.filter((row) => {
    // Filter by chains - if specific chains are selected, only show rows that match
    // Empty chains array means show all chains
    if (
      filters.chains.length > 0 &&
      !row.supportedChains.some((chain) => filters.chains.includes(chain))
    ) {
      return false;
    }

    if (
      filters.protocols.length > 0 &&
      !filters.protocols.includes(row.protocol)
    ) {
      return false;
    }

    if (
      filters.assetFilter &&
      !row.assets.some((asset) =>
        asset.toLowerCase().includes(filters.assetFilter.toLowerCase()),
      )
    ) {
      return false;
    }

    return true;
  });

  return {
    earnRows: filteredEarnRows,
    dashboardRows: filteredDashboardRows,
  };
}

// Export the modal component for this protocol
export { EtherFiModal as ProtocolModal };
