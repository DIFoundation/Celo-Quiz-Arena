// services/playerService.js
import db from "../db";

/**
 * Add player to quiz participants
 */
async function joinQuiz({ quizId, wallet }) {
  // Check if quiz exists and is still active
  const quizCheck = await db.query(
    "SELECT * FROM quizzes WHERE id = $1 AND status = 'pending'",
    [quizId]
  );

  if (quizCheck.rowCount === 0) {
    throw new Error("Quiz not found or not accepting participants");
  }

  // Check if already joined
  const exists = await db.query(
    "SELECT * FROM participants WHERE quiz_id = $1 AND wallet = $2",
    [quizId, wallet]
  );

  if (exists.rowCount > 0) {
    throw new Error("Player already joined");
  }

  // Insert participant
  const result = await db.query(
    `INSERT INTO participants (quiz_id, wallet, score)
     VALUES ($1, $2, 0)
     RETURNING *`,
    [quizId, wallet]
  );

  return result.rows[0];
}

// export async function joinQuiz(quizId, wallet) {
//   if (!wallet) throw new Error("Wallet address is required");

//   // Check quiz exists & not ended
//   const quiz = await db.query(
//     "SELECT * FROM quizzes WHERE id = $1 AND status != 'ended'",
//     [quizId]
//   );

//   if (quiz.rows.length === 0) {
//     throw new Error("Quiz not found or already ended");
//   }

//   // Prevent duplicate join
//   const existing = await db.query(
//     "SELECT * FROM participants WHERE quiz_id = $1 AND wallet = $2",
//     [quizId, wallet]
//   );

//   if (existing.rows.length > 0) {
//     return existing.rows[0]; // return existing record
//   }

//   // Create participant entry
//   const result = await db.query(
//     `INSERT INTO participants (quiz_id, wallet, score)
//      VALUES ($1, $2, 0)
//      RETURNING *`,
//     [quizId, wallet]
//   );

//   return result.rows[0];
// }


/**
 * Update score after answering a question
 */
async function updateScore({ quizId, wallet, score }) {
  const result = await db.query(
    `UPDATE participants
     SET score = $1
     WHERE quiz_id = $2 AND wallet = $3
     RETURNING *`,
    [score, quizId, wallet]
  );

  if (result.rowCount === 0) {
    throw new Error("Player not found");
  }

  return result.rows[0];
}

/**
 * Get leaderboard for a quiz
 */
async function getLeaderboard(quizId) {
  const result = await db.query(
    `SELECT wallet, score
     FROM participants
     WHERE quiz_id = $1
     ORDER BY score DESC`,
    [quizId]
  );

  return result.rows;
}

export {
  joinQuiz,
  updateScore,
  getLeaderboard,
};
