import * as quizService from "../services/quizService.js"
import * as questionService from "../services/questionService.js"

export const createQuiz = async (req, res) => {
  try {
    const { host, token = "0x0", num_winners = 3, percentages = [], equal_split = true, metadata_uri } = req.body
    const quiz = await quizService.createQuiz(host, token, num_winners, percentages, equal_split, metadata_uri)
    res.json({ ok: true, quiz })
  } catch (err) {
    console.error("Error in createQuiz:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const getQuiz = async (req, res) => {
  try {
    const quiz = await quizService.getQuiz(req.params.id)
    res.json({ ok: true, quiz })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const addQuestions = async (req, res) => {
  try {
    const { id } = req.params
    const { questions } = req.body

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ ok: false, error: "questions array is required and must not be empty" })
    }

    const addedQuestions = await questionService.addQuestions(id, questions)
    res.json({ ok: true, questions: addedQuestions })
  } catch (err) {
    console.error("Error in addQuestions:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const getQuizQuestions = async (req, res) => {
  try {
    const { id } = req.params
    const questions = await questionService.getQuizQuestions(id)
    res.json({ ok: true, questions })
  } catch (err) {
    console.error("Error in getQuizQuestions:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const getQuestion = async (req, res) => {
  try {
    const { id, questionIndex } = req.params
    const question = await questionService.getQuestion(id, Number.parseInt(questionIndex))
    res.json({ ok: true, question })
  } catch (err) {
    console.error("Error in getQuestion:", err)
    res.status(500).json({ ok: false, error: err.message })
  }
}

export const getResults = async (req, res) => {
  try {
    const results = await quizService.getResults(req.params.id)
    res.json({ ok: true, results })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
