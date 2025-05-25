import React from "react";
import MetricsCard from "@/components/ui/lending/SupplyBorrowMetricsCard";
import SupplyBorrowToggle from "@/components/ui/lending/SupplyBorrowToggle";

interface SupplyBorrowMetricsHeadersProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SupplyBorrowMetricsHeaders: React.FC<SupplyBorrowMetricsHeadersProps> = ({
  activeTab,
  onTabChange,
}) => {
  // First card metrics (networth, net APY, health factor)
  const metricsDataHealth = [
    {
      label: "Net Worth",
      value: "0.21",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Net APY",
      value: "2.07",
      suffix: "%",
      color: "text-white",
    },
    {
      label: "Health Factor",
      value: "1.59",
      color: "text-amber-500",
      showButton: true,
      buttonText: "risk details",
    },
  ];

  // Second card metrics (market size, available, borrows)
  const marketMetrics = [
    {
      label: "Market Size",
      value: "23.35B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Available",
      value: "14.18B",
      prefix: "$",
      color: "text-white",
    },
    {
      label: "Borrows",
      value: "8.53B",
      prefix: "$",
      color: "text-white",
    },
  ];

  const handleButtonClick = (metricLabel: string): void => {
    console.log(`Button clicked for ${metricLabel}`);
    // Add your logic for showing risk details here
  };

  return (
    <div className="w-full pb-4">
      {/* Mobile and tablet views */}
      <div className="flex flex-col gap-4 xl:hidden">
        {/* Supply/Borrow Toggle */}
        <div className="w-full">
          <SupplyBorrowToggle
            activeTab={activeTab}
            onTabChange={onTabChange}
            className="w-full"
          />
        </div>

        {/* Metrics cards stacked vertically with full width */}
        <div className="w-full">
          <MetricsCard
            metrics={metricsDataHealth}
            onButtonClick={handleButtonClick}
            className="w-full"
          />
        </div>
        <div className="w-full">
          <MetricsCard metrics={marketMetrics} className="w-full" />
        </div>
      </div>

      {/* Desktop view with responsive layout - only show on xl screens */}
      <div className="hidden xl:block">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-shrink-0 w-full xl:w-auto">
            <SupplyBorrowToggle
              activeTab={activeTab}
              onTabChange={onTabChange}
            />
          </div>

          {/* Metrics cards with responsive layout */}
          <div className="flex flex-wrap justify-end gap-4 w-full xl:w-auto">
            <div className="w-full xl:w-auto">
              <MetricsCard
                metrics={metricsDataHealth}
                onButtonClick={handleButtonClick}
                className="w-full xl:w-auto"
              />
            </div>
            <div className="w-full xl:w-auto">
              <MetricsCard
                metrics={marketMetrics}
                className="w-full xl:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyBorrowMetricsHeaders;
