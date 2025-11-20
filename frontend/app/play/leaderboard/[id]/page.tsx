"use client";

import { useParams } from "next/navigation";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import LeaderboardTable from "@/components/quiz/LeaderboardTable";

export default function Leaderboard() {
  const { id } = useParams();
  const { leaderboard } = useLeaderboard(id);

  return (
    <div className="p-10">
      <LeaderboardTable rows={leaderboard} />
    </div>
  );
}
