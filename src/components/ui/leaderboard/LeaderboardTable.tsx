import { GlobalLeaderboardEntry, WeeklyLeaderboardEntry } from "@/api/altverse";
import { Trophy, Medal } from "lucide-react";

interface LeaderboardTableProps {
  entries: (GlobalLeaderboardEntry | WeeklyLeaderboardEntry)[];
  type: "weekly" | "global";
  searchedEntry?: {
    rank: number;
    entry: GlobalLeaderboardEntry | WeeklyLeaderboardEntry;
  } | null;
  startRank?: number; // Starting rank for pagination
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  type,
  searchedEntry,
  startRank = 1,
}) => {
  const tableHeaderClass = `px-4 py-2 text-left text-sm font-semibold text-zinc-300 lowercase tracking-wider`;

  const getTrophyIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="h-4 w-4 text-gray-400" />;
    } else if (rank === 3) {
      return <Medal className="h-4 w-4 text-amber-700" />;
    }
    return null;
  };

  const formatAddress = (address: string) => {
    return (
      <>
        {/* Full address on large screens (1024px+) */}
        <span className="hidden lg:inline">{address}</span>
        {/* Tablet: 16 start + 12 end (640px-1023px) */}
        <span className="hidden sm:inline lg:hidden">
          {address.slice(0, 16)}...{address.slice(-12)}
        </span>
        {/* Medium: 12 start + 10 end (500px-639px) */}
        <span className="hidden min-[500px]:inline sm:hidden">
          {address.slice(0, 12)}...{address.slice(-10)}
        </span>
        {/* Small: 7 start + 5 end (under 500px) */}
        <span className="min-[500px]:hidden">
          {address.slice(0, 7)}...{address.slice(-5)}
        </span>
      </>
    );
  };

  const formatXP = (xp: number) => {
    return xp.toLocaleString();
  };

  const getXP = (entry: GlobalLeaderboardEntry | WeeklyLeaderboardEntry) => {
    if (type === "global") {
      return (entry as GlobalLeaderboardEntry).total_xp;
    }
    return (entry as WeeklyLeaderboardEntry).xp;
  };

  const displayEntries =
    searchedEntry && searchedEntry.rank > 100
      ? [...entries, searchedEntry.entry]
      : entries;

  const getRank = (index: number) => {
    if (
      searchedEntry &&
      searchedEntry.rank > 100 &&
      index === displayEntries.length - 1
    ) {
      return `>${searchedEntry.rank}`;
    }
    return `${startRank + index}`;
  };

  return (
    <div className="w-full overflow-hidden">
      <table className="w-full">
        <thead className="bg-zinc-800/90 border-b border-[#27272A]">
          <tr>
            <th className={`${tableHeaderClass} w-20`}>rank</th>
            <th className={tableHeaderClass}>address</th>
            <th className={`${tableHeaderClass} text-right`}>
              {type === "weekly" ? "weekly xp" : "global xp"}
            </th>
          </tr>
        </thead>
        <tbody className="bg-[#18181B] divide-y divide-[#27272A]">
          {displayEntries.map((entry, index) => {
            const isSearchedEntry =
              searchedEntry &&
              searchedEntry.rank > 100 &&
              index === displayEntries.length - 1;

            return (
              <tr
                key={`${entry.user_address}-${index}`}
                className={isSearchedEntry ? "bg-sky-950/30" : ""}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[#FAFAFA] text-sm font-mono">
                      {getRank(index)}
                    </span>
                    {getTrophyIcon(startRank + index)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[#FAFAFA] text-sm font-mono">
                    {formatAddress(entry.user_address)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-[#FAFAFA] font-mono text-sm">
                    {formatXP(getXP(entry))}
                  </span>
                </td>
              </tr>
            );
          })}
          {displayEntries.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-[#A1A1AA]">
                no entries found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
