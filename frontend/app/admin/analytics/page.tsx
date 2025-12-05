"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Analytics {
  totalQuizzes: number
  totalParticipants: number
  activeQuizzes: number
  completedQuizzes: number
  tokenDistribution: Array<{ token: string; count: number }>
  statusBreakdown: Array<{ status: string; count: number }>
  revenue: Array<{ token: string; quiz_count: number }>
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/admin/analytics")
      const data = await res.json()
      if (data.ok) {
        setAnalytics(data.stats)
      }
    } catch (err) {
      console.error("Error fetching analytics:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading analytics...</div>
  }

  if (!analytics) {
    return <div className="min-h-screen flex items-center justify-center">Error loading analytics</div>
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Analytics</h1>
            <p className="text-slate-600 dark:text-slate-400">Platform statistics and insights</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Back to Dashboard
          </Link>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Quizzes</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-white mt-3">{analytics.totalQuizzes}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Participants</p>
            <p className="text-4xl font-bold text-blue-600 mt-3">{analytics.totalParticipants}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Quizzes</p>
            <p className="text-4xl font-bold text-green-600 mt-3">{analytics.activeQuizzes}</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Completed Quizzes</p>
            <p className="text-4xl font-bold text-purple-600 mt-3">{analytics.completedQuizzes}</p>
          </div>
        </div>

        {/* Token Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Token Distribution</h3>
            <div className="space-y-3">
              {analytics.tokenDistribution.map((item) => (
                <div key={item.token} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{item.token}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${
                            (item.count / Math.max(...analytics.tokenDistribution.map((t) => t.count))) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-slate-900 dark:text-white font-semibold w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {analytics.statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400 capitalize">{item.status}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(item.count / Math.max(...analytics.statusBreakdown.map((t) => t.count))) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-slate-900 dark:text-white font-semibold w-12 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
