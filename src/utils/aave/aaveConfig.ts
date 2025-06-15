// Aave protocol configuration for supported chains
export type SupportedChainId = 1 | 137 | 42161 | 10 | 43114 | 8453;

export interface ChainConfig {
  poolAddress: string;
  dataProviderAddress: string;
  uiDataProviderAddress?: string;
  addressesProviderAddress: string;
  wethGatewayAddress?: string;
}

export class AaveConfig {
  private static readonly chainConfigs: Record<SupportedChainId, ChainConfig> =
    {
      // Ethereum Mainnet
      1: {
        poolAddress: "0x87870Bce3F2c9c4c2Bb83B4e6Dd0d2d0",
        dataProviderAddress: "0x7B4EB56E7CD4b454BA8ff71E4518426369a138a3",
        uiDataProviderAddress: "0x91c0eA31b49B69Ea18607702c5d9C1e1e5b9c4D8",
        addressesProviderAddress: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94D4a",
        wethGatewayAddress: "0x893411580e590D62dDBca8a703d61Cc4A8c7b2b9",
      },
      // Polygon
      137: {
        poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProviderAddress: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
        uiDataProviderAddress: "0xC69728f11E9E6127733751c8410432913123acf1",
        addressesProviderAddress: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
        wethGatewayAddress: "0x1e4b7A6b903680eab0c5dAbcb8fD429cD2a9598c",
      },
      // Arbitrum
      42161: {
        poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProviderAddress: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
        uiDataProviderAddress: "0x6b2e59b8EbE61B5ee0EF30021b7740C63F597654",
        addressesProviderAddress: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
        wethGatewayAddress: "0xB5Ee21786D28c5Ba61661550879475976B707099",
      },
      // Optimism
      10: {
        poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProviderAddress: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
        uiDataProviderAddress: "0x6b2e59b8EbE61B5ee0EF30021b7740C63F597654",
        addressesProviderAddress: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
        wethGatewayAddress: "0x76D3030728e52DEB8848d5613aBaDE88441cbc59",
      },
      // Avalanche
      43114: {
        poolAddress: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
        dataProviderAddress: "0x69FA688f1Dc47d4B5d8029D5a35FB7a548310654",
        uiDataProviderAddress: "0x50ddd0Cd4266299527d25De9CBb55fE0EB8dAc30",
        addressesProviderAddress: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
        wethGatewayAddress: "0x6F143FE2F7B02424ad3CaD1593D6f36c0Aab69d7",
      },
      // Base
      8453: {
        poolAddress: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
        dataProviderAddress: "0x2d8A3C5677189723C4cB8873CfC9C8976FDF38Ac",
        uiDataProviderAddress: "0x174446a6741300cD2E7C1b1A636Fee99c8F83502",
        addressesProviderAddress: "0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D",
        wethGatewayAddress: "0x8be473dCfA93132658821E67CbEB684ec8Ea2E74",
      },
    };

  static isChainSupported(chainId: number): chainId is SupportedChainId {
    return chainId in this.chainConfigs;
  }

  static getPoolAddress(chainId: SupportedChainId): string {
    return this.chainConfigs[chainId].poolAddress;
  }

  static getDataProviderAddress(chainId: SupportedChainId): string {
    return this.chainConfigs[chainId].dataProviderAddress;
  }

  static getUiDataProviderAddress(
    chainId: SupportedChainId,
  ): string | undefined {
    return this.chainConfigs[chainId].uiDataProviderAddress;
  }

  static getAddressesProviderAddress(chainId: SupportedChainId): string {
    return this.chainConfigs[chainId].addressesProviderAddress;
  }

  static getWethGatewayAddress(chainId: SupportedChainId): string | undefined {
    return this.chainConfigs[chainId].wethGatewayAddress;
  }

  static getChainConfig(chainId: SupportedChainId): ChainConfig {
    return this.chainConfigs[chainId];
  }

  static getAllSupportedChains(): SupportedChainId[] {
    return Object.keys(this.chainConfigs).map(Number) as SupportedChainId[];
  }
}
