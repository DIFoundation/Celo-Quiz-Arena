// app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-5xl font-bold mb-6">Quiz dApp</h1>

      <div className="flex gap-6">
        <Link
          href="/play/join"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl"
        >
          Play Quiz
        </Link>

        <Link
          href="/host/create"
          className="px-6 py-3 bg-green-600 text-white rounded-xl"
        >
          Host Quiz
        </Link>
      </div>
    </div>
  );
}
