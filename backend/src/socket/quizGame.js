// socket/quizGame.js
const answerService = require("../services/answerService");

let questionTimers = {}; // tracks per-quiz active timers

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("player connected:", socket.id);

    // player joins a quiz room
    socket.on("join-quiz", ({ quizId, participant }) => {
      socket.join(`quiz-${quizId}`);
      console.log(`${participant} joined quiz ${quizId}`);
    });

    // host starts a question
    socket.on("start-question", async ({ quizId, questionIndex, duration }) => {
      const room = `quiz-${quizId}`;

      // broadcast to all players
      io.to(room).emit("question-started", {
        questionIndex,
        duration
      });

      // store start time
      if (!questionTimers[quizId]) questionTimers[quizId] = {};
      questionTimers[quizId][questionIndex] = {
        startedAt: Date.now(),
        endsAt: Date.now() + duration
      };

      // auto-end when time expires
      setTimeout(() => {
        io.to(room).emit("question-ended", { questionIndex });
      }, duration);
    });

    // player submits answer
    socket.on("submit-answer", async (data) => {
      try {
        await answerService.storeAnswer(data);
        const leaderboard = await answerService.getLeaderboard(data.quizId);

        io.to(`quiz-${data.quizId}`).emit("leaderboard-update", leaderboard);
      } catch (err) {
        console.error(err);
        socket.emit("answer-error", { message: err.message });
      }
    });
  });
};
