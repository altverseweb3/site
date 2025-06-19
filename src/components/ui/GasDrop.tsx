import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { useSetGasDrop } from "@/store/web3Store";

interface GasDropProps {
  /** Maximum gas drop amount available */
  maxGasDrop: number;
  /** Symbol to display (e.g., "ETH", "SOL", "SUI") */
  symbol: string;
  /** Initial enabled state (default: false) */
  initialEnabled?: boolean;
  /** Initial percentage value (default: 50) */
  initialValue?: number;
  /** Additional CSS classes */
  className?: string;
}

export function GasDrop({
  maxGasDrop,
  symbol,
  initialEnabled = false,
  initialValue = 50,
  className = "",
}: GasDropProps) {
  // ─── Zustand store hooks ─────────────────────────────────────────────────────
  const setGasDrop = useSetGasDrop();

  // ─── Local state ─────────────────────────────────────────────────────────────
  const [isGasDropEnabled, setIsGasDropEnabled] =
    useState<boolean>(initialEnabled);
  const [gasDropValue, setGasDropValue] = useState<number>(initialValue);

  // ─── Calculated values ───────────────────────────────────────────────────────
  // Calculate the actual gas drop amount
  const actualGasDropAmount = (gasDropValue / 100) * maxGasDrop;
  // Format the gas drop display amount to 4 decimal places
  const formattedGasDropAmount = actualGasDropAmount.toFixed(4);

  // ─── Effects ─────────────────────────────────────────────────────────────────

  // Update the gas drop in the store when relevant values change
  useEffect(() => {
    // Set gas drop to 0 if switch is off
    const dropValue = isGasDropEnabled ? Number(formattedGasDropAmount) : 0;
    setGasDrop(dropValue);
  }, [isGasDropEnabled, formattedGasDropAmount, setGasDrop]);

  // ─── Event handlers ──────────────────────────────────────────────────────────

  const handleSwitchChange = (checked: boolean) => {
    setIsGasDropEnabled(checked);
    if (!checked) {
      setGasDrop(0);
    }
  };

  const handleSliderChange = (value: number[]) => {
    setGasDropValue(value[0]);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={className}>
      {/* Gas Drop Toggle */}
      <div className="grid grid-cols-2 items-center text-[12px] gap-y-2">
        <div className="text-left text-zinc-400">gas drop</div>
        <div className="flex justify-end">
          <Switch
            checked={isGasDropEnabled}
            onCheckedChange={handleSwitchChange}
            className="data-[state=checked]:bg-sky-500 data-[state=unchecked]:bg-zinc-800 focus-visible:ring-sky-400"
          />
        </div>
      </div>

      {/* Gas Drop Slider */}
      {isGasDropEnabled && (
        <div className="mt-2 flex items-center space-x-4">
          <div className="flex-1">
            <Slider
              value={[gasDropValue]}
              onValueChange={handleSliderChange}
              min={0}
              max={100}
              step={1}
              className="w-full 
                  [&_.bg-primary]:bg-sky-500 
                  [&_[role=slider]]:border-zinc-900 
                  [&_[role=slider]]:bg-sky-500
                  "
            />
          </div>
          <div className="text-right numeric-input text-zinc-200 sm:text-xs text-[9px] w-[80px] text-right">
            {formattedGasDropAmount} {symbol}
          </div>
        </div>
      )}
    </div>
  );
}

export default GasDrop;
