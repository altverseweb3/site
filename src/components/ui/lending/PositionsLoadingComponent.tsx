import React from "react";

interface PositionsLoadingComponentProps {
  message?: string;
}

const PositionsLoadingComponent: React.FC<PositionsLoadingComponentProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className="text-white text-center py-8">
      <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-2"></div>
      <div>{message}</div>
    </div>
  );
};

export default PositionsLoadingComponent;
