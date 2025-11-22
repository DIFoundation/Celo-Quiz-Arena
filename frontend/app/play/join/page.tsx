// app/play/join/page.jsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";
import api from "../../api/backend";

export default function JoinPage() {
  const { address } = useConnection();
  const [quizId, setQuizId] = useState("");
  const [wallet, setWallet] = useState(`${address}`);
  const router = useRouter();

  console.log(wallet);

  const join = async () => {
    try {
      const res = await api.post(`/quiz/${quizId}/join`, { wallet });
      alert("Joined! Participant ID: " + res.data.participant.id);
      router.push(`/play/quiz/${quizId}`);
    } catch (e) {
      console.error(e);
      alert("Failed to join");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Join Quiz</h2>

      <input placeholder="Quiz ID" value={quizId} onChange={(e)=>setQuizId(e.target.value)} className="w-full p-3 border rounded mb-3" />
      <input placeholder="Your Wallet (optional)" value={wallet} onChange={(e)=>setWallet(e.target.value)} className="w-full p-3 border rounded mb-3" />

      <button onClick={join} className="px-6 py-3 bg-indigo-600 text-white rounded">Join</button>
    </div>
  );
}
