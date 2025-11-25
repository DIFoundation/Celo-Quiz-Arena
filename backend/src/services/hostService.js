import db from "../db.js"

/**
 * Start a quiz and prepare for question broadcasting
 */
export async function startQuiz(quizId) {
  const result = await db.query(
    `UPDATE quizzes 
     SET status = 'active', started = true, started_at = NOW() 
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [quizId],
  )

  if (result.rowCount === 0) {
    throw new Error("Quiz not found or already started")
  }

  return result.rows[0]
}

/**
 * Get current question for a quiz by index
 */
export async function getCurrentQuestion(quizId, questionIndex) {
  try {
    const res = await db.query(
      `SELECT * FROM questions 
       WHERE quiz_id = $1 AND question_index = $2`,
      [quizId, questionIndex],
    )

    if (res.rowCount === 0) {
      throw new Error("Question not found")
    }

    const q = res.rows[0]
    return {
      id: q.id,
      quiz_id: q.quiz_id,
      question_index: q.question_index,
      question_text: q.question_text,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
      time_limit: q.time_limit || 30,
      points: q.points || 100,
      // Don't send correct_answer to clients - that's for scoring later
    }
  } catch (err) {
    console.error("Error fetching question:", err)
    throw err
  }
}

/**
 * Broadcast next question to all players in quiz
 */
export async function broadcastNextQuestion(io, quizId, questionIndex) {
  try {
    const question = await getCurrentQuestion(quizId, questionIndex)
    const totalQuestions = await getTotalQuestions(quizId)

    const payload = {
      questionIndex,
      question,
      totalQuestions,
      endsAt: Date.now() + question.time_limit * 1000,
    }

    io.to(`quiz_${quizId}`).emit("new_question", payload)
    console.log(`Broadcasting question ${questionIndex + 1}/${totalQuestions} for quiz ${quizId}`)

    return payload
  } catch (err) {
    console.error("Error broadcasting question:", err)
    throw err
  }
}

/**
 * Get total number of questions in a quiz
 */
export async function getTotalQuestions(quizId) {
  const res = await db.query(`SELECT COUNT(*) as count FROM questions WHERE quiz_id = $1`, [quizId])
  return Number.parseInt(res.rows[0].count, 10)
}

/**
 * End quiz (stop accepting answers)
 */
export async function endQuiz(quizId) {
  const result = await db.query(
    `UPDATE quizzes 
     SET status = 'ended', ended_at = NOW() 
     WHERE id = $1 
     RETURNING *`,
    [quizId],
  )

  if (result.rowCount === 0) {
    throw new Error("Quiz not found")
  }

  return result.rows[0]
}

/**
 * Get participant list for a quiz
 */
export async function getParticipants(quizId) {
  const res = await db.query(
    `SELECT id, wallet, name, score, joined_at 
     FROM participants 
     WHERE quiz_id = $1 
     ORDER BY joined_at ASC`,
    [quizId],
  )
  return res.rows
}

/**
 * Get quiz details with participant count
 */
export async function getQuizWithParticipants(quizId) {
  const quizRes = await db.query(`SELECT * FROM quizzes WHERE id = $1`, [quizId])

  if (quizRes.rowCount === 0) {
    throw new Error("Quiz not found")
  }

  const quiz = quizRes.rows[0]
  const participants = await getParticipants(quizId)
  const questionCount = await getTotalQuestions(quizId)

  return {
    ...quiz,
    participants,
    participant_count: participants.length,
    question_count: questionCount,
  }
}
