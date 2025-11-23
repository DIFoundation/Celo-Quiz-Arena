// app/host/quiz/[id]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../api/backend";
import HostQuestionCard from "@/components/quiz/HostQuestionCard";

export default function HostQuizPage() {
  const params = useParams();
  const quizId = params.id;
  const [quiz, setQuiz] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [live, setLive] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await api.get(`/quiz/${quizId}`);
      setQuiz(res.data.quiz);
      setParticipants(res.data.participants || []);
      setLoading(false);
      // fetch metadata questions if metadata_uri present
      if (res.data.quiz?.metadata_uri) {
        try {
          const m = await fetch(res.data.quiz.metadata_uri).then(r => r.json());
          setQuestions(m.questions || []);
        } catch (e) {
          console.warn("failed to fetch metadata", e);
        }
      }
    }
    load();
  }, [quizId]);

  const start = async () => {
    await api.post(`/quizzes/${quizId}/start`);
    setLive(true);
  };

  const nextQ = () => {
    setQuestionIndex((s) => Math.min(s + 1, questions.length - 1));
  };

  const end = async () => {
    await api.post(`/quizzes/${quizId}/end`);
    // finalize compute winners on backend
    const res = await api.post(`/quizzes/${quizId}/finalize`);
    alert("Winners computed. See console.");
    console.log(res.data);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3 className="text-xl font-semibold mb-2">Host Dashboard — Quiz #{quizId}</h3>
      <p>Status: <span className="font-medium">{quiz.status}</span></p>

      <div className="mt-4 flex gap-3">
        {!live && <button onClick={start} className="px-4 py-2 bg-indigo-600 text-white rounded">Start Quiz</button>}
        {live && <button onClick={nextQ} className="px-4 py-2 bg-yellow-500 text-black rounded">Next Question</button>}
        <button onClick={end} className="px-4 py-2 bg-red-600 text-white rounded">End & Finalize</button>
      </div>

      <div className="mt-6">
        <h4 className="font-semibold">Participants ({participants.length})</h4>
        <ul className="mt-2 divide-y">
          {participants.map(p => (
            <li key={p.id} className="py-2 flex justify-between">
              <span>{p.wallet}</span>
              <span className="text-sm text-gray-500">joined {new Date(p.joined_at).toLocaleTimeString()}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        {questions.length > 0 && (
          <HostQuestionCard
            question={questions[questionIndex]}
            index={questionIndex}
            total={questions.length}
          />
        )}
      </div>
    </div>
  );
}
