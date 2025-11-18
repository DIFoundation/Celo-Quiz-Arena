// src/routes/playerRoutes.js
import express from "express";
import {
  joinQuiz,
  submitAnswer,
  getLeaderboard
} from "../controllers/playerController.js";

const router = express.Router({ mergeParams: true });

// join: POST /api/quizzes/:id/join
router.post("/:id/join", joinQuiz.bind(null));

// submit answer: POST /api/quizzes/:id/answer
router.post("/:id/answer", submitAnswer.bind(null));

// leaderboard: GET /api/quizzes/:id/leaderboard
router.get("/:id/leaderboard", getLeaderboard.bind(null));

export default router;
