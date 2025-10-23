import { useDynamicEvmProvider } from "@/hooks/dynamic/useDynamicProviderAndSigner";
import { WalletType } from "@/types/web3";
import { approveToken, depositTokens } from "@/utils/etherFi/interact";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";

/**
 * React hook for etherFi interaction functions with wallet integration
 */
export function useEtherFiInteract() {
  const wallet = useWalletByType(WalletType.EVM);
  const { getEvmSigner } = useDynamicEvmProvider(wallet);

  return {
    approveToken: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      return approveToken(tokenSymbol, vaultId, amount, signer);
    },

    depositTokens: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      return depositTokens(tokenSymbol, vaultId, amount, signer);
    },
  };
}
