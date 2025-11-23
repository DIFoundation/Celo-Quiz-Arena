// src/services/quizService.js
import db from "../db.js";

/**
 * Create a new quiz with blockchain integration
 */
async function createQuiz(host, token, num_winners, percentages, equal_split, metadata_uri, contract_address = null) {
  const insert = `
    INSERT INTO quizzes (
      host, 
      token, 
      num_winners, 
      equal_split, 
      percentages, 
      metadata_uri,
      contract_address,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const res = await db.query(insert, [
    host, 
    token, 
    num_winners, 
    equal_split, 
    percentages || [], 
    metadata_uri || null,
    contract_address,
    'pending'
  ]);
  
  return res.rows[0];
}

/**
 * Get quiz by ID with participants
 */
async function getQuiz(id) {
  const quizRes = await db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
  if (quizRes.rowCount === 0) throw new Error('Quiz not found');
  
  const quiz = quizRes.rows[0];
  
  // Get participants
  const participantsRes = await db.query(
    'SELECT * FROM participants WHERE quiz_id = $1 ORDER BY joined_at ASC',
    [id]
  );
  
  quiz.participants = participantsRes.rows;
  
  return quiz;
}

/**
 * Update quiz contract address after blockchain deployment
 */
async function updateQuizContract(id, contractAddress) {
  const res = await db.query(
    'UPDATE quizzes SET contract_address = $1 WHERE id = $2 RETURNING *',
    [contractAddress, id]
  );
  
  if (res.rowCount === 0) throw new Error('Quiz not found');
  return res.rows[0];
}

/**
 * Start quiz
 */
async function startQuiz(quizId) {
  await db.query(
    'UPDATE quizzes SET started = true, started_at = now(), status = $1 WHERE id = $2',
    ['active', quizId]
  );
  return true;
}

/**
 * Get results with participant details
 */
async function getResults(quizId) {
  const res = await db.query(
    `SELECT 
      r.*, 
      p.wallet, 
      p.name,
      p.score
    FROM results r 
    JOIN participants p ON p.id = r.participant_id 
    WHERE r.quiz_id = $1 
    ORDER BY r.rank ASC`,
    [quizId]
  );
  return res.rows;
}

/**
 * Get live leaderboard (before finalization)
 */
async function getLiveLeaderboard(quizId) {
  const res = await db.query(
    `SELECT 
      p.id,
      p.wallet,
      p.name,
      p.score,
      COUNT(a.id) FILTER (WHERE a.is_correct = true) as correct_answers
    FROM participants p
    LEFT JOIN answers a ON a.participant_id = p.id AND a.quiz_id = p.quiz_id
    WHERE p.quiz_id = $1
    GROUP BY p.id, p.wallet, p.name, p.score
    ORDER BY p.score DESC, correct_answers DESC`,
    [quizId]
  );
  return res.rows;
}

export {
  createQuiz,
  getQuiz,
  updateQuizContract,
  startQuiz,
  getResults,
  getLiveLeaderboard,
};