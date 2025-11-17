// src/controllers/quizController.js
const quizService = require('../services/quizService');

module.exports = {
  createQuiz: async (req, res) => {
    try {
      const { host, token = '0x0', numWinners = 3, percentages = [], equalSplit = true, metadataURI } = req.body;
      const quiz = await quizService.createQuiz(host, token, numWinners, percentages, equalSplit, metadataURI);
      res.json({ ok: true, quiz });
    } catch (err) {
      console.error(err);
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  getQuiz: async (req, res) => {
    try {
      const quiz = await quizService.getQuiz(req.params.id);
      res.json({ ok: true, quiz });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  joinQuiz: async (req, res) => {
    try {
      const { playerAddress, name } = req.body;
      const participant = await quizService.joinQuiz(req.params.id, playerAddress, name);
      res.json({ ok: true, participant });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  startQuiz: async (req, res) => {
    try {
      // host-only check should be enforced by client/backend verification (simpler here)
      await quizService.startQuiz(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  finalizeQuiz: async (req, res) => {
    try {
      // server computes winners based on recorded answers (fastest-finger logic)
      const { winners } = await quizService.finalizeQuiz(req.params.id);
      res.json({ ok: true, winners });
    } catch (err) {
      console.error('finalizeQuiz err', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  },

  getResults: async (req, res) => {
    try {
      const results = await quizService.getResults(req.params.id);
      res.json({ ok: true, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  },
};
