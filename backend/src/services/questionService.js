import db from "../db.js"

/**
 * Create or insert questions for a quiz
 */
export async function addQuestions(quizId, questions) {
  try {
    const insertQuery = `
      INSERT INTO questions (
        quiz_id, 
        question_index, 
        question_text, 
        options, 
        correct_answer, 
        time_limit, 
        points
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (quiz_id, question_index) DO UPDATE
      SET question_text = EXCLUDED.question_text,
          options = EXCLUDED.options,
          correct_answer = EXCLUDED.correct_answer,
          time_limit = EXCLUDED.time_limit,
          points = EXCLUDED.points,
          updated_at = NOW()
      RETURNING *
    `

    const results = []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const res = await db.query(insertQuery, [
        quizId,
        i, // question_index
        q.question_text || q.text,
        JSON.stringify(q.options || q.choices || []),
        q.correct_answer || q.correctAnswer || 0,
        q.time_limit || q.timeLimit || 30,
        q.points || 100,
      ])
      results.push(res.rows[0])
    }
    return results
  } catch (err) {
    console.error("Error adding questions:", err)
    throw err
  }
}

/**
 * Get all questions for a quiz
 */
export async function getQuizQuestions(quizId) {
  try {
    const res = await db.query(`SELECT * FROM questions WHERE quiz_id = $1 ORDER BY question_index ASC`, [quizId])
    return res.rows.map((q) => ({
      ...q,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    }))
  } catch (err) {
    console.error("Error fetching questions:", err)
    throw err
  }
}

/**
 * Get a single question by quiz_id and question_index
 */
export async function getQuestion(quizId, questionIndex) {
  try {
    const res = await db.query(`SELECT * FROM questions WHERE quiz_id = $1 AND question_index = $2`, [
      quizId,
      questionIndex,
    ])
    if (res.rowCount === 0) throw new Error("Question not found")

    const q = res.rows[0]
    return {
      ...q,
      options: typeof q.options === "string" ? JSON.parse(q.options) : q.options,
    }
  } catch (err) {
    console.error("Error fetching question:", err)
    throw err
  }
}

/**
 * Verify if an answer is correct
 */
export async function verifyAnswer(quizId, questionIndex, selectedOption) {
  try {
    const q = await getQuestion(quizId, questionIndex)
    return q.correct_answer === selectedOption
  } catch (err) {
    console.error("Error verifying answer:", err)
    throw err
  }
}

/**
 * Get total number of questions in a quiz
 */
export async function getQuestionCount(quizId) {
  try {
    const res = await db.query(`SELECT COUNT(*) as count FROM questions WHERE quiz_id = $1`, [quizId])
    return Number.parseInt(res.rows[0].count, 10)
  } catch (err) {
    console.error("Error getting question count:", err)
    throw err
  }
}

/**
 * Delete questions for a quiz
 */
export async function deleteQuizQuestions(quizId) {
  try {
    const res = await db.query(`DELETE FROM questions WHERE quiz_id = $1`, [quizId])
    return res.rowCount
  } catch (err) {
    console.error("Error deleting questions:", err)
    throw err
  }
}
