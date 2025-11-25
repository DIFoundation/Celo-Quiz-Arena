import db from "../db.js"

/**
 * Submit and store an answer from a player
 */
export async function submitAnswer(quizId, participantId, questionIndex, selectedOption) {
  try {
    // Verify participant exists in this quiz
    const participantRes = await db.query(`SELECT id FROM participants WHERE id = $1 AND quiz_id = $2`, [
      participantId,
      quizId,
    ])

    if (participantRes.rowCount === 0) {
      throw new Error("Participant not found in this quiz")
    }

    // Check if answer already submitted for this question
    const existingRes = await db.query(
      `SELECT id FROM answers 
       WHERE quiz_id = $1 AND participant_id = $2 AND question_index = $3`,
      [quizId, participantId, questionIndex],
    )

    if (existingRes.rowCount > 0) {
      throw new Error("Answer already submitted for this question")
    }

    const questionRes = await db.query(
      `SELECT correct_answer, points FROM questions 
       WHERE quiz_id = $1 AND question_index = $2`,
      [quizId, questionIndex],
    )

    if (questionRes.rowCount === 0) {
      throw new Error("Question not found")
    }

    const question = questionRes.rows[0]
    const isCorrect = question.correct_answer === selectedOption
    const points = isCorrect ? question.points || 100 : 0

    const insertRes = await db.query(
      `INSERT INTO answers (
        quiz_id, 
        participant_id, 
        question_index, 
        selected_option, 
        is_correct,
        answered_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [quizId, participantId, questionIndex, selectedOption, isCorrect],
    )

    const answer = insertRes.rows[0]

    if (isCorrect) {
      await db.query(
        `UPDATE participants 
         SET score = score + $1 
         WHERE id = $2`,
        [points, participantId],
      )
    }

    return {
      answer,
      isCorrect,
      pointsAwarded: points,
    }
  } catch (err) {
    console.error("Error submitting answer:", err)
    throw err
  }
}

/**
 * Get all answers submitted by a participant in a quiz
 */
export async function getParticipantAnswers(quizId, participantId) {
  const res = await db.query(
    `SELECT 
      question_index,
      selected_option,
      is_correct,
      answered_at
     FROM answers 
     WHERE quiz_id = $1 AND participant_id = $2
     ORDER BY question_index ASC`,
    [quizId, participantId],
  )
  return res.rows
}

/**
 * Get live leaderboard for a quiz (based on current scores)
 */
export async function getLiveLeaderboard(quizId) {
  const res = await db.query(
    `SELECT 
      p.id as participant_id,
      p.wallet,
      p.name,
      p.score,
      COUNT(a.id) FILTER (WHERE a.is_correct = true) as correct_answers,
      COUNT(a.id) as total_answered
     FROM participants p
     LEFT JOIN answers a ON a.participant_id = p.id AND a.quiz_id = p.quiz_id
     WHERE p.quiz_id = $1
     GROUP BY p.id, p.wallet, p.name, p.score
     ORDER BY p.score DESC NULLS LAST, correct_answers DESC`,
    [quizId],
  )
  return res.rows
}
