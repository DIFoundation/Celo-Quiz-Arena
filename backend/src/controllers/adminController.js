// src/controllers/adminController.js
import { pool } from "../db.js";
import { computeAndPersistResults } from "../services/scoringService.js";

/**
 * Host starts the quiz (sets started flag)
 */
export const startQuiz = async (req, res) => {
  const quizId = req.params.id;
  try {
    await pool.query(`UPDATE quizzes SET status='active' WHERE id = $1`, [quizId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("startQuiz err", err);
    return res.status(500).json({ error: "failed to start" });
  }
};

/**
 * Host ends the quiz. (Optional; might be used to stop accepting answers)
 */
export const endQuiz = async (req, res) => {
  const quizId = req.params.id;
  try {
    await pool.query(`UPDATE quizzes SET status='ended' WHERE id = $1`, [quizId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("endQuiz err", err);
    return res.status(500).json({ error: "failed to end" });
  }
};

/**
 * Finalize: compute winners via scoringService, persist results and return winners list (wallets + ranks)
 * Body can optionally include `topN`. If not provided uses quiz.num_winners.
 */
export const finalizeQuiz = async (req, res) => {
  const quizId = req.params.id;
  try {
    // fetch quiz to obtain num_winners
    const q = await pool.query(`SELECT * FROM quizzes WHERE id = $1`, [quizId]);
    if (q.rowCount === 0) return res.status(404).json({ error: "quiz not found" });
    const quiz = q.rows[0];
    // parse num_winners from stored columns (ensure correct naming)
    const topN = Number(quiz.num_winners) || Number(req.body.topN) || 3;

    const { winners, allScores } = await computeAndPersistResults(quizId, topN);

    // Return winners in the shape smart contract expects (array of wallets ordered by rank)
    const winnersWallets = winners.map((w) => w.wallet);

    return res.json({ winners, winnersWallets, allScores });
  } catch (err) {
    console.error("finalizeQuiz err", err);
    return res.status(500).json({ error: err.message || "finalize failed" });
  }
};

/**
 * Cancel quiz prior to start: refunds logic is on-chain; backend marks status and returns prize info
 */
export const cancelQuiz = async (req, res) => {
  const quizId = req.params.id;
  try {
    await pool.query(`UPDATE quizzes SET status='cancelled' WHERE id = $1`, [quizId]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("cancelQuiz err", err);
    return res.status(500).json({ error: "cancel failed" });
  }
};
