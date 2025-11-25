// components/AnswerButton.jsx
export default function AnswerButton({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-lg border text-left shadow-sm transition ${
        disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
      } ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200"}`}
    >
      {label}
    </button>
  );
}
