import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, CornerDownRight, Check } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { chainList, defaultSourceChain } from "@/config/chains";
import { Chain } from "@/types/web3";
import useWeb3Store from "@/store/web3Store";

interface SelectChainButtonProps {
  selectedChain?: Chain;
  onChainSelect?: (chain: Chain) => void;
  displayName?: boolean;
  chainsToShow?: Chain[];
  storeType?: "source" | "destination";
}

export const SelectChainButton: React.FC<SelectChainButtonProps> = ({
  selectedChain: propSelectedChain,
  onChainSelect: propOnChainSelect,
  displayName = false,
  chainsToShow = chainList,
  storeType,
}) => {
  // Get store values and setters if storeType is provided
  const sourceChain = useWeb3Store((state) => state.sourceChain);
  const destinationChain = useWeb3Store((state) => state.destinationChain);
  const setSourceChain = useWeb3Store((state) => state.setSourceChain);
  const setDestinationChain = useWeb3Store(
    (state) => state.setDestinationChain,
  );

  // Determine the chain to display (from store)
  const selectedChain = storeType
    ? storeType === "source"
      ? sourceChain
      : destinationChain
    : propSelectedChain || defaultSourceChain;

  // Animation timers ref
  const timersRef = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Last selected chain for comparison
  const lastSelectedChainRef = useRef<string>(selectedChain.id);

  // State for the icon currently being displayed
  const [displayedChain, setDisplayedChain] = useState<Chain>(selectedChain);
  // State for the icon's opacity
  const [opacity, setOpacity] = useState(1);
  // State for background transition
  const [showRipple, setShowRipple] = useState(false);
  // State to track if chain is changing
  const [isChanging, setIsChanging] = useState(false);
  // State for background color/gradient
  const [bgColor, setBgColor] = useState(selectedChain.backgroundColor);
  const [bgGradient, setBgGradient] = useState(
    selectedChain.backgroundGradient,
  );
  // State for font color
  const [fontColor, setFontColor] = useState(
    selectedChain.fontColor || "#FFFFFF",
  );

  // Clear all timers
  const clearAllTimers = () => {
    Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    timersRef.current = {};
  };

  // Handle chain selection based on whether we're using the store or props
  const handleChainSelect = (chain: Chain) => {
    if (storeType) {
      // Update the store
      if (storeType === "source") {
        setSourceChain(chain);
      } else {
        setDestinationChain(chain);
      }
    } else if (propOnChainSelect) {
      // Use the prop callback (old behavior)
      propOnChainSelect(chain);
    }
  };

  // Helper function to get background style
  const getBackgroundStyle = (chain: Chain) => {
    if (chain.backgroundGradient) {
      return {
        background: chain.backgroundGradient,
        backgroundColor: chain.backgroundColor, // Fallback
      };
    }
    return {
      backgroundColor: chain.backgroundColor,
    };
  };

  // When selectedChain changes, animate the icon change:
  useEffect(() => {
    // Skip if this is just the initial render with the same chain
    if (
      selectedChain.id === lastSelectedChainRef.current &&
      lastSelectedChainRef.current === displayedChain.id &&
      !isChanging
    ) {
      return;
    }

    // Update ref to track the current selected chain
    lastSelectedChainRef.current = selectedChain.id;

    // Clean up any ongoing animations to prevent conflicts
    clearAllTimers();

    // Only trigger full animation if the chain has actually changed
    if (selectedChain.id !== displayedChain.id || isChanging) {
      setIsChanging(true);
      setShowRipple(true);

      // Start background color/gradient transition with original timing
      timersRef.current.bgTransition = setTimeout(() => {
        setBgColor(selectedChain.backgroundColor);
        setBgGradient(selectedChain.backgroundGradient);
        setFontColor(selectedChain.fontColor || "#FFFFFF");
      }, 50);

      // Fade out the current icon with original timing
      setOpacity(0);

      // After the fade-out duration, swap the icon and then fade in
      timersRef.current.fadeOut = setTimeout(() => {
        setDisplayedChain(selectedChain);

        // Small delay to ensure the new icon renders at opacity 0
        // before starting fade-in
        timersRef.current.fadeIn = setTimeout(() => {
          setOpacity(1);

          // Finish the animation
          timersRef.current.cleanup = setTimeout(() => {
            setIsChanging(false);
            setShowRipple(false);
          }, 300);
        }, 50);
      }, 300);
    } else {
      // If just syncing state, make sure everything is set correctly
      setBgColor(selectedChain.backgroundColor);
      setBgGradient(selectedChain.backgroundGradient);
      setFontColor(selectedChain.fontColor || "#FFFFFF");
      setDisplayedChain(selectedChain);
      setOpacity(1);
    }

    // Clean up on unmount or before re-running effect
    return clearAllTimers;
  }, [selectedChain, isChanging, displayedChain.id]);

  // Get current background style
  const currentBgStyle = getBackgroundStyle({
    backgroundColor: bgColor,
    backgroundGradient: bgGradient,
  } as Chain);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-between rounded-lg relative overflow-hidden"
          style={{
            width: "48px",
            height: "28px",
            padding: "0px 6px",
            ...currentBgStyle,
            transition: bgGradient
              ? "opacity 600ms ease" // For gradients, we use opacity transition
              : "background-color 600ms ease", // For solid colors, use background-color transition
          }}
        >
          {/* Ripple effect when chain changes */}
          {showRipple && (
            <span
              className="absolute inset-0 z-0 animate-ripple rounded-lg origin-center"
              style={getBackgroundStyle(selectedChain)}
            />
          )}

          {/* Chain Icon with opacity transition - Fixed dimensions */}
          <div
            className="relative z-10 flex-shrink-0 transition-all duration-300"
            style={{
              width: "18px",
              height: "18px",
              opacity,
              transition: "opacity 300ms ease, transform 300ms ease", // Original timing
              transform: isChanging ? "scale(0.9)" : "scale(1)",
            }}
          >
            {/* Always render the image even during transitions */}
            <Image
              src={`${displayedChain.icon}`}
              alt={displayedChain.name}
              fill
              className="object-contain"
            />
          </div>

          {/* Chain name - Only if needed */}
          {displayName && (
            <span
              className="text-sm font-medium hidden sm:block z-10 mx-1"
              style={{
                opacity: isChanging ? opacity : 1,
                transition: "opacity 300ms ease", // Original timing
                color: fontColor,
              }}
            >
              {displayedChain.name}
            </span>
          )}

          {/* Chevron with fixed dimensions and font color from chain */}
          <ChevronDown
            className="z-10 flex-shrink-0"
            style={{
              width: "12px",
              height: "12px",
              color: fontColor,
            }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 rounded-[6px] border-[#52525B50] bg-[#18181B]"
      >
        <style jsx global>{`
          /* Override default dropdown hover styles */
          .chain-dropdown-item {
            padding: 2px 8px !important;
          }

          .chain-dropdown-item:hover,
          .chain-dropdown-item:focus {
            background-color: transparent !important;
            outline: none !important;
          }

          .chain-item-inner:hover {
            background-color: #27272a !important;
          }
        `}</style>

        {chainsToShow.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onClick={() => handleChainSelect(chain)}
            className="chain-dropdown-item cursor-pointer"
          >
            <div
              className={`chain-item-inner flex items-center justify-between px-[9px] py-[5px] rounded-[6px] w-full ${
                selectedChain.id === chain.id ? "bg-[#27272A]" : ""
              }`}
            >
              <div className="flex items-center">
                {/* L2 indicator icon with text */}
                {chain.l2 && (
                  <div className="relative mr-1 flex-shrink-0">
                    <CornerDownRight className="text-zinc-500" size={16} />
                    <span
                      className="absolute text-[7px] font-bold text-zinc-600"
                      style={{
                        left: "6px",
                        top: "2px",
                        lineHeight: "0",
                      }}
                    >
                      L2
                    </span>
                  </div>
                )}
                {/* Colored circle with mono icon */}
                <div className="relative w-5 h-5 mr-2 flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={getBackgroundStyle(chain)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-3.5 h-3.5">
                      <Image
                        src={`${chain.icon}`}
                        alt={chain.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
                <span>{chain.name}</span>
              </div>

              {/* Check icon for selected chain */}
              {selectedChain.id === chain.id && (
                <Check
                  className="text-amber-500 ml-2 flex-shrink-0"
                  size={16}
                />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SelectChainButton;
