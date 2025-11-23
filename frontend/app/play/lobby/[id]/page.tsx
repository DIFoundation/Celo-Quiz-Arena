"use client";

import { useState } from "react";
import usePlayerSocket from "@/hooks/usePlayerSocket";

export default function PlayerLobby({ params, wallet }: { params: { quizId: string }, wallet: string }) {
  const { quizId } = params;
  const [players, setPlayers] = useState<string[]>([]);

  usePlayerSocket(quizId, wallet, {
    playerJoined: ({ wallet }: { wallet: string }) => {
      setPlayers((prev: string[]) => [...prev, wallet]);
    },
    gameStarted: () => {
      window.location.href = `/player/${quizId}/question`;
    },
  });

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold">Waiting for host...</h1>

      <h2 className="mt-4 text-xl">Players Joined:</h2>
      <ul className="mt-2">
        {players.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
  