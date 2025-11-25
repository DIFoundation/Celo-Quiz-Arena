// app/host/create/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useConnection } from "wagmi"
import { useQuizFactory } from "@/hooks/useBlockchain"
import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

export default function CreateQuizPage() {
  const router = useRouter()
  const { address, isConnected } = useConnection()
  const { createQuiz, isPending, isConfirming } = useQuizFactory()

  const [numWinners, setNumWinners] = useState(3)
  const [token, setToken] = useState("")
  const [equalSplit, setEqualSplit] = useState(true)
  const [percentages, setPercentages] = useState("50,30,20")
  const [metadataURI, setMetadataURI] = useState("")
  const [prizeAmount, setPrizeAmount] = useState("0.1")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"form" | "blockchain" | "backend">("form")

  const handleCreate = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first")
      return
    }

    if (!metadataURI) {
      alert("Please provide a metadata URI with quiz questions")
      return
    }

    setLoading(true)

    try {
      // Step 1: Create quiz on blockchain
      setStep("blockchain")
      console.log("Creating quiz on blockchain...")

      const percentagesArray = equalSplit ? [] : percentages.split(",").map((p) => Number(p.trim()))

      const txHash = await createQuiz({
        token,
        numWinners,
        percentages: percentagesArray,
        equalSplit,
        metadataURI,
      })

      console.log("Quiz created on blockchain. Transaction:", txHash)

      // Wait for transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Step 2: Create quiz in backend database
      setStep("backend")
      console.log("Creating quiz in backend...")

      const payload = {
        host: address,
        token: token || "0x0000000000000000000000000000000000000000",
        num_winners: numWinners,
        equal_split: equalSplit,
        percentages: percentagesArray,
        metadata_uri: metadataURI,
        contract_address: txHash,
      }

      const res = await api.post("/quiz", payload)
      const quiz = res.data.quiz

      console.log("Quiz created in backend:", quiz)

      alert(`Quiz created successfully! ID: ${quiz.id}`)
      router.push(`/host/lobby/${quiz.id}`)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error creating quiz:", err)
      alert(`Failed to create quiz: ${err.message || "Unknown error"}`)
    } finally {
      setLoading(false)
      setStep("form")
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6">Create a Quiz</h2>

      {!isConnected && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">Please connect your wallet to create a quiz</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 space-y-6">
        {/* Number of Winners */}
        <div>
          <label className="block text-sm font-medium mb-2">Number of Winners</label>
          <input
            type="number"
            min="1"
            max="10"
            value={numWinners}
            onChange={(e) => setNumWinners(Number(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Prize Distribution */}
        <div>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={equalSplit}
              onChange={(e) => setEqualSplit(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Equal split among winners?</span>
          </label>

          {!equalSplit && (
            <div>
              <label className="block text-sm font-medium mb-2">Percentages (comma-separated, must sum to 100)</label>
              <input
                value={percentages}
                onChange={(e) => setPercentages(e.target.value)}
                placeholder="e.g., 50,30,20"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Example for 3 winners: 50,30,20 (must equal 100%)</p>
            </div>
          )}
        </div>

        {/* Token */}
        <div>
          <label className="block text-sm font-medium mb-2">Payment Token</label>
          <select
            id="token"
            name="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="bg-white dark:bg-slate-800 border w-full text-black dark:text-white p-3 rounded"
          >
            <option value="0x0000000000000000000000000000000000000000">Native CELO</option>
            <option value="0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b">cUSD</option>
          </select>
        </div>

        {/* Prize Amount */}
        <div>
          <label className="block text-sm font-medium mb-2">Prize Pool (CELO)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={prizeAmount}
            onChange={(e) => setPrizeAmount(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">Amount of CELO to fund the prize pool</p>
        </div>

        {/* Metadata URI */}
        <div>
          <label className="block text-sm font-medium mb-2">Metadata URI (IPFS or public URL)</label>
          <input
            value={metadataURI}
            onChange={(e) => setMetadataURI(e.target.value)}
            placeholder="ipfs://... or https://..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">JSON file containing quiz questions and answers</p>
        </div>

        {/* Status Messages */}
        {loading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
              {step === "blockchain" && "Creating quiz on blockchain..."}
              {step === "backend" && "Saving quiz to database..."}
              {isPending && "Confirm transaction in your wallet..."}
              {isConfirming && "Waiting for confirmation..."}
            </p>
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={loading || !isConnected}
          className="w-full px-6 py-4 bg-linear-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-300">
          <li>Quiz is created on Celo blockchain</li>
          <li>Quiz data is saved to backend database</li>
          <li>You&apos;ll be redirected to the lobby to manage your quiz</li>
          <li>Fund the prize pool and start when ready</li>
        </ol>
      </div>
    </div>
  )
}
