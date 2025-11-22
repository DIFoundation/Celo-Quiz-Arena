// hooks/useQuizPlayer.js
import { useState } from "react";
import api from "../app/api/backend";

export function useQuizPlayer(quizId) {
  const [question, setQuestion] = useState(null);

  const join = async (wallet) => {
    const res = await api.post(`/quizzes/${quizId}/join`, { wallet });
    localStorage.setItem(`participant_${quizId}`, JSON.stringify(res.data.participant));
    return res.data.participant;
  };

  const submitAnswer = async (participant_id, question_index, selected_option) => {
    const res = await api.post(`/quizzes/${quizId}/answer`, { participant_id, question_index, selected_option });
    return res.data;
  };

  return { question, join, submitAnswer };
}
