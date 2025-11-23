// src/controllers/adminController.js
import { pool } from "../db.js";
import { computeAndPersistResults } from "../services/scoringService.js";
import { io } from "../server.js";
import db from "../db.js";

/**
 * Start quiz and begin broadcasting questions
 */
export const startQuiz = async (req, res) => {
  try {
    const { id: quizId } = req.params;

    // Mark quiz as started
    await db.query(
      "UPDATE quizzes SET status = 'active', started = true, started_at = now() WHERE id = $1",
      [quizId]
    );

    // Fetch quiz metadata
    const quizRes = await db.query(
      "SELECT metadata_uri, question_duration FROM quizzes WHERE id = $1",
      [quizId]
    );

    if (quizRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }

    const quiz = quizRes.rows[0];
    const duration = (quiz.question_duration || 15) * 1000;

    // Notify all connected players
    io.to(`quiz_${quizId}`).emit("quiz_started", {
      quizId,
      startedAt: Date.now(),
    });

    // Load questions from metadata URI
    let questions = [];
    if (quiz.metadata_uri) {
      try {
        const response = await fetch(quiz.metadata_uri);
        const metadata = await response.json();
        questions = metadata.questions || [];
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        return res.status(400).json({ 
          success: false, 
          message: "Failed to load questions from metadata URI" 
        });
      }
    }

    if (questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "No questions found in metadata" 
      });
    }

    // Start broadcasting questions
    let index = 0;
    const interval = setInterval(() => {
      if (index < questions.length) {
        const questionData = {
          index,
          question: questions[index],
          endsAt: Date.now() + duration,
          totalQuestions: questions.length
        };
        
        io.to(`quiz_${quizId}`).emit("new_question", questionData);
        console.log(`Broadcasting question ${index + 1}/${questions.length} for quiz ${quizId}`);
        
        index++;
      } else {
        clearInterval(interval);
        io.to(`quiz_${quizId}`).emit("quiz_finished", { quizId });
        console.log(`Quiz ${quizId} finished`);
      }
    }, duration);

    res.json({ 
      success: true, 
      message: "Quiz started",
      totalQuestions: questions.length,
      questionDuration: duration / 1000
    });

  } catch (err) {
    console.error("startQuiz error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * End quiz (mark as ended, stop accepting answers)
 */
export const endQuiz = async (req, res) => {
  const { id: quizId } = req.params;
  
  try {
    await pool.query(
      "UPDATE quizzes SET status = 'ended' WHERE id = $1",
      [quizId]
    );
    
    io.to(`quiz_${quizId}`).emit("quiz_ended", { quizId });
    
    return res.json({ success: true, message: "Quiz ended" });
  } catch (err) {
    console.error("endQuiz error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Finalize quiz: compute winners and prepare for blockchain payout
 */
export const finalizeQuiz = async (req, res) => {
  const { id: quizId } = req.params;
  
  try {
    // Fetch quiz details
    const quizRes = await pool.query("SELECT * FROM quizzes WHERE id = $1", [quizId]);
    
    if (quizRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Quiz not found" });
    }
    
    const quiz = quizRes.rows[0];
    const topN = Number(quiz.num_winners) || 3;

    // Compute and persist results
    const { winners, allScores } = await computeAndPersistResults(quizId, topN);

    // Format winners for smart contract (array of wallet addresses)
    const winnersWallets = winners.map((w) => w.wallet);

    // Emit to connected clients
    io.to(`quiz_${quizId}`).emit("quiz_finalized", {
      quizId,
      winners,
      allScores
    });

    return res.json({ 
      success: true,
      winners,
      winnersWallets,
      allScores,
      contractAddress: quiz.contract_address
    });
    
  } catch (err) {
    console.error("finalizeQuiz error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Finalization failed" 
    });
  }
};

/**
 * Cancel quiz before it starts
 */
export const cancelQuiz = async (req, res) => {
  const { id: quizId } = req.params;
  
  try {
    const result = await pool.query(
      "UPDATE quizzes SET status = 'cancelled', cancelled_at = now() WHERE id = $1 AND started = false RETURNING *",
      [quizId]
    );
    
    if (result.rowCount === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Quiz not found or already started" 
      });
    }
    
    io.to(`quiz_${quizId}`).emit("quiz_cancelled", { quizId });
    
    return res.json({ 
      success: true, 
      message: "Quiz cancelled",
      quiz: result.rows[0]
    });
    
  } catch (err) {
    console.error("cancelQuiz error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};