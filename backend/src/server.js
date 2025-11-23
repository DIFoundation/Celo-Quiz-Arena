// src/server.js
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import sockets from "./sockets.js";
import "dotenv/config";
import http from "http";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "http://localhost:5000",
    methods: ["GET", "POST"],
  },
});

// initialize sockets with io
sockets(io);

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join_quiz", ({ quizId, wallet }) => {
    socket.join(`quiz_${quizId}`);
    console.log(`Player ${wallet} joined quiz ${quizId}`);

    io.to(`quiz_${quizId}`).emit("player_joined", { wallet });
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
  });

  socket.on("start_game", ({ quizId }) => {
    console.log(`Game started for quiz ${quizId}`);

    io.to(`quiz_${quizId}`).emit("game_started", {
      quizId,
      started: true,
    });
  });

  socket.on("submit-answer", async (data) => {
    const { quizId, participant, questionIndex, option } = data;

    // 1) prevent double-answer
    const exists = await db.query(
      `SELECT id FROM answers WHERE quiz_id=$1 AND participant=$2 AND question_index=$3`,
      [quizId, participant, questionIndex]
    );
    if (exists.rows.length) return;

    // 2) check correctness
    const correct = await checkCorrectAnswer(quizId, questionIndex, option);

    // 3) calculate reaction time
    const timeTaken = Date.now() - questionStartTime[quizId][questionIndex];

    // 4) store in DB
    await db.query(
      `INSERT INTO answers (quiz_id, participant, question_index, correct, time_taken_ms)
         VALUES ($1,$2,$3,$4,$5)`,
      [quizId, participant, questionIndex, correct, timeTaken]
    );

    // 5) broadcast updated leaderboard
    io.to(`quiz-${quizId}`).emit("leaderboard-update", {
      quizId,
      leaderboard: await getLeaderboard(quizId),
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const quizGame = require("./socket/quizGame");

quizGame(io);
