'use client'
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export default function usePlayerSocket(
  quizId: string, 
  wallet: string, 
  onEvents: {
    playerJoined?: (data: { wallet: string }) => void;
    playerLeft?: (data: { wallet: string }) => void;
    gameStarted?: () => void;
  } = {}
) {
  const socketRef = useRef<Socket | null>(null);
  const onEventsRef = useRef(onEvents);

  // Keep onEvents ref updated without causing re-connections
  useEffect(() => {
    onEventsRef.current = onEvents;
  }, [onEvents]);

  useEffect(() => {
    if (!quizId || !wallet) return;

    // Connect to socket
    socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001");

    // Join quiz room
    socketRef.current.emit("join_quiz", { quizId, wallet });

    // Listen for player joined event
    const handlePlayerJoined = (data: { wallet: string }) => {
      onEventsRef.current.playerJoined?.(data);
    };

    // Listen for player left event
    const handlePlayerLeft = (data: { wallet: string }) => {
      onEventsRef.current.playerLeft?.(data);
    };

    // Listen for game started event
    const handleGameStarted = () => {
      onEventsRef.current.gameStarted?.();
    };

    // Attach event listeners
    socketRef.current.on("player_joined", handlePlayerJoined);
    socketRef.current.on("player_left", handlePlayerLeft);
    socketRef.current.on("game_started", handleGameStarted);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.off("player_joined", handlePlayerJoined);
        socketRef.current.off("player_left", handlePlayerLeft);
        socketRef.current.off("game_started", handleGameStarted);
        socketRef.current.disconnect();
      }
    };
  }, [quizId, wallet]); // Only reconnect when quizId or wallet changes

  return socketRef.current;
}