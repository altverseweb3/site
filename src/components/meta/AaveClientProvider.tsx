"use client";

import { AaveProvider } from "@aave/react";
import { aaveClient } from "@/config/aave/aaveClient";

interface AaveClientProviderProps {
  children: React.ReactNode;
}

export function AaveClientProvider({ children }: AaveClientProviderProps) {
  return <AaveProvider client={aaveClient}>{children}</AaveProvider>;
}
