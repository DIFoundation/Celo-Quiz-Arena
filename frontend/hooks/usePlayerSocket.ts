'use client'
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

export default function usePlayerSocket(quizId: string, wallet: string, onEvents: any = {}) {
  const socketRef = useRef<any>(null);

  useEffect(() => {
    if (!quizId || !wallet) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL);

    socketRef.current.emit("join_quiz", { quizId, wallet });

    // Listen for events
    if (onEvents.playerJoined) {
      socketRef.current.on("player_joined", onEvents.playerJoined);
    }

    if (onEvents.gameStarted) {
      socketRef.current.on("game_started", onEvents.gameStarted);
    }

    return () => {
      socketRef.current.disconnect();
    };
  }, [quizId, wallet, onEvents]);

  return socketRef.current;
}
