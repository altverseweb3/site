import { useState, useEffect } from "react";
import {
  useUserWallets as useDynamicUserWallets,
  Wallet,
} from "@dynamic-labs/sdk-react-core";
import { useSourceChain, useDestinationChain } from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import {
  useDynamicContext,
  useDynamicModals,
} from "@dynamic-labs/sdk-react-core";

export const useConnectedRequiredWallet = (): boolean => {
  const requiredWalletType = useSourceChain().walletType;
  return useWalletByType(requiredWalletType) !== null;
};

export const useSourceWallet = (): Wallet | null => {
  const requiredWalletType = useSourceChain().walletType;
  return useWalletByType(requiredWalletType);
};

export const useDestinationWallet = (): Wallet | null => {
  const requiredWalletType = useDestinationChain().walletType;
  return useWalletByType(requiredWalletType);
};

export const useWalletByType = (walletType: WalletType): Wallet | null => {
  const userWallets = useDynamicUserWallets();
  const [connectedWallet, setConnectedWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    const checkWalletConnection = async () => {
      let targetWallet: Wallet | undefined;

      if (walletType === WalletType.EVM) {
        targetWallet = userWallets.find((wallet) => wallet.chain === "EVM");
      } else if (walletType === WalletType.SOLANA) {
        targetWallet = userWallets.find((wallet) => wallet.chain === "SOL");
      } else if (walletType === WalletType.SUI) {
        targetWallet = userWallets.find((wallet) => wallet.chain === "SUI");
      }

      if (targetWallet) {
        const isConnected = await targetWallet.isConnected();
        setConnectedWallet(isConnected ? targetWallet : null);
      } else {
        setConnectedWallet(null);
      }
    };

    checkWalletConnection();
  }, [userWallets, walletType]);

  return connectedWallet;
};

export const useIsWalletTypeConnected = (walletType: WalletType): boolean => {
  return useWalletByType(walletType) !== null;
};

export const useHandleWalletClick = (walletType?: WalletType) => {
  const { setShowAuthFlow, primaryWallet, setSelectedTabIndex } =
    useDynamicContext();
  const { setShowLinkNewWalletModal } = useDynamicModals();
  const tabIndex = walletType
    ? walletType === WalletType.EVM
      ? 0
      : walletType === WalletType.SOLANA
        ? 1
        : 2
    : -1;
  return () => {
    if (primaryWallet) {
      setShowLinkNewWalletModal(true);
    } else {
      setShowAuthFlow(true);
    }
    if (tabIndex !== -1) {
      setSelectedTabIndex(tabIndex);
    }
  };
};
