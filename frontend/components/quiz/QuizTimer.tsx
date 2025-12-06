// components/QuizTimer.jsx
import { useEffect, useState } from "react";

export default function QuizTimer({ duration = 12, onExpire = () => {} }) {
  const [time, setTime] = useState(duration);

  useEffect(() => {
    // setTime(duration);
    const iv = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          clearInterval(iv);
          onExpire();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [duration, onExpire]);

  const pct = Math.max(0, (time / duration) * 100);

  return (
    <div className="w-36">
      <div className="text-right text-sm text-gray-600">{time}s</div>
      <div className="h-2 bg-gray-200 rounded overflow-hidden mt-1">
        <div style={{ width: `${pct}%` }} className="h-full bg-indigo-600" />
      </div>
    </div>
  );
}
