import { useState, useEffect } from "react";
import { ETHERFI_VAULTS, DEPOSIT_ASSETS } from "@/config/etherFi";
import { EarnTableRow, DashboardTableRow } from "@/types/earn";
import {
  fetchVaultTVLPublic,
  getUserVaultBalance,
} from "@/utils/etherFi/fetch";
import { fetchAssetPrice } from "@/utils/etherFi/prices";
import { queryAllVaultsAPY, VaultApyData } from "@/utils/etherFi/apy";
import { chains } from "@/config/chains";
import { createEthersJsonRpcProviderFromUrls } from "@/utils/wallet/ethersJsonRpcProvider";
import { useWalletByType } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import EtherFiModal from "@/components/ui/earn/EtherFiModal";

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
  const [userPositionsLoading, setUserPositionsLoading] = useState(false);
  const evmWallet = useWalletByType(WalletType.EVM);

  // Effect 1: Fetch vault data (independent of wallet connection)
  useEffect(() => {
    let isMounted = true;

    const fetchVaultData = async (): Promise<void> => {
      if (!isMounted) return;
      setLoading(true);

      try {
        const earnRows: EarnTableRow[] = [];

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
        const sharedProvider = createEthersJsonRpcProviderFromUrls(
          chains.ethereum.rpcUrls || [],
        );

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
              fetchVaultTVLPublic(vaultId, sharedProvider).catch(() => null),
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
          setData((prevData) => ({
            ...prevData,
            earnRows,
          }));
        }
      } catch (error) {
        console.error("Error fetching etherFi vault data:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVaultData();

    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  // Effect 2: Fetch user positions (only when wallet connects/changes)
  useEffect(() => {
    let isMounted = true;

    const fetchUserPositions = async (): Promise<void> => {
      if (!isMounted || !isWalletConnected || !evmWallet?.address) {
        // Clear dashboard rows if wallet disconnected
        if (isMounted) {
          setData((prevData) => ({
            ...prevData,
            dashboardRows: [],
          }));
        }
        return;
      }

      setUserPositionsLoading(true);

      try {
        const dashboardRows: DashboardTableRow[] = [];
        if (isWalletConnected && evmWallet?.address) {
          const provider = createEthersJsonRpcProviderFromUrls(
            chains.ethereum.rpcUrls || [],
          );
          const vaultEntries = Object.entries(ETHERFI_VAULTS);

          // Create parallel promises for all user vault positions
          const userPositionPromises = vaultEntries.map(
            async ([vaultIdStr]) => {
              const vaultId = parseInt(vaultIdStr);

              try {
                const userBalance = await getUserVaultBalance(
                  vaultId,
                  evmWallet.address,
                  provider,
                );

                // Only include positions with non-zero balance
                if (parseFloat(userBalance.formatted) > 0) {
                  // Find the corresponding earn row for vault details
                  const earnRow = data.earnRows.find(
                    (row) => row.id === vaultId,
                  );
                  if (earnRow) {
                    // Calculate USD value of the position
                    const vault = ETHERFI_VAULTS[vaultId];
                    let balanceUsd = 0;

                    if (vault?.supportedAssets.deposit[0]) {
                      try {
                        const assetPrice = await fetchAssetPrice(
                          vault.supportedAssets.deposit[0].toLowerCase(),
                        ).catch(() => 1);
                        balanceUsd =
                          parseFloat(userBalance.formatted) * assetPrice;
                      } catch (error) {
                        console.error(
                          `Error fetching price for vault ${vaultId}:`,
                          error,
                        );
                      }
                    }

                    const dashboardRow: DashboardTableRow = {
                      id: earnRow.id,
                      protocol: earnRow.protocol,
                      protocolIcon: earnRow.protocolIcon,
                      marketVault: earnRow.marketVault,
                      marketVaultIcon: earnRow.marketVaultIcon,
                      assets: earnRow.assets,
                      assetIcons: earnRow.assetIcons,
                      supportedChains: earnRow.supportedChains,
                      supportedChainIcons: earnRow.supportedChainIcons,
                      apy: earnRow.apy,
                      position: userBalance.formatted,
                      balance: parseFloat(userBalance.formatted),
                      balanceUsd: balanceUsd,
                      details: earnRow.details,
                    };

                    return dashboardRow;
                  }
                }
                return null;
              } catch (error) {
                console.error(
                  `Error fetching user position for vault ${vaultId}:`,
                  error,
                );
                return null;
              }
            },
          );

          const userPositionResults = await Promise.all(userPositionPromises);
          dashboardRows.push(
            ...(userPositionResults.filter(
              (row) => row !== null,
            ) as DashboardTableRow[]),
          );
        }

        if (isMounted) {
          setData((prevData) => ({
            ...prevData,
            dashboardRows,
          }));
        }
      } catch (error) {
        console.error("Error fetching user positions:", error);
      } finally {
        if (isMounted) {
          setUserPositionsLoading(false);
        }
      }
    };

    // Only fetch user positions if we have earn rows already loaded
    if (data.earnRows.length > 0) {
      fetchUserPositions();
    }

    return () => {
      isMounted = false;
    };
  }, [isWalletConnected, evmWallet?.address, data.earnRows]);

  return {
    data,
    loading: loading, // Only vault data loading
    userPositionsLoading, // Separate loading state for user positions
  };
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
