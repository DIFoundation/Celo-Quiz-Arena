"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import axios from "axios"
import PlayerQuestionCard from "@/components/PlayerQuestionCard"
import LeaderboardTable from "@/components/LeaderboardTable"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
})

interface Question {
  id?: number
  question_text?: string
  question_index?: number
  text?: string
  options: string[]
  correctIndex?: number
  time_limit?: number
  time?: number
  points?: number
}

interface QuestionData {
  index: number
  question: Question
  questionIndex?: number
  endsAt: number
  totalQuestions: number
}

interface Participant {
  id: number
  wallet: string
  score: number
}

let socket: Socket | null = null

export default function PlayerQuizPage() {
  const params = useParams()
  const quizId = params.id as string

  const [participant, setParticipant] = useState<Participant | null>(null)
  const [currentQ, setCurrentQ] = useState<Question | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [quizStatus, setQuizStatus] = useState<"waiting" | "active" | "finished">("waiting")
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [answered, setAnswered] = useState<Set<number>>(new Set())

  useEffect(() => {
    // Load participant from localStorage
    const storedParticipant = localStorage.getItem(`participant_${quizId}`)
    if (storedParticipant) {
      setParticipant(JSON.parse(storedParticipant))
    }

    const loadLeaderboard = async () => {
      try {
        const res = await api.get(`/player/${quizId}/leaderboard`)
        setLeaderboard(res.data.leaderboard || [])
      } catch (error) {
        console.error("Error loading leaderboard:", error)
      }
    }

    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_SOCKET || "http://localhost:5000"
    socket = io(socketUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socket.on("connect", () => {
      console.log("Connected to socket:", socket?.id)
      if (storedParticipant) {
        const participant = JSON.parse(storedParticipant)
        socket?.emit("join_quiz", {
          quizId,
          wallet: participant.wallet,
          isHost: false,
        })
      }
    })

    socket.on("quiz_started", (data) => {
      console.log("Quiz started:", data)
      setQuizStatus("active")
    })

    socket.on("new_question", (data: QuestionData) => {
      console.log("New question:", data)

      const question = {
        ...data.question,
        text: data.question.question_text || data.question.text,
        time: data.question.time_limit || data.question.time || 30,
      }

      setCurrentQ(question)
      setQuestionIndex(data.index || data.questionIndex || 0)
      setQuizStatus("active")
    })

    socket.on("quiz_ended", () => {
      console.log("Quiz ended")
      setQuizStatus("finished")
      setCurrentQ(null)
    })

    socket.on("quiz_finished", () => {
      console.log("Quiz finished")
      setQuizStatus("finished")
      setCurrentQ(null)
      loadLeaderboard()
    })

    socket.on("leaderboard_update", (data) => {
      console.log("Leaderboard update:", data)
      setLeaderboard(data.leaderboard || [])
    })

    socket.on("error", (error) => {
      console.error("Socket error:", error)
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [quizId])

  const submitAnswer = async (participantId: string | number, selectedOption: number) => {
    try {
      const response = await api.post(`/player/${quizId}/answer`, {
        participant_id: participantId,
        question_index: questionIndex,
        selected_option: selectedOption,
      })

      console.log("[v0] Answer response:", response.data)

      // Track answered questions
      setAnswered((prev) => new Set(prev).add(questionIndex))

      return response.data
    } catch (error: any) {
      console.error("[v0] Error submitting answer:", error)

      if (error.response?.data?.error) {
        throw new Error(error.response.data.error)
      }
      throw error
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Waiting State */}
      {quizStatus === "waiting" && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Waiting for quiz to start...</h2>
          <p className="text-gray-600 dark:text-gray-400">The host will begin the quiz shortly</p>
        </div>
      )}

      {/* Active Question */}
      {quizStatus === "active" && currentQ && participant && (
        <div className="space-y-6">
          <PlayerQuestionCard
            question={currentQ}
            index={questionIndex}
            quizId={quizId}
            participantId={participant.id}
            onSubmit={submitAnswer}
          />

          {/* Live Leaderboard Preview */}
          {leaderboard.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Live Standings</h3>
              <LeaderboardTable rows={leaderboard.slice(0, 5)} />
            </div>
          )}
        </div>
      )}

      {/* Finished State */}
      {quizStatus === "finished" && (
        <div className="space-y-6">
          <div className="text-center py-10 bg-linear-to-r from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg">
            <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-gray-600 dark:text-gray-400">Check out the final leaderboard below</p>
          </div>

          {leaderboard.length > 0 && (
            <div>
              <h3 className="text-2xl font-semibold mb-4">Final Leaderboard</h3>
              <LeaderboardTable rows={leaderboard} />
            </div>
          )}
        </div>
      )}

      {/* No Participant Warning */}
      {!participant && quizStatus !== "waiting" && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">You haven&apos;t joined this quiz. Please join from the lobby first.</p>
        </div>
      )}
    </div>
  )
}
