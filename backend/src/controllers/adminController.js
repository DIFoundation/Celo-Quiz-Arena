import db from "../db.js"
import { computeAndPersistResults } from "../services/scoringService.js"
import { io } from "../server.js"
import * as hostService from "../services/hostService.js"

/**
 * Start quiz and begin broadcasting questions
 */
export const startQuiz = async (req, res) => {
  try {
    const { id: quizId } = req.params

    const quiz = await hostService.startQuiz(quizId)

    // Notify all connected players
    io.to(`quiz_${quizId}`).emit("quiz_started", {
      quizId,
      startedAt: Date.now(),
    })

    res.json({
      ok: true,
      message: "Quiz started",
      quiz,
      totalQuestions: quiz.question_durations?.length || 0,
    })
  } catch (err) {
    console.error("startQuiz error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Broadcast a specific question to all players
 */
export const broadcastQuestion = async (req, res) => {
  try {
    const { id: quizId } = req.params
    const { questionIndex } = req.body

    const payload = await hostService.broadcastNextQuestion(io, quizId, questionIndex)

    res.json({
      ok: true,
      message: "Question broadcasted",
      payload,
    })
  } catch (err) {
    console.error("broadcastQuestion error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * End quiz (mark as ended, stop accepting answers)
 */
export const endQuiz = async (req, res) => {
  const { id: quizId } = req.params

  try {
    const quiz = await hostService.endQuiz(quizId)

    io.to(`quiz_${quizId}`).emit("quiz_ended", { quizId })

    return res.json({ ok: true, message: "Quiz ended", quiz })
  } catch (err) {
    console.error("endQuiz error:", err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Finalize quiz: compute winners and prepare for blockchain payout
 */
export const finalizeQuiz = async (req, res) => {
  const { id: quizId } = req.params

  try {
    // Fetch quiz details
    const quizRes = await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId])

    if (quizRes.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Quiz not found" })
    }

    const quiz = quizRes.rows[0]
    const topN = Number(quiz.num_winners) || 3

    const { winners, allScores } = await computeAndPersistResults(quizId, topN)

    // Format winners for smart contract (array of wallet addresses)
    const winnersWallets = winners.map((w) => w.wallet)

    // Emit to connected clients
    io.to(`quiz_${quizId}`).emit("quiz_finalized", {
      quizId,
      winners,
      allScores,
    })

    return res.json({
      ok: true,
      message: "Quiz finalized",
      winners,
      winnersWallets,
      allScores,
      contractAddress: quiz.contract_address,
    })
  } catch (err) {
    console.error("finalizeQuiz error:", err)
    return res.status(500).json({
      ok: false,
      error: err.message || "Finalization failed",
    })
  }
}

/**
 * Distribute prizes via smart contract
 */
export const distributePrizes = async (req, res) => {
  const { id: quizId } = req.params
  const { winnersWallets } = req.body

  try {
    if (!winnersWallets || !Array.isArray(winnersWallets)) {
      return res.status(400).json({ ok: false, error: "winnersWallets array is required" })
    }

    // Fetch quiz to get contract address and status
    const quizRes = await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId])
    if (quizRes.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Quiz not found" })
    }

    const quiz = quizRes.rows[0]

    if (!quiz.contract_address) {
      return res.status(400).json({ ok: false, error: "No contract address found for this quiz" })
    }

    if (quiz.status !== "finalized") {
      return res.status(400).json({ ok: false, error: "Quiz must be finalized before distributing prizes" })
    }

    // Update quiz status to show prizes are being distributed
    await db.query("UPDATE quizzes SET status = $1 WHERE id = $2", ["distributing", quizId])

    // Emit prize distribution started event
    io.to(`quiz_${quizId}`).emit("prize_distribution_started", {
      quizId,
      winnersCount: winnersWallets.length,
      contractAddress: quiz.contract_address,
    })

    return res.json({
      ok: true,
      message: "Prize distribution initiated",
      quizId,
      contractAddress: quiz.contract_address,
      winnersCount: winnersWallets.length,
      token: quiz.token,
    })
  } catch (err) {
    console.error("distributePrizes error:", err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Confirm prize distribution after blockchain transaction
 */
export const confirmPrizeDistribution = async (req, res) => {
  const { id: quizId } = req.params
  const { transactionHash } = req.body

  try {
    if (!transactionHash) {
      return res.status(400).json({ ok: false, error: "transactionHash is required" })
    }

    // Mark quiz as completed
    const quizRes = await db.query("UPDATE quizzes SET status = $1, distribution_tx = $2 WHERE id = $3 RETURNING *", [
      "completed",
      transactionHash,
      quizId,
    ])

    if (quizRes.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Quiz not found" })
    }

    const quiz = quizRes.rows[0]

    // Emit completion event
    io.to(`quiz_${quizId}`).emit("prize_distribution_completed", {
      quizId,
      transactionHash,
      status: "completed",
    })

    return res.json({
      ok: true,
      message: "Prize distribution confirmed",
      quiz,
    })
  } catch (err) {
    console.error("confirmPrizeDistribution error:", err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Cancel quiz before it starts
 */
export const cancelQuiz = async (req, res) => {
  const { id: quizId } = req.params

  try {
    const result = await db.query(
      `UPDATE quizzes 
       SET status = 'cancelled', cancelled_at = NOW() 
       WHERE id = $1 AND status = 'pending' 
       RETURNING *`,
      [quizId],
    )

    if (result.rowCount === 0) {
      return res.status(400).json({
        ok: false,
        error: "Quiz not found or already started",
      })
    }

    io.to(`quiz_${quizId}`).emit("quiz_cancelled", { quizId })

    return res.json({
      ok: true,
      message: "Quiz cancelled",
      quiz: result.rows[0],
    })
  } catch (err) {
    console.error("cancelQuiz error:", err)
    return res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Get all quizzes with pagination and filters
 */
export const getAllQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, host } = req.query
    const offset = (page - 1) * limit

    let query = "SELECT * FROM quizzes WHERE 1=1"
    const params = []
    let paramCount = 1

    if (status) {
      query += ` AND status = $${paramCount++}`
      params.push(status)
    }

    if (host) {
      query += ` AND host = $${paramCount++}`
      params.push(host)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`
    params.push(limit, offset)

    const quizzesRes = await db.query(query, params)

    const countRes = await db.query(
      `SELECT COUNT(*) as total FROM quizzes WHERE 1=1${status ? " AND status = $1" : ""}${host ? ` AND host = $${status ? 2 : 1}` : ""}`,
      [status, host].filter(Boolean),
    )

    res.json({
      ok: true,
      quizzes: quizzesRes.rows,
      total: Number.parseInt(countRes.rows[0].total),
      page: Number.parseInt(page),
      pages: Math.ceil(countRes.rows[0].total / limit),
    })
  } catch (err) {
    console.error("getAllQuizzes error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Get quiz with full details and participants
 */
export const getQuizDetails = async (req, res) => {
  try {
    const { id: quizId } = req.params

    const quizRes = await db.query("SELECT * FROM quizzes WHERE id = $1", [quizId])
    if (quizRes.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Quiz not found" })
    }

    const quiz = quizRes.rows[0]

    const participantsRes = await db.query(
      "SELECT id, wallet, name, score, joined_at FROM participants WHERE quiz_id = $1 ORDER BY score DESC",
      [quizId],
    )

    const questionsRes = await db.query(
      "SELECT id, question_index, question_text FROM questions WHERE quiz_id = $1 ORDER BY question_index ASC",
      [quizId],
    )

    res.json({
      ok: true,
      quiz,
      participants: participantsRes.rows,
      questions: questionsRes.rows,
      totalParticipants: participantsRes.rowCount,
      totalQuestions: questionsRes.rowCount,
    })
  } catch (err) {
    console.error("getQuizDetails error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Get analytics and statistics
 */
export const getAnalytics = async (req, res) => {
  try {
    // Total quizzes
    const totalQuizzesRes = await db.query("SELECT COUNT(*) as count FROM quizzes")
    const totalQuizzes = Number.parseInt(totalQuizzesRes.rows[0].count)

    // Total participants
    const totalParticipantsRes = await db.query("SELECT COUNT(DISTINCT quiz_id) as count FROM participants")
    const totalParticipantsCount = Number.parseInt(totalParticipantsRes.rows[0].count)

    // Active quizzes
    const activeQuizzesRes = await db.query("SELECT COUNT(*) as count FROM quizzes WHERE status = 'active'")
    const activeQuizzes = Number.parseInt(activeQuizzesRes.rows[0].count)

    // Completed quizzes
    const completedQuizzesRes = await db.query("SELECT COUNT(*) as count FROM quizzes WHERE status = 'completed'")
    const completedQuizzes = Number.parseInt(completedQuizzesRes.rows[0].count)

    // Token distribution
    const tokenDistRes = await db.query(
      `SELECT token, COUNT(*) as count FROM quizzes GROUP BY token ORDER BY count DESC`,
    )

    // Quiz status breakdown
    const statusRes = await db.query(`SELECT status, COUNT(*) as count FROM quizzes GROUP BY status`)

    // Revenue by token (from completed quizzes)
    const revenueRes = await db.query(
      `SELECT token, COUNT(*) as quiz_count FROM quizzes WHERE status = 'completed' GROUP BY token`,
    )

    res.json({
      ok: true,
      stats: {
        totalQuizzes,
        totalParticipants: totalParticipantsCount,
        activeQuizzes,
        completedQuizzes,
        tokenDistribution: tokenDistRes.rows,
        statusBreakdown: statusRes.rows,
        revenue: revenueRes.rows,
      },
    })
  } catch (err) {
    console.error("getAnalytics error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

/**
 * Delete quiz (only if pending)
 */
export const deleteQuiz = async (req, res) => {
  try {
    const { id: quizId } = req.params

    const quizRes = await db.query("UPDATE quizzes SET status = $1 WHERE id = $2 AND status = 'pending' RETURNING *", [
      "deleted",
      quizId,
    ])

    if (quizRes.rowCount === 0) {
      return res.status(400).json({
        ok: false,
        error: "Quiz not found or already started",
      })
    }

    res.json({
      ok: true,
      message: "Quiz deleted",
      quiz: quizRes.rows[0],
    })
  } catch (err) {
    console.error("deleteQuiz error:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}
