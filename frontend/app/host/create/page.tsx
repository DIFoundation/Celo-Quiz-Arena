"use client";

import { useState } from "react";
import api from "@/app/api/backend";

export default function CreateQuiz() {
  const [numWinners, setNumWinners] = useState(3);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    const res = await api.post("/quiz", {
      host: "0xHostAddress",
      token: "0x0",
      numWinners,
      equalSplit: false,
      percentages: [50, 30, 20],
      metadataURI: "ipfs://quiz.json",
    });
    setLoading(false);
    alert("Quiz Created ID: " + res.data.id);
  };

  return (
    <div className="p-10">
      <h1 className="text-3xl mb-4">Host a Quiz</h1>

      <button
        onClick={create}
        className="px-6 py-3 bg-green-600 text-white rounded-xl"
      >
        {loading ? "Creating..." : "Create Quiz"}
      </button>
    </div>
  );
}
