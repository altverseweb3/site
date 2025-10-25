"use client";

import { useState, useEffect, useMemo } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RefreshCw, Search } from "lucide-react";
import LeaderboardTable from "@/components/ui/leaderboard/LeaderboardTable";
import LeaderboardCard from "@/components/ui/leaderboard/LeaderboardCard";
import {
  fetchAllGlobalLeaderboard,
  fetchAllWeeklyLeaderboard,
  fetchUserLeaderboardEntry,
} from "@/utils/leaderboard/fetchEntries";
import {
  GlobalLeaderboardEntry,
  WeeklyLeaderboardEntry,
  UserLeaderboardEntryResponse,
} from "@/api/altverse";

type LeaderboardType = "weekly" | "global";

const ITEMS_PER_PAGE = 10;

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardType>("weekly");
  const [searchAddress, setSearchAddress] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalEntries, setGlobalEntries] = useState<GlobalLeaderboardEntry[]>(
    [],
  );
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>(
    [],
  );
  const [searchedUserEntry, setSearchedUserEntry] =
    useState<UserLeaderboardEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [timeToReset, setTimeToReset] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Check viewport width for responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [global, weekly] = await Promise.all([
        fetchAllGlobalLeaderboard(),
        fetchAllWeeklyLeaderboard(),
      ]);
      setGlobalEntries(global);
      setWeeklyEntries(weekly);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch leaderboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Countdown timer for weekly reset (resets every Monday at 00:00 UTC)
  useEffect(() => {
    const calculateTimeToReset = () => {
      const now = new Date();
      const nextMonday = new Date(now);

      // Get days until next Monday (0 = Sunday, 1 = Monday, etc.)
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
      nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
      nextMonday.setUTCHours(0, 0, 0, 0);

      const diff = nextMonday.getTime() - now.getTime();

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeToReset({ days, hours, minutes, seconds });
    };

    calculateTimeToReset();
    const interval = setInterval(calculateTimeToReset, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSearchChange = async (value: string) => {
    setSearchAddress(value);
    setCurrentPage(1); // Reset to first page when searching

    if (!value.trim()) {
      setSearchedUserEntry(null);
      setSearchQuery("");
      return;
    }

    const query = value.trim();

    // If less than 40 characters, do substring search in existing entries
    if (query.length < 40) {
      setSearchQuery(query);
      setSearchedUserEntry(null);
      return;
    }

    // If 40 or more characters, fetch from API
    try {
      const userEntry = await fetchUserLeaderboardEntry(query);
      setSearchedUserEntry(userEntry);
      setSearchQuery(query);
    } catch (err) {
      console.error("Error searching user:", err);
      setSearchedUserEntry(null);
      setSearchQuery(query);
    }
  };

  const handleRefresh = () => {
    fetchData();
    setSearchedUserEntry(null);
    setSearchAddress("");
    setSearchQuery("");
  };

  const handleTabChange = (value: LeaderboardType) => {
    if (value) {
      setActiveTab(value);
      setCurrentPage(1); // Reset to first page when changing tabs
    }
  };

  const currentEntries = activeTab === "weekly" ? weeklyEntries : globalEntries;

  // Filter entries based on substring search
  const filteredEntries = useMemo(() => {
    if (!searchQuery || searchQuery.length >= 40) return currentEntries;

    const query = searchQuery.toLowerCase();
    return currentEntries.filter((entry) =>
      entry.user_address.toLowerCase().includes(query),
    );
  }, [searchQuery, currentEntries]);

  const displayEntries =
    searchQuery && searchQuery.length < 40 ? filteredEntries : currentEntries;

  // Pagination calculations
  const totalPages = Math.ceil(displayEntries.length / ITEMS_PER_PAGE);
  const paginatedEntries = displayEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Find rank and prepare searched entry for display
  const searchedEntryData = useMemo(() => {
    if (!searchedUserEntry || !searchQuery || searchQuery.length < 40)
      return null;

    if (activeTab === "global") {
      const rank =
        globalEntries.findIndex(
          (e) => e.user_address.toLowerCase() === searchQuery.toLowerCase(),
        ) + 1;

      if (rank > 0 && rank <= 100) {
        return { rank, entry: globalEntries[rank - 1] };
      } else if (searchedUserEntry.global_total_xp > 0) {
        // User not in top 100, create entry for display
        const userEntry: GlobalLeaderboardEntry = {
          user_address: searchedUserEntry.user_address,
          total_xp: searchedUserEntry.global_total_xp,
          first_active_timestamp: new Date().toISOString(),
        };
        return { rank: rank > 0 ? rank : 101, entry: userEntry };
      }
    } else {
      const rank =
        weeklyEntries.findIndex(
          (e) => e.user_address.toLowerCase() === searchQuery.toLowerCase(),
        ) + 1;

      if (rank > 0 && rank <= 100) {
        return { rank, entry: weeklyEntries[rank - 1] };
      } else if (searchedUserEntry.weekly_xp > 0) {
        // User not in top 100, create entry for display
        const userEntry: WeeklyLeaderboardEntry = {
          user_address: searchedUserEntry.user_address,
          xp: searchedUserEntry.weekly_xp,
          first_xp_timestamp: new Date().toISOString(),
        };
        return { rank: rank > 0 ? rank : 101, entry: userEntry };
      }
    }

    return null;
  }, [searchedUserEntry, searchQuery, activeTab, globalEntries, weeklyEntries]);

  return (
    <div className="container mx-auto px-2 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-6">
          {/* Large screens: everything in one row */}
          <div className="hidden xl:flex items-center gap-6">
            {/* Tabs */}
            <div className="overflow-x-auto">
              <ToggleGroup
                type="single"
                value={activeTab}
                onValueChange={handleTabChange}
                variant="outline"
                className="justify-start shrink-0 min-w-max"
              >
                <ToggleGroupItem
                  value="weekly"
                  className="data-[state=on]:text-[#FAFAFA]"
                >
                  weekly
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="global"
                  className="data-[state=on]:text-[#FAFAFA]"
                >
                  global
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="flex items-center gap-6 ml-auto">
              {/* Weekly Reset Timer */}
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <span className="text-[#FAFAFA]">weekly reset:</span>
                <span className="font-mono text-amber-500">
                  {String(timeToReset.days).padStart(2, "0")}:
                  {String(timeToReset.hours).padStart(2, "0")}:
                  {String(timeToReset.minutes).padStart(2, "0")}:
                  {String(timeToReset.seconds).padStart(2, "0")}
                </span>
              </div>

              {/* Search and Refresh */}
              <div className="flex gap-4 items-center">
                <div className="relative w-80">
                  <Input
                    type="text"
                    placeholder="search by address"
                    value={searchAddress}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="h-8 pr-10 bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-amber-500/80 focus:ring-amber-500/80 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  className="bg-[#18181B] border-[#27272A] text-[#FAFAFA] hover:bg-[#1C1C1F] hover:border-[#3F3F46] h-8 px-3 flex-shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Smaller screens: two rows */}
          <div className="xl:hidden flex flex-col gap-4">
            {/* Row 1: Tabs and Timer */}
            <div className="flex items-center justify-between gap-4">
              <div className="overflow-x-auto">
                <ToggleGroup
                  type="single"
                  value={activeTab}
                  onValueChange={handleTabChange}
                  variant="outline"
                  className="justify-start shrink-0 min-w-max"
                >
                  <ToggleGroupItem
                    value="weekly"
                    className="data-[state=on]:text-[#FAFAFA]"
                  >
                    weekly
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="global"
                    className="data-[state=on]:text-[#FAFAFA]"
                  >
                    global
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Weekly Reset Timer */}
              <div className="flex items-center gap-2 text-sm whitespace-nowrap">
                <span className="text-[#FAFAFA]">weekly reset:</span>
                <span className="font-mono text-amber-500">
                  {String(timeToReset.days).padStart(2, "0")}:
                  {String(timeToReset.hours).padStart(2, "0")}:
                  {String(timeToReset.minutes).padStart(2, "0")}:
                  {String(timeToReset.seconds).padStart(2, "0")}
                </span>
              </div>
            </div>

            {/* Row 2: Search and Refresh */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="search by address"
                  value={searchAddress}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-8 pr-10 bg-[#18181B] border-[#27272A] text-[#FAFAFA] placeholder:text-[#A1A1AA] focus:border-amber-500/80 focus:ring-amber-500/80 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none">
                  <Search className="h-4 w-4" />
                </div>
              </div>
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="bg-[#18181B] border-[#27272A] text-[#FAFAFA] hover:bg-[#1C1C1F] hover:border-[#3F3F46] h-8 px-3 flex-shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden 2xl:mb-0 mb-12">
          {loading ? (
            <div className="text-center py-16">
              <div className="text-[#A1A1AA]">loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-red-400">error: {error}</div>
            </div>
          ) : (
            <>
              {/* Desktop: Table View */}
              {!isMobile && (
                <>
                  <LeaderboardTable
                    entries={paginatedEntries}
                    type={activeTab}
                    searchedEntry={searchedEntryData}
                    startRank={(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  />

                  {/* Desktop Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t border-[#27272A] gap-4">
                      <div className="text-sm text-[#A1A1AA] order-2 sm:order-1">
                        showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          displayEntries.length,
                        )}{" "}
                        of {displayEntries.length} results
                      </div>
                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let page;
                              if (totalPages <= 5) {
                                page = i + 1;
                              } else if (currentPage <= 3) {
                                page = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                              } else {
                                page = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={`w-8 h-8 text-sm rounded ${
                                    page === currentPage
                                      ? "bg-amber-500/25 text-amber-500 border border-[#61410B]"
                                      : "border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            },
                          )}
                        </div>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Mobile: Card View */}
              {isMobile && (
                <>
                  <div className="p-4 space-y-3">
                    {paginatedEntries.map((entry, index) => {
                      const actualRank =
                        (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                      return (
                        <LeaderboardCard
                          key={`${entry.user_address}-${index}`}
                          entry={entry}
                          type={activeTab}
                          rank={actualRank}
                        />
                      );
                    })}
                    {searchedEntryData &&
                      searchedEntryData.rank > 100 &&
                      currentPage === totalPages && (
                        <LeaderboardCard
                          entry={searchedEntryData.entry}
                          type={activeTab}
                          rank={searchedEntryData.rank}
                          isSearchedEntry={true}
                        />
                      )}
                    {displayEntries.length === 0 && (
                      <div className="text-center py-8 text-[#A1A1AA]">
                        no entries found
                      </div>
                    )}
                  </div>

                  {/* Mobile Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t border-[#27272A] gap-4">
                      <div className="text-sm text-[#A1A1AA] order-2 sm:order-1">
                        showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                        {Math.min(
                          currentPage * ITEMS_PER_PAGE,
                          displayEntries.length,
                        )}{" "}
                        of {displayEntries.length} results
                      </div>
                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let page;
                              if (totalPages <= 5) {
                                page = i + 1;
                              } else if (currentPage <= 3) {
                                page = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                              } else {
                                page = currentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  className={`w-8 h-8 text-sm rounded ${
                                    page === currentPage
                                      ? "bg-amber-500/25 text-amber-500 border border-[#61410B]"
                                      : "border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]"
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            },
                          )}
                        </div>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
