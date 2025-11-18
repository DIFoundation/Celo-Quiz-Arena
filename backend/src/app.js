// src/app.js
import express from 'express';
import cors from 'cors';
import quizRoutes from './routes/quiz.js';
import playerRoutes from './routes/player.js';
import adminRoutes from './routes/admin.js';

const app = express();

app.use(cors());
app.use(express.json());

// health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// quiz routes
app.use('/api/quiz', quizRoutes);

// Player endpoints (join/answer/leaderboard)
app.use('/api/quizzes', playerRoutes); // handles /:id/join and /:id/answer

// Admin endpoints
app.use('/api/quizzes', adminRoutes);

export default app;
