// apyFetch.mjs
// This module queries both Seven Seas Capital API and ether.fi website for APY information
// Using Promise.all for concurrent requests

// Export the main function for use in API routes
export { queryAllVaults };

// Define vault addresses and their data sources
const vaults = [
    {
      name: 'Liquid ETH Yield',
      address: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C',
      source: 'sevenseas-api',
    },
    {
      name: 'Liquid BTC Yield',
      address: '0x5f46d540b6eD704C3c8789105F30E075AA900726',
      source: 'sevenseas-api',
    },
    {
      name: 'Market-Neutral USD',
      address: '0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C',
      source: 'sevenseas-api',
    },
    {
      name: 'EIGEN Restaking',
      address: '0xE77076518A813616315EaAba6cA8e595E845EeE9',
      source: 'sevenseas-api',
      path: 'eigen-restaking'
    },
    {
      name: 'UltraYield Stablecoin Vault',
      address: '0xbc0f3B23930fff9f4894914bD745ABAbA9588265',
      source: 'sevenseas-api',
    },
    {
      name: 'Liquid Move ETH',
      address: '0xca8711dAF13D852ED2121E4bE3894Dae366039E4',
      source: 'etherfi-website',
      path: 'move-eth'
    },
    {
      name: 'The Bera ETH Vault',
      address: '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410',
      source: 'etherfi-website',
      path: 'bera-eth'
    }
  ];
  
  // Base URLs for different data sources
  const sevenSeasBaseUrl = 'https://api.sevenseas.capital/etherfi/ethereum/performance';
  const sevenSeasQueryParams = '?&aggregation_period=14';
  const etherfiBaseUrl = 'https://www.ether.fi/_next/data/vc-ap-neobank-dapp-uDwLY9dHYesAmUW8-RRiR/app/liquid';
  
  // Function to fetch APY data from Seven Seas API
  async function fetchSevenSeasAPY(vault) {
    const url = `${sevenSeasBaseUrl}/${vault.address}${sevenSeasQueryParams}`;
    
    try {
      // Removed console.log to reduce terminal output
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract relevant APY information
      return {
        name: vault.name,
        address: vault.address,
        source: 'Seven Seas API',
        overall_apy: data.Response?.apy,
        fee: data.Response?.fees,
        net_apy: data.Response?.apy - data.Response?.fees,
        timestamp: data.Response?.timestamp
      };
    } catch (error) {
      console.error(`Error fetching data for ${vault.name} from Seven Seas API:`, error);
      return {
        name: vault.name,
        address: vault.address,
        source: 'Seven Seas API',
        error: error.message
      };
    }
  }
  
  // Function to fetch APY data from ether.fi website
  async function fetchEtherfiWebsiteAPY(vault) {
    // Make sure we have a path
    if (!vault.path) {
      console.error(`No path specified for ${vault.name} from ether.fi website`);
      return {
        name: vault.name,
        address: vault.address,
        source: 'ether.fi Website',
        error: 'Missing path parameter'
      };
    }
    
    const url = `${etherfiBaseUrl}/${vault.path}.json?liquid=${vault.path}`;
    
    try {
      console.log(`Fetching APY data for ${vault.name} from ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract APY information from ether.fi website JSON
      // The format differs from Seven Seas API
      const vaultData = data.pageProps?.vault;
      
      let apyValue = null;
      let feeValue = 0;
      
      // Extract APY value, which could be in different formats
      if (vaultData?.apy) {
        if (vaultData.apy.hardcodedApy) {
          // If APY is hardcoded (e.g., "11%")
          const hardcodedApy = vaultData.apy.hardcodedApy;
          apyValue = parseFloat(hardcodedApy) / 100;
        } else if (typeof vaultData.apy.apy === 'number') {
          apyValue = vaultData.apy.apy;
        }
      }
      
      // Extract fee if available
      if (vaultData?.details?.platformFee) {
        feeValue = vaultData.details.platformFee / 100; // Convert percentage to decimal
      }
      
      // Calculate net APY if both values are available
      const netApy = (apyValue !== null && feeValue !== null) ? apyValue - feeValue : null;
      
      return {
        name: vault.name,
        address: vault.address,
        source: 'ether.fi Website',
        overall_apy: apyValue,
        fee: feeValue,
        net_apy: netApy,
        deposit_disabled: vaultData?.depositDisabled || false,
        withdraw_disabled: vaultData?.withdrawDetails?.withdrawalDisabled || false
      };
    } catch (error) {
      console.error(`Error fetching data for ${vault.name} from ether.fi website:`, error);
      return {
        name: vault.name,
        address: vault.address,
        source: 'ether.fi Website',
        error: error.message
      };
    }
  }
  
  // Function to fetch the Bera ETH vault data from Veda API
  async function fetchBeraETHVault(vault) {
    const specificUrl = 'https://app.veda.tech/api/individual-vault-metadata?chainId=1&vaultAddress=0x83599937c2C9bEA0E0E8ac096c6f32e86486b410&daysLookback=14&getAllChains=false';
    
    try {
      console.log(`Fetching Bera ETH APY data from ${specificUrl}`);
      const response = await fetch(specificUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let apyValue = null;
      let feeValue = 0;
      
      // Log first part of the response
      console.log("Bera ETH API response first 500 chars:", JSON.stringify(data).substring(0, 500) + "...");
      
      // The API returns apy in the dailyApys array with most recent first
      if (data && data.dailyApys && data.dailyApys.length > 0) {
        // Get the most recent APY value (first in the array)
        apyValue = data.dailyApys[0].apy;
        console.log(`Found Bera ETH APY in dailyApys[0]: ${apyValue}`);
        
        // The API returns APY as a percentage already (e.g., 1.738... means 1.738%)
        // But our system expects decimal (0.01738), so we need to convert
        if (apyValue > 0) {
          // Convert from percentage to decimal
          apyValue = apyValue / 100;
          console.log(`Converted Bera ETH APY to decimal: ${apyValue}`);
        }
      }
      
      // For Bera Vault, either take fee from API or use standard value
      // We only take the fee from the API if available
      if (data.fee !== undefined) {
        feeValue = data.fee;
        console.log(`Found Bera ETH fee in API: ${feeValue}`);
      } else {
        // No fee in API response, using zero to avoid hardcoding
        feeValue = 0;
        console.log(`No fee found in API for Bera ETH, using 0`);
      }
      
      // Calculate net APY
      const netApy = apyValue - feeValue;
      
      return {
        name: vault.name,
        address: vault.address,
        source: 'Veda API (Bera ETH)',
        overall_apy: apyValue,
        fee: feeValue,
        net_apy: netApy
      };
    } catch (error) {
      console.error(`Error fetching Bera ETH data:`, error);
      return {
        name: vault.name,
        address: vault.address,
        source: 'Veda API (Bera ETH)',
        error: error.message
      };
    }
  }

// Function to fetch the specific move-eth data from the correct build ID URL
  async function fetchSpecificMoveETH(vault) {
    const specificUrl = 'https://www.ether.fi/_next/data/vc-ap-neobank-dapp-u_z6eFw44IA5qcDBgGE1I/app/liquid/move-eth.json?liquid=move-eth';
    
    try {
      console.log(`Fetching special Move ETH APY data from ${specificUrl}`);
      const response = await fetch(specificUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Log full response for debugging
      console.log("Move ETH API full response (first 500 chars):", JSON.stringify(data).substring(0, 500) + "...");
      
      // Extract the hardcoded APY
      const vaultData = data.pageProps?.vault;
      console.log("Move ETH vault data:", JSON.stringify(vaultData?.apy || {}));
      
      let apyValue = null;
      let feeValue = 0;
      
      // Extract APY value, which should be in the hardcodedApy field
      if (vaultData?.apy?.hardcodedApy) {
        // Convert percentage string (e.g. "11%") to decimal (0.11)
        const hardcodedApy = vaultData.apy.hardcodedApy;
        apyValue = parseFloat(hardcodedApy) / 100;
        console.log(`Found hardcoded APY value: ${hardcodedApy} -> ${apyValue}`);
      }
      
      // Liquid Move ETH is fee-free, so no fee calculation needed
      feeValue = 0;
      
      // For fee-free vault, net APY equals overall APY
      const netApy = apyValue;
      
      return {
        name: vault.name,
        address: vault.address,
        source: 'ether.fi Website (Move ETH)',
        overall_apy: apyValue,
        fee: feeValue,
        net_apy: netApy
      };
    } catch (error) {
      console.error(`Error fetching specific Move ETH data:`, error);
      return {
        name: vault.name,
        address: vault.address,
        source: 'ether.fi Website (Move ETH)',
        error: error.message
      };
    }
  }

// Function to fetch data for a single vault based on its source
  function fetchVaultData(vault) {
    if (vault.address === '0xca8711dAF13D852ED2121E4bE3894Dae366039E4') {
      // Special case for Liquid Move ETH vault
      return fetchSpecificMoveETH(vault);
    } else if (vault.address === '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410') {
      // Special case for Bera ETH vault
      return fetchBeraETHVault(vault);
    } else if (vault.source === 'sevenseas-api') {
      return fetchSevenSeasAPY(vault);
    } else if (vault.source === 'etherfi-website') {
      return fetchEtherfiWebsiteAPY(vault);
    } else {
      return Promise.resolve({
        name: vault.name,
        address: vault.address,
        error: 'Unknown data source'
      });
    }
  }
  
  // Main function to query all vaults concurrently using Promise.all
  async function queryAllVaults() {
    // Removed console.log
    
    try {
      // Create an array of promises for all vault queries
      const promises = vaults.map(vault => fetchVaultData(vault));
      
      // Execute all promises concurrently
      const results = await Promise.all(promises);
      
      // Removed console logging of results and tables
      
      return results;
    } catch (error) {
      console.error('An error occurred while querying vaults:', error);
      throw error;
    }
  }
  
  // Commented out direct execution for module import
  // If you want to run this script directly, uncomment below
  /*
  console.time('Total execution time');
  queryAllVaults()
    .then(() => {
      console.timeEnd('Total execution time');
    })
    .catch(error => {
      console.error('Fatal error:', error);
      console.timeEnd('Total execution time');
    });
  */