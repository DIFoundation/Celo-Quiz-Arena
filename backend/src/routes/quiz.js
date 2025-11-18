// src/routes/quiz.js
import express from 'express';
import { 
  createQuiz, 
  getQuiz, 
  getResults 
} from '../controllers/quizController.js';

const router = express.Router();

// create a quiz (host supplies metadata, token, winners, etc.)
router.post('/', createQuiz);

// get quiz info
router.get('/:id', getQuiz);

// get results
router.get('/:id/results', getResults);

export default router;
