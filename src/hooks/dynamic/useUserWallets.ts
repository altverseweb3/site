import { useUserWallets as useDynamicUserWallets } from "@dynamic-labs/sdk-react-core";
import { useSourceChain } from "@/store/web3Store";
import { WalletType } from "@/types/web3";

export const useConnectedRequiredWallet = (): boolean => {
  const userWallets = useDynamicUserWallets();
  const requiredWalletType = useSourceChain().walletType;
  if (
    requiredWalletType === WalletType.EVM &&
    userWallets.some((wallet) => wallet.chain === "EVM")
  )
    return true;
  if (
    requiredWalletType === WalletType.SOLANA &&
    userWallets.some((wallet) => wallet.chain === "SOL")
  )
    return true;
  if (
    requiredWalletType === WalletType.SUI &&
    userWallets.some((wallet) => wallet.chain === "SUI")
  )
    return true;
  return false;
};
