export interface EtherFiVault {
  // Basic vault information
  id: number;
  name: string;
  description: string;
  ecosystem: string;
  type:
    | "Featured"
    | "Strategy Vault"
    | "Governance Restaking"
    | "Partner Vault";
  chain: "Ethereum";

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
  };

  // Vault Icon
  vaultIcon: string;
}

// Shared lens address for all vaults
const SHARED_LENS_ADDRESS = "0x5232bc0F5999f8dA604c42E1748A13a170F94A1B";

// Complete EtherFi vaults configuration
export const ETHERFI_VAULTS: Record<number, EtherFiVault> = {
  1: {
    id: 1,
    name: "Liquid ETH Yield",
    description:
      "Liquid ETH vault provides staking rewards plus additional yield from ETH delegation strategies.",
    ecosystem: "Ether.fi",
    type: "Featured",
    chain: "Ethereum",
    addresses: {
      vault: "0xf0bb20865277aBd641a307eCe5Ee04E79073416C",
      teller: "0x9AA79C84b79816ab920bBcE20f8f74557B514734",
      accountant: "0x0d05D94a5F1E76C18fbeB7A13d17C8a314088198",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH", "eETH", "weETH", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/liquid-eth-icon.png",
  },

  2: {
    id: 2,
    name: "Liquid BTC Yield",
    description:
      "Liquid BTC vault uses wrapped BTC to generate yield through lending and options strategies.",
    ecosystem: "Ether.fi",
    type: "Featured",
    chain: "Ethereum",
    addresses: {
      vault: "0x5f46d540b6eD704C3c8789105F30E075AA900726",
      teller: "0x8Ea0B382D054dbEBeB1d0aE47ee4AC433C730353",
      accountant: "0xEa23aC6D7D11f6b181d6B98174D334478ADAe6b0",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["LBTC", "wBTC", "cbBTC", "eBTC", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/liquid-btc-icon.png",
  },

  3: {
    id: 3,
    name: "Market-Neutral USD",
    description:
      "Market-Neutral USD vault focuses on stable returns using conservative stablecoin strategies.",
    ecosystem: "Ether.fi",
    type: "Strategy Vault",
    chain: "Ethereum",
    addresses: {
      vault: "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C",
      teller: "0x4DE413a26fC24c3FC27Cc983be70aA9c5C299387",
      accountant: "0xc315D6e14DDCDC7407784e2Caf815d131Bc1D3E7",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["USDC", "DAI", "USDT", "USDe", "deUSD", "sdeUSD", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/usdc-icon.png",
  },

  4: {
    id: 4,
    name: "EIGEN Restaking",
    description:
      "EIGEN Restaking vault allows users to earn rewards by staking EIGEN tokens.",
    ecosystem: "Ether.fi",
    type: "Governance Restaking",
    chain: "Ethereum",
    addresses: {
      vault: "0xE77076518A813616315EaAba6cA8e595E845EeE9",
      teller: "0x63b2B0528376d1B34Ed8c9FF61Bd67ab2C8c2Bb0",
      accountant: "0x075e60550C6f77f430B284E76aF699bC31651f75",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["EIGEN", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/eigenlayer-icon.svg",
  },

  5: {
    id: 5,
    name: "UltraYield Stablecoin Vault",
    description:
      "Ultra Yield Stablecoin Vault uses aggressive yet secure strategies to maximize stablecoin returns.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "Ethereum",
    addresses: {
      vault: "0xbc0f3B23930fff9f4894914bD745ABAbA9588265",
      teller: "0xc8c58d1567e1db8c02542e6df5241A0d71f91Fe2",
      accountant: "0x95fE19b324bE69250138FE8EE50356e9f6d17Cfe",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["USDC", "DAI", "USDT", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/ultrayieldstable.png",
  },

  6: {
    id: 6,
    name: "Liquid Move ETH",
    description:
      "Liquid Move ETH vault combines ETH staking with automated trading strategies.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "Ethereum",
    addresses: {
      vault: "0xca8711dAF13D852ED2121E4bE3894Dae366039E4",
      teller: "0x63ede83cbB1c8D90bA52E9497e6C1226a673e884",
      accountant: "0xb53244f7716dC83811C8fB1a91971dC188C1C5aA",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/liquidmove.png",
  },

  7: {
    id: 7,
    name: "The Bera ETH Vault",
    description:
      "The Bera ETH Vault focuses on low-risk strategies with consistent returns for ETH holders.",
    ecosystem: "Ether.fi",
    type: "Partner Vault",
    chain: "Ethereum",
    addresses: {
      vault: "0x83599937c2C9bEA0E0E8ac096c6f32e86486b410",
      teller: "0xCbc0D2838256919e55eB302Ce8c46d7eE0E9d807",
      accountant: "0x04B8136820598A4e50bEe21b8b6a23fE25Df9Bd8",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wETH", "eETH", "weETH", "stETH", "wstETH", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/beraeth.svg",
  },

  8: {
    id: 8,
    name: "The Bera BTC Vault",
    description:
      "The Bera BTC Vault focuses on low-risk strategies with consistent returns for BTC holders.",
    ecosystem: "Bera", // Note: Different ecosystem
    type: "Partner Vault",
    chain: "Ethereum",
    addresses: {
      vault: "0xC673ef7791724f0dcca38adB47Fbb3AEF3DB6C80",
      teller: "0x07951756b68427e7554AB4c9091344cB8De1Ad5a",
      accountant: "0xF44BD12956a0a87c2C20113DdFe1537A442526B5",
      lens: SHARED_LENS_ADDRESS,
    },
    supportedAssets: {
      deposit: ["wBTC", "LBTC", "cbBTC", "eBTC", "SOL", "SUI"],
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
    },
    vaultIcon: "/images/etherFi/beraeth.svg",
  },
};

// Helper functions for easy access to vault data

/**
 * Get a specific vault by ID
 */
export const getVaultById = (id: number): EtherFiVault | undefined => {
  return ETHERFI_VAULTS[id];
};

/**
 * Get vaults by type
 */
export const getVaultsByType = (type: EtherFiVault["type"]): EtherFiVault[] => {
  return Object.values(ETHERFI_VAULTS).filter((vault) => vault.type === type);
};

/**
 * Get vaults that support a specific deposit asset
 */
export const getVaultsBySupportedAsset = (asset: string): EtherFiVault[] => {
  return Object.values(ETHERFI_VAULTS).filter((vault) =>
    vault.supportedAssets.deposit.includes(asset),
  );
};

/**
 * Get image path for a deposit asset
 */
export const getDepositAssetImage = (asset: string): string | undefined => {
  return DEPOSIT_ASSET_IMAGES[asset];
};

/**
 * Get vault address mappings (for backward compatibility)
 */
export const getVaultAddressMappings = () => {
  const vaultAddresses: Record<number, string> = {};
  const tellerAddresses: Record<number, string> = {};
  const accountantAddresses: Record<number, string> = {};

  Object.values(ETHERFI_VAULTS).forEach((vault) => {
    vaultAddresses[vault.id] = vault.addresses.vault;
    tellerAddresses[vault.id] = vault.addresses.teller;
    accountantAddresses[vault.id] = vault.addresses.accountant;
  });

  return {
    VAULT_ID_TO_ADDRESS: vaultAddresses,
    VAULT_ID_TO_TELLER: tellerAddresses,
    VAULT_ID_TO_ACCOUNTANT: accountantAddresses,
    LENS_ADDRESS: SHARED_LENS_ADDRESS,
  };
};

// Export the address mappings for backward compatibility
export const {
  VAULT_ID_TO_ADDRESS,
  VAULT_ID_TO_TELLER,
  VAULT_ID_TO_ACCOUNTANT,
  LENS_ADDRESS,
} = getVaultAddressMappings();

// Deposit asset image paths mapping
export const DEPOSIT_ASSET_IMAGES: Record<string, string> = {
  // ETH variants
  wETH: "/images/etherFi/eth-icon-2.png",
  eETH: "/images/etherFi/eeth-icon.png",
  weETH: "/images/etherFi/weeth-icon.png",
  stETH: "/images/etherFi/stETH.svg",
  wstETH: "/images/etherFi/wstETH.png",

  // BTC variants
  LBTC: "/images/etherFi/lbtc-icon.png",
  wBTC: "/images/etherFi/wbtc.png",
  cbBTC: "/images/etherFi/cbbtc-icon.png",
  eBTC: "/images/etherFi/ebtc-icon.png",

  // USD stablecoins
  USDC: "/images/etherFi/usdc-icon.png",
  DAI: "/images/etherFi/dai-icon.png",
  USDT: "/images/etherFi/usdt-icon.png",
  USDe: "/images/etherFi/usde-icon.png",
  deUSD: "/images/etherFi/deUSD.png",
  sdeUSD: "/images/etherFi/sdeUSD.png",

  // Governance tokens
  EIGEN: "/images/etherFi/eigenlayer-token.svg",
};

// Common assets supported across multiple vaults
export const COMMON_CROSS_CHAIN_ASSETS = [
  "SOL",
  "SUI",
  "ARB",
  "OP",
  "BASE",
  "UNI",
  "POL",
  "BNB",
  "AVAX",
];

// Asset categories for easy filtering
export const ASSET_CATEGORIES = {
  ETH_VARIANTS: ["wETH", "eETH", "weETH", "stETH", "wstETH"],
  BTC_VARIANTS: ["LBTC", "wBTC", "cbBTC", "eBTC"],
  USD_STABLECOINS: ["USDC", "DAI", "USDT", "USDe", "deUSD", "sdeUSD"],
  GOVERNANCE_TOKENS: ["EIGEN"],
  CROSS_CHAIN: COMMON_CROSS_CHAIN_ASSETS,
};

export default ETHERFI_VAULTS;
