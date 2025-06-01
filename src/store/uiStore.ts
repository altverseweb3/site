import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Tab } from "@/types/ui";

type Theme = "light" | "dark";

interface UIStoreState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  tokenSelectOpen: boolean;
  setTokenSelectOpen: (open: boolean) => void;
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

      theme: "light",
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === "light" ? "dark" : "light";
          console.log("Toggling theme to:", newTheme);
          updateDOMTheme(newTheme);
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        updateDOMTheme(theme);
        set({ theme });
      },
      tokenSelectOpen: false,
      setTokenSelectOpen: (open) => set({ tokenSelectOpen: open }),
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
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
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
