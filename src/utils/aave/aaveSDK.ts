import { SupportedChainId, ChainConfig, getAaveMarket } from "@/config/aave";

/**
 * SDK-based Aave configuration using official address book
 * Replaces hardcoded AaveConfig with dynamic address fetching
 */
export class AaveSDK {
  /**
   * Check if a chain is supported by Aave V3
   */
  static isChainSupported(chainId: number): chainId is SupportedChainId {
    const supportedChains: number[] = [
      1, 137, 42161, 10, 43114, 8453, 100, 56, 11155111,
    ];
    return supportedChains.includes(chainId);
  }

  /**
   * Get the Pool contract address for a chain
   */
  static getPoolAddress(chainId: SupportedChainId): string {
    const market = getAaveMarket(chainId);
    return market.POOL;
  }

  /**
   * Get the Protocol Data Provider address for a chain
   */
  static getDataProviderAddress(chainId: SupportedChainId): string {
    const market = getAaveMarket(chainId);
    return market.AAVE_PROTOCOL_DATA_PROVIDER;
  }

  /**
   * Get the UI Data Provider address for a chain (if available)
   */
  static getUiDataProviderAddress(
    chainId: SupportedChainId,
  ): string | undefined {
    const market = getAaveMarket(chainId);
    return market.UI_POOL_DATA_PROVIDER;
  }

  /**
   * Get the Pool Addresses Provider address for a chain
   */
  static getAddressesProviderAddress(chainId: SupportedChainId): string {
    const market = getAaveMarket(chainId);
    return market.POOL_ADDRESSES_PROVIDER;
  }

  /**
   * Get the WETH Gateway address for a chain (if available)
   */
  static getWethGatewayAddress(chainId: SupportedChainId): string | undefined {
    const market = getAaveMarket(chainId);
    return market.WETH_GATEWAY;
  }

  /**
   * Get the complete chain configuration
   */
  static getChainConfig(chainId: SupportedChainId): ChainConfig {
    const market = getAaveMarket(chainId);

    return {
      poolAddress: market.POOL,
      dataProviderAddress: market.AAVE_PROTOCOL_DATA_PROVIDER,
      uiDataProviderAddress: market.UI_POOL_DATA_PROVIDER,
      addressesProviderAddress: market.POOL_ADDRESSES_PROVIDER,
      wethGatewayAddress: market.WETH_GATEWAY,
    };
  }

  /**
   * Get all supported chain IDs
   */
  static getAllSupportedChains(): SupportedChainId[] {
    return [1, 137, 42161, 10, 43114, 8453, 100, 56, 11155111];
  }

  /**
   * Check if the chain supports a specific feature
   */
  static hasWethGateway(chainId: SupportedChainId): boolean {
    try {
      const wethGateway = this.getWethGatewayAddress(chainId);
      return !!wethGateway;
    } catch {
      return false;
    }
  }

  /**
   * Check if the chain has UI data provider
   */
  static hasUiDataProvider(chainId: SupportedChainId): boolean {
    try {
      const uiDataProvider = this.getUiDataProviderAddress(chainId);
      return !!uiDataProvider;
    } catch {
      return false;
    }
  }
}
