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

async function joinQuiz(quizId, playerAddress, name) {
  const insert = `
    INSERT INTO participants (quiz_id, player_address, name)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const res = await db.query(insert, [quizId, playerAddress, name || null]);
  return res.rows[0];
}

async function startQuiz(quizId) {
  await db.query('UPDATE quizzes SET started = true, started_at = now() WHERE id = $1', [quizId]);
  return true;
}

/**
 * finalizeQuiz: compute scores, persist results, return ordered winners
 */
async function finalizeQuiz(quizId) {
  // 1. fetch quiz to ensure started and not finalized
  const quizRes = await db.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
  if (quizRes.rowCount === 0) throw new Error('quiz not found');
  const quiz = quizRes.rows[0];
  if (!quiz.started) throw new Error('quiz not started');
  if (quiz.finalized) throw new Error('already finalized');

  // 2. fetch all answers grouped by question and participant
  const answersRes = await db.query(
    `SELECT a.id, a.participant_id, a.question_index, a.selected_option, a.is_correct, a.answered_at,
            p.player_address, p.name
     FROM answers a
     JOIN participants p ON p.id = a.participant_id
     WHERE a.quiz_id = $1
     ORDER BY a.question_index, a.answered_at ASC`,
    [quizId]
  );
  const answers = answersRes.rows;

  // 3. compute per-participant totalScore
  const participantScores = {}; // participantId -> totalScore
  const participantsMeta = {}; // participantId -> { player_address, name }

  // group answers by question
  const byQuestion = {};
  for (const a of answers) {
    if (!byQuestion[a.question_index]) byQuestion[a.question_index] = [];
    byQuestion[a.question_index].push(a);
    participantsMeta[a.participant_id] = { player_address: a.player_address, name: a.name };
  }

  // For each question, award fastest-finger points among correct responders
  for (const qIdx of Object.keys(byQuestion)) {
    const arr = byQuestion[qIdx];

    // filter correct answers
    const corrects = arr.filter(x => x.is_correct);

    // order is already by answered_at ASC because query included that
    corrects.sort((a, b) => new Date(a.answered_at) - new Date(b.answered_at));

    for (let rank = 0; rank < corrects.length; ++rank) {
      const a = corrects[rank];
      const points = Math.max(0, BASE_POINTS - (DECREMENT * rank));
      participantScores[a.participant_id] = (participantScores[a.participant_id] || 0) + points;
    }
  }

  // Persist results: compute ranking
  const entries = Object.entries(participantScores).map(([participantId, totalScore]) => ({
    participantId,
    totalScore,
  }));

  // if no participants or no scores, still mark finalized
  // sort descending by score
  entries.sort((a, b) => b.totalScore - a.totalScore);

  // write results rows
  await db.query('BEGIN');
  try {
    // mark quiz finalized
    await db.query('UPDATE quizzes SET finalized = true, finalized_at = now() WHERE id = $1', [quizId]);

    // insert results and assign rank
    for (let i = 0; i < entries.length; ++i) {
      const e = entries[i];
      const rank = i + 1;
      await db.query(
        `INSERT INTO results (quiz_id, participant_id, total_score, rank) VALUES ($1, $2, $3, $4)`,
        [quizId, e.participantId, e.totalScore, rank]
      );
    }

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  // prepare winners (top N)
  const numWinners = quiz.num_winners;
  const winners = entries.slice(0, numWinners).map((e, idx) => ({
    participantId: e.participantId,
    totalScore: e.totalScore,
    rank: idx + 1,
    address: participantsMeta[e.participantId].player_address,
    name: participantsMeta[e.participantId].name,
  }));

  return { winners };
}

async function getResults(quizId) {
  const res = await db.query(
    `SELECT r.*, p.player_address, p.name FROM results r JOIN participants p ON p.id = r.participant_id WHERE r.quiz_id = $1 ORDER BY r.rank ASC`,
    [quizId]
  );
  return res.rows;
}

export {
  createQuiz,
  getQuiz,
  joinQuiz,
  startQuiz,
  finalizeQuiz,
  getResults,
};
