import React from "react";

const SupplyAvailablePositionsHeader = ({
  text = "available positions",
  ...props
}) => {
  return (
    <div className="w-full flex items-center h-[65px]" {...props}>
      {/* Title - fixed width with more padding */}
      <div className="w-40 flex-shrink-0 pl-6">
        <span className="text-base font-bold text-white">{text}</span>
      </div>
      <div className="w-12 flex-shrink-0"></div>
    </div>
  );
};

export default SupplyAvailablePositionsHeader;
