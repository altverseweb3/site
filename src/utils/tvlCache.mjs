// This module provides access to the TVL data from getVaultTVL.mjs
// It imports getVaultTVL.mjs to get the data

// Import the getVaultTVL module
import { getVaultTVLData } from './getVaultTVL.mjs';

// Define mappings for vault IDs to addresses
const VAULT_ID_TO_ADDRESS = {
  1: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C', // Liquid ETH
  2: '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410', // The Bera ETH Vault 
  3: '0x5f46d540b6eD704C3c8789105F30E075AA900726', // Liquid BTC
  4: '0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C', // Liquid USD
  5: '0xca8711dAF13D852ED2121E4bE3894Dae366039E4', // Liquid Move ETH
  6: '0xbc0f3B23930fff9f4894914bD745ABAbA9588265', // Ultra Yield Stablecoin Vault
  7: '0x352180974C71f84a934953Cf49C4E538a6F9c997', // Elixir Stable Vault
  8: '0xeDa663610638E6557c27e2f4e973D3393e844E70'  // Usual Stable Vault
};

// Function to get TVL by vault ID
function getTVLByVaultId(vaultId) {
  try {
    // Get the TVL data
    const tvlData = getVaultTVLData();
    const address = VAULT_ID_TO_ADDRESS[vaultId];
    
    if (!address) {
      return null;
    }
    
    // Look through tvlData for matching address
    for (const symbol in tvlData) {
      if (tvlData[symbol].address.toLowerCase() === address.toLowerCase()) {
        return tvlData[symbol].tvl;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting TVL for vault ${vaultId}:`, error);
    return null;
  }
}

// Export functions and data
export { getTVLByVaultId };
export function allTVLData() {
  return getVaultTVLData();
}