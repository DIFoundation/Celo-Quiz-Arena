import express from "express"
import {
  createQuiz,
  getQuiz,
  getResults,
  addQuestions,
  getQuizQuestions,
  getQuestion,
} from "../controllers/quizController.js"

const router = express.Router()

// create a quiz (host supplies metadata, token, winners, etc.)
router.post("/", createQuiz)

// get quiz info
router.get("/:id", getQuiz)

router.post("/:id/questions", addQuestions)

router.get("/:id/questions", getQuizQuestions)

router.get("/:id/questions/:questionIndex", getQuestion)

// get results
router.get("/:id/results", getResults)

export default router
