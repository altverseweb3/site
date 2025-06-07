import { ChangeEvent, useEffect, useState, useRef } from "react";
import { NumberTicker } from "@/components/ui/NumberTicker";

interface PersistentAmountDisplayProps {
  isLoading: boolean;
  amount: number | string;
  variant: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  shouldApplyDisabledStyle?: boolean;
  readOnly?: boolean;
  allowContainerClick?: boolean; // New prop to control click passthrough
}

const PersistentAmountDisplay: React.FC<PersistentAmountDisplayProps> = ({
  isLoading,
  amount,
  variant,
  onChange,
  placeholder,
  readOnly,
  allowContainerClick = false, // Default to false
}) => {
  // Track last displayed value for smooth ticker animations
  const [lastDisplayedAmount, setLastDisplayedAmount] = useState(0);
  // Track the container height to maintain consistent sizing
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
  // Track the actual rendered content length
  const [contentLength, setContentLength] = useState(0);
  // Refs for DOM access
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Check if amount is zero or empty (handles various representations)
  const isZeroAmount = !amount || Number(amount) === 0;

  // Dynamic text size based on content length
  const getTextSizeClass = (length: number) => {
    if (length < 10) return "text-3xl";
    if (length < 14) return "text-2xl";
    if (length < 18) return "text-normal";
    if (length < 22) return "text-sm";
    return "text-xs";
  };

  // Set initial last displayed amount
  useEffect(() => {
    if (!isLoading && amount !== undefined && amount !== null) {
      setLastDisplayedAmount(parseFloat(Number(amount).toFixed(3)));
    }
  }, [amount, isLoading]);

  // Establish initial height based on text-3xl
  useEffect(() => {
    if (containerRef.current && !containerHeight) {
      // Add a temporary element with text-3xl to measure
      const tempDiv = document.createElement("div");
      tempDiv.className = "text-3xl";
      tempDiv.innerText = "0";
      tempDiv.style.visibility = "hidden";
      tempDiv.style.position = "absolute";
      containerRef.current.appendChild(tempDiv);

      // Measure and store the height
      const height = tempDiv.offsetHeight;
      setContainerHeight(height);

      // Clean up
      containerRef.current.removeChild(tempDiv);
    }
  }, [containerHeight]);

  // Setup observer for the ticker variant
  useEffect(() => {
    if (variant === "destination" && tickerRef.current) {
      // Use MutationObserver to watch for text content changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "characterData" ||
            mutation.type === "childList"
          ) {
            const el = tickerRef.current?.querySelector(".numeric-input");
            if (el) {
              const content = el.textContent || "";
              setContentLength(content.length);
            }
          }
        });
      });

      // Start observing with appropriate config
      observer.observe(tickerRef.current, {
        characterData: true,
        childList: true,
        subtree: true,
      });

      return () => observer.disconnect();
    }
  }, [variant]);

  // For input variant, track content length changes directly
  useEffect(() => {
    if (variant !== "destination" && inputRef.current) {
      setContentLength(String(amount).length);
    }
  }, [amount, variant]);

  // Sanitize incoming value: allow only digits and one "."
  const handleSanitizedChange = (e: ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // strip out anything that is not 0–9 or "."
    v = v.replace(/[^0-9.]/g, "");
    // if more than one ".", keep the first and remove the rest
    const parts = v.split(".");
    if (parts.length > 2) {
      v = parts[0] + "." + parts.slice(1).join("");
    }
    // write it back so React sees the real value
    e.target.value = v;
    onChange(e);
  };

  // Dynamic text size class based on current content length
  const textSizeClass = getTextSizeClass(contentLength);

  // Base styles with dynamic text size and conditional opacity
  const commonClass = `
    w-full 
    text-amber-500
    bg-transparent 
    ${textSizeClass}
    focus:outline-none 
    text-right 
    numeric-input 
    [appearance:textfield] 
    [&::-webkit-outer-spin-button]:appearance-none 
    [&::-webkit-inner-spin-button]:appearance-none
    ${allowContainerClick ? "pointer-events-none" : ""}
    ${isZeroAmount ? "text-zinc-400" : "text-white"}    
    placeholder:text-zinc-400
    placeholder:opacity-100
    transition-font-size
    duration-200
  `;

  // Container style to maintain consistent height
  const containerStyle = containerHeight
    ? { height: `${containerHeight}px`, overflow: "visible" }
    : {};

  // Destination (read-only ticker with pulse on loading)
  if (variant === "destination") {
    const numAmount = Number(amount);
    // Show 0 decimal places for zero values, 3 decimal places for non-zero values
    const decimalPlaces = numAmount === 0 ? 0 : 3;
    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className={`flex items-center justify-end text-zinc-400`}
      >
        <div ref={tickerRef} className={isLoading ? "animate-pulse" : ""}>
          <NumberTicker
            value={numAmount}
            startValue={lastDisplayedAmount}
            decimalPlaces={decimalPlaces}
            stiffness={500}
            damping={90}
            className={commonClass}
          />
        </div>
      </div>
    );
  }
  // Source (editable input)
  else if (variant !== "destination") {
    return (
      <div
        ref={containerRef}
        style={containerStyle}
        className="flex items-center justify-end"
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={String(amount)}
          onChange={handleSanitizedChange}
          placeholder={placeholder}
          className={commonClass}
          readOnly={readOnly}
          disabled={readOnly}
        />
      </div>
    );
  }

  // fallback (shouldn't ever hit)
  return null;
};

export default PersistentAmountDisplay;
