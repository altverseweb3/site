import { WalletType, WalletOption } from "@/types/web3";

export const walletOptions: WalletOption[] = [
  {
    value: "all",
    label: "all wallets",
    icons: [
      "/wallets/metamask.svg",
      "/wallets/phantom.svg",
      "/wallets/sui.svg",
    ],
  },
  {
    value: "metamask",
    label: "metamask",
    icon: "/wallets/metamask.svg",
    walletType: WalletType.REOWN_EVM,
  },
  {
    value: "phantom",
    label: "phantom",
    icon: "/wallets/phantom.svg",
    walletType: WalletType.REOWN_SOL,
  },
  {
    value: "suiet",
    label: "suiet",
    icon: "/wallets/sui.svg",
    walletType: WalletType.SUIET_SUI,
  },
];
