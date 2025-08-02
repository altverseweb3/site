import { ethers } from "ethers";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { TELLER_ABI } from "@/types/etherFiABIs";
import { ETHERFI_VAULTS, DEPOSIT_ASSETS } from "@/config/etherFi";
import { ERC20_ABI } from "@/types/ERC20ABI";

export async function approveToken(
  tokenSymbol: string,
  vaultId: number,
  amount: string,
  signer: ethers.Signer,
): Promise<{
  success: boolean;
  message: string;
  hash?: string;
}> {
  try {
    const asset = DEPOSIT_ASSETS[tokenSymbol.toLowerCase()];
    const vault = ETHERFI_VAULTS[vaultId];

    if (!asset) {
      return { success: false, message: `Token ${tokenSymbol} not supported` };
    }
    if (!vault) {
      return { success: false, message: `Vault ${vaultId} not found` };
    }

    const tokenContract = new ethers.Contract(
      asset.contractAddress,
      ERC20_ABI,
      signer,
    );
    const approvalAmount =
      amount === "max"
        ? ethers.MaxUint256
        : ethers.parseUnits(amount, asset.decimals);

    const tx = await tokenContract.approve(
      vault.addresses.vault,
      approvalAmount,
    );
    const receipt = await tx.wait();

    return {
      success: true,
      message: "Approval successful",
      hash: receipt.hash,
    };
  } catch (error) {
    console.error("Approval error:", error);
    return {
      success: false,
      message: `Approval failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function depositTokens(
  tokenSymbol: string,
  vaultId: number,
  amount: string,
  signer: ethers.Signer,
): Promise<{
  success: boolean;
  message: string;
  hash?: string;
}> {
  try {
    const asset = DEPOSIT_ASSETS[tokenSymbol.toLowerCase()];
    const vault = ETHERFI_VAULTS[vaultId];

    if (!asset) {
      return { success: false, message: `Token ${tokenSymbol} not supported` };
    }
    if (!vault) {
      return { success: false, message: `Vault ${vaultId} not found` };
    }

    const depositAmount = ethers.parseUnits(amount, asset.decimals);
    const signerAddress = await signer.getAddress();

    const tokenContract = new ethers.Contract(
      asset.contractAddress,
      ERC20_ABI,
      signer,
    );
    const tellerContract = new ethers.Contract(
      vault.addresses.teller,
      TELLER_ABI,
      signer,
    );

    const balance = await tokenContract.balanceOf(signerAddress);
    if (balance < depositAmount) {
      return {
        success: false,
        message: `Insufficient balance. You have ${ethers.formatUnits(balance, asset.decimals)} ${tokenSymbol.toUpperCase()}`,
      };
    }

    const allowance = await tokenContract.allowance(
      signerAddress,
      vault.addresses.vault,
    );
    if (allowance < depositAmount) {
      return {
        success: false,
        message: `Insufficient allowance. Please approve ${tokenSymbol.toUpperCase()} first.`,
      };
    }

    const tx = await tellerContract.deposit(
      asset.contractAddress,
      depositAmount,
      0, // minimumMint
    );

    const receipt = await tx.wait();

    return {
      success: true,
      message: "Deposit successful",
      hash: receipt.hash,
    };
  } catch (error) {
    console.error("Deposit error:", error);

    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("CALL_EXCEPTION")) {
        errorMessage =
          "The contract rejected the transaction. The vault may not accept this deposit at this time.";
      } else if (error.message.includes("transfer")) {
        errorMessage =
          "Token transfer failed. Make sure you have enough tokens and have approved the contract.";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      message: `Deposit failed: ${errorMessage}`,
    };
  }
}

/**
 * React hook for etherFi interaction functions with wallet integration
 */
export function useEtherFiInteract() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  return {
    approveToken: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      return approveToken(tokenSymbol, vaultId, amount, signer);
    },

    depositTokens: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      return depositTokens(tokenSymbol, vaultId, amount, signer);
    },
  };
}
