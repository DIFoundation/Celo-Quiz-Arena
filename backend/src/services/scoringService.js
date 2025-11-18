// src/services/scoringService.js
import { pool } from "../db.js";

/**
 * Scoring policy:
 * - For each question:
 *   - consider only answers where is_correct = true
 *   - sort by answered_at ASC (fastest first)
 *   - award points: first = BASE_POINTS, next = BASE_POINTS - DECREMENT, ...
 * - Sum across questions to get participant total_score
 *
 * Configurable constants:
 */
const BASE_POINTS = 1000;
const DECREMENT = 50;

/**
 * Compute scores for quizId and persist results.
 * Returns winners ordered by rank (descending score).
 */
export async function computeAndPersistResults(quizId, topN) {
  // ensure quiz exists and is started
  const qRes = await pool.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
  if (qRes.rowCount === 0) throw new Error("quiz not found");
  const quiz = qRes.rows[0];
  if (!quiz.started) throw new Error("quiz not started");

  // 1) fetch all answers for this quiz
  const ansRes = await pool.query(
    `SELECT a.*, p.wallet as player_wallet
     FROM answers a
     JOIN participants p ON p.id = a.participant_id
     WHERE a.quiz_id = $1
     ORDER BY a.question_index ASC, a.answered_at ASC`,
    [quizId]
  );
  const answers = ansRes.rows;

  // 2) group answers by question index
  const byQuestion = new Map();
  for (const a of answers) {
    const qidx = a.question_index;
    if (!byQuestion.has(qidx)) byQuestion.set(qidx, []);
    byQuestion.get(qidx).push(a);
  }

  // 3) accumulate participant scores
  const scores = new Map(); // participant_id -> totalScore
  const participantMeta = new Map(); // id -> { wallet }

  for (const [qidx, arr] of byQuestion.entries()) {
    // filter correct responses (note: is_correct should be set when inserting answer)
    const corrects = arr.filter((r) => r.is_correct);

    // they are already ordered by answered_at asc from query; sort to be sure
    corrects.sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at));

    for (let rank = 0; rank < corrects.length; rank++) {
      const row = corrects[rank];
      const pid = row.participant_id;
      participantMeta.set(pid, { wallet: row.player_wallet });

      const pts = Math.max(0, BASE_POINTS - DECREMENT * rank);
      const prev = scores.get(pid) || 0;
      scores.set(pid, prev + pts);
    }
  }

  // 4) convert map to sorted array
  const entries = Array.from(scores.entries()).map(([participant_id, totalScore]) => ({
    participant_id: Number(participant_id),
    totalScore,
    wallet: participantMeta.get(Number(participant_id))?.wallet || null,
  }));

  // sort by totalScore desc
  entries.sort((a, b) => b.totalScore - a.totalScore);

  // 5) persist results transactionally
  await pool.query("BEGIN");
  try {
    // remove any stale results for this quiz (re-finalize safe)
    await pool.query("DELETE FROM results WHERE quiz_id = $1", [quizId]);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const rank = i + 1;
      await pool.query(
        `INSERT INTO results (quiz_id, participant_id, total_score, rank)
         VALUES ($1, $2, $3, $4)`,
        [quizId, e.participant_id, e.totalScore, rank]
      );
    }

    // mark quiz as finalized and set finalized_at
    await pool.query(
      `UPDATE quizzes SET status='finalized', created_at = created_at WHERE id = $1`,
      [quizId]
    );

    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }

  // 6) build winners list (topN)
  const winners = entries.slice(0, topN).map((e, idx) => ({
    rank: idx + 1,
    participant_id: e.participant_id,
    totalScore: e.totalScore,
    wallet: e.wallet,
  }));

  return { winners, allScores: entries };
}
