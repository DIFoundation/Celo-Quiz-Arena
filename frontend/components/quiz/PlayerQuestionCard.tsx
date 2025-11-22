// components/PlayerQuestionCard.jsx
import { useState } from "react";
import QuizTimer from "./QuizTimer";
import AnswerButton from "./AnswerButton";

export default function PlayerQuestionCard({ question, index, submit }) {
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState(null);

  const onSelect = (optIndex) => {
    if (locked) return;
    setSelected(optIndex);
    setLocked(true);
    // assume participant id stored in localStorage for demo
    const participant = JSON.parse(localStorage.getItem(`participant_${question.quizId}`) || "{}");
    if (participant?.id) submit(participant.id, optIndex);
  };

  return (
    <div className="p-6 bg-indigo-50 dark:bg-slate-800 rounded-lg shadow">
      <div className="flex justify-between items-center">
        <div>
          <div className="text-sm text-gray-500">Question {index + 1}</div>
          <h3 className="text-2xl font-semibold mt-1">{question.text}</h3>
        </div>
        <QuizTimer duration={question.time ?? 12} onExpire={() => setLocked(true)} />
      </div>

      <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <AnswerButton
            key={i}
            label={`${String.fromCharCode(65 + i)}. ${opt}`}
            active={selected === i}
            disabled={locked}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  );
}
