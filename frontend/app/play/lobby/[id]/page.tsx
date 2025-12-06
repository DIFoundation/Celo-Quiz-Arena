"use client";

import { useState, use } from "react";
import usePlayerSocket from "@/hooks/usePlayerSocket";
import { useConnection } from "wagmi"; // or however you're managing wallet connection

export default function PlayerLobby({ 
  params 
}: { 
  params: Promise<{ id: string }> // Note: it's 'id' not 'quizId' based on your folder structure
}) {
  const { id: quizId } = use(params);
  const { address: wallet } = useConnection(); // Get wallet from wagmi
  const [players, setPlayers] = useState<string[]>([]);

  usePlayerSocket(quizId, wallet || "", {
    playerJoined: ({ wallet }: { wallet: string }) => {
      setPlayers((prev) => {
        if (prev.includes(wallet)) return prev;
        return [...prev, wallet];
      });
    },
    playerLeft: ({ wallet }: { wallet: string }) => {
      setPlayers((prev) => prev.filter(p => p !== wallet));
    },
    gameStarted: () => {
      window.location.href = `/player/${quizId}/question`;
    },
  });

  // Show loading if wallet not connected
  if (!wallet) {
    return (
      <div className="flex flex-col items-center mt-10">
        <h1 className="text-3xl font-bold">Please connect your wallet</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold">Waiting for host...</h1>

      <h2 className="mt-4 text-xl">Players Joined: {players.length}</h2>
      <ul className="mt-2 space-y-2">
        {players.length === 0 ? (
          <li className="text-gray-500">No players yet...</li>
        ) : (
          players.map((p, i) => (
            <li key={p} className="text-sm font-mono">
              {i + 1}. {p}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}