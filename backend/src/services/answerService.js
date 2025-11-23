// services/answerService.js
const db = require("../db");

async function storeAnswer({
  quizId,
  participant,
  questionIndex,
  option
}) {
  // prevent double answers
  const exists = await db.query(
    `SELECT id FROM answers WHERE quiz_id=$1 AND participant=$2 AND question_index=$3`,
    [quizId, participant, questionIndex]
  );

  if (exists.rows.length) {
    throw new Error("Already answered");
  }

  // TODO: fetch correct option from metadata or DB
  const correct = option === "A"; // placeholder

  const timeTaken = Date.now() - Date.now(); // replace with real timer (next step)

  await db.query(
    `INSERT INTO answers (quiz_id, participant, question_index, correct, time_taken_ms)
     VALUES ($1,$2,$3,$4,$5)`,
    [quizId, participant, questionIndex, correct, timeTaken]
  );
}

async function getLeaderboard(quizId) {
  const result = await db.query(
    `SELECT participant,
            COUNT(*) FILTER (WHERE correct = true) AS score,
            SUM(time_taken_ms) AS total_time
     FROM answers
     WHERE quiz_id=$1
     GROUP BY participant
     ORDER BY score DESC, total_time ASC`,
    [quizId]
  );

  return result.rows;
}

module.exports = {
  storeAnswer,
  getLeaderboard
};
