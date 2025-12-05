"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
// import { useRouter } from "next/navigation"

interface Quiz {
  id: number
  host: string
  token: string
  status: string
  num_winners: number
  created_at: string
  started_at: string | null
  question_durations: number[]
}

export default function AdminDashboard() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>("")
//   const router = useRouter()

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      query.append("page", page.toString())
      query.append("limit", "10")
      if (statusFilter) query.append("status", statusFilter)

      const res = await fetch(`/api/admin?${query}`)
      const data = await res.json()

      if (data.ok) {
        setQuizzes(data.quizzes)
        setTotalPages(data.pages)
      }
    } catch (err) {
      console.error("Error fetching quizzes:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuizzes()
  }, [page, statusFilter])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "active":
        return "bg-blue-100 text-blue-800"
      case "ended":
        return "bg-purple-100 text-purple-800"
      case "finalized":
        return "bg-indigo-100 text-indigo-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTokenIcon = (token: string) => {
    switch (token) {
      case "CELO":
        return "C"
      case "cUSD":
        return "U"
      case "USDT":
        return "T"
      default:
        return "?"
    }
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage and monitor all quizzes</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Quizzes</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{quizzes.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {quizzes.filter((q) => q.status === "active").length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {quizzes.filter((q) => q.status === "completed").length}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Analytics</p>
            <Link href="/admin/analytics" className="text-indigo-600 dark:text-indigo-400 font-medium mt-2 block">
              View Details →
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Quizzes Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No quizzes found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Host
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Questions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {quizzes.map((quiz) => (
                    <tr key={quiz.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">#{quiz.id}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {quiz.host.substring(0, 10)}...
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                          {getTokenIcon(quiz.token)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                          {quiz.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {quiz.question_durations?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {new Date(quiz.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/quizzes/${quiz.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg ${
                    p === page
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
