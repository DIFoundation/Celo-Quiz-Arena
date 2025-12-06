"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

interface Winner {
  id: number
  wallet: string
  name: string
  score: number
  rank: number
  prizeAmount?: string
}

interface Quiz {
  id: number
  token: string
  num_winners: number
  equal_split: boolean
  status: string
  contract_address: string
}

export default function ResultsPage() {
  const params = useParams()
  const quizId = params.id as string

  const [winners, setWinners] = useState<Winner[]>([])
  const [allResults, setAllResults] = useState<Winner[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [
    distributionStatus, 
    // setDistributionStatus
  ] = useState<"idle" | "processing" | "completed" | "failed">("idle")

  // Token display names
  const tokenNames: Record<string, string> = {
    "0x0000000000000000000000000000000000000000": "CELO",
    "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b": "cUSD",
    "0xdF629d76EF573512B74a17C6eADB26e3aE1C90A3": "USDT",
  }

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true)

        // Fetch quiz details
        const quizRes = await api.get(`/quiz/${quizId}`)
        setQuiz(quizRes.data.quiz)

        // Fetch results
        const resultsRes = await api.get(`/quiz/${quizId}/results`)
        const results = resultsRes.data.results || []
        setAllResults(results)

        // Extract winners (top N)
        const topWinners = results.slice(0, quizRes.data.quiz.num_winners || 3)
        setWinners(topWinners)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error loading results:", err)
        setError(err.message || "Failed to load results")
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [quizId])

  const getTokenName = (address: string) => {
    return tokenNames[address] || address.slice(0, 6) + "..."
  }

  const calculatePrizeAmount = (rank: number) => {
    if (!quiz) return "0"
    console.log("rank: ", rank)

    // This is a placeholder - actual prize calculation would come from contract
    const totalPrize = 1.0 // In real app, fetch from contract

    if (quiz.equal_split) {
      return (totalPrize / quiz.num_winners).toFixed(2)
    }

    // For custom percentages, we'd need to fetch from the results table
    return "TBD"
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Loading results...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
        <Link href="/" className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Quiz Complete!</h1>
        <p className="text-gray-600 dark:text-gray-400">Final Results and Prize Distribution</p>
      </div>

      {/* Winners Podium */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">Top Winners</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 2nd Place */}
          {winners[1] && (
            <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-6 flex flex-col items-center text-center order-1">
              <div className="text-4xl mb-2">🥈</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">2nd Place</p>
              <p className="font-bold truncate">{winners[1].name || winners[1].wallet.slice(0, 6)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{winners[1].wallet.slice(0, 10)}...</p>
              <p className="text-2xl font-bold text-yellow-600">{winners[1].score} pts</p>
              <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                {calculatePrizeAmount(2)} {getTokenName(quiz?.token || "")}
              </p>
            </div>
          )}

          {/* 1st Place */}
          {winners[0] && (
            <div className="bg-linear-to-b from-yellow-200 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-lg p-6 flex flex-col items-center text-center border-2 border-yellow-400 transform scale-105 order-2">
              <div className="text-5xl mb-2">🥇</div>
              <p className="text-sm font-semibold text-yellow-800 mb-1">1st Place</p>
              <p className="font-bold text-lg truncate">{winners[0].name || winners[0].wallet.slice(0, 6)}</p>
              <p className="text-sm text-yellow-700 mb-3">{winners[0].wallet.slice(0, 10)}...</p>
              <p className="text-3xl font-bold text-yellow-700">{winners[0].score} pts</p>
              <p className="text-sm mt-2 font-semibold text-yellow-800">
                {calculatePrizeAmount(1)} {getTokenName(quiz?.token || "")}
              </p>
            </div>
          )}

          {/* 3rd Place */}
          {winners[2] && (
            <div className="bg-orange-100 dark:bg-slate-700 rounded-lg p-6 flex flex-col items-center text-center order-3">
              <div className="text-4xl mb-2">🥉</div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">3rd Place</p>
              <p className="font-bold truncate">{winners[2].name || winners[2].wallet.slice(0, 6)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{winners[2].wallet.slice(0, 10)}...</p>
              <p className="text-2xl font-bold text-orange-600">{winners[2].score} pts</p>
              <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                {calculatePrizeAmount(3)} {getTokenName(quiz?.token || "")}
              </p>
            </div>
          )}
        </div>

        {/* Prize Distribution Status */}
        <div className="bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Prize Distribution Status</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                distributionStatus === "completed"
                  ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : distributionStatus === "processing"
                    ? "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              {distributionStatus === "completed" && "Completed"}
              {distributionStatus === "processing" && "Processing..."}
              {distributionStatus === "idle" && "Pending"}
              {distributionStatus === "failed" && "Failed"}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {distributionStatus === "completed" && "Prizes have been distributed to winners on the blockchain!"}
            {distributionStatus === "processing" && "Distributing prizes via smart contract..."}
            {distributionStatus === "idle" && "Prizes will be distributed to winners' wallets"}
            {distributionStatus === "failed" && "Prize distribution failed. Please try again."}
          </p>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Full Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Wallet</th>
                <th className="px-4 py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              {allResults.map((result, idx) => (
                <tr key={result.id} className={idx < 3 ? "bg-yellow-50 dark:bg-slate-800" : ""}>
                  <td className="px-4 py-3 font-bold">
                    {idx === 0 && "🥇 1"}
                    {idx === 1 && "🥈 2"}
                    {idx === 2 && "🥉 3"}
                    {idx > 2 && `${idx + 1}`}
                  </td>
                  <td className="px-4 py-3">{result.name || "Anonymous"}</td>
                  <td className="px-4 py-3 font-mono text-sm">{result.wallet.slice(0, 10)}...</td>
                  <td className="px-4 py-3 text-right font-bold">{result.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quiz Info */}
      {quiz && (
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-3">Quiz Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Quiz ID</p>
              <p className="font-mono text-sm">{quiz.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Prize Token</p>
              <p className="font-semibold">{getTokenName(quiz.token)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Distribution Type</p>
              <p className="font-semibold">{quiz.equal_split ? "Equal Split" : "Custom Percentages"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Winners</p>
              <p className="font-semibold">{quiz.num_winners}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Link href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Back to Home
        </Link>
        <Link
          href={`/play/join`}
          className="px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
        >
          Join Another Quiz
        </Link>
      </div>
    </div>
  )
}
