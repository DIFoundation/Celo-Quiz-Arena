// app/test/socket/page.tsx
// Test page to verify socket connectivity
// Access at: http://localhost:3000/test/socket

"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export default function SocketTestPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [testQuizId, setTestQuizId] = useState("1");

  const addEvent = (event: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents(prev => [`[${timestamp}] ${event}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_SOCKET || "http://localhost:5000";
    
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    socket.on("connecting", () => {
      setConnecting(true);
      addEvent(`Connecting to: ${socketUrl}`);
    })

    socket.on("connect", () => {
      setConnected(true);
      addEvent(`✅ Connected! Socket ID: ${socket?.id}`);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      addEvent("❌ Disconnected");
    });

    socket.on("connect_error", (error) => {
      addEvent(`🔴 Connection Error: ${error.message}`);
    });

    socket.on("room_joined", (data) => {
      addEvent(`✅ Room joined: ${JSON.stringify(data)}`);
    });

    socket.on("player_joined", (data) => {
      addEvent(`🎉 Player joined: ${JSON.stringify(data)}`);
    });

    socket.on("game_started", (data) => {
      addEvent(`🎮 Game started: ${JSON.stringify(data)}`);
    });

    socket.on("error", (data) => {
      addEvent(`❌ Error: ${JSON.stringify(data)}`);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, []);

  const joinAsHost = () => {
    if (!socket) return;
    addEvent(`📤 Emitting join_quiz as HOST for quiz ${testQuizId}`);
    socket.emit("join_quiz", {
      quizId: testQuizId,
      wallet: "0xTEST_HOST",
      isHost: true,
    });
  };

  const joinAsPlayer = () => {
    if (!socket) return;
    const randomWallet = `0xTEST_${Math.random().toString(36).substr(2, 9)}`;
    addEvent(`📤 Emitting join_quiz as PLAYER for quiz ${testQuizId}`);
    socket.emit("join_quiz", {
      quizId: testQuizId,
      wallet: randomWallet,
      name: "Test Player",
      isHost: false,
    });
  };

  const startGame = () => {
    if (!socket) return;
    addEvent(`📤 Emitting start_game for quiz ${testQuizId}`);
    socket.emit("start_game", { quizId: testQuizId });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Socket.io Connection Test</h1>

      {/* Connection Status */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <div>
            <p className="text-lg font-medium">
              {connecting ? 'Connecting...' : connected ? '✅ Connected': '❌ Disconnected'}
            </p>
            {socket?.id && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                Socket ID: {socket.id}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Test Controls</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Quiz ID</label>
          <input
            type="text"
            value={testQuizId}
            onChange={(e) => setTestQuizId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter quiz ID"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={joinAsHost}
            disabled={!connected || connecting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Join as Host
          </button>
          
          <button
            onClick={joinAsPlayer}
            disabled={!connected || connecting}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Join as Player
          </button>
          
          <button
            onClick={startGame}
            disabled={!connected || connecting}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Start Game
          </button>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Event Log</h2>
          <button
            onClick={() => setEvents([])}
            className="text-sm px-3 py-1 bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
        
        <div className="bg-gray-900 text-green-400 rounded p-4 font-mono text-sm h-96 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500">No events yet...</p>
          ) : (
            events.map((event, index) => (
              <div key={index} className="mb-1">
                {event}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-slate-700 rounded-lg">
        <h3 className="font-semibold mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Check if socket connects (green indicator)</li>
          <li>Enter a quiz ID (or use default &quot;1&quot;)</li>
          <li>Click &quot;Join as Host&quot; to simulate host joining</li>
          <li>Open another browser tab/window and click &quot;Join as Player&quot;</li>
          <li>Watch the event log for real-time updates</li>
          <li>Click &quot;Start Game&quot; to test game start broadcast</li>
        </ol>
      </div>
    </div>
  );
}
