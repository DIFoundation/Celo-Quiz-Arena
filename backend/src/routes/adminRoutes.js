import express from "express"
import {
  startQuiz,
  broadcastQuestion,
  endQuiz,
  finalizeQuiz,
  cancelQuiz,
  distributePrizes,
  confirmPrizeDistribution,
} from "../controllers/adminController.js"

const router = express.Router()

// POST /api/admin/:id/start
router.post("/:id/start", startQuiz)

router.post("/:id/broadcast-question", broadcastQuestion)

// POST /api/admin/:id/end
router.post("/:id/end", endQuiz)

// POST /api/admin/:id/finalize
router.post("/:id/finalize", finalizeQuiz)

// POST /api/admin/:id/distribute-prizes
router.post("/:id/distribute-prizes", distributePrizes)

// POST /api/admin/:id/confirm-distribution
router.post("/:id/confirm-distribution", confirmPrizeDistribution)

// POST /api/admin/:id/cancel
router.post("/:id/cancel", cancelQuiz)

export default router
