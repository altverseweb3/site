// This module provides access to the TVL data from getVaultTVL.mjs
// It imports getVaultTVL.mjs to get the data

// Import the getVaultTVL module
import { getVaultTVLData } from './getVaultTVL.mjs';

// Define mappings for vault IDs to addresses
const VAULT_ID_TO_ADDRESS = {
  1: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C', // Liquid ETH Yield
  2: '0x5f46d540b6eD704C3c8789105F30E075AA900726', // Liquid BTC Yield
  3: '0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C', // Market-Neutral USD
  4: '0xE77076518A813616315EaAba6cA8e595E845EeE9', // EIGEN Restaking
  5: '0xbc0f3B23930fff9f4894914bD745ABAbA9588265', // UltraYield Stablecoin Vault
  6: '0xca8711dAF13D852ED2121E4bE3894Dae366039E4', // Liquid Move ETH
  7: '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410' // The Bera ETH Vault 
};

// Module-level cache to prevent duplicate fetches
let tvlDataCache = null;

// Function to get TVL by vault ID
async function getTVLByVaultId(vaultId) {
  try {
    // Get the TVL data (now using async/await since getVaultTVLData is async)
    if (!tvlDataCache) {
      tvlDataCache = await getVaultTVLData();
    }
    
    const address = VAULT_ID_TO_ADDRESS[vaultId];
    
    if (!address) {
      return null;
    }
    
    // Look through tvlDataCache for matching address
    for (const symbol in tvlDataCache) {
      if (tvlDataCache[symbol].address.toLowerCase() === address.toLowerCase()) {
        return tvlDataCache[symbol].tvl;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error getting TVL for vault ${vaultId}:`, error);
    return null;
  }
}

// Function to invalidate the cache
function invalidateTVLCache() {
  tvlDataCache = null;
  // Removed console.log
}

// Export functions and data
export { getTVLByVaultId, VAULT_ID_TO_ADDRESS, invalidateTVLCache };
export async function allTVLData() {
  if (!tvlDataCache) {
    tvlDataCache = await getVaultTVLData();
  }
  return tvlDataCache;
}