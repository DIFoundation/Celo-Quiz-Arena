// components/WalletConnectButton.jsx
"use client";
import { useConnection } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
// import { useEffect } from "react";

export default function WalletConnectButton() {
  const { address, isConnected } = useConnection();
  const { open } = useAppKit();

  function handleConnectionButton() {
    if (isConnected) {
      open({ view: "Account" })
    } else {
      open({ view: "Connect" })
    }

  }
  return (
    <div>
      <button
        onClick={handleConnectionButton}
        className="bg-gray-100 dark:bg-gray-800 px-3 py-1 text-white rounded">
        {isConnected ? (
          address?.slice(0, 6) + "..." + address?.slice(-4)
        ) : (
        <div>
Connect Wallet
        </div>
      )}
      </button>
    </div>
  );
}
