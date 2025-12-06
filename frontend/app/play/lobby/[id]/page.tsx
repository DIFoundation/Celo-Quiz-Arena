"use client";

import { useState } from "react";
import { useConnection } from "wagmi";
import usePlayerSocket from "@/hooks/usePlayerSocket";

export default function PlayerLobby({ params }: { params: { id: string } }) {
  const { id: quizId } = params;
  const [players, setPlayers] = useState<string[]>([]);
  const { address: wallet } = useConnection();

  usePlayerSocket(quizId, wallet || "", {
    playerJoined: ({ wallet }: { wallet: string }) => {
      setPlayers((prev: string[]) => [...prev, wallet]);
    },
    gameStarted: () => {
      window.location.href = `/player/${quizId}/question`;
    },
  });

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl">Please connect your wallet to join the game</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold">Waiting for host...</h1>
      <p className="mt-2">Game ID: {quizId}</p>
      <p className="mb-4">Your wallet: {wallet}</p>

      <h2 className="text-xl">Players Joined:</h2>
      <ul className="mt-2">
        {players.map((p, i) => (
          <li key={i} className="text-center">{p}</li>
        ))}
      </ul>
    </div>
  );
}
