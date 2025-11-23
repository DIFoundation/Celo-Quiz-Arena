// src/controllers/playerController.js
import { pool } from "../db.js";
// import * as playerService from "../services/playerService.js";

// export async function joinQuiz(req, res) {
//   try {
//     const { quizId } = req.params;
//     const { wallet } = req.body;

//     const participant = await playerService.joinQuiz(quizId, wallet);

//     res.json({
//       success: true,
//       participant,
//     });
//   } catch (err) {
//     res.status(400).json({ success: false, message: err.message });
//   }
// }


/**
 * Player joins a quiz (creates a participant row)
 * Body: { wallet }
 */
export const joinQuiz = async (req, res) => {
  const quizId = req.params.id;
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  try {
    const insert = await pool.query(
      `INSERT INTO participants (quiz_id, wallet) VALUES ($1,$2) RETURNING *`,
      [quizId, wallet]
    );
    return res.status(201).json({ participant: insert.rows[0] });
  } catch (err) {
    console.error("joinQuiz err", err);
    return res.status(500).json({ error: "join failed" });
  }
};

/**
 * Player submits an answer
 * Body: { participant_id, question_index, selected_option, is_correct (optional) }
 * - is_correct can be determined by backend by comparing to hosted metadata.
 * - We accept it if provided; otherwise backend must set it in a later job.
 */
export const submitAnswer = async (req, res) => {
  const quizId = req.params.id;
  const { participant_id, question_index, selected_option, is_correct } = req.body;
  if (!participant_id || question_index === undefined) {
    return res.status(400).json({ error: "participant_id and question_index required" });
  }

  try {
    const insert = await pool.query(
      `INSERT INTO answers (quiz_id, participant_id, question_index, selected_option, is_correct)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [quizId, participant_id, question_index, selected_option ?? null, is_correct ?? null]
    );
    return res.status(201).json({ answer: insert.rows[0] });
  } catch (err) {
    console.error("submitAnswer err", err);
    return res.status(500).json({ error: "submit failed" });
  }
};

/**
 * Leaderboard for quiz: returns participants ordered by score (DB results table if available),
 * otherwise compute a quick aggregate from participants.score column (if you update it live).
 */
export const getLeaderboard = async (req, res) => {
  const quizId = req.params.id;
  try {
    // prefer results table if finalized
    const r = await pool.query(`SELECT COUNT(*) FROM results WHERE quiz_id = $1`, [quizId]);
    if (Number(r.rows[0].count) > 0) {
      const rows = await pool.query(
        `SELECT r.rank, r.total_score, p.wallet
         FROM results r
         JOIN participants p ON p.id = r.participant_id
         WHERE r.quiz_id = $1
         ORDER BY r.rank ASC`,
        [quizId]
      );
      return res.json({ leaderboard: rows.rows });
    }

    // otherwise fallback: order participants by score column
    const rows = await pool.query(
      `SELECT p.id as participant_id, p.wallet, p.score
       FROM participants p
       WHERE p.quiz_id = $1
       ORDER BY p.score DESC NULLS LAST`,
      [quizId]
    );
    return res.json({ leaderboard: rows.rows });
  } catch (err) {
    console.error("getLeaderboard err", err);
    return res.status(500).json({ error: "failed" });
  }
};
