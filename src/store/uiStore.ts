import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Tab } from "@/types/ui";

type Theme = "light" | "dark";

//lending
export type LendingTabType = "markets" | "dashboard" | "staking" | "history";

interface LendingState {
  activeMainTab: LendingTabType;
  dashboardSupplyMode: boolean;
  dashboardShowAvailable: boolean;
  dashboardShowZeroBalance: boolean;
}

interface UIStoreState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  sourceTokenSelectOpen: boolean;
  setSourceTokenSelectOpen: (open: boolean) => void;
  destinationTokenSelectOpen: boolean;
  setDestinationTokenSelectOpen: (open: boolean) => void;
  // lending
  lending: LendingState;
  setLendingActiveMainTab: (tab: LendingTabType) => void;
  setLendingDashboardSupplyMode: (isSupply: boolean) => void;
  setLendingDashboardShowAvailable: (showAvailable: boolean) => void;
  setLendingDashboardShowZeroBalance: (showZeroBalance: boolean) => void;
}

// Safely update DOM theme
const updateDOMTheme = (theme: Theme) => {
  if (typeof window !== "undefined") {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
};

const useUIStore = create<UIStoreState>()(
  persist(
    (set) => ({
      activeTab: "swap",
      setActiveTab: (tab) => set({ activeTab: tab }),

      theme: "dark", // Default to dark theme
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          updateDOMTheme(newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        updateDOMTheme(theme);
        set({ theme });
      },
      sourceTokenSelectOpen: false,
      setSourceTokenSelectOpen: (open) => {
        return set({ sourceTokenSelectOpen: open });
      },
      destinationTokenSelectOpen: false,
      setDestinationTokenSelectOpen: (open) => {
        return set({ destinationTokenSelectOpen: open });
      },
      // lending
      lending: {
        activeMainTab: "markets",
        dashboardSupplyMode: true,
        dashboardShowAvailable: true,
        dashboardShowZeroBalance: false,
      },
      setLendingActiveMainTab: (tab) =>
        set((state) => ({
          lending: { ...state.lending, activeMainTab: tab },
        })),
      setLendingDashboardSupplyMode: (isSupply) =>
        set((state) => ({
          lending: { ...state.lending, dashboardSupplyMode: isSupply },
        })),
      setLendingDashboardShowAvailable: (showAvailable) =>
        set((state) => ({
          lending: { ...state.lending, dashboardShowAvailable: showAvailable },
        })),
      setLendingDashboardShowZeroBalance: (showZeroBalance) =>
        set((state) => ({
          lending: {
            ...state.lending,
            dashboardShowZeroBalance: showZeroBalance,
          },
        })),
    }),
    {
      name: "altverse-storage-ui",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

// Initialize theme
if (typeof window !== "undefined") {
  // Get stored theme first
  const storedTheme = localStorage.getItem("altverse-storage-ui");
  const store = useUIStore.getState();

  if (!storedTheme) {
    // If no stored theme, use system preference
    const systemTheme = "dark"; // Default to dark theme
    store.setTheme(systemTheme);
  } else {
    // If theme was stored, ensure DOM matches stored state
    const parsedData = JSON.parse(storedTheme);
    if (parsedData.state?.theme) {
      updateDOMTheme(parsedData.state.theme);
    }
  }
}

export default useUIStore;
