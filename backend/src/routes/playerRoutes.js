// src/routes/playerRoutes.js
// import express from "express";
import { Router } from "express"
import { joinQuiz, submitAnswer, getParticipantAnswers, getLeaderboard } from "../controllers/playerController.js"

// const router = express.Router({ mergeParams: true });
const router = Router()

// join: POST /api/player/:id/join
router.post("/:id/join", joinQuiz)

// submit answer: POST /api/player/:id/answer
router.post("/:id/answer", submitAnswer)

router.get("/:id/answers", getParticipantAnswers)

// leaderboard: GET /api/player/:id/leaderboard
router.get("/:id/leaderboard", getLeaderboard)

export default router
