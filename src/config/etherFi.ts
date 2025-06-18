export interface EtherFiVault {
  id: number;
  name: string;
  description: string;
  ecosystem: string;
  type:
    | "Featured"
    | "Strategy Vault"
    | "Governance Restaking"
    | "Partner Vault";
  chain: "ethereum";

  // Contract addresses
  addresses: {
    vault: string;
    teller: string;
    accountant: string;
    lens: string; // Lens contract (same for all vaults)
  };

  // Supported assets for deposits
  supportedAssets: {
    deposit: string[]; // Assets that can be deposited
    receive: {
      // Token received from deposit
      name: string;
      symbol: string;
      imagePath?: string;
    };
  };

  // External links
  links: {
    explorer: string; // Etherscan link
    analytics: string; // EtherFi analytics page
    withdrawal: string; // Same as analytics for withdrawals
    yield: string; // Direct API URL for APY data
  };

  // Vault Icon for Table UI
  vaultIcon: string;
}

// Shared lens address for all vaults
const SHARED_LENS_ADDRESS = "0x5232bc0F5999f8dA604c42E1748A13a170F94A1B";

// Fallback APY values based on EtherFi website observations (as of current date)
// These should be updated periodically by checking the actual website
export const FALLBACK_APY_VALUES: Record<string, number> = {
  "0x83599937c2c9bea0e0e8ac096c6f32e86486b410": 3.2, // Bera ETH Vault (lowercase)
  "0xe77076518a813616315eaaba6ca8e595e845eee9": 3.0, // EIGEN Restaking (lowercase)
  "0x86b5780b606940eb59a062aa85a07959518c0161": 25.0, // ETHFI Restaking (lowercase)
  "0xca8711daf13d852ed2121e4be3894dae366039e4": 11.0, // Liquid Move ETH (lowercase)
};

// Deposit asset configuration for tokens with contract addresses
export interface DepositAsset {
  chain: string;
  contractAddress: string;
  decimals: number;
  imagePath: string;
  priceUrl?: string;
  stable: boolean;
}

// Complete EtherFi vaults configuration
export const ETHERFI_VAULTS: Record<number, EtherFiVault> = {
  1: {
    id: 1,
    name: "Liquid ETH Yield",
    description:
      "Liquid ETH vault provides staking rewards plus additional yield from ETH delegation strategies.",
    ecosystem: "Ether.fi",
    type: "Featured",
    chain: "ethereum",
    addresses: {
      vault: "0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      teller: "0x9AA79C84b79816ab920bBcE20f8f74557B514734",
      accountant: "0x0d05D94a5F1E76C18fbeB7A13d17C8a314088198",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH", "eETH", "weETH"],
      receive: {
        name: "liquidETH",
        symbol: "liquidETH",
        imagePath: "/images/etherFi/liquid.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      analytics: "https://www.ether.fi/app/liquid/eth",
      withdrawal: "https://www.ether.fi/app/liquid/eth",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/performance/0xf0bb20865277aBd641a307eCe5Ee04E79073416C?&aggregation_period=14",
    },
    vaultIcon: "/images/etherFi/vaults/liquideth.svg",
  },

  2: {
    id: 2,
    name: "Liquid BTC Yield",
    description:
      "Liquid BTC vault uses wrapped BTC to generate yield through lending and options strategies.",
    ecosystem: "Ether.fi",
    type: "Featured",
    chain: "ethereum",
    addresses: {
      vault: "0x5f46d540b6eD704C3c8789105F30E075AA900726",
      teller: "0x8Ea0B382D054dbEBeB1d0aE47ee4AC433C730353",
      accountant: "0xEa23aC6D7D11f6b181d6B98174D334478ADAe6b0",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["LBTC", "wBTC", "cbBTC", "eBTC"],
      receive: {
        name: "liquidBTC",
        symbol: "liquidBTC",
        imagePath: "/images/etherFi/liquid.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x5f46d540b6eD704C3c8789105F30E075AA900726",
      analytics: "https://www.ether.fi/app/liquid/btc",
      withdrawal: "https://www.ether.fi/app/liquid/btc",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/performance/0x5f46d540b6eD704C3c8789105F30E075AA900726?&aggregation_period=14",
    },
    vaultIcon: "/images/etherFi/vaults/liquidbtc.svg",
  },

  3: {
    id: 3,
    name: "Market-Neutral USD",
    description:
      "Market-Neutral USD vault focuses on stable returns using conservative stablecoin strategies.",
    ecosystem: "Ether.fi",
    type: "Strategy Vault",
    chain: "ethereum",
    addresses: {
      vault: "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      teller: "0x4DE413a26fC24c3FC27Cc983be70aA9c5C299387",
      accountant: "0xc315D6e14DDCDC7407784e2Caf815d131Bc1D3E7",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["USDC", "DAI", "USDT", "USDe", "deUSD", "sdeUSD"],
      receive: {
        name: "liquidUSD",
        symbol: "liquidUSD",
        imagePath: "/images/etherFi/liquid.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      analytics: "https://www.ether.fi/app/liquid/usd",
      withdrawal: "https://www.ether.fi/app/liquid/usd",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/performance/0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C?&aggregation_period=14",
    },
    vaultIcon: "/images/etherFi/vaults/usdc.svg",
  },

  4: {
    id: 4,
    name: "ETHFI Restaking",
    description:
      "ETHFI Restaking vault allows users to earn rewards by staking ETHFI tokens.",
    ecosystem: "Ether.fi",
    type: "Governance Restaking",
    chain: "ethereum",
    addresses: {
      vault: "0x86B5780b606940Eb59A062aA85a07959518c0161",
      teller: "0xe2acf9f80a2756E51D1e53F9f41583C84279Fb1f",
      accountant: "0x05A1552c5e18F5A0BB9571b5F2D6a4765ebdA32b",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["ETHFI"],
      receive: {
        name: "sETHFI",
        symbol: "sETHFI",
        imagePath: "/images/etherFi/sethfi.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x86B5780b606940Eb59A062aA85a07959518c0161",
      analytics: "https://www.ether.fi/app/ethfi",
      withdrawal: "https://www.ether.fi/app/ethfi",
      yield: "fallback", // Seven Seas API returns 400 error
    },
    vaultIcon: "/images/etherFi/vaults/ethfi.svg",
  },

  5: {
    id: 5,
    name: "EIGEN Restaking",
    description:
      "EIGEN Restaking vault allows users to earn rewards by staking EIGEN tokens.",
    ecosystem: "Ether.fi",
    type: "Governance Restaking",
    chain: "ethereum",
    addresses: {
      vault: "0xE77076518A813616315EaAba6cA8e595E845EeE9",
      teller: "0x63b2B0528376d1B34Ed8c9FF61Bd67ab2C8c2Bb0",
      accountant: "0x075e60550C6f77f430B284E76aF699bC31651f75",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["EIGEN"],
      receive: {
        name: "eEIGEN",
        symbol: "eEIGEN",
        imagePath: "/images/etherFi/ethereum-assets/eeigen.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0xE77076518A813616315EaAba6cA8e595E845EeE9",
      analytics: "https://www.ether.fi/app/eigen",
      withdrawal: "https://www.ether.fi/app/eigen",
      yield: "fallback", // EtherFi API doesn't return explicit APY
    },
    vaultIcon: "/images/etherFi/vaults/eigen.png",
  },

  6: {
    id: 6,
    name: "UltraYield Stablecoin Vault",
    description:
      "Ultra Yield Stablecoin Vault uses aggressive yet secure strategies to maximize stablecoin returns.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "ethereum",
    addresses: {
      vault: "0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      teller: "0xc8c58d1567e1db8c02542e6df5241A0d71f91Fe2",
      accountant: "0x95fE19b324bE69250138FE8EE50356e9f6d17Cfe",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["USDC", "DAI", "USDT"],
      receive: {
        name: "UltraUSD",
        symbol: "UltraUSD",
        imagePath: "/images/etherFi/liquid.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      analytics: "https://www.ether.fi/app/liquid/ultra-yield-stablecoin",
      withdrawal: "https://www.ether.fi/app/liquid/ultra-yield-stablecoin",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/performance/0xbc0f3B23930fff9f4894914bD745ABAbA9588265?&aggregation_period=14",
    },
    vaultIcon: "/images/etherFi/vaults/ultrayield-stablecoin.png",
  },

  7: {
    id: 7,
    name: "Liquid Move ETH",
    description:
      "Liquid Move ETH vault combines ETH staking with automated trading strategies.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "ethereum",
    addresses: {
      vault: "0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      teller: "0x63ede83cbB1c8D90bA52E9497e6C1226a673e884",
      accountant: "0xb53244f7716dC83811C8fB1a91971dC188C1C5aA",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH"],
      receive: {
        name: "LiquidMoveETH",
        symbol: "LiquidMoveETH",
        imagePath: "/images/etherFi/ethereum-assets/liquidmove.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      analytics: "https://www.ether.fi/app/liquid/move-eth",
      withdrawal: "https://www.ether.fi/app/liquid/move-eth",
      yield: "fallback", // EtherFi website shows hardcoded 11% APY
    },
    vaultIcon: "/images/etherFi/vaults/liquidmove.png",
  },

  8: {
    id: 8,
    name: "The Bera ETH Vault",
    description:
      "The Bera ETH Vault focuses on low-risk strategies with consistent returns for ETH holders.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "ethereum",
    addresses: {
      vault: "0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      teller: "0xCbc0D2838256919e55eB302Ce8c46d7eE0E9d807",
      accountant: "0x04B8136820598A4e50bEe21b8b6a23fE25Df9Bd8",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH", "eETH", "weETH", "stETH", "wstETH"],
      receive: {
        name: "BeraETH",
        symbol: "BeraETH",
        imagePath: "/images/etherFi/ethereum-assets/beraeth.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      analytics: "https://www.ether.fi/app/liquid/bera-eth",
      withdrawal: "https://www.ether.fi/app/liquid/bera-eth",
      yield: "fallback", // Veda API returns 0% APY
    },
    vaultIcon: "/images/etherFi/vaults/beraeth.svg",
  },

  9: {
    id: 9,
    name: "The Bera BTC Vault",
    description:
      "The Bera BTC Vault focuses on low-risk strategies with consistent returns for BTC holders.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "ethereum",
    addresses: {
      vault: "0xC673ef7791724f0dcca38adB47Fbb3AEF3DB6C80",
      teller: "0x07951756b68427e7554AB4c9091344cB8De1Ad5a",
      accountant: "0xF44BD12956a0a87c2C20113DdFe1537A442526B5",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wBTC", "LBTC", "cbBTC", "eBTC"],
      receive: {
        name: "BeraBTC",
        symbol: "BeraBTC",
        imagePath: "/images/etherFi/ethereum-assets/beraeth.svg",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0xC673ef7791724f0dcca38adB47Fbb3AEF3DB6C80",
      analytics: "https://www.ether.fi/app/liquid/bera-btc",
      withdrawal: "https://www.ether.fi/app/liquid/bera-btc",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/performance/0xC673ef7791724f0dcca38adB47Fbb3AEF3DB6C80?&aggregation_period=14",
    },
    vaultIcon: "/images/etherFi/vaults/beraeth.svg",
  },

  10: {
    id: 10,
    name: " Symbiotic Restaking",
    description: "TBA",
    ecosystem: "Ether.fi",
    type: "Featured",
    chain: "ethereum",
    addresses: {
      vault: "0x7223442cad8e9cA474fC40109ab981608F8c4273",
      teller: "0x929B44db23740E65dF3A81eA4aAB716af1b88474",
      accountant: "0x126af21dc55C300B7D0bBfC4F3898F558aE8156b",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["ETH", "wETH", "eETH", "weETH", "wstETH", "rETH"],
      receive: {
        name: "weETHs",
        symbol: "weETHs",
        imagePath: "/images/etherFi/ethereum-assets/weETHs.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x7223442cad8e9cA474fC40109ab981608F8c4273",
      analytics: "https://www.ether.fi/app/weeths",
      withdrawal: "https://www.ether.fi/app/weeths",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/apy/0x917ceE801a67f933F2e6b33fC0cD1ED2d5909D88",
    },
    vaultIcon: "/images/etherFi/vaults/weETHs.png",
  },

  11: {
    id: 11,
    name: "Bitcoin LRT",
    description:
      "Bitcoin LRT vault providing restaked BTC yield through various Bitcoin strategies.",
    ecosystem: "Ethereum",
    type: "Featured",
    chain: "ethereum",
    addresses: {
      vault: "0x657e8C867D8B37dCC18fA4Caead9C45EB088C642",
      teller: "0x6Ee3aaCcf9f2321E49063C4F8da775DdBd407268",
      accountant: "0x1B293DC39F94157fA0D1D36d7e0090C8B8B8c13F",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wBTC", "LBTC"],
      receive: {
        name: "eBTC",
        symbol: "eBTC",
        imagePath: "/images/etherFi/ethereum-assets/ebtc.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x657e8C867D8B37dCC18fA4Caead9C45EB088C642",
      analytics: "https://www.ether.fi/app/liquid/ebtc",
      withdrawal: "https://www.ether.fi/app/liquid/ebtc",
      yield: "fallback",
    },
    vaultIcon: "/images/etherFi/ethereum-assets/ebtc.png",
  },

  12: {
    id: 12,
    name: "Ethena USD LRT",
    description:
      "Ethena USD LRT vault combining staking and shorting ETH strategies for stablecoin yield.",
    ecosystem: "Ethereum",
    type: "Featured",
    chain: "ethereum",
    addresses: {
      vault: "0x939778D83b46B456224A33Fb59630B11DEC56663",
      teller: "0xCc9A7620D0358a521A068B444846E3D5DebEa8fA",
      accountant: "0xEB440B36f61Bf62E0C54C622944545f159C3B790",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["USDC", "DAI", "USDT", "USDe"],
      receive: {
        name: "eUSD",
        symbol: "eUSD",
        imagePath: "/images/etherFi/ethereum-assets/eusd.png",
      },
    },
    links: {
      explorer:
        "https://etherscan.io/address/0x939778D83b46B456224A33Fb59630B11DEC56663",
      analytics: "https://www.ether.fi/app/liquid/eusd",
      withdrawal: "https://www.ether.fi/app/liquid/eusd",
      yield:
        "https://api.sevenseas.capital/etherfi/ethereum/apy/0x939778D83b46B456224A33Fb59630B11DEC56663",
    },
    vaultIcon: "/images/etherFi/vaults/eusd.png",
  },
};

// ethereum deposit assets configuration
export const DEPOSIT_ASSETS: Record<string, DepositAsset> = {
  eth: {
    chain: "ethereum",
    contractAddress: "0x0000000000000000000000000000000000000000", // Native ETH
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/eth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/eth",
    stable: false,
  },
  weth: {
    chain: "ethereum",
    contractAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/weth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/weth",
    stable: false,
  },
  eeth: {
    chain: "ethereum",
    contractAddress: "0x35fA164735182de50811E8e2E824cFb9B6118ac2",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/eeth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/eeth",
    stable: false,
  },
  weeth: {
    chain: "ethereum",
    contractAddress: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/weeth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/weeth",
    stable: false,
  },
  steth: {
    chain: "ethereum",
    contractAddress: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/steth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/steth",
    stable: false,
  },
  wsteth: {
    chain: "ethereum",
    contractAddress: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/wsteth.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/wsteth",
    stable: false,
  },
  lbtc: {
    chain: "ethereum",
    contractAddress: "0x8236a87084f8B84306f72007F36F2618A5634494",
    decimals: 8,
    imagePath: "/images/etherFi/ethereum-assets/lbtc.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/lbtc",
    stable: false,
  },
  wbtc: {
    chain: "ethereum",
    contractAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    imagePath: "/images/etherFi/ethereum-assets/wbtc.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/wbtc",
    stable: false,
  },
  cbbtc: {
    chain: "ethereum",
    contractAddress: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    decimals: 8,
    imagePath: "/images/etherFi/ethereum-assets/cbbtc.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/cbbtc",
    stable: false,
  },
  ebtc: {
    chain: "ethereum",
    contractAddress: "0x657e8C867D8B37dCC18fA4Caead9C45EB088C642",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/ebtc.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/wbtc",
    stable: false,
  },
  usdc: {
    chain: "ethereum",
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
    imagePath: "/images/etherFi/ethereum-assets/usdc.png",
    stable: true,
  },
  dai: {
    chain: "ethereum",
    contractAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/dai.png",
    stable: true,
  },
  usdt: {
    chain: "ethereum",
    contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    imagePath: "/images/etherFi/ethereum-assets/usdt.png",
    stable: true,
  },
  usde: {
    chain: "ethereum",
    contractAddress: "0x4c9EdD5852cd905f086C759E8383e09bff1E68B3",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/usde.png",
    stable: true,
  },
  deusd: {
    chain: "ethereum",
    contractAddress: "0x15700B564Ca08D9439C58cA5053166E8317aa138",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/deusd.png",
    stable: true,
  },
  sdeusd: {
    chain: "ethereum",
    contractAddress: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/sdeusd.png",
    stable: true,
  },
  eigen: {
    chain: "ethereum",
    contractAddress: "0xec53bF9167f50cDEB3Ae105f56099aaaB9061F83",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/eigen.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/eigen",
    stable: false,
  },
  ethfi: {
    chain: "ethereum",
    contractAddress: "0xfe0c30065b384f05761f15d0cc899d4f9f9cc0eb",
    decimals: 18,
    imagePath: "/images/etherFi/ethereum-assets/ethfi.png",
    priceUrl: "https://www.ether.fi/api/dapp/pricing/ethfi",
    stable: false,
  },
};

// Asset categories for easy filtering
export const ASSET_CATEGORIES = {
  ETH_VARIANTS: ["wETH", "eETH", "weETH", "stETH", "wstETH"],
  BTC_VARIANTS: ["LBTC", "wBTC", "cbBTC", "eBTC"],
  USD_STABLECOINS: ["USDC", "DAI", "USDT", "USDe", "deUSD", "sdeUSD"],
  GOVERNANCE_TOKENS: ["EIGEN", "ETHFI"],
};

export default ETHERFI_VAULTS;
