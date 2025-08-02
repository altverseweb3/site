import { ethers } from "ethers";
import { useCallback } from "react"; // Add this import
import { useWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { TELLER_PAUSED_ABI } from "@/types/etherFiABIs";
import { ETHERFI_VAULTS, DEPOSIT_ASSETS } from "@/config/etherFi";
import { createEthersJsonRpcProviderFromUrls } from "@/utils/wallet/ethersJsonRpcProvider";
import { chains } from "@/config/chains";
import { ERC20_ABI } from "@/types/ERC20ABI";

export async function fetchVaultTVL(
  vaultId: number,
  provider: ethers.Provider,
): Promise<{
  vaultId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tvl: string;
}> {
  const vault = ETHERFI_VAULTS[vaultId];
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  const contract = new ethers.Contract(
    vault.addresses.vault,
    ERC20_ABI,
    provider,
  );

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
    contract.totalSupply(),
  ]);

  const formattedSupply = ethers.formatUnits(totalSupply, decimals);

  return {
    vaultId,
    address: vault.addresses.vault,
    name,
    symbol,
    decimals,
    tvl: formattedSupply,
  };
}

export async function checkIfTellerPaused(
  vaultId: number,
  provider: ethers.Provider,
): Promise<boolean> {
  const vault = ETHERFI_VAULTS[vaultId];
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  const tellerContract = new ethers.Contract(
    vault.addresses.teller,
    TELLER_PAUSED_ABI,
    provider,
  );

  try {
    return await tellerContract.isPaused();
  } catch {
    try {
      return await tellerContract.paused();
    } catch {
      return false; // Assume not paused if function doesn't exist
    }
  }
}

export async function getTokenAllowance(
  tokenSymbol: string,
  vaultId: number,
  signer: ethers.Signer,
): Promise<{
  allowance: bigint;
  formatted: string;
}> {
  const asset = DEPOSIT_ASSETS[tokenSymbol.toLowerCase()];
  const vault = ETHERFI_VAULTS[vaultId];

  if (!asset) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  const signerAddress = await signer.getAddress();
  const tokenContract = new ethers.Contract(
    asset.contractAddress,
    ERC20_ABI,
    signer,
  );
  const allowance = await tokenContract.allowance(
    signerAddress,
    vault.addresses.vault,
  );

  return {
    allowance,
    formatted: ethers.formatUnits(allowance, asset.decimals),
  };
}

export async function getTokenBalance(
  tokenSymbol: string,
  signer: ethers.Signer,
): Promise<{
  balance: bigint;
  formatted: string;
}> {
  const asset = DEPOSIT_ASSETS[tokenSymbol.toLowerCase()];
  if (!asset) {
    throw new Error(`Token ${tokenSymbol} not supported`);
  }

  const signerAddress = await signer.getAddress();

  // Handle native ETH
  if (asset.contractAddress === "0x0000000000000000000000000000000000000000") {
    const provider = signer.provider;
    if (!provider) {
      throw new Error("Signer must have a provider for ETH balance");
    }
    const balance = await provider.getBalance(signerAddress);
    return {
      balance,
      formatted: ethers.formatEther(balance),
    };
  }

  const tokenContract = new ethers.Contract(
    asset.contractAddress,
    ERC20_ABI,
    signer,
  );
  const balance = await tokenContract.balanceOf(signerAddress);

  return {
    balance,
    formatted: ethers.formatUnits(balance, asset.decimals),
  };
}

/**
 * Fetch TVL using public RPC (no wallet required)
 */
export async function fetchVaultTVLPublic(
  vaultId: number,
  provider?: ethers.Provider,
): Promise<{
  vaultId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  tvl: string;
}> {
  const rpcProvider =
    provider ||
    createEthersJsonRpcProviderFromUrls(chains.ethereum.rpcUrls || []);
  return fetchVaultTVL(vaultId, rpcProvider);
}

/**
 * Get user's vault token balance (position)
 */
export async function getUserVaultBalance(
  vaultId: number,
  userAddress: string,
  provider: ethers.Provider,
): Promise<{
  vaultId: number;
  userAddress: string;
  balance: bigint;
  formatted: string;
  decimals: number;
}> {
  const vault = ETHERFI_VAULTS[vaultId];
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  const vaultContract = new ethers.Contract(
    vault.addresses.vault,
    ERC20_ABI,
    provider,
  );

  const [balance, decimals] = await Promise.all([
    vaultContract.balanceOf(userAddress),
    vaultContract.decimals(),
  ]);

  return {
    vaultId,
    userAddress,
    balance,
    formatted: ethers.formatUnits(balance, decimals),
    decimals,
  };
}

/**
 * React hook for etherFi fetch functions with wallet integration
 */
export function useEtherFiFetch() {
  const { getEvmSigner } = useWalletProviderAndSigner();

  const fetchVaultTVLMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return fetchVaultTVL(vaultId, provider);
    },
    [getEvmSigner],
  );

  const checkIfTellerPausedMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return checkIfTellerPaused(vaultId, provider);
    },
    [getEvmSigner],
  );

  const getTokenAllowanceMemoized = useCallback(
    async (tokenSymbol: string, vaultId: number) => {
      const signer = await getEvmSigner();
      return getTokenAllowance(tokenSymbol, vaultId, signer);
    },
    [getEvmSigner],
  );

  const getTokenBalanceMemoized = useCallback(
    async (tokenSymbol: string) => {
      const signer = await getEvmSigner();
      return getTokenBalance(tokenSymbol, signer);
    },
    [getEvmSigner],
  );

  const getUserVaultBalanceMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      const userAddress = await signer.getAddress();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return getUserVaultBalance(vaultId, userAddress, provider);
    },
    [getEvmSigner],
  );

  return {
    fetchVaultTVL: fetchVaultTVLMemoized,
    checkIfTellerPaused: checkIfTellerPausedMemoized,
    getTokenAllowance: getTokenAllowanceMemoized,
    getTokenBalance: getTokenBalanceMemoized,
    getUserVaultBalance: getUserVaultBalanceMemoized,
  };
}
