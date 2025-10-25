import { GlobalLeaderboardEntry, WeeklyLeaderboardEntry } from "@/api/altverse";

interface LeaderboardCardProps {
  entry: GlobalLeaderboardEntry | WeeklyLeaderboardEntry;
  type: "weekly" | "global";
  rank: number;
  isSearchedEntry?: boolean;
}

const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entry,
  type,
  rank,
  isSearchedEntry = false,
}) => {
  const formatAddress = (address: string) => {
    return (
      <>
        {/* Medium: 12 start + 10 end (500px+) */}
        <span className="hidden min-[500px]:inline">
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

  const getXP = () => {
    if (type === "global") {
      return (entry as GlobalLeaderboardEntry).total_xp;
    }
    return (entry as WeeklyLeaderboardEntry).xp;
  };

  const displayRank = rank > 100 ? `>${rank}` : `${rank}`;

  const getRankStyles = () => {
    if (rank === 1) {
      return "bg-yellow-500/30 border-yellow-500/60";
    } else if (rank === 2) {
      return "bg-gray-400/30 border-gray-400/60";
    } else if (rank === 3) {
      return "bg-amber-700/30 border-amber-700/60";
    }
    return "bg-zinc-800/90 border-[#27272A]";
  };

  return (
    <div
      className={`border rounded-lg p-4 ${
        isSearchedEntry
          ? "bg-sky-950/30 border-sky-800/50"
          : "bg-[#18181B] border-[#27272A]"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankStyles()}`}
          >
            <span className="text-[#FAFAFA] text-sm font-mono font-semibold">
              {displayRank}
            </span>
          </div>
          <div>
            <div className="text-xs text-[#A1A1AA] mb-1">address</div>
            <div className="font-medium font-mono text-white text-sm">
              {formatAddress(entry.user_address)}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#A1A1AA] mb-1">
            {type === "weekly" ? "weekly xp" : "global xp"}
          </div>
          <div className="font-medium font-mono text-white">
            {formatXP(getXP())}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardCard;
