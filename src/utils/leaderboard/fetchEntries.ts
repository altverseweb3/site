import {
  altverseAPI,
  GlobalLeaderboardEntry,
  UserLeaderboardEntryResponse,
  WeeklyLeaderboardEntry,
} from "@/api/altverse";

// Define the limit of number of entries to return.
const PAGE_LIMIT = 100;

/**
 * Fetches the complete global leaderboard, handling pagination automatically.
 * The entries are sorted by total_xp (descending), then by
 * first_active_timestamp (ascending).
 *
 * @returns A promise that resolves to an array of GlobalLeaderboardEntry.
 * @throws Will throw an error if the API call fails.
 */
export async function fetchAllGlobalLeaderboard(): Promise<
  GlobalLeaderboardEntry[]
> {
  const allEntries: GlobalLeaderboardEntry[] = [];

  try {
    const response = await altverseAPI.getLeaderboard({
      queryType: "leaderboard",
      scope: "global",
      limit: PAGE_LIMIT,
    });

    if (response.error || !response.data) {
      throw new Error(
        response.error ||
          "Failed to fetch global leaderboard: No data returned",
      );
    }

    if (response.data.items) {
      allEntries.push(...(response.data.items as GlobalLeaderboardEntry[]));
    }

    // Perform the final client-side sort
    allEntries.sort((a, b) => {
      // 1. Sort by total_xp descending
      const xpDiff = b.total_xp - a.total_xp;
      if (xpDiff !== 0) {
        return xpDiff;
      }
      // 2. If XP is equal, sort by first_active_timestamp ascending
      return (
        new Date(a.first_active_timestamp).getTime() -
        new Date(b.first_active_timestamp).getTime()
      );
    });

    return allEntries;
  } catch (error) {
    console.error("Error in fetchAllGlobalLeaderboard:", error);
    throw error;
  }
}

/**
 * Fetches the complete weekly leaderboard, handling pagination automatically.
 * The entries are sorted by xp (descending), then by
 * first_xp_timestamp (ascending).
 *
 * @returns A promise that resolves to an array of WeeklyLeaderboardEntry.
 * @throws Will throw an error if the API call fails.
 */
export async function fetchAllWeeklyLeaderboard(): Promise<
  WeeklyLeaderboardEntry[]
> {
  const allEntries: WeeklyLeaderboardEntry[] = [];

  try {
    const response = await altverseAPI.getLeaderboard({
      queryType: "leaderboard",
      scope: "weekly",
      limit: PAGE_LIMIT,
    });

    if (response.error || !response.data) {
      throw new Error(
        response.error ||
          "Failed to fetch weekly leaderboard: No data returned",
      );
    }

    if (response.data.items) {
      allEntries.push(...(response.data.items as WeeklyLeaderboardEntry[]));
    }

    // Perform the final client-side sort
    allEntries.sort((a, b) => {
      // 1. Sort by xp descending
      const xpDiff = b.xp - a.xp;
      if (xpDiff !== 0) {
        return xpDiff;
      }
      // 2. If XP is equal, sort by first_xp_timestamp ascending
      return (
        new Date(a.first_xp_timestamp).getTime() -
        new Date(b.first_xp_timestamp).getTime()
      );
    });

    return allEntries;
  } catch (error) {
    console.error("Error in fetchAllWeeklyLeaderboard:", error);
    throw error;
  }
}

/**
 * Fetches a single user's global and weekly leaderboard data.
 *
 * @param userAddress The user's address to query.
 * @returns A promise that resolves to the user's leaderboard data, or null if not found.
 * @throws Will throw an error if the API call fails.
 */
export async function fetchUserLeaderboardEntry(
  userAddress: string,
): Promise<UserLeaderboardEntryResponse | null> {
  try {
    const response = await altverseAPI.getUserLeaderboardEntry({
      queryType: "user_leaderboard_entry",
      user_address: userAddress,
    });

    if (response.error) {
      throw new Error(response.error);
    }

    return response.data;
  } catch (error) {
    console.error("Error in fetchUserLeaderboardEntry:", error);
    throw error;
  }
}
