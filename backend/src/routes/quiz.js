// src/routes/quiz.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// create a quiz (host supplies metadata, token, winners, etc.)
router.post('/', quizController.createQuiz);

// get quiz info
router.get('/:id', quizController.getQuiz);

// join via REST (optional — sockets recommended)
router.post('/:id/join', quizController.joinQuiz);

// start quiz (host)
router.post('/:id/start', quizController.startQuiz);

// finalize - compute winners and persist results (host)
router.post('/:id/finalize', quizController.finalizeQuiz);

// get results
router.get('/:id/results', quizController.getResults);

module.exports = router;
