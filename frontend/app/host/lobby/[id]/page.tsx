// app/host/lobby/[id]/page.tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import { io, type Socket } from "socket.io-client"
import axios from "axios"
import { useQuizGame } from "@/hooks/useBlockchain"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

interface Participant {
  id: number
  wallet: string
  name?: string
  joined_at: string
}

interface Quiz {
  id: number
  host: string
  status: string
  metadata_uri?: string
  num_winners: number
  contract_address?: `0x${string}`
}

let socket: Socket | null = null

export default function HostLobby() {
  const params = useParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isSocketConnected, setIsSocketConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")
  const [contractAddress, setContractAddress] = useState<`0x${string}` | undefined>(undefined)
  const [fundAmount, setFundAmount] = useState("1")
  const [fundingLoading, setFundingLoading] = useState(false)

  const quizGame = useQuizGame(contractAddress)

  const loadQuizData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await api.get(`/quiz/${quizId}`)

      console.log("Quiz data loaded:", response.data)

      if (response.data.ok) {
        setQuiz(response.data.quiz)
        setParticipants(response.data.quiz.participants || [])
        if (response.data.quiz.contract_address) {
          setContractAddress(response.data.quiz.contract_address as `0x${string}`)
        }
      }
    } catch (err: any) {
      console.error("Error loading quiz:", err)
      setError(err.response?.data?.error || "Failed to load quiz")
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    loadQuizData()
  }, [loadQuizData, quizId])

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_SOCKET || "http://localhost:5000"
    socket = io(socketUrl)

    socket.on("connect", () => {
      console.log("Host connected to socket:", socket?.id)
      setIsSocketConnected(true)

      socket?.emit("join_quiz", {
        quizId,
        wallet: address || "HOST",
        isHost: true,
      })
    })

    socket.on("disconnect", () => {
      console.log("Host disconnected from socket")
      setIsSocketConnected(false)
    })

    socket.on("player_joined", (data: { wallet: string; name?: string; id?: number }) => {
      console.log("Player joined:", data)
      loadQuizData()
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [quizId, address, loadQuizData])

  const handleStartGame = async () => {
    if (!quiz) {
      setError("Quiz data not loaded")
      return
    }

    if (participants.length === 0) {
      setError("No participants have joined yet")
      return
    }

    if (!isConnected || address !== quiz.host) {
      setError("Only the host can start the game")
      return
    }

    setStarting(true)
    setError("")

    try {
      console.log("Starting quiz:", quizId)

      const response = await api.post(`/admin/${quizId}/start`)

      console.log("Start quiz response:", response.data)

      if (response.data.success) {
        socket?.emit("start_game", { quizId })

        setTimeout(() => {
          router.push(`/host/quiz/${quizId}`)
        }, 1000)
      } else {
        setError(response.data.message || "Failed to start quiz")
      }
    } catch (err: any) {
      console.error("Error starting quiz:", err)
      setError(err.response?.data?.message || err.response?.data?.error || "Failed to start quiz")
    } finally {
      setStarting(false)
    }
  }

  const handleFundPrizePool = async () => {
    if (!quizGame.fundPrizePoolNative) {
      setError("Prize pool funding not available")
      return
    }

    try {
      setFundingLoading(true)
      setError("")
      const txHash = await quizGame.fundPrizePoolNative(fundAmount)
      console.log("Prize pool funded:", txHash)
      alert(`Prize pool funded successfully with ${fundAmount} CELO`)
      setFundAmount("1")
    } catch (err: any) {
      console.error("Error funding prize pool:", err)
      setError(`Failed to fund prize pool: ${err.message}`)
    } finally {
      setFundingLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Quiz not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Host Lobby</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Quiz ID: <span className="font-mono font-bold text-indigo-600">{quizId}</span>
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Socket Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${isSocketConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
            ></div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connection</p>
              <p className="font-medium">{isSocketConnected ? "Connected" : "Disconnected"}</p>
            </div>
          </div>
        </div>

        {/* Participants Count */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
          <p className="text-2xl font-bold">{participants.length}</p>
        </div>

        {/* Quiz Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
          <p className="text-lg font-medium capitalize">{quiz.status}</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Participants List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Participants ({participants.length})</h2>

        {participants.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">Waiting for players to join...</p>
            <p className="text-sm">
              Share Quiz ID <span className="font-mono font-bold">{quizId}</span> with players
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((participant, index) => (
              <div key={participant.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  {participant.name && <p className="font-medium">{participant.name}</p>}
                  <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {participant.wallet.slice(0, 6)}...{participant.wallet.slice(-4)}
                  </p>
                </div>
                <div className="text-sm text-gray-500">{new Date(participant.joined_at).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8 border border-blue-200 dark:border-blue-900">
        <h3 className="text-xl font-bold mb-4">Fund Prize Pool</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Add CELO tokens to the quiz prize pool. This will be distributed to winners after the quiz ends.
        </p>

        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              placeholder="Amount in CELO"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleFundPrizePool}
            disabled={fundingLoading || !contractAddress || !isConnected}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {fundingLoading ? "Funding..." : "Fund Pool"}
          </button>
        </div>

        {quizGame.quizInfo && (
          <div className="mt-4 p-3 bg-white dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Current Prize Pool: <span className="font-bold">{quizGame.quizInfo.prizePool} CELO</span>
            </p>
          </div>
        )}
      </div>

      {/* Start Game Button */}
      <div className="bg-linear-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-900 rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold mb-2">Ready to Start?</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Make sure all players have joined before starting the quiz
        </p>

        <button
          onClick={handleStartGame}
          disabled={starting || participants.length === 0 || !isSocketConnected}
          className="w-full px-6 py-4 bg-linear-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {starting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Starting Game...
            </span>
          ) : (
            "Start Game"
          )}
        </button>

        {participants.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-3">At least one player must join to start</p>
        )}
      </div>
    </div>
  )
}
