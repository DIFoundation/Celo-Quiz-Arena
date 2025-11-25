import db from "../db.js"
import * as answerService from "../services/answerService.js"
import { io } from "../server.js"

export const joinQuiz = async (req, res) => {
  const { id: quizId } = req.params
  const { wallet, name } = req.body

  console.log("Join quiz request:", { quizId, wallet, name })

  if (!wallet) {
    return res.status(400).json({
      ok: false,
      error: "Wallet address is required",
    })
  }

  if (!quizId) {
    return res.status(400).json({
      ok: false,
      error: "Quiz ID is required",
    })
  }

  try {
    const quizCheck = await db.query(`SELECT * FROM quizzes WHERE id = $1`, [quizId])

    if (quizCheck.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: "Quiz not found",
      })
    }

    const quiz = quizCheck.rows[0]

    if (quiz.status === "active") {
      return res.status(400).json({
        ok: false,
        error: "Quiz has already started. Cannot join now.",
      })
    }

    if (quiz.status === "ended" || quiz.status === "finalized") {
      return res.status(400).json({
        ok: false,
        error: `Quiz is ${quiz.status}. Cannot join.`,
      })
    }

    const existingParticipant = await db.query(`SELECT * FROM participants WHERE quiz_id = $1 AND wallet = $2`, [
      quizId,
      wallet,
    ])

    if (existingParticipant.rowCount > 0) {
      console.log("Player already joined, returning existing participant")
      return res.status(200).json({
        ok: true,
        participant: existingParticipant.rows[0],
        message: "Already joined this quiz",
      })
    }

    const insertResult = await db.query(
      `INSERT INTO participants (quiz_id, wallet, name, score)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [quizId, wallet, name || null],
    )

    const participant = insertResult.rows[0]
    console.log("New participant created:", participant)

    return res.status(201).json({
      ok: true,
      participant,
      message: "Successfully joined the quiz",
    })
  } catch (err) {
    console.error("joinQuiz error:", err)
    return res.status(500).json({
      ok: false,
      error: "Failed to join quiz",
      details: err.message,
    })
  }
}

export const submitAnswer = async (req, res) => {
  const quizId = req.params.id
  const { participant_id, question_index, selected_option } = req.body

  if (!participant_id || question_index === undefined || selected_option === undefined) {
    return res.status(400).json({
      ok: false,
      error: "participant_id, question_index, and selected_option are required",
    })
  }

  try {
    const { answer, isCorrect, pointsAwarded } = await answerService.submitAnswer(
      quizId,
      participant_id,
      Number.parseInt(question_index),
      Number.parseInt(selected_option),
    )

    const leaderboard = await answerService.getLiveLeaderboard(quizId)
    io.to(`quiz_${quizId}`).emit("leaderboard_update", {
      leaderboard,
      latestAnswer: {
        participantId: participant_id,
        questionIndex: question_index,
        isCorrect,
      },
    })

    res.status(201).json({
      ok: true,
      answer,
      isCorrect,
      pointsAwarded,
      message: isCorrect ? "Correct answer!" : "Incorrect answer",
    })
  } catch (err) {
    console.error("submitAnswer error:", err)

    // Handle specific error cases
    if (err.message.includes("already submitted")) {
      return res.status(400).json({ ok: false, error: err.message })
    }
    if (err.message.includes("not found")) {
      return res.status(404).json({ ok: false, error: err.message })
    }

    res.status(500).json({
      ok: false,
      error: "Failed to submit answer",
      details: err.message,
    })
  }
}

export const getParticipantAnswers = async (req, res) => {
  const { id: quizId } = req.params
  const { participantId } = req.query

  if (!participantId) {
    return res.status(400).json({
      ok: false,
      error: "participantId query parameter is required",
    })
  }

  try {
    const answers = await answerService.getParticipantAnswers(quizId, participantId)
    res.json({ ok: true, answers })
  } catch (err) {
    console.error("getParticipantAnswers error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const getLeaderboard = async (req, res) => {
  const { id: quizId } = req.params

  try {
    const resultsCheck = await db.query(`SELECT COUNT(*) as count FROM results WHERE quiz_id = $1`, [quizId])

    if (Number(resultsCheck.rows[0].count) > 0) {
      // Quiz is finalized, return results table
      const results = await db.query(
        `SELECT 
          r.rank, 
          r.total_score, 
          r.prize_amount,
          p.wallet,
          p.name
         FROM results r
         JOIN participants p ON p.id = r.participant_id
         WHERE r.quiz_id = $1
         ORDER BY r.rank ASC`,
        [quizId],
      )

      return res.json({
        ok: true,
        leaderboard: results.rows,
        finalized: true,
      })
    }

    const leaderboard = await answerService.getLiveLeaderboard(quizId)
    res.json({
      ok: true,
      leaderboard,
      finalized: false,
    })
  } catch (err) {
    console.error("getLeaderboard error:", err)
    res.status(500).json({
      ok: false,
      error: "Failed to fetch leaderboard",
      details: err.message,
    })
  }
}
