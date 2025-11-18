// src/controllers/quizController.js
import * as quizService from '../services/quizService.js';

export const createQuiz = async (req, res) => {
  try {
    const { host, token = '0x0', num_winners = 3, percentages = [], equal_split = true, metadata_uri } = req.body;
    const quiz = await quizService.createQuiz(host, token, num_winners, percentages, equal_split, metadata_uri);
    res.json({ ok: true, quiz });
  } catch (err) {
    console.error('Error in createQuiz:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const getQuiz = async (req, res) => {
  try {
    const quiz = await quizService.getQuiz(req.params.id);
    res.json({ ok: true, quiz });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const getResults = async (req, res) => {
  try {
    const results = await quizService.getResults(req.params.id);
    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
