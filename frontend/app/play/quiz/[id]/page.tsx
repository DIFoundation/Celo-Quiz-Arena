"use client";

import { useParams } from "next/navigation";
import { useQuizPlayer } from "@/hooks/useQuizPlayer";
import PlayerQuestionCard from "@/components/quiz/PlayerQuestionCard";

export default function PlayerQuiz() {
  const { id } = useParams();
  const { question, submitAnswer } = useQuizPlayer(id);

  return (
    <div className="p-10">
      <PlayerQuestionCard question={question} submit={submitAnswer} />
    </div>
  );
}
