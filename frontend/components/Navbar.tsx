// components/Navbar.jsx
"use client";
import Link from "next/link";
import WalletConnectButton from "./WalletConnectButton";

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white dark:bg-slate-900/60 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold">
            Q
          </div>
          <span className="font-semibold">Celo Quiz Arena</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/play/join" className="text-sm text-gray-600 dark:text-gray-200">Play</Link>
          <Link href="/host/create" className="text-sm text-gray-600 dark:text-gray-200">Host</Link>
          <WalletConnectButton />
        </div>
      </div>
    </nav>
  );
}
