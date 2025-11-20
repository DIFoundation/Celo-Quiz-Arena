"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinQuiz() {
  const [quizId, setQuizId] = useState("");
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h2 className="text-3xl mb-4">Enter Quiz ID</h2>

      <input
        className="border p-3 rounded-lg w-64 text-center"
        value={quizId}
        onChange={(e) => setQuizId(e.target.value)}
        placeholder="e.g. 21"
      />

      <button
        onClick={() => router.push(`/play/quiz/${quizId}`)}
        className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl"
      >
        Join
      </button>
    </div>
  );
}
