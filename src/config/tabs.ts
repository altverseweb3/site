import { Tab } from "@/types/ui";

interface TabConfig {
  label: string;
  disabled?: boolean;
  disabledMessage?: string;
}

export const TAB_CONFIG: Record<Tab, TabConfig> = {
  swap: {
    label: "swap",
  },
  earn: {
    label: "earn",
  },
  lending: {
    label: "lending",
  },
  leaderboard: {
    label: "leaderboard",
  },
  analytics: {
    label: "analytics",
    disabled: true,
  },
  dashboard: {
    label: "dashboard",
    disabled: true,
    disabledMessage: "Coming soon",
  },
};
