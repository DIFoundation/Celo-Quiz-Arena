// hooks/useQuizHost.js
import { useState } from "react";
import api from "../app/api/backend";

export function useQuizHost() {
  const [quiz, setQuiz] = useState(null);

  const create = async (payload) => {
    const res = await api.post("/quizzes", payload);
    setQuiz(res.data.quiz);
    return res.data.quiz;
  };

  const start = async (id) => {
    await api.post(`/quizzes/${id}/start`);
  };

  const finalize = async (id) => {
    const res = await api.post(`/quizzes/${id}/finalize`);
    return res.data;
  };

  return { quiz, create, start, finalize };
}
