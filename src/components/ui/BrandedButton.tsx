import React, { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { Coins, Cable, Wallet, ArrowLeftRight } from "lucide-react";
import { AvailableIconName } from "@/types/ui";

interface BrandedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconName: AvailableIconName;
  buttonText: string;
  className?: string;
  iconClassName?: string;
}

export function BrandedButton({
  iconName,
  buttonText,
  className = "",
  iconClassName = "h-6 w-6",
  ...props
}: BrandedButtonProps) {
  const IconComponent = {
    Coins,
    Cable,
    Wallet,
    ArrowLeftRight,
  }[iconName];

  return (
    <Button
      className={`w-full bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border-[1px] rounded-lg leading-zero text-lg ${className}`}
      {...props}
    >
      <IconComponent className={`mr-2 ${iconClassName}`} />
      {buttonText}
    </Button>
  );
}

export default BrandedButton;
