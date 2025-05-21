import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface SupplyBorrowToggleProps {
  activeTab?: string;
  onTabChange?: (button: string) => void;
  className?: string;
  showSupplyData?: React.ReactNode;
  showBorrowData?: React.ReactNode;
}

const SupplyBorrowToggle = ({
  activeTab = "borrow",
  onTabChange = () => {},
  className = "",
  showSupplyData,
  showBorrowData,
}: SupplyBorrowToggleProps) => {
  const [activeButton, setActiveButton] = useState(activeTab);

  const handleClick = (button: string) => {
    setActiveButton(button);
    onTabChange(button);
  };

  // Common button classes extracted to avoid repetition
  const commonButtonClasses =
    "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background py-1 px-8 border border-solid rounded-lg text-sm h-6 w-full sm:flex-1 min-w-[150px]";

  // Active and inactive style classes
  const activeStyle =
    "bg-[#4F3917] hover:bg-[#5e4520] text-[#F59E0B] border-[#61410B]";
  const inactiveStyle =
    "bg-[#27272ABF] hover:bg-[#323232] text-[#52525B] border-[#27272A]";

  // Determine which component to display based on active button
  const activeComponent =
    activeButton === "supply" ? showSupplyData : showBorrowData;

  return (
    <div className="w-full">
      <div
        className={`flex flex-col sm:flex-row p-1 w-full gap-2 ${className}`}
      >
        <Button
          className={`${commonButtonClasses} ${activeButton === "supply" ? activeStyle : inactiveStyle}`}
          onClick={() => handleClick("supply")}
        >
          supply
        </Button>
        <Button
          className={`${commonButtonClasses} ${activeButton === "borrow" ? activeStyle : inactiveStyle}`}
          onClick={() => handleClick("borrow")}
        >
          borrow
        </Button>
      </div>

      {/* Render the active component */}
      {activeComponent && <div className="w-full">{activeComponent}</div>}
    </div>
  );
};

export default SupplyBorrowToggle;
