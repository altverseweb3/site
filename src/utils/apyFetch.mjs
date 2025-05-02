// apyFetch.mjs
// This module queries both Seven Seas Capital API and ether.fi website for APY information
// Using Promise.all for concurrent requests

// Export the main function for use in API routes
export { queryAllVaults };

// Define vault addresses and their data sources
const vaults = [
    {
      name: 'Liquid ETH',
      address: '0xf0bb20865277aBd641a307eCe5Ee04E79073416C',
      source: 'sevenseas-api'
    },
    {
      name: 'The Bera ETH Vault',
      address: '0x83599937c2C9bEA0E0E8ac096c6f32e86486b410',
      source: 'etherfi-website',
      path: 'bera-eth'
    },
    {
      name: 'Liquid BTC',
      address: '0x5f46d540b6eD704C3c8789105F30E075AA900726',
      source: 'sevenseas-api'
    },
    {
      name: 'Liquid USD',
      address: '0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C',
      source: 'sevenseas-api'
    },
    {
      name: 'Liquid Move ETH',
      address: '0xca8711dAF13D852ED2121E4bE3894Dae366039E4',
      source: 'etherfi-website',
      path: 'move-eth'
    },
    {
      name: 'Ultra Yield Stablecoin Vault',
      address: '0xbc0f3B23930fff9f4894914bD745ABAbA9588265',
      source: 'sevenseas-api'
    },
    {
      name: 'Elixir Stable Vault',
      address: '0x352180974C71f84a934953Cf49C4E538a6F9c997',
      source: 'sevenseas-api'
    },
    {
      name: 'Usual Stable Vault',
      address: '0xeDa663610638E6557c27e2f4e973D3393e844E70',
      source: 'sevenseas-api'
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
    const url = `${etherfiBaseUrl}/${vault.path}.json?liquid=${vault.path}`;
    
    try {
      // Removed console.log to reduce terminal output
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
  
  // Function to fetch data for a single vault based on its source
  function fetchVaultData(vault) {
    if (vault.source === 'sevenseas-api') {
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