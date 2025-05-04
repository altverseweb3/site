// pricequery.mjs
// This module fetches price data for multiple tokens from the ether.fi API

// Export the main function for use in API routes
export { fetchAllTokenPrices };

// Define the tokens to fetch prices for
const tokens = [
    { symbol: 'wETH', apiPath: 'weth' },
    { symbol: 'wBTC', apiPath: 'wbtc' },
    { symbol: 'USDC', apiPath: 'usdc' },
    { symbol: 'EIGEN', apiPath: 'eigen' },
    // Add fallbacks with case variations to handle potential mismatches
    { symbol: 'ETH', apiPath: 'weth' },
    { symbol: 'BTC', apiPath: 'wbtc' },
    { symbol: 'USD', apiPath: 'usdc' }
  ];
  
  // Base URL for the API
  const baseUrl = 'https://www.ether.fi/api/dapp/pricing';
  
  // Function to fetch price data for a single token
  async function fetchTokenPrice(token) {
    const url = `${baseUrl}/${token.apiPath}`;
    
    try {
      // Removed console.log
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        symbol: token.symbol,
        price_usd: data.price_usd,
        total_supply: data.total_supply,
        usd_market_cap: data.usd_market_cap,
        timestamp: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error(`Error fetching data for ${token.symbol}:`, error);
      return {
        symbol: token.symbol,
        error: error.message,
        success: false
      };
    }
  }
  
  // Main function to fetch prices for all tokens concurrently
  async function fetchAllTokenPrices() {
    // Removed console.log
    
    try {
      // Create an array of promises for all token price queries
      const promises = tokens.map(token => fetchTokenPrice(token));
      
      // Execute all promises concurrently
      const results = await Promise.all(promises);
      
      // Convert results to a more usable object with symbols as keys
      const priceData = {};
      results.forEach(result => {
        priceData[result.symbol] = result;
      });
      
      // Removed console logging of results and tables
      
      // Save to a file if needed
      // await writeFile('token-prices.json', JSON.stringify(priceData, null, 2));
      
      return priceData;
    } catch (error) {
      console.error('An error occurred while fetching token prices:', error);
      throw error;
    }
  }
  
  // Comment out direct execution for module import
  // If you want to run this script directly, uncomment the below section
  /*
  console.time('Total execution time');
  fetchAllTokenPrices()
    .then(data => {
      console.log('\nToken price data object:');
      console.log(data);
      console.timeEnd('Total execution time');
    })
    .catch(error => {
      console.error('Fatal error:', error);
      console.timeEnd('Total execution time');
    });
  */