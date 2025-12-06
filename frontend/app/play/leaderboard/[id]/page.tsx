// app/play/leaderboard/[id]/page.jsx
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../api/backend";
import LeaderboardTable from "@/components/LeaderboardTable";

export default function LeaderboardPage() {
  const { id } = useParams();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await api.get(`/quizzes/${id}/results`);
      setRows(res.data.results || []);
    }
    load();
  }, [id]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Leaderboard</h2>
      <LeaderboardTable rows={rows} />
    </div>
  );
}
