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
    disabled: true,
    disabledMessage: "Coming soon",
  },
  lending: {
    label: "lending",
    disabled: true,
    disabledMessage: "Coming soon",
  },
  dashboard: {
    label: "dashboard",
    disabled: true,
    disabledMessage: "Coming soon",
  },
};
