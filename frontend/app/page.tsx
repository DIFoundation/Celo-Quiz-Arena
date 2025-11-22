// app/page.jsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center gap-8 py-20 text-center">
      <h1 className="text-5xl font-extrabold">Celo Quiz Arena</h1>
      <p className="max-w-2xl text-gray-600 dark:text-gray-300">
        Host or join interactive, mobile-first quiz games. Winners are paid on-chain with CELO/cUSD.
      </p>

      <div className="flex gap-4">
        <Link href="/play/join" className="px-6 py-3 rounded-xl bg-indigo-600 text-white">
          Play a Quiz
        </Link>
        <Link href="/host/create" className="px-6 py-3 rounded-xl bg-green-600 text-white">
          Host a Quiz
        </Link>
      </div>

      <div className="mt-8 w-full max-w-3xl">
        <Image
          src={"/mnt/data/Screenshot From 2025-11-18 02-50-54.png"}
          alt="railway-screenshot"
          width={1000}
          height={1000}
          className="rounded-lg shadow-lg object-cover w-full"
        />
      </div>
    </section>
  );
}
