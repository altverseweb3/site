// TokenImage.tsx
import { useState } from "react";
import Image from "next/image";
import { HelpCircle } from "lucide-react";
import { Token, Chain } from "@/types/web3";

interface TokenImageProps {
  token: Token;
  chain: Chain;
  size?: "sm" | "md" | "lg";
}

export const TokenImage: React.FC<TokenImageProps> = ({
  token,
  chain,
  size = "md",
}) => {
  const [hasLoadError, setHasLoadError] = useState(false);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };
  const sizesProp = {
    sm: "20px",
    md: "32px",
    lg: "48px",
  };
  const questionMarkSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const getImageSrc = () => {
    if (!token.icon || token.icon === "unknown.png") {
      return null;
    }

    if (token.isNativeGas) {
      return `/tokens/native-gas/${chain.chainId}.png`;
    }
    if (token.isNativeWrapped) {
      return `/tokens/native-wrapped/${chain.chainId}.png`;
    }
    if (token.isL2Token) {
      return `/tokens/l2/${chain.chainId}.png`;
    }
    return `/tokens/${chain.id}/pngs/${token.icon}`;
  };

  const imageSrc = getImageSrc();

  const handleImageError = () => {
    console.warn(
      `Failed to load image for token ${token.name} at path: ${imageSrc}`,
    );
    setHasLoadError(true);
  };

  if (!imageSrc || hasLoadError) {
    return (
      <div
        className={`${sizeClasses[size]} flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full`}
        aria-label={`Missing icon for ${token.name}`}
      >
        <HelpCircle size={questionMarkSizes[size]} className="text-zinc-400" />
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClasses[size]} flex-shrink-0`}>
      <Image
        src={imageSrc}
        alt={token.name}
        fill
        sizes={sizesProp[size]}
        className="object-contain"
        onError={handleImageError}
      />
    </div>
  );
};

export default TokenImage;
