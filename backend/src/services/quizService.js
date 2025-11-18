// src/services/quizService.js
import db from "../db.js";

/**
 * Scoring logic:
 * - For each question:
 *   - filter answers where is_correct = true (we expect backend to mark is_correct
 *     by comparing selected_option with correct answer from metadata)
 *   - order by answered_at asc
 *   - award points: first = 1000, second = 950, third = 900, ...
 * - total score is sum across questions
 *
 * NOTE: We assume answers.is_correct is set (you can compute it by fetching metadataURI)
 */

const BASE_POINTS = 1000;
const DECREMENT = 50;

async function createQuiz(host, token, num_winners, percentages, equal_split, metadata_uri) {
  const insert = `
    INSERT INTO quizzes (host, token, num_winners, equal_split, percentages, metadata_uri)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const res = await db.query(insert, [host, token, num_winners, equal_split, percentages || [], metadata_uri || null]);
  return res.rows[0];
}

async function getQuiz(id) {
  const res = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (res.rowCount === 0) throw new Error('quiz not found');
  return res.rows[0];
}

async function joinQuiz(quizId, wallet, name) {
  const insert = `
    INSERT INTO participants (quiz_id, wallet, name)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const res = await db.query(insert, [quizId, wallet, name || null]);
  return res.rows[0];
}

async function startQuiz(quizId) {
  await db.query('UPDATE quizzes SET started = true, started_at = now() WHERE id = $1', [quizId]);
  return true;
}

async function getResults(quizId) {
  const res = await db.query(
    `SELECT r.*, p.wallet, p.name FROM results r JOIN participants p ON p.id = r.participant_id WHERE r.quiz_id = $1 ORDER BY r.rank ASC`,
    [quizId]
  );
  return res.rows;
}

export {
  createQuiz,
  getQuiz,
  joinQuiz,
  startQuiz,
  getResults,
};
