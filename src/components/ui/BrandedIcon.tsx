import { ButtonHTMLAttributes } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

// Use a string literal type for the icon names
type AvailableIconName = "X";

// Props interface extending HTML button attributes
interface BrandedIconProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconName: AvailableIconName;
  className?: string;
  iconClassName?: string;
}

export function BrandedIcon({
  iconName,
  className = "",
  iconClassName = "",
  ...props
}: BrandedIconProps) {
  // Get the correct icon component directly in the component
  const IconComponent = {
    X,
  }[iconName];

  return (
    <Button
      className={`w-full bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border-[1px] rounded-lg leading-zero text-lg ${className}`}
      {...props}
    >
      <IconComponent className={iconClassName} />
    </Button>
  );
}

export default BrandedIcon;
