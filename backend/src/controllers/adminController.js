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
