// app/host/create/page.jsx
"use client";
import { useState } from "react";
import api from "../../api/backend";
import { useRouter } from "next/navigation";
import { useConnection } from "wagmi";

export default function CreateQuizPage() {
    const { address } = useConnection();
  const [numWinners, setNumWinners] = useState(3);
  const [equalSplit, setEqualSplit] = useState(false);
  const [percentages, setPercentages] = useState("50,30,20");
  const [metadataURI, setMetadataURI] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const create = async () => {
    setLoading(true);
    const payload = {
      host: {address},
      token: "0x0",
      num_winners: numWinners,
      equal_split: equalSplit,
      percentages: equalSplit ? [] : percentages.split(",").map((p) => Number(p.trim())),
      metadata_uri: metadataURI,
    };
    try {
      const res = await api.post("/quiz", payload);
      const quiz = res.data.quiz;
      alert("Quiz created: " + quiz.id);
      router.push(`/host/quiz/${quiz.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Create a Quiz</h2>

      <div className="grid gap-4">
        <label className="block">
          Number of winners
          <input type="number" value={numWinners} onChange={(e) => setNumWinners(Number(e.target.value))} className="mt-1 w-full p-2 border rounded" />
        </label>

        <label className="block">
          Equal split?
          <input type="checkbox" checked={equalSplit} onChange={(e) => setEqualSplit(e.target.checked)} className="ml-2" />
        </label>

        {!equalSplit && (
          <label className="block">
            Percentages (comma separated, sum 100)
            <input value={percentages} onChange={(e) => setPercentages(e.target.value)} className="mt-1 w-full p-2 border rounded" />
          </label>
        )}

        <label className="block">
          Metadata URI (IPFS or public URL)
          <input value={metadataURI} onChange={(e) => setMetadataURI(e.target.value)} className="mt-1 w-full p-2 border rounded" />
        </label>

        <button onClick={create} className="px-5 py-3 bg-green-600 text-white rounded">
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </div>
    </div>
  );
}
