// src/controllers/playerController.js
import { pool } from "../db.js";

export const joinQuiz = async (req, res) => {
  const { id: quizId } = req.params;
  const { wallet, name } = req.body;

  console.log("Join quiz request:", { quizId, wallet, name });

  // Validation
  if (!wallet) {
    return res.status(400).json({ 
      success: false,
      error: "Wallet address is required" 
    });
  }

  try {
    // Check if quiz exists and is accepting participants
    const quizCheck = await pool.query(
      `SELECT * FROM quizzes WHERE (quiz_id, wallet, name) = ($1, $2, $3)`,
      [quizId, wallet, name]
    );

    if (quizCheck.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Quiz not found" 
      });
    }

    const quiz = quizCheck.rows[0];

    // Check if quiz has already started or finished
    if (quiz.status === 'active') {
      return res.status(400).json({ 
        success: false,
        error: "Quiz has already started. Cannot join now." 
      });
    }

    if (quiz.status === 'ended' || quiz.status === 'finalized' || quiz.status === 'cancelled') {
      return res.status(400).json({ 
        success: false,
        error: `Quiz is ${quiz.status}. Cannot join.` 
      });
    }

    // Check if player already joined
    const existingParticipant = await pool.query(
      `SELECT * FROM participants WHERE quiz_id = $1 AND wallet = $2`,
      [quizId, wallet]
    );

    if (existingParticipant.rowCount > 0) {
      // Player already joined, return existing participant
      console.log("Player already joined, returning existing participant");
      return res.status(200).json({ 
        success: true,
        participant: existingParticipant.rows[0],
        message: "Already joined this quiz"
      });
    }

    // Insert new participant
    const insertResult = await pool.query(
      `INSERT INTO participants (quiz_id, wallet, name, score)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [quizId, wallet, name || null]
    );

    const participant = insertResult.rows[0];

    console.log("New participant created:", participant);

    return res.status(201).json({ 
      success: true,
      participant,
      message: "Successfully joined the quiz"
    });

  } catch (err) {
    console.error("joinQuiz error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to join quiz",
      details: err.message 
    });
  }
};

export const submitAnswer = async (req, res) => {
  const quizId = req.params.id;
  const { participant_id, question_index, selected_option, is_correct } = req.body;
  if (!participant_id || question_index === undefined || selected_option === undefined) {
    return res.status(400).json({ 
      success: false,
      error: "participant_id and question_index required" 
    });
  }

  try {
    const insert = await pool.query(
      `INSERT INTO answers (quiz_id, participant_id, question_index, selected_option, is_correct)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [quizId, participant_id, question_index, selected_option ?? null, is_correct ?? null]
    );

    if (participantCheck.rowCount === 0) {
      return res.status(404).json({ 
        success: false,
        error: "Participant not found for this quiz" 
      });
    }

    // Check if answer already submitted for this question
    const existingAnswer = await pool.query(
      `SELECT * FROM answers 
       WHERE quiz_id = $1 AND participant_id = $2 AND question_index = $3`,
      [quizId, participant_id, question_index]
    );

    if (existingAnswer.rowCount > 0) {
      return res.status(400).json({ 
        success: false,
        error: "Answer already submitted for this question" 
      });
    }

     // TODO: Fetch correct answer from metadata and set is_correct
    // For now, we'll set is_correct as null and update it later
    const insertResult = await pool.query(
      `INSERT INTO answers (quiz_id, participant_id, question_index, selected_option, is_correct)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [quizId, participant_id, question_index, selected_option, null]
    );

    const answer = insertResult.rows[0];

    console.log("Answer submitted:", answer);

    return res.status(201).json({ 
      success: true,
      answer,
      message: "Answer submitted successfully"
    });
  } catch (err) {
    console.error("submitAnswer err", err);
    return res.status(500).json({ error: "submit failed" });
  }
};

export const getLeaderboard = async (req, res) => {
  const { id: quizId } = req.params;

  try {
    // Check if quiz is finalized (has results)
    const resultsCheck = await pool.query(
      `SELECT COUNT(*) as count FROM results WHERE quiz_id = $1`,
      [quizId]
    );

    if (Number(resultsCheck.rows[0].count) > 0) {
      // Quiz is finalized, return results table
      const results = await pool.query(
        `SELECT 
          r.rank, 
          r.total_score, 
          p.wallet,
          p.name
         FROM results r
         JOIN participants p ON p.id = r.participant_id
         WHERE r.quiz_id = $1
         ORDER BY r.rank ASC`,
        [quizId]
      );

      return res.json({ 
        success: true,
        leaderboard: results.rows,
        finalized: true
      });
    }

    // Quiz not finalized, return live leaderboard from participants
    const participants = await pool.query(
      `SELECT 
        p.id as participant_id, 
        p.wallet,
        p.name,
        p.score,
        COUNT(a.id) FILTER (WHERE a.is_correct = true) as correct_answers,
        COUNT(a.id) as total_answers
       FROM participants p
       LEFT JOIN answers a ON a.participant_id = p.id AND a.quiz_id = p.quiz_id
       WHERE p.quiz_id = $1
       GROUP BY p.id, p.wallet, p.name, p.score
       ORDER BY p.score DESC NULLS LAST, correct_answers DESC`,
      [quizId]
    );

    return res.json({ 
      success: true,
      leaderboard: participants.rows,
      finalized: false
    });

  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ 
      success: false,
      error: "Failed to fetch leaderboard",
      details: err.message 
    });
  }
};