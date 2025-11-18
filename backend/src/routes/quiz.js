// src/routes/quiz.js
import express from 'express';
import { 
  createQuiz, 
  getQuiz, 
  joinQuiz, 
  startQuiz, 
  finalizeQuiz, 
  getResults 
} from '../controllers/quizController.js';

const router = express.Router();

// create a quiz (host supplies metadata, token, winners, etc.)
router.post('/', createQuiz);

// get quiz info
router.get('/:id', getQuiz);

// join via REST (optional — sockets recommended)
router.post('/:id/join', joinQuiz);

// start quiz (host)
router.post('/:id/start', startQuiz);

// finalize - compute winners and persist results (host)
router.post('/:id/finalize', finalizeQuiz);

// get results
router.get('/:id/results', getResults);

export default router;
