"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

interface Question {
  id: number
  question_index: number
  question_text: string
}

interface Participant {
  id: number
  wallet: string
  name: string
  score: number
  joined_at: string
}

interface Quiz {
  id: number
  host: string
  token: string
  status: string
  num_winners: number
  created_at: string
  started_at: string | null
  contract_address: string
  question_durations: number[]
  prize_pool_amount: number
}

interface QuizDetails {
  quiz: Quiz
  participants: Participant[]
  questions: Question[]
  totalParticipants: number
  totalQuestions: number
}

export default function QuizDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const quizId = params.id as string

  const [details, setDetails] = useState<QuizDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchQuizDetails = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/${quizId}/details`)
      const data = await res.json()
      if (data.ok) {
        setDetails(data)
      }
    } catch (err) {
      console.error("Error fetching quiz details:", err)
    } finally {
      setLoading(false)
    }
  }, [quizId])
  
  useEffect(() => {
    fetchQuizDetails()
  }, [quizId, fetchQuizDetails])

  const handleAction = async (action: string) => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/admin/${quizId}/${action}`, {
        method: "POST",
      })
      const data = await res.json()

      if (data.ok) {
        // Refresh details
        await fetchQuizDetails()
        alert(`Quiz ${action} successful!`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err)
      alert("An error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch(`/api/admin/${quizId}`, {
        method: "DELETE",
      })
      const data = await res.json()

      if (data.ok) {
        alert("Quiz deleted successfully")
        router.push("/admin")
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      console.error("Error deleting quiz:", err)
      alert("An error occurred")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading quiz details...</p>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Quiz not found</p>
          <Link href="/admin" className="text-indigo-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { quiz, participants, questions, totalParticipants, totalQuestions } = details

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "ended":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "finalized":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const canStart = quiz.status === "pending"
  const canEnd = quiz.status === "active"
  const canFinalize = quiz.status === "ended"

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-indigo-600 hover:underline mb-2 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Quiz #{quiz.id}</h1>
          </div>
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getStatusColor(quiz.status)}`}>
            {quiz.status.toUpperCase()}
          </span>
        </div>

        {/* Quiz Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Host</p>
            <p className="text-lg font-mono text-slate-900 dark:text-white mt-2 break-all">
              {quiz.host.substring(0, 20)}...
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Token</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{quiz.token}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Prize Pool</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
              {quiz.prize_pool_amount || "N/A"}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Created</p>
            <p className="text-sm text-slate-900 dark:text-white mt-2">{new Date(quiz.created_at).toLocaleString()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow mb-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Quiz Actions</h3>
          <div className="flex gap-3 flex-wrap">
            {canStart && (
              <button
                onClick={() => handleAction("start")}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Start Quiz
              </button>
            )}
            {canEnd && (
              <button
                onClick={() => handleAction("end")}
                disabled={actionLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                End Quiz
              </button>
            )}
            {canFinalize && (
              <button
                onClick={() => handleAction("finalize")}
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Finalize Quiz
              </button>
            )}
            {quiz.status === "pending" && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Delete Quiz
              </button>
            )}
            {quiz.status === "pending" && (
              <button
                onClick={() => handleAction("cancel")}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Cancel Quiz
              </button>
            )}
          </div>
        </div>

        {/* Questions Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow mb-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Questions ({totalQuestions})</h3>
          {questions.length === 0 ? (
            <p className="text-slate-500">No questions added yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {questions.map((q) => (
                <div key={q.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded">
                  <span className="shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {q.question_index + 1}
                  </span>
                  <p className="text-slate-900 dark:text-white text-sm">{q.question_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participants Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Participants ({totalParticipants})
          </h3>
          {participants.length === 0 ? (
            <p className="text-slate-500">No participants yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Rank</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Wallet</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Score</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold">#{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-xs">
                        {p.wallet.substring(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-white font-bold">{p.score}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">
                        {new Date(p.joined_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
