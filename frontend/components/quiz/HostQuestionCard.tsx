// components/HostQuestionCard.jsx
export default function HostQuestionCard({ question, index, total }) {
  if (!question) return <div className="p-6 bg-white rounded shadow">No question</div>;

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">Question {index + 1} / {total}</div>
          <h3 className="text-lg font-semibold mt-2">{question.text}</h3>
        </div>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        {question.options.map((opt, i) => (
          <div key={i} className={`p-3 rounded border ${question.correctIndex === i ? "border-green-500 bg-green-50" : "border-gray-200"}`}>
            <div className="font-medium">{String.fromCharCode(65 + i)}. {opt}</div>
            {question.correctIndex === i && <div className="text-sm text-green-700 mt-1">Correct</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
