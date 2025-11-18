// src/sockets.js
import db from './db.js';

/**
 * Socket events:
 * - join_room: { quizId, playerAddress, name }
 * - leave_room: { quizId }
 * - host_start: { quizId }  // host tells server to start quiz (server emits question flow)
 * - submit_answer: { quizId, participantId, questionIndex, selectedOption }
 * - host_emit_question: { quizId, questionIndex, questionObj } // optionally host-driven
 *
 * Server emits:
 * - player_joined, player_left, question, answer_accepted, quiz_started, quiz_ended
 */

export default function (io) {
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on('join_room', async (payload) => {
      const { quizId, playerAddress, name } = payload;
      try {
        // add participant if not exists
        const insertQ = `
          INSERT INTO participants (quiz_id, player_address, name)
          VALUES ($1, $2, $3)
          RETURNING id, player_address, name, joined_at
        `;
        const r = await db.query(insertQ, [quizId, playerAddress, name || null]);
        
        const participant = r.rows[0];
        socket.join(quizId);
        socket.data.participantId = participant.id;
        socket.data.quizId = quizId;
        io.to(quizId).emit('player_joined', {
          id: participant.id,
          playerAddress: participant.player_address,
          name: participant.name,
          joinedAt: participant.joined_at
        });
      } catch (err) {
        console.error('Error joining room:', err);
        socket.emit('error', { message: 'failed to join' });
      }
    });

    socket.on('leave_room', async (payload) => {
      const { quizId } = payload;
      socket.leave(quizId);
      io.to(quizId).emit('player_left', { socketId: socket.id });
    });

    // host can start quiz (record started flag in DB and tell clients)
    socket.on('host_start', async ({ quizId }) => {
      try {
        await db.query('UPDATE quizzes SET started = true, started_at = now() WHERE id = $1', [quizId]);
        io.to(quizId).emit('quiz_started', { quizId, startedAt: new Date().toISOString() });
      } catch (err) {
        console.error('host_start error', err);
      }
    });

    // host can emit question (host-managed flow), server simply relays
    socket.on('host_emit_question', ({ quizId, questionIndex, questionObj }) => {
      io.to(quizId).emit('question', { questionIndex, question: questionObj });
    });

    // player submits answer (server-side stores timestamp)
    socket.on('submit_answer', async ({ quizId, questionIndex, selectedOption }) => {
      const participantId = socket.data.participantId;
      if (!participantId) {
        socket.emit('error', { message: 'participant not registered' });
        return;
      }
      try {
        const insert = `
          INSERT INTO answers (quiz_id, participant_id, question_index, selected_option, answered_at)
          VALUES ($1, $2, $3, $4, now())
          RETURNING id, answered_at
        `;
        const res = await db.query(insert, [quizId, participantId, questionIndex, selectedOption]);
        socket.emit('answer_accepted', { questionIndex, answeredAt: res.rows[0].answered_at });
      } catch (err) {
        console.error('submit_answer err', err);
        socket.emit('error', { message: 'failed to submit answer' });
      }
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected', socket.id);
    });
  });
}
