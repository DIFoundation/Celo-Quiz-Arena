// components/PlayerQuestionCard.tsx
"use client";

import { useState, useEffect } from "react";
import QuizTimer from "./quiz/QuizTimer";
import AnswerButton from "./quiz/AnswerButton";

interface Question {
  text: string;
  options: string[];
  correctIndex?: number;
  time?: number;
}

interface PlayerQuestionCardProps {
  question: Question;
  index: number;
  quizId: string | number;
  participantId: string | number;
  onSubmit: (participantId: string | number, selectedOption: number) => Promise<void>;
}

export default function PlayerQuestionCard({ 
  question, 
  index, 
  // quizId,
  participantId,
  onSubmit 
}: PlayerQuestionCardProps) {
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setLocked(false);
    setSelected(null);
    setSubmitting(false);
  }, [index, question]);

  const handleSelect = async (optIndex: number) => {
    if (locked || submitting) return;
    
    setSelected(optIndex);
    setSubmitting(true);

    try {
      await onSubmit(participantId, optIndex);
      setLocked(true);
    } catch (error) {
      console.error("Error submitting answer:", error);
      // Allow retry on error
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTimeExpire = () => {
    setLocked(true);
  };

  return (
    <div className="p-6 bg-linear-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Question {index + 1}
          </div>
          <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
            {question.text}
          </h3>
        </div>
        <QuizTimer 
          duration={question.time ?? 15} 
          onExpire={handleTimeExpire} 
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <AnswerButton
            key={i}
            label={`${String.fromCharCode(65 + i)}. ${opt}`}
            active={selected === i}
            disabled={locked || submitting}
            onClick={() => handleSelect(i)}
          />
        ))}
      </div>

      {submitting && (
        <div className="mt-4 text-center text-sm text-indigo-600 dark:text-indigo-400">
          Submitting answer...
        </div>
      )}

      {locked && !submitting && (
        <div className="mt-4 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
          {selected !== null ? "Answer submitted!" : "Time's up!"}
        </div>
      )}
    </div>
  );
}
