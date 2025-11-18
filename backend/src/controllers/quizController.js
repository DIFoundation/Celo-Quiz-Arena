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

export const joinQuiz = async (req, res) => {
  try {
    const { playerAddress, name } = req.body;
    const participant = await quizService.joinQuiz(req.params.id, playerAddress, name);
    res.json({ ok: true, participant });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const startQuiz = async (req, res) => {
  try {
    // host-only check should be enforced by client/backend verification (simpler here)
    await quizService.startQuiz(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const finalizeQuiz = async (req, res) => {
  try {
    // server computes winners based on recorded answers (fastest-finger logic)
    const { winners } = await quizService.finalizeQuiz(req.params.id);
    res.json({ ok: true, winners });
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
