import { ethers } from "ethers";
import { Chain } from "@/types/web3";

const stallTimeout = 1000;
const quorum = 1;

interface FallbackProviderConfig {
  provider: ethers.JsonRpcProvider;
  priority: number;
  weight: number;
  stallTimeout: number;
}

export function createEthersJsonRpcProvider(chain: Chain): ethers.Provider {
  if (!chain.rpcUrls || chain.rpcUrls.length === 0) {
    throw new Error(`No RPC URLs configured for chain ${chain.chainName}`);
  }

  if (chain.rpcUrls.length === 1) {
    return new ethers.JsonRpcProvider(chain.rpcUrls[0]);
  }

  const providers: FallbackProviderConfig[] = chain.rpcUrls.map(
    (url, index) => ({
      provider: new ethers.JsonRpcProvider(url),
      priority: index + 1,
      weight: chain.rpcUrls!.length - index,
      stallTimeout: stallTimeout,
    }),
  );

  return new ethers.FallbackProvider(
    providers,
    Math.min(quorum, chain.rpcUrls.length),
  );
}

export function createEthersJsonRpcProviderFromUrls(
  rpcUrls: string[],
): ethers.Provider {
  if (!rpcUrls || rpcUrls.length === 0) {
    throw new Error("No RPC URLs provided");
  }

  if (rpcUrls.length === 1) {
    return new ethers.JsonRpcProvider(rpcUrls[0]);
  }

  const providers: FallbackProviderConfig[] = rpcUrls.map((url, index) => ({
    provider: new ethers.JsonRpcProvider(url),
    priority: index + 1,
    weight: rpcUrls.length - index,
    stallTimeout: stallTimeout,
  }));

  return new ethers.FallbackProvider(
    providers,
    Math.min(quorum, rpcUrls.length),
  );
}
