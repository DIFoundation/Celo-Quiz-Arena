"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export default function HostLobby({ params }) {
  const { quizId } = params;
  const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL);

  useEffect(() => {
    socket.emit("join_quiz", { quizId, wallet: "HOST" });
  }, []);

  const startGame = () => {
    socket.emit("start_game", { quizId });

    // optional API call:
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/host/${quizId}/start`, {
      method: "POST",
    });
  };

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-3xl font-bold">Host Lobby</h1>

      <button
        onClick={startGame}
        className="mt-6 px-6 py-3 bg-green-600 text-white rounded-lg"
      >
        Start Game
      </button>
    </div>
  );
}
