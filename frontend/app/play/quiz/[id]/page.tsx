// app/play/quiz/[id]/page.jsx
"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../api/backend";
import PlayerQuestionCard from "../../../components/PlayerQuestionCard";
import io from "socket.io-client";

let socket;

export default function PlayerQuizPage() {
  const params = useParams();
  const quizId = params.id;
  const [participant, setParticipant] = useState(null);
  const [currentQ, setCurrentQ] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // connect socket for live events
    socket = io(process.env.NEXT_PUBLIC_BACKEND_SOCKET || "http://localhost:5000");
    socket.on("connect", () => {});
    socket.on("question", (payload) => {
      setCurrentQ(payload.question);
      setQuestionIndex(payload.questionIndex);
    });
    return () => {
      socket?.disconnect?.();
    };
  }, []);

  // Attempt to fetch participant if previously joined: optimistic
  useEffect(() => {
    // optional: get participant by wallet from localStorage
    const pid = localStorage.getItem(`participant_${quizId}`);
    if (pid) setParticipant(JSON.parse(pid));
  }, [quizId]);

  const submitAnswer = async (participant_id, question_index, selected_option) => {
    try {
      await api.post(`/quizzes/${quizId}/answer`, {
        participant_id,
        question_index,
        selected_option,
        // optionally is_correct if you compute on client (prefer backend)
      });
      // optimistic UI
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!currentQ && <div className="text-center py-20">Waiting for host to start...</div>}

      {currentQ && (
        <PlayerQuestionCard
          question={currentQ}
          index={questionIndex}
          submit={(participant_id, sel) => submitAnswer(participant_id, questionIndex, sel)}
        />
      )}
    </div>
  );
}
