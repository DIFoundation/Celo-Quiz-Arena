// src/app.js
const express = require('express');
const cors = require('cors');
const quizRoutes = require('./routes/quiz');

const app = express();

app.use(cors());
app.use(express.json());

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// quiz routes
app.use('/api/quiz', quizRoutes);

module.exports = app;
