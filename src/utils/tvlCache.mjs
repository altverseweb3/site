// This module provides access to the TVL data from getVaultTVL.mjs
// It imports and runs getVaultTVL.mjs to get the data

// Import the getVaultTVL module
import { getVaultTVL, getVaultTVLData } from './getVaultTVL.mjs';

// Run the getVaultTVL function to populate the data
getVaultTVL().then(() => {
  console.log('TVL data loaded successfully');
}).catch(error => {
  console.error('Error loading TVL data:', error);
});

// Define mapping for vault IDs
const VAULT_ID_MAP = {
  'liquidETH': 1,
  'liquidBeraETH': 2,
  'liquidBTC': 3, 
  'liquidUSD': 4,
  'liquidMoveETH': 5,
  'UltraUSD': 6,
  'liquidElixir': 7,
  'eUSD0++': 8
};

// Function to get TVL by vault ID
function getTVLByVaultId(vaultId) {
  try {
    // Get the TVL data
    const tvlData = getVaultTVLData();
    
    // Find the corresponding symbol for this vault ID
    const symbol = Object.keys(VAULT_ID_MAP).find(key => VAULT_ID_MAP[key] === vaultId);
    
    if (!symbol || !tvlData[symbol]) {
      return null;
    }
    
    return tvlData[symbol].tvl;
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