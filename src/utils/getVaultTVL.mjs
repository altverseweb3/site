// getVaultTVL.js
// A script that queries vault TVL data in parallel using Promise.all
// Usage: just run:
//    node getVaultTVL.js

import { ethers } from 'ethers';
import { setTimeout } from 'timers/promises';

// Configuration
const RPC_URL = 'https://mainnet.infura.io/v3/049bdd15053e47b29fa15e2cc4c6abe2';

// Vault addresses - lowercase to avoid checksum issues
const vaults = [
  {
    address: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C',
    protocol: 'Ether.fi',
    name: 'Liquid ETH',
    expectedSymbol: 'wETH'
  },
  {
    address: '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410',
    protocol: 'Ether.fi',
    name: 'The Bera ETH Vault',
    expectedSymbol: 'wETH'
  },
  {
    address: '0x5f46d540b6eD704C3c8789105F30E075AA900726',
    protocol: 'Ether.fi',
    name: 'Liquid BTC',
    expectedSymbol: 'wBTC'
  },
  {
    address: '0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C',
    protocol: 'Ether.fi',
    name: 'Liquid USD',
    expectedSymbol: 'USDC'
  },
  {
    address: '0xca8711dAF13D852ED2121E4bE3894Dae366039E4',
    protocol: 'Ether.fi',
    name: 'Liquid Move ETH',
    expectedSymbol: 'wETH'
  },
  {
    address: '0xbc0f3B23930fff9f4894914bD745ABAbA9588265',
    protocol: 'Ether.fi',
    name: 'Ultra Yield Stablecoin Vault',
    expectedSymbol: 'USDC'
  },
  {
    address: '0x352180974C71f84a934953Cf49C4E538a6F9c997',
    protocol: 'Ether.fi',
    name: 'Elixir Stable Vault',
    expectedSymbol: 'deUSD'
  },
  {
    address: '0xeDa663610638E6557c27e2f4e973D3393e844E70',
    protocol: 'Ether.fi',
    name: 'Usual Stable Vault',
    expectedSymbol: 'USD0'
  }
];

// Standard ERC20 ABI for totalSupply and other basic functions
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

// Helper function to retry a promise with exponential backoff
async function retry(fn, retries = 3, delay = 1000, backoff = 2) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    
    await setTimeout(delay);
    return retry(fn, retries - 1, delay * backoff, backoff);
  }
}

// Function to query vault TVL data
async function queryVaultTVL(provider, vault) {
  try {
    // Removed console.log
    const contract = new ethers.Contract(vault.address, ERC20_ABI, provider);
    
    // Get token information
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      retry(() => contract.name()),
      retry(() => contract.symbol()),
      retry(() => contract.decimals()),
      retry(() => contract.totalSupply())
    ]);
    
    const formattedSupply = ethers.formatUnits(totalSupply, decimals);
    
    return {
      address: vault.address,
      protocol: vault.protocol,
      name,
      symbol,
      decimals,
      tvl: formattedSupply
    };
  } catch (error) {
    console.error(`Error querying vault ${vault.address}:`, error.message);
    return {
      address: vault.address,
      protocol: vault.protocol,
      name: vault.name,
      symbol: vault.expectedSymbol,
      tvl: '0',
      error: true
    };
  }
}

// Export data as JavaScript variables - function signature kept for API compatibility
function exportVaultData(/* vaultData */) {
  // All console logging removed
}

// Main function
async function main() {
  try {
    // Removed console.log
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(RPC_URL, 1); // 1 = Ethereum mainnet
    
    // Query all vaults simultaneously using Promise.all
    // Removed console.log
    const queryPromises = vaults.map(vault => queryVaultTVL(provider, vault));
    const results = await Promise.all(queryPromises);
    
    // Just export the data as variables
    exportVaultData(results);
    
    // Calculate total TVL is no longer needed since we removed the logging
    // results.reduce((sum, vault) => sum + parseFloat(vault.tvl || 0), 0);
    
    // Make the data available as a global variable
    global.vaultTVLData = {};
    results.forEach(vault => {
      const symbol = vault.symbol || vault.expectedSymbol;
      global.vaultTVLData[symbol] = {
        address: vault.address,
        protocol: vault.protocol,
        name: vault.name,
        tvl: vault.tvl,
        tvlNumber: parseFloat(vault.tvl)
      };
    });
  } catch (error) {
    console.error('Error executing query:', error);
    process.exit(1);
  }
}

// Handle direct execution vs module import
const isMainModule = process.argv[1]?.includes('getVaultTVL.js');
if (isMainModule) {
  main();
}

// Create a module-level cache that persists between API calls
let vaultTVLCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

// Export functions for use as a module
export {
  main as getVaultTVL,
  vaults
};

// Improved getVaultTVLData function with local caching
export async function getVaultTVLData() {
  const now = Date.now();
  
  // Use module-level cache instead of global
  if (vaultTVLCache && now - lastFetchTime < CACHE_TTL) {
    // Removed console.log
    return vaultTVLCache;
  }
  
  // If no cache or cache expired, fetch fresh data
  // Removed console.log
  
  try {
    // Run the main function to get fresh data
    await main();
    
    // Store the results in our module cache
    vaultTVLCache = global.vaultTVLData || {};
    lastFetchTime = now;
    
    return vaultTVLCache;
  } catch (error) {
    console.error("Error fetching TVL data:", error);
    
    // If we have old cache, return it even if expired
    if (vaultTVLCache) {
      console.log("Returning expired cache due to fetch error");
      return vaultTVLCache;
    }
    
    // Otherwise return empty object
    return {};
  }
}