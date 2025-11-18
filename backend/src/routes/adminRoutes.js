// src/routes/adminRoutes.js
import express from "express";
import {
  startQuiz,
  endQuiz,
  finalizeQuiz,
  cancelQuiz
} from "../controllers/adminController.js";

const router = express.Router();

// POST /api/quizzes/:id/start
router.post("/:id/start", startQuiz);

// POST /api/quizzes/:id/end
router.post("/:id/end", endQuiz);

// POST /api/quizzes/:id/finalize
router.post("/:id/finalize", finalizeQuiz);

// POST /api/quizzes/:id/cancel
router.post("/:id/cancel", cancelQuiz);

export default router;
