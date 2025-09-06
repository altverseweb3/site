export interface LendingFilters {
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  assetFilter: string;
}

export interface LendingSortConfig {
  column: string;
  direction: "asc" | "desc";
}
