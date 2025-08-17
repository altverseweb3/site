import React from "react";

interface PositionsEmptyStateComponentProps {
  title: string;
  subtitle?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
  refreshText?: string;
  isError?: boolean;
}

const PositionsEmptyStateComponent: React.FC<
  PositionsEmptyStateComponentProps
> = ({
  title,
  subtitle,
  showRefreshButton = false,
  onRefresh,
  refreshDisabled = false,
  refreshText = "Refresh",
  isError = false,
}) => {
  return (
    <div className="text-center py-8">
      <div className={`mb-4 ${isError ? "text-red-400" : "text-gray-400"}`}>
        {title}
      </div>
      {subtitle && <div className="text-sm text-gray-500 mb-4">{subtitle}</div>}
      {showRefreshButton && onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshDisabled}
          className="px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition-colors disabled:opacity-50"
        >
          {refreshText}
        </button>
      )}
    </div>
  );
};

export default PositionsEmptyStateComponent;
