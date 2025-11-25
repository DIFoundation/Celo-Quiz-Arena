// app/play/join/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

export default function JoinPage() {
  const router = useRouter();
  const { address, isConnected } = useConnection();
  
  const [quizId, setQuizId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setError("");
    
    // Validation
    if (!quizId.trim()) {
      setError("Please enter a Quiz ID");
      return;
    }

    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);

    try {
      console.log("Joining quiz:", quizId, "with wallet:", address);

      // Join quiz via API
      const response = await api.post(`/player/${quizId}/join`, {
        wallet: address,
        name: playerName || undefined,
      });

      console.log("Join response:", response.data);

      const participant = response.data.participant;

      // Store participant info in localStorage
      localStorage.setItem(
        `participant_${quizId}`,
        JSON.stringify(participant)
      );

      // Success! Redirect to quiz lobby or game page
      alert(`Successfully joined quiz! Participant ID: ${participant.id}`);
      router.push(`/play/lobby/${quizId}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Join error:", err);
      
      if (err.response) {
        // Server responded with error
        setError(
          err.response.data.message || 
          err.response.data.error || 
          "Failed to join quiz"
        );
      } else if (err.request) {
        // Request made but no response
        setError("Cannot connect to server. Please check if backend is running.");
      } else {
        // Other errors
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Join Quiz</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter the quiz code to get started
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-4">
        {/* Connection Status */}
        {!isConnected && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ Please connect your wallet first
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Quiz ID Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Quiz ID *
          </label>
          <input
            type="text"
            placeholder="Enter quiz ID (e.g., 1)"
            value={quizId}
            onChange={(e) => setQuizId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Player Name Input (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Player Name (optional)
          </label>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Wallet Display */}
        {isConnected && address && (
          <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Connected Wallet
            </p>
            <p className="text-sm font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        )}

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={loading || !isConnected}
          className="w-full px-6 py-4 bg-linear-to-r from-indigo-500 to-indigo-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Joining...
            </span>
          ) : (
            "Join Quiz"
          )}
        </button>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <h3 className="font-semibold mb-2 text-sm">How to join:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>Get the Quiz ID from the host</li>
          <li>Connect your wallet</li>
          <li>Enter the Quiz ID and click Join</li>
          <li>Wait in the lobby for the quiz to start</li>
        </ol>
      </div>
    </div>
  );
}
