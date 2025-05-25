import React from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface Metric {
  label: string;
  value: string;
  color?: string;
  prefix?: string;
  suffix?: string;
  showButton?: boolean;
  buttonText?: string;
}

interface MetricsCardProps {
  metrics: Metric[];
  className?: string;
  onButtonClick?: (metricLabel: string) => void;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  metrics,
  className,
  onButtonClick,
}) => {
  // Determine whether to use fixed width or responsive width
  const useFixedWidth =
    !className || (!className.includes("w-") && !className.includes("max-w-"));

  return (
    <Card
      className={`
                rounded-md border border-[#232326] bg-transparent text-card-foreground shadow
                ${useFixedWidth ? "w-full md:w-auto max-w-full md:min-w-[500px] h-auto min-h-[64px]" : ""}
                ${className || ""}
            `}
    >
      <CardContent className="flex flex-wrap px-5 py-4">
        {metrics.map((metric, index) => (
          <div
            key={`metric-${index}`}
            className={`
              flex flex-col items-center text-center
              ${metrics.length <= 3 ? "flex-1 md:px-4" : "w-1/2 mb-4 md:px-2"}
              ${metrics.length === 2 ? "w-1/2 md:px-6" : ""}
            `}
          >
            {/* Label with consistent height */}
            <div className="h-5 mb-1.5 whitespace-nowrap text-[14px] font-[400] font-['Urbanist'] leading-4 text-[#FFFFFF80]">
              {metric.label}
            </div>

            {/* Value container with consistent alignment */}
            <div className="flex items-center justify-center h-6 whitespace-nowrap">
              {metric.prefix && (
                <span className="numeric-input text-base font-medium text-white">
                  {metric.prefix}
                </span>
              )}

              <span
                className={`numeric-input text-base font-medium ${metric.color || "text-white"}`}
              >
                {metric.value}
              </span>

              {metric.suffix && (
                <span className="numeric-input text-base font-medium text-white ml-0.5">
                  {metric.suffix}
                </span>
              )}

              {/* Button inline with the value */}
              {metric.showButton && metric.buttonText && (
                <button
                  onClick={() => onButtonClick?.(metric.label)}
                  className="ml-2 rounded bg-[#232326] px-2 py-[2px] text-xs text-[#FFFFFF80] font-['Urbanist'] leading-none whitespace-nowrap hover:bg-[#2a2a2e]"
                >
                  {metric.buttonText}
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MetricsCard;
