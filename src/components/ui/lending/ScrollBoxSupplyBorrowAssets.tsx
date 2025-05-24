import * as React from "react";

interface ScrollBoxSupplyBorrowAssetsProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  maxHeight?: string;
}

export function ScrollBoxSupplyBorrowAssets({
  children,
  className = "",
  padding = "p-4",
  maxHeight = "max-h-[420px]",
}: ScrollBoxSupplyBorrowAssetsProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-full h-16 rounded-md border flex items-center justify-center ${className}`}
      >
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${maxHeight} overflow-auto rounded-md border ${className}`}
    >
      <div
        className={`grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4 ${padding}`}
      >
        {children}
      </div>
    </div>
  );
}
